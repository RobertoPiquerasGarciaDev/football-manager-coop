import { moraleBandFromScore, type Club, type GameSave, type LeagueStanding, type Match, type MatchResultCode } from "@/lib/types"
import { simulateMatch, type MatchSimClub } from "@/lib/engine/match-simulator"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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
    if (delta === 0) return club
    return {
      ...club,
      squadMorale: clamp(club.squadMorale + delta, 0, 100),
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

  return {
    ...save,
    currentMatchday: advancedMatchday,
    turnDeadlineAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    matches,
    clubs: updateClubs(save, simulatedMatches),
    players: updatePlayers(save, simulatedMatches),
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
