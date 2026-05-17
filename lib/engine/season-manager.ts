import { moraleBandFromScore, type Club, type GameSave, type LeagueStanding, type Match, type MatchResultCode } from "@/lib/types"
import { simulateMatch, type MatchSimClub } from "@/lib/engine/match-simulator"
import { progressPlayers } from "@/lib/engine/progression"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const academyNames = ["Mateo Silva", "Noah Brandt", "Iker Ramos", "Theo Moreau", "Dario Klein", "Enzo Vidal"]
const academyPositions = ["GK", "CB", "CM", "CAM", "RW", "ST"] as const

const defaultTrainingPlan = {
  weekNumber: 1,
  sessions: [
    { id: "default-tech", category: "technical" as const, focusAttributes: ["passing", "technique", "shooting"], fatigueCost: 16, scheduledDay: 1 },
    { id: "default-phys", category: "physical" as const, focusAttributes: ["pace", "stamina", "strength"], fatigueCost: 18, scheduledDay: 3 },
    { id: "default-rec", category: "recovery" as const, focusAttributes: ["concentration", "teamwork"], fatigueCost: 4, scheduledDay: 5 },
  ],
}

function clubWithSquad(save: GameSave, club: Club): MatchSimClub {
  return {
    ...club,
    squad: save.players.filter((player) => club.squadPlayerIds.includes(player.id)),
  }
}

function resultCode(forGoals: number, againstGoals: number): MatchResultCode {
  if (forGoals > againstGoals) return "W"
  if (forGoals < againstGoals) return "L"
  return "D"
}

function applyMatchToStanding(
  standing: LeagueStanding,
  goalsFor: number,
  goalsAgainst: number,
  pointsForWin: number,
  pointsForDraw: number,
): LeagueStanding {
  const won = goalsFor > goalsAgainst ? 1 : 0
  const drawn = goalsFor === goalsAgainst ? 1 : 0
  const lost = goalsFor < goalsAgainst ? 1 : 0
  const points = won ? pointsForWin : drawn ? pointsForDraw : 0
  const form = [resultCode(goalsFor, goalsAgainst), ...standing.form].slice(0, 5)

  return {
    ...standing,
    played: standing.played + 1,
    won: standing.won + won,
    drawn: standing.drawn + drawn,
    lost: standing.lost + lost,
    goalsFor: standing.goalsFor + goalsFor,
    goalsAgainst: standing.goalsAgainst + goalsAgainst,
    goalDifference: standing.goalDifference + goalsFor - goalsAgainst,
    points: standing.points + points,
    form,
  }
}

function applyZones(rows: LeagueStanding[], save: GameSave): LeagueStanding[] {
  const league = save.leagues[0]
  const relegationStart = rows.length - league.rules.relegationSpots + 1

  return rows.map((row) => {
    let zone: LeagueStanding["zone"] = null
    if (row.position <= league.rules.championsLeagueSpots) zone = "champions"
    else if (row.position <= league.rules.championsLeagueSpots + league.rules.europaLeagueSpots) zone = "europa"
    else if (
      row.position <=
      league.rules.championsLeagueSpots + league.rules.europaLeagueSpots + league.rules.conferenceLeagueSpots
    ) {
      zone = "conference"
    } else if (row.position >= relegationStart) {
      zone = "relegation"
    }
    return { ...row, zone }
  })
}

function updateStandings(save: GameSave, matches: Match[]): LeagueStanding[] {
  const byClub = new Map(save.standings.map((standing) => [standing.clubId, { ...standing }]))
  const league = save.leagues[0]

  for (const match of matches) {
    if (match.homeScore == null || match.awayScore == null) continue
    const home = byClub.get(match.homeClubId)
    const away = byClub.get(match.awayClubId)
    if (!home || !away) continue

    byClub.set(
      match.homeClubId,
      applyMatchToStanding(home, match.homeScore, match.awayScore, league.rules.pointsForWin, league.rules.pointsForDraw),
    )
    byClub.set(
      match.awayClubId,
      applyMatchToStanding(away, match.awayScore, match.homeScore, league.rules.pointsForWin, league.rules.pointsForDraw),
    )
  }

  const sorted = [...byClub.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.goalsAgainst - b.goalsAgainst,
  )

  const ranked = sorted.map((standing, index) => {
    const position = index + 1
    const previousPosition = save.standings.find((row) => row.clubId === standing.clubId)?.position ?? position
    return {
      ...standing,
      position,
      positionChange: position < previousPosition ? "up" : position > previousPosition ? "down" : "same",
    } satisfies LeagueStanding
  })

  return applyZones(ranked, save)
}

function moraleDeltaFor(clubId: string, matches: Match[]): number {
  return matches.reduce((delta, match) => {
    if (match.homeScore == null || match.awayScore == null) return delta
    if (match.homeClubId === clubId) {
      if (match.homeScore > match.awayScore) return delta + 3
      if (match.homeScore < match.awayScore) return delta - 3
      return delta + 1
    }
    if (match.awayClubId === clubId) {
      if (match.awayScore > match.homeScore) return delta + 3
      if (match.awayScore < match.homeScore) return delta - 3
      return delta + 1
    }
    return delta
  }, 0)
}

function updateClubs(save: GameSave, matches: Match[]): Club[] {
  return save.clubs.map((club) => {
    const delta = moraleDeltaFor(club.id, matches)
    const homeMatches = matches.filter((match) => match.homeClubId === club.id).length
    const matchdayIncome = homeMatches * club.stadium.capacity * 24
    const tvIncome = Math.round(club.finances.incomeBreakdown.tvRights / 4)
    const sponsorIncome = club.sponsorDeals.reduce((sum, deal) => sum + deal.weeklyIncome, 0)
    const staffWages = club.staff.reduce((sum, staff) => sum + staff.weeklyWage, 0)
    const wagePenalty =
      club.finances.weeklyWageBill > club.finances.monthlyProjectedIncome / 3 ? Math.round(club.finances.weeklyWageBill * 0.12) : 0
    const weeklyExpenses = club.finances.weeklyWageBill + staffWages + wagePenalty
    const weeklyIncome = matchdayIncome + tvIncome + sponsorIncome
    const wageBillPercent = Math.round((club.finances.weeklyWageBill * 4 / Math.max(1, club.finances.monthlyProjectedIncome)) * 100)
    const shouldCreateProspect = club.isUserControlled && save.currentMatchday % 4 === 0 && club.youthProspects.length < 6
    const nextProspectIndex = club.youthProspects.length
    const nextProspectPosition = academyPositions[nextProspectIndex % academyPositions.length]

    return {
      ...club,
      finances: {
        ...club.finances,
        balance: club.finances.balance + weeklyIncome - weeklyExpenses,
        wageBillPercent,
        weeklyWageRoom: Math.max(0, Math.round(club.finances.monthlyProjectedIncome / 16 - club.finances.weeklyWageBill)),
        incomeBreakdown: {
          ...club.finances.incomeBreakdown,
          tickets: club.finances.incomeBreakdown.tickets + matchdayIncome,
          tvRights: club.finances.incomeBreakdown.tvRights + tvIncome,
          sponsors: club.finances.incomeBreakdown.sponsors + sponsorIncome,
        },
        wageCapPenalty: wageBillPercent >= 95 ? "transfer_ban" : wageBillPercent >= 80 ? "warning" : "none",
      },
      youthProspects: [
        ...club.youthProspects.map((prospect) => ({
          ...prospect,
          weeksInAcademy: prospect.weeksInAcademy + 1,
          overallRating: clamp(prospect.overallRating + (prospect.age <= 18 ? 1 : 0), 45, 82),
        })),
        ...(shouldCreateProspect
          ? [
              {
                id: `prospect-${Date.now()}-${nextProspectIndex}`,
                generatedName: academyNames[nextProspectIndex % academyNames.length],
                age: 16 + (nextProspectIndex % 3),
                position: nextProspectPosition,
                positionGroup: nextProspectPosition === "GK" ? "GK" as const : nextProspectPosition === "CB" ? "DEF" as const : nextProspectPosition === "CM" || nextProspectPosition === "CAM" ? "MID" as const : "FWD" as const,
                potentialHidden: nextProspectIndex % 2 === 0,
                revealedPotential: nextProspectIndex % 2 === 0 ? null : 82 + nextProspectIndex,
                overallRating: 58 + nextProspectIndex,
                academyCategory: nextProspectIndex % 3 === 0 ? "u16" as const : nextProspectIndex % 3 === 1 ? "u18" as const : "u21" as const,
                weeksInAcademy: 0,
              },
            ]
          : []),
      ],
      squadMorale: clamp(club.squadMorale + delta - (wagePenalty > 0 ? 2 : 0), 0, 100),
      updatedAt: new Date().toISOString(),
    }
  })
}

function updatePlayers(save: GameSave, matches: Match[]) {
  const playedClubIds = new Set(matches.flatMap((match) => [match.homeClubId, match.awayClubId]))
  const injuryPlayerIds = new Set(
    matches.flatMap((match) => match.events.filter((event) => event.type === "injury" && event.playerId).map((event) => event.playerId!)),
  )

  return save.players.map((player) => {
    if (!player.clubId || !playedClubIds.has(player.clubId)) return player
    const delta = moraleDeltaFor(player.clubId, matches)
    const morale = clamp(player.morale + delta, 0, 100)
    const injured = injuryPlayerIds.has(player.id)

    return {
      ...player,
      morale,
      moraleBand: moraleBandFromScore(morale),
      fatigue: clamp(player.fatigue + 8, 0, 100),
      fitness: clamp(player.fitness - 6, 0, 100),
      isInjured: player.isInjured || injured,
      injury: injured
        ? {
            type: "Match knock",
            severity: "light" as const,
            weeksOut: 1,
            description: "Picked up during simulated match",
            injuredAt: new Date().toISOString(),
            expectedReturnAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            potentialReduced: false,
          }
        : player.injury,
      updatedAt: new Date().toISOString(),
    }
  })
}

function matchesToSimulate(save: GameSave): Match[] {
  const season = save.seasons.find((item) => item.id === save.currentSeasonId)
  const currentMatchday = season?.currentMatchday ?? save.currentMatchday
  const scheduledCurrent = save.matches.filter((match) => match.status === "scheduled" && match.matchday === currentMatchday)
  if (scheduledCurrent.length > 0) return scheduledCurrent

  const nextMatchday = Math.min(
    ...save.matches
      .filter((match) => match.status === "scheduled" && match.matchday >= currentMatchday)
      .map((match) => match.matchday),
  )

  return Number.isFinite(nextMatchday)
    ? save.matches.filter((match) => match.status === "scheduled" && match.matchday === nextMatchday)
    : []
}

export function advanceTurn(save: GameSave): GameSave {
  const scheduledMatches = matchesToSimulate(save)
  if (scheduledMatches.length === 0) return { ...save, updatedAt: new Date().toISOString() }

  const playedAt = new Date().toISOString()
  const simulatedMatches = scheduledMatches.map((match) => {
    const homeClub = save.clubs.find((club) => club.id === match.homeClubId)
    const awayClub = save.clubs.find((club) => club.id === match.awayClubId)
    if (!homeClub || !awayClub) return match

    const result = simulateMatch(clubWithSquad(save, homeClub), clubWithSquad(save, awayClub))

    return {
      ...match,
      status: "finished" as const,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: result.events,
      homeStats: result.homeStats,
      awayStats: result.awayStats,
      homeAdvantageApplied: true,
      simulationMode: "detailed" as const,
      minute: 90,
      playedAt,
    }
  })

  const simulatedById = new Map(simulatedMatches.map((match) => [match.id, match]))
  const matches = save.matches.map((match) => simulatedById.get(match.id) ?? match)
  const advancedMatchday = Math.max(...simulatedMatches.map((match) => match.matchday)) + 1

  const playersAfterMatch = updatePlayers(save, simulatedMatches)
  const clubsAfterMatch = updateClubs(save, simulatedMatches)
  const userClub = clubsAfterMatch.find((club) => club.id === save.userClubId)
  const trainingPlan = userClub?.currentTrainingPlan ?? defaultTrainingPlan
  const progressedUserSquad = progressPlayers(
    playersAfterMatch.filter((player) => player.clubId === save.userClubId),
    trainingPlan,
  )
  const progressedById = new Map(progressedUserSquad.map((player) => [player.id, player]))

  return {
    ...save,
    currentMatchday: advancedMatchday,
    turnDeadlineAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    matches,
    clubs: clubsAfterMatch,
    players: playersAfterMatch.map((player) => progressedById.get(player.id) ?? player),
    standings: updateStandings(save, simulatedMatches),
    seasons: save.seasons.map((season) =>
      season.id === save.currentSeasonId
        ? { ...season, currentMatchday: Math.min(advancedMatchday, season.totalMatchdays) }
        : season,
    ),
    turnSubmissions: save.turnSubmissions.filter((turn) => turn.matchday >= advancedMatchday),
    updatedAt: playedAt,
  }
}
