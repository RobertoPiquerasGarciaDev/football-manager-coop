import {
  moralePerformanceMultiplier,
  type Club,
  type MatchEvent,
  type MatchTeamStats,
  type Player,
  type PositionGroup,
} from "@/lib/types"

export type MatchSimClub = Club & {
  squad?: Player[]
}

export type MatchResult = {
  homeScore: number
  awayScore: number
  events: MatchEvent[]
  homeStats: MatchTeamStats
  awayStats: MatchTeamStats
}

type TeamProfile = {
  club: MatchSimClub
  players: Player[]
  attack: number
  midfield: number
  defense: number
  disciplineRisk: number
  injuryRisk: number
  effectiveStrength: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function average(values: number[], fallback = 65): number {
  if (values.length === 0) return fallback
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function groupPlayers(players: Player[], group: PositionGroup): Player[] {
  return players.filter((player) => player.positionGroup === group && !player.isInjured)
}

function playerAttack(player: Player): number {
  return average([
    player.attributes.technical.shooting,
    player.attributes.technical.dribbling,
    player.attributes.technical.technique,
    player.attributes.mental.decisions,
  ])
}

function playerDefense(player: Player): number {
  if (player.positionGroup === "GK") {
    return average([
      player.attributes.goalkeeping.reflexes,
      player.attributes.goalkeeping.positioning,
      player.attributes.goalkeeping.handling,
      player.attributes.mental.concentration,
    ])
  }
  return average([
    player.attributes.physical.strength,
    player.attributes.physical.pace,
    player.attributes.mental.concentration,
    player.attributes.mental.decisions,
  ])
}

function teamProfile(club: MatchSimClub, isHome: boolean): TeamProfile {
  const players = club.squad?.length ? club.squad : []
  const activePlayers = players.filter((player) => !player.isInjured)
  const squadFallback = club.reputation
  const attackers = groupPlayers(activePlayers, "FWD")
  const midfielders = groupPlayers(activePlayers, "MID")
  const defenders = [...groupPlayers(activePlayers, "DEF"), ...groupPlayers(activePlayers, "GK")]
  const moraleMultiplier = moralePerformanceMultiplier(club.squadMorale)
  const fatigueMultiplier = 1 - average(activePlayers.map((player) => player.fatigue), 20) / 250
  const homeMultiplier = isHome ? 1.05 : 1
  const baseStrength = average(activePlayers.map((player) => player.overallRating), squadFallback)

  return {
    club,
    players: activePlayers,
    attack: average(attackers.map(playerAttack), squadFallback),
    midfield: average(midfielders.map((player) => player.overallRating), squadFallback),
    defense: average(defenders.map(playerDefense), squadFallback),
    disciplineRisk: average(activePlayers.map((player) => player.attributes.mental.aggression), 50),
    injuryRisk: average(activePlayers.map((player) => player.fatigue), 20),
    effectiveStrength: baseStrength * moraleMultiplier * fatigueMultiplier * homeMultiplier,
  }
}

function pickPlayer(profile: TeamProfile, preferredGroups: PositionGroup[]): Player | undefined {
  const preferred = profile.players.filter((player) => preferredGroups.includes(player.positionGroup))
  const pool = preferred.length ? preferred : profile.players
  return pool[Math.floor(Math.random() * pool.length)]
}

function createEvent(
  minute: number,
  type: MatchEvent["type"],
  clubId: string,
  player?: Player,
  description?: string,
): MatchEvent {
  return {
    id: `event-${clubId}-${minute}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    minute,
    type,
    clubId,
    playerId: player?.id,
    description,
  }
}

function chanceFor(attacking: TeamProfile, defending: TeamProfile): number {
  const attackingEdge =
    attacking.attack * 0.5 +
    attacking.midfield * 0.25 +
    attacking.effectiveStrength * 0.25 -
    (defending.defense * 0.6 + defending.midfield * 0.2 + defending.effectiveStrength * 0.2)

  return clamp(0.012 + attackingEdge / 4000, 0.004, 0.04)
}

function statsFor(profile: TeamProfile, opponent: TeamProfile, goals: number, shots: number): MatchTeamStats {
  const possession = clamp(
    Math.round(50 + (profile.midfield - opponent.midfield) * 0.4 + (profile.effectiveStrength - opponent.effectiveStrength) * 0.2),
    35,
    65,
  )

  return {
    clubId: profile.club.id,
    effectiveStrength: Math.round(profile.effectiveStrength),
    possession,
    shots,
    shotsOnTarget: clamp(goals + Math.floor(shots * 0.35), goals, shots),
    corners: Math.max(1, Math.round(shots * 0.35)),
    fouls: clamp(Math.round(7 + profile.disciplineRisk / 10 + Math.random() * 5), 6, 22),
    offsides: clamp(Math.round(profile.attack / 30 + Math.random() * 3), 0, 6),
  }
}

export function simulateMatch(home: MatchSimClub, away: MatchSimClub): MatchResult {
  const homeProfile = teamProfile(home, true)
  const awayProfile = teamProfile(away, false)
  const events: MatchEvent[] = []
  let homeScore = 0
  let awayScore = 0
  let homeShots = 0
  let awayShots = 0

  for (let minute = 1; minute <= 90; minute += 1) {
    const homeChance = chanceFor(homeProfile, awayProfile)
    const awayChance = chanceFor(awayProfile, homeProfile)

    if (Math.random() < homeChance) {
      homeShots += 1
      if (Math.random() < 0.34) {
        homeScore += 1
        const scorer = pickPlayer(homeProfile, ["FWD", "MID"])
        events.push(createEvent(minute, "goal", home.id, scorer, `${scorer?.displayName ?? home.name} scores for ${home.name}`))
      } else if (Math.random() < 0.18) {
        events.push(createEvent(minute, "key_chance", home.id, pickPlayer(homeProfile, ["FWD", "MID"])))
      }
    }

    if (Math.random() < awayChance) {
      awayShots += 1
      if (Math.random() < 0.34) {
        awayScore += 1
        const scorer = pickPlayer(awayProfile, ["FWD", "MID"])
        events.push(createEvent(minute, "goal", away.id, scorer, `${scorer?.displayName ?? away.name} scores for ${away.name}`))
      } else if (Math.random() < 0.18) {
        events.push(createEvent(minute, "key_chance", away.id, pickPlayer(awayProfile, ["FWD", "MID"])))
      }
    }

    for (const profile of [homeProfile, awayProfile]) {
      if (Math.random() < clamp(profile.disciplineRisk / 18_000, 0.001, 0.006)) {
        events.push(createEvent(minute, "yellow_card", profile.club.id, pickPlayer(profile, ["DEF", "MID"])))
      }
      if (Math.random() < clamp(profile.disciplineRisk / 120_000, 0.0001, 0.0012)) {
        events.push(createEvent(minute, "red_card", profile.club.id, pickPlayer(profile, ["DEF", "MID"])))
      }
      if (Math.random() < clamp(profile.injuryRisk / 80_000, 0.0002, 0.0015)) {
        events.push(createEvent(minute, "injury", profile.club.id, pickPlayer(profile, ["MID", "DEF", "FWD"])))
      }
    }
  }

  homeShots = Math.max(homeShots, homeScore + Math.floor(Math.random() * 4) + 4)
  awayShots = Math.max(awayShots, awayScore + Math.floor(Math.random() * 4) + 3)

  return {
    homeScore,
    awayScore,
    events: events.sort((a, b) => a.minute - b.minute),
    homeStats: statsFor(homeProfile, awayProfile, homeScore, homeShots),
    awayStats: statsFor(awayProfile, homeProfile, awayScore, awayShots),
  }
}
