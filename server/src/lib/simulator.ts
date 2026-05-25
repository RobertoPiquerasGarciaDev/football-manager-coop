/**
 * Probabilistic match simulation engine (v7).
 *
 * Each match is modelled as 90 discrete minutes. At every minute we roll a
 * goal probability derived from:
 *   - attacking rating of the team vs defending rating of the opponent
 *   - team form, morale and accumulated fatigue
 *   - home advantage (+8%)
 *   - tactical instructions (press/tempo/style)
 *   - staff modifiers (analyst suggestion bonus, medic injury reduction, ...)
 *
 * Output: home_score, away_score and a full timeline of events.
 */

import { createHash } from "crypto"

export type TacticInstructions = {
  formation?: string
  pressing?: "low" | "medium" | "high" | string
  tempo?: "low" | "medium" | "high" | string
  style?: "possession" | "direct" | "counter" | "press" | string
  width?: "narrow" | "balanced" | "wide" | string
  defensiveLine?: "deep" | "balanced" | "high" | string
}

export type ClubProfile = {
  id: string
  name: string
  shortName: string
  /** 50-90 overall rating */
  rating: number
  /** 0-100 form (last 5 matches) */
  form: number
  /** 0-100 squad morale */
  morale: number
  /** 0-100 fatigue, higher = worse */
  fatigue: number
  /** 0-100 home strength bonus */
  homeBoost: number
  tactics: TacticInstructions
  /** staff bonus multipliers, see below */
  staff: StaffBonuses
  /** personality for bots */
  personality?: "aggressive" | "conservative" | "balanced" | "human"
  /** if true and the analyst suggestion was applied */
  analystApplied?: boolean
}

export type StaffBonuses = {
  /** -1..+1 — physical coach reduces fatigue accumulation (-1 = no impact, +1 = max) */
  physical: number
  /** -1..+1 — medical staff reduces in-game injury chance */
  medic: number
  /** -1..+1 — tactical analyst bonus when applied */
  analyst: number
  /** -1..+1 — set-piece coach improves dead-ball goals */
  setPiece: number
  /** -1..+1 — gk coach reduces opponent shot conversion */
  gkCoach: number
}

export type MatchEvent = {
  minute: number
  type: "goal" | "yellow_card" | "red_card" | "injury" | "substitution" | "penalty" | "miss" | "key_chance"
  team: "home" | "away"
  player?: string
  description: string
}

export type SimulationResult = {
  homeScore: number
  awayScore: number
  events: MatchEvent[]
  homeRating: number
  awayRating: number
  homeXg: number
  awayXg: number
  mvp: { team: "home" | "away"; player: string; rating: number }
  fatigueAdded: { home: number; away: number }
  injuredPlayers: { team: "home" | "away"; player: string; weeks: number }[]
}

/** Deterministic seeded PRNG (mulberry32) so the same matchday simulation reproduces */
export function makeRng(seed: string) {
  const hash = createHash("sha256").update(seed).digest()
  let a = hash.readUInt32LE(0)
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Derive a deterministic base rating for clubs that don't have real players seeded */
export function deriveClubRating(clubId: string, base = 70): number {
  const hash = createHash("md5").update(clubId).digest()
  const noise = (hash.readUInt16LE(0) % 25) - 12 // -12..+12
  return Math.max(55, Math.min(88, base + noise))
}

/** Combine tactic + staff into final attack and defence values */
function teamRatings(profile: ClubProfile, isHome: boolean) {
  const tactics = profile.tactics ?? {}
  const formAdj = (profile.form - 50) * 0.06 // ±3
  const moraleAdj = (profile.morale - 50) * 0.04 // ±2
  const fatigueAdj = -profile.fatigue * 0.05 // 0..-5
  const homeAdj = isHome ? 4 + profile.homeBoost * 0.04 : 0 // +4..+8

  const baseAtk = profile.rating + formAdj + moraleAdj + fatigueAdj + homeAdj
  const baseDef = profile.rating + formAdj * 0.7 + moraleAdj * 0.5 + fatigueAdj + homeAdj * 0.5

  const styleAtk =
    tactics.style === "direct" ? 2.5 :
    tactics.style === "counter" ? 1.5 :
    tactics.style === "press" ? 1.5 :
    tactics.style === "possession" ? 1 : 0
  const pressingAtk = tactics.pressing === "high" ? 2 : tactics.pressing === "low" ? -1.5 : 0
  const tempoAtk = tactics.tempo === "high" ? 1.5 : tactics.tempo === "low" ? -1 : 0
  const lineDef = tactics.defensiveLine === "deep" ? 2 : tactics.defensiveLine === "high" ? -1.5 : 0
  const lineAtk = tactics.defensiveLine === "high" ? 1.5 : tactics.defensiveLine === "deep" ? -0.5 : 0

  const analystBonus = profile.analystApplied ? profile.staff.analyst * 4 : 0

  return {
    attack: baseAtk + styleAtk + pressingAtk + tempoAtk + lineAtk + analystBonus + profile.staff.setPiece * 0.8,
    defence: baseDef + lineDef + profile.staff.gkCoach * 2 - (tactics.pressing === "high" ? 1 : 0),
  }
}

/** Per-minute probability of a goal for `attacker` */
function goalChance(attackerAtk: number, defenderDef: number): number {
  const diff = attackerAtk - defenderDef
  // base ~0.011/min so ~1 goal per 90' if even
  const base = 0.011
  const factor = Math.exp(diff * 0.06)
  return Math.min(0.07, base * factor)
}

/** Per-minute probability of an injury for the attacking team */
function injuryChance(attackerFatigue: number, medic: number): number {
  // 0.0008 base ~ 7% chance over 90'
  const base = 0.00075
  const fatigueMult = 1 + attackerFatigue * 0.012
  const medicReduce = 1 - Math.max(0, medic) * 0.5
  return base * fatigueMult * medicReduce
}

/** Per-minute card chance — depends on pressing */
function cardChance(profile: ClubProfile, color: "yellow" | "red"): number {
  const pressing = profile.tactics?.pressing
  const aggressive = profile.personality === "aggressive"
  const yellow = (pressing === "high" ? 0.005 : pressing === "low" ? 0.002 : 0.0035) * (aggressive ? 1.3 : 1)
  return color === "yellow" ? yellow : yellow * 0.08
}

const PLAYER_NAMES_POOL = [
  "Romero", "Vargas", "Suárez", "Castro", "Núñez", "Iglesias", "Salinas",
  "Ortega", "Cabrera", "Morales", "Vidal", "Reina", "Linde", "Sánchez",
  "Mejía", "Pacheco", "Gallego", "Cordero", "Camacho", "Espinosa",
  "Ferrer", "Garrido", "Bravo", "Velasco", "Mendoza", "Lara", "Vega",
]

function pickPlayer(rng: () => number, used: Set<string>, prefix?: string): string {
  let pick = PLAYER_NAMES_POOL[Math.floor(rng() * PLAYER_NAMES_POOL.length)]
  let attempts = 0
  while (used.has(pick) && attempts < 8) {
    pick = PLAYER_NAMES_POOL[Math.floor(rng() * PLAYER_NAMES_POOL.length)]
    attempts += 1
  }
  used.add(pick)
  return prefix ? `${prefix} ${pick}` : pick
}

/**
 * Simulate a single match.
 * Both teams must be passed with their full profile.
 */
export function simulateMatch(home: ClubProfile, away: ClubProfile, seed: string): SimulationResult {
  const rng = makeRng(seed)
  const homeR = teamRatings(home, true)
  const awayR = teamRatings(away, false)
  const homePerMin = goalChance(homeR.attack, awayR.defence)
  const awayPerMin = goalChance(awayR.attack, homeR.defence)
  const homeInjPerMin = injuryChance(home.fatigue, home.staff.medic)
  const awayInjPerMin = injuryChance(away.fatigue, away.staff.medic)

  let homeScore = 0
  let awayScore = 0
  let homeXg = 0
  let awayXg = 0
  const events: MatchEvent[] = []
  const injured: SimulationResult["injuredPlayers"] = []
  const homeUsed = new Set<string>()
  const awayUsed = new Set<string>()
  const playerRatings = new Map<string, { team: "home" | "away"; rating: number; player: string }>()

  function bumpRating(team: "home" | "away", player: string, delta: number) {
    const key = `${team}:${player}`
    const current = playerRatings.get(key) ?? { team, rating: 6.5, player }
    current.rating = Math.min(10, Math.max(3, current.rating + delta))
    playerRatings.set(key, current)
  }

  for (let minute = 1; minute <= 90; minute += 1) {
    homeXg += homePerMin
    awayXg += awayPerMin

    // Goals
    if (rng() < homePerMin) {
      const player = pickPlayer(rng, homeUsed, home.shortName)
      homeScore += 1
      events.push({
        minute,
        type: "goal",
        team: "home",
        player,
        description: `⚽ ${player} marca para ${home.shortName}`,
      })
      bumpRating("home", player, 1.2)
    }
    if (rng() < awayPerMin) {
      const player = pickPlayer(rng, awayUsed, away.shortName)
      awayScore += 1
      events.push({
        minute,
        type: "goal",
        team: "away",
        player,
        description: `⚽ ${player} marca para ${away.shortName}`,
      })
      bumpRating("away", player, 1.2)
    }

    // Key chances (visualisation)
    if (rng() < homePerMin * 1.8 && events[events.length - 1]?.minute !== minute) {
      events.push({
        minute,
        type: "key_chance",
        team: "home",
        description: `Ocasión clara de ${home.shortName}`,
      })
    } else if (rng() < awayPerMin * 1.8 && events[events.length - 1]?.minute !== minute) {
      events.push({
        minute,
        type: "key_chance",
        team: "away",
        description: `Ocasión clara de ${away.shortName}`,
      })
    }

    // Cards
    if (rng() < cardChance(home, "yellow")) {
      const player = pickPlayer(rng, homeUsed, home.shortName)
      events.push({ minute, type: "yellow_card", team: "home", player, description: `🟨 Amarilla a ${player}` })
      bumpRating("home", player, -0.2)
    }
    if (rng() < cardChance(away, "yellow")) {
      const player = pickPlayer(rng, awayUsed, away.shortName)
      events.push({ minute, type: "yellow_card", team: "away", player, description: `🟨 Amarilla a ${player}` })
      bumpRating("away", player, -0.2)
    }
    if (rng() < cardChance(home, "red")) {
      const player = pickPlayer(rng, homeUsed, home.shortName)
      events.push({ minute, type: "red_card", team: "home", player, description: `🟥 Roja directa a ${player}` })
      bumpRating("home", player, -1.5)
    }

    // Injuries
    if (rng() < homeInjPerMin) {
      const player = pickPlayer(rng, homeUsed, home.shortName)
      const weeks = 1 + Math.floor(rng() * 5)
      events.push({ minute, type: "injury", team: "home", player, description: `🤕 ${player} se lesiona (${weeks}s)` })
      injured.push({ team: "home", player, weeks })
    }
    if (rng() < awayInjPerMin) {
      const player = pickPlayer(rng, awayUsed, away.shortName)
      const weeks = 1 + Math.floor(rng() * 5)
      events.push({ minute, type: "injury", team: "away", player, description: `🤕 ${player} se lesiona (${weeks}s)` })
      injured.push({ team: "away", player, weeks })
    }
  }

  // Fatigue added depends on tempo & pressing
  const tempoMult = (t: TacticInstructions) =>
    (t.tempo === "high" ? 1.4 : t.tempo === "low" ? 0.6 : 1) *
    (t.pressing === "high" ? 1.3 : t.pressing === "low" ? 0.8 : 1)
  const homeFatigueAdded = Math.round(10 * tempoMult(home.tactics) * (1 - home.staff.physical * 0.4))
  const awayFatigueAdded = Math.round(10 * tempoMult(away.tactics) * (1 - away.staff.physical * 0.4))

  // Sort events by minute for nicer timelines
  events.sort((a, b) => a.minute - b.minute)

  // Pick MVP based on player ratings
  let mvp: SimulationResult["mvp"] = { team: "home", player: `${home.shortName} 10`, rating: 6.8 }
  let topRating = 0
  for (const r of playerRatings.values()) {
    if (r.rating > topRating) {
      topRating = r.rating
      mvp = { team: r.team, player: r.player, rating: Number(r.rating.toFixed(1)) }
    }
  }

  return {
    homeScore,
    awayScore,
    events,
    homeRating: Number(homeR.attack.toFixed(1)),
    awayRating: Number(awayR.attack.toFixed(1)),
    homeXg: Number(homeXg.toFixed(2)),
    awayXg: Number(awayXg.toFixed(2)),
    mvp,
    fatigueAdded: { home: homeFatigueAdded, away: awayFatigueAdded },
    injuredPlayers: injured,
  }
}
