import {
  careerPhaseFromAge,
  moraleBandFromScore,
  POSITION_TO_GROUP,
  type Club,
  type ClubTactics,
  type Contract,
  type Formation,
  type FormationSlot,
  type GameSave,
  type IndividualInstructions,
  type League,
  type LeagueStanding,
  type ManagerType,
  type MarketListing,
  type Match,
  type Money,
  type Player,
  type PlayerAttributes,
  type PlayerPosition,
  type PositionGroup,
  type Season,
  type Transfer,
  type TransferOffer,
  type TransferStatus,
  type ValueTrend,
} from "@/lib/types"
import { formatGoalDifference, formatMoney } from "@/lib/format"

// ─── IDs ─────────────────────────────────────────────────────────────────────

export const IDS = {
  save: "save-demo-1",
  league: "league-metro-premier",
  season: "season-2025-26",
  userClub: "club-fc-metropolis",
  clubs: {
    metropolis: "club-fc-metropolis",
    northVale: "club-north-vale",
    riverside: "club-riverside",
    harbor: "club-harbor-city",
    summit: "club-summit",
    ironGate: "club-iron-gate",
    pacific: "club-pacific",
    capital: "club-capital",
    eastern: "club-eastern",
    coastal: "club-coastal",
  },
} as const

const NOW = "2025-12-10T12:00:00.000Z"
const SEASON_START = "2025-08-01"
const SEASON_END = "2026-05-31"

// ─── Formation presets (tactics UI) ──────────────────────────────────────────

export const FORMATION_PRESETS: Record<
  "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1" | "5-3-2",
  { positions: FormationSlot[] }
> = {
  "4-3-3": {
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LB", x: 15, y: 72 },
      { role: "CB", x: 38, y: 75 },
      { role: "CB", x: 62, y: 75 },
      { role: "RB", x: 85, y: 72 },
      { role: "CM", x: 30, y: 52 },
      { role: "CDM", x: 50, y: 56 },
      { role: "CM", x: 70, y: 52 },
      { role: "LW", x: 18, y: 28 },
      { role: "ST", x: 50, y: 22 },
      { role: "RW", x: 82, y: 28 },
    ],
  },
  "4-4-2": {
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LB", x: 15, y: 72 },
      { role: "CB", x: 38, y: 75 },
      { role: "CB", x: 62, y: 75 },
      { role: "RB", x: 85, y: 72 },
      { role: "LM", x: 15, y: 50 },
      { role: "CM", x: 38, y: 52 },
      { role: "CM", x: 62, y: 52 },
      { role: "RM", x: 85, y: 50 },
      { role: "ST", x: 38, y: 24 },
      { role: "ST", x: 62, y: 24 },
    ],
  },
  "3-5-2": {
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "CB", x: 25, y: 75 },
      { role: "CB", x: 50, y: 77 },
      { role: "CB", x: 75, y: 75 },
      { role: "LWB", x: 10, y: 52 },
      { role: "CM", x: 35, y: 55 },
      { role: "CDM", x: 50, y: 60 },
      { role: "CM", x: 65, y: 55 },
      { role: "RWB", x: 90, y: 52 },
      { role: "ST", x: 38, y: 24 },
      { role: "ST", x: 62, y: 24 },
    ],
  },
  "4-2-3-1": {
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LB", x: 15, y: 72 },
      { role: "CB", x: 38, y: 75 },
      { role: "CB", x: 62, y: 75 },
      { role: "RB", x: 85, y: 72 },
      { role: "CDM", x: 38, y: 58 },
      { role: "CDM", x: 62, y: 58 },
      { role: "LW", x: 18, y: 38 },
      { role: "CAM", x: 50, y: 38 },
      { role: "RW", x: 82, y: 38 },
      { role: "ST", x: 50, y: 20 },
    ],
  },
  "5-3-2": {
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LWB", x: 10, y: 68 },
      { role: "CB", x: 30, y: 76 },
      { role: "CB", x: 50, y: 78 },
      { role: "CB", x: 70, y: 76 },
      { role: "RWB", x: 90, y: 68 },
      { role: "CM", x: 30, y: 50 },
      { role: "CM", x: 50, y: 52 },
      { role: "CM", x: 70, y: 50 },
      { role: "ST", x: 38, y: 24 },
      { role: "ST", x: 62, y: 24 },
    ],
  },
}

// ─── Factories ───────────────────────────────────────────────────────────────

function d(ovr: number, offset: number): number {
  return Math.min(99, Math.max(1, ovr + offset))
}

function buildAttributes(ovr: number, group: PositionGroup): PlayerAttributes {
  const t = (o: number) => ({
    passing: d(ovr, o),
    dribbling: d(ovr, o - 1),
    shooting: d(ovr, o - 2),
    heading: d(ovr, o - 1),
    crossing: d(ovr, o),
    technique: d(ovr, o + 1),
  })
  const p = (o: number) => ({
    pace: d(ovr, o),
    stamina: d(ovr, o - 1),
    strength: d(ovr, o - 2),
    agility: d(ovr, o),
    acceleration: d(ovr, o + 1),
    jumping: d(ovr, o - 1),
  })
  const m = (o: number) => ({
    vision: d(ovr, o),
    aggression: d(ovr, o - 2),
    leadership: d(ovr, o - 1),
    concentration: d(ovr, o),
    decisions: d(ovr, o + 1),
    teamwork: d(ovr, o),
  })
  const gkBoost = group === "GK" ? 4 : -8
  const g = (o: number) => ({
    reflexes: d(ovr, o + gkBoost),
    positioning: d(ovr, o + gkBoost - 1),
    rushingOut: d(ovr, o + gkBoost - 2),
    distribution: d(ovr, o + gkBoost - 1),
    handling: d(ovr, o + gkBoost),
    aerialReach: d(ovr, o + gkBoost - 1),
  })
  const bias =
    group === "GK" ? 0 : group === "DEF" ? -1 : group === "MID" ? 1 : 2
  return {
    technical: t(bias),
    physical: p(bias - 1),
    mental: m(bias),
    goalkeeping: g(bias),
  }
}

type PlayerSeed = {
  id: string
  firstName: string
  lastName: string
  position: PlayerPosition
  ovr: number
  potential: number
  age: number
  nationality: string
  nationalityCode: string
  weeklyWage: Money
  marketValue: Money
  form?: number
  morale?: number
  fitness?: number
  fatigue?: number
  isCaptain?: boolean
  injured?: { type: string; weeks: number; description: string }
  goals?: number
  assists?: number
  appearances?: number
  trend?: ValueTrend
  foot?: "left" | "right" | "both"
}

function defaultInstructions(role: string): IndividualInstructions {
  return { role, pressingIntensity: 50, creativeFreedom: "medium" }
}

function createPlayer(
  seed: PlayerSeed,
  clubId: string,
  contractId: string,
  seasonId: string,
): Player {
  const group = POSITION_TO_GROUP[seed.position]
  const morale = seed.morale ?? 72
  const displayName = `${seed.firstName} ${seed.lastName}`
  const shortName = seed.lastName.length > 10 ? seed.lastName.slice(0, 8) : seed.lastName
  const trend = seed.trend ?? "stable"
  const injured = !!seed.injured

  return {
    id: seed.id,
    openFootballId: null,
    firstName: seed.firstName,
    lastName: seed.lastName,
    displayName,
    shortName,
    nationalityCode: seed.nationalityCode,
    nationality: seed.nationality,
    dateOfBirth: `${2025 - seed.age}-06-15`,
    age: seed.age,
    careerPhase: careerPhaseFromAge(seed.age),
    preferredFoot: seed.foot ?? "right",
    position: seed.position,
    positionGroup: group,
    attributes: buildAttributes(seed.ovr, group),
    overallRating: seed.ovr,
    potentialRating: seed.potential,
    potentialRevealedPercent: seed.age <= 21 ? 45 : 100,
    form: seed.form ?? seed.ovr - 2,
    morale,
    moraleBand: moraleBandFromScore(morale),
    moraleFactors: {
      minutesPlayedScore: 70,
      recentResultsScore: 65,
      coachRelationshipScore: 72,
      contractExpectationsScore: 60,
      randomEventsScore: 50,
    },
    fatigue: seed.fatigue ?? 25,
    fitness: seed.fitness ?? 90,
    marketValue: seed.marketValue,
    marketValueFactors: {
      baseValue: seed.marketValue,
      ageMultiplier: seed.age < 24 ? 1.15 : seed.age > 30 ? 0.85 : 1,
      formMultiplier: (seed.form ?? seed.ovr) / seed.ovr,
      wageMultiplier: 1,
      trend,
    },
    valueTrend: trend,
    clubId,
    contractId,
    isCaptain: seed.isCaptain ?? false,
    isInjured: injured,
    injury: injured
      ? {
          type: seed.injured!.type,
          severity: seed.injured!.weeks <= 2 ? "light" : "moderate",
          weeksOut: seed.injured!.weeks,
          description: seed.injured!.description,
          injuredAt: "2025-12-03",
          expectedReturnAt: "2025-12-24",
          potentialReduced: false,
        }
      : null,
    isAcademyPlayer: seed.age <= 19,
    seasonStats: {
      seasonId,
      appearances: seed.appearances ?? 8,
      starts: Math.max(0, (seed.appearances ?? 8) - 1),
      minutesPlayed: (seed.appearances ?? 8) * 78,
      goals: seed.goals ?? 0,
      assists: seed.assists ?? 0,
      cleanSheets: seed.position === "GK" ? 3 : 0,
      yellowCards: 1,
      redCards: 0,
      averageRating: seed.ovr - 1,
      manOfTheMatch: seed.ovr >= 86 ? 2 : 0,
    },
    individualInstructions: defaultInstructions(seed.position),
    customImagePath: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function createContract(
  id: string,
  playerId: string,
  clubId: string,
  weeklyWage: Money,
  years: number,
  shirtNumber: number | null,
): Contract {
  return {
    id,
    playerId,
    clubId,
    status: "active",
    weeklyWage,
    signingBonus: weeklyWage * 8,
    releaseClause: weeklyWage * 52 * 3,
    sellOnClausePercent: null,
    startDate: "2024-07-01",
    endDate: `${2024 + years}-06-30`,
    lengthYears: years,
    shirtNumber,
    goalBonus: 5_000,
    cleanSheetBonus: 3_000,
    appearanceBonus: 2_000,
    promisedRole: shirtNumber && shirtNumber <= 11 ? "starter" : "rotation",
    isLoan: false,
    loanFromClubId: null,
    buyOptionFee: null,
    buyOptionDeadline: null,
    coOwnershipPercent: null,
    renewedFromContractId: null,
    signedAt: "2024-07-01",
  }
}

// ─── Squad seeds (23) ────────────────────────────────────────────────────────

const METROPOLIS_SQUAD_SEEDS: PlayerSeed[] = [
  { id: "player-metro-01", firstName: "Erik", lastName: "Stenberg", position: "GK", ovr: 82, potential: 84, age: 29, nationality: "Sweden", nationalityCode: "SE", weeklyWage: 85_000, marketValue: 4_200_000, fitness: 98 },
  { id: "player-metro-02", firstName: "Diego", lastName: "Morales", position: "CB", ovr: 85, potential: 87, age: 27, nationality: "Spain", nationalityCode: "ES", weeklyWage: 165_000, marketValue: 18_500_000, isCaptain: true, goals: 2, assists: 1 },
  { id: "player-metro-03", firstName: "Kenji", lastName: "Tanaka", position: "CB", ovr: 81, potential: 86, age: 24, nationality: "Japan", nationalityCode: "JP", weeklyWage: 120_000, marketValue: 12_000_000, goals: 1 },
  { id: "player-metro-04", firstName: "Luke", lastName: "Ashford", position: "LB", ovr: 79, potential: 82, age: 26, nationality: "England", nationalityCode: "GB", weeklyWage: 95_000, marketValue: 8_500_000, morale: 55, assists: 5 },
  { id: "player-metro-05", firstName: "Romain", lastName: "Deschamps", position: "RB", ovr: 80, potential: 83, age: 25, nationality: "France", nationalityCode: "FR", weeklyWage: 110_000, marketValue: 10_000_000, goals: 1, assists: 7 },
  { id: "player-metro-06", firstName: "Liam", lastName: "O'Brien", position: "CDM", ovr: 83, potential: 85, age: 28, nationality: "Ireland", nationalityCode: "IE", weeklyWage: 130_000, marketValue: 14_000_000, goals: 3, assists: 4 },
  { id: "player-metro-07", firstName: "Marco", lastName: "Fiori", position: "CM", ovr: 86, potential: 89, age: 26, nationality: "Italy", nationalityCode: "IT", weeklyWage: 185_000, marketValue: 24_000_000, goals: 5, assists: 8, trend: "rising" },
  { id: "player-metro-08", firstName: "Andre", lastName: "Kovacs", position: "CAM", ovr: 88, potential: 92, age: 24, nationality: "Brazil", nationalityCode: "BR", weeklyWage: 220_000, marketValue: 35_000_000, goals: 8, assists: 12, trend: "rising" },
  { id: "player-metro-09", firstName: "Samuel", lastName: "Okafor", position: "LW", ovr: 84, potential: 88, age: 23, nationality: "Nigeria", nationalityCode: "NG", weeklyWage: 175_000, marketValue: 20_000_000, goals: 9, assists: 4 },
  { id: "player-metro-10", firstName: "Ivan", lastName: "Petrov", position: "RW", ovr: 82, potential: 84, age: 27, nationality: "Bulgaria", nationalityCode: "BG", weeklyWage: 140_000, marketValue: 15_000_000, morale: 52, goals: 6, assists: 5 },
  { id: "player-metro-11", firstName: "Thomas", lastName: "Richter", position: "ST", ovr: 89, potential: 91, age: 25, nationality: "Germany", nationalityCode: "DE", weeklyWage: 265_000, marketValue: 42_000_000, goals: 14, assists: 3, trend: "rising" },
  { id: "player-metro-12", firstName: "Ryan", lastName: "Palmer", position: "CM", ovr: 77, potential: 84, age: 22, nationality: "USA", nationalityCode: "US", weeklyWage: 75_000, marketValue: 6_000_000, fitness: 80, morale: 58, goals: 1, assists: 2, injured: { type: "Hamstring", weeks: 2, description: "Hamstring - 2 weeks" } },
  { id: "player-metro-13", firstName: "Oscar", lastName: "Lindqvist", position: "ST", ovr: 75, potential: 86, age: 20, nationality: "Sweden", nationalityCode: "SE", weeklyWage: 45_000, marketValue: 4_500_000, morale: 32, fitness: 82, goals: 2, assists: 1 },
  { id: "player-metro-14", firstName: "Noel", lastName: "Weiss", position: "GK", ovr: 74, potential: 78, age: 30, nationality: "Germany", nationalityCode: "DE", weeklyWage: 35_000, marketValue: 2_500_000 },
  { id: "player-metro-15", firstName: "Marcus", lastName: "Okonkwo", position: "CB", ovr: 76, potential: 83, age: 23, nationality: "Nigeria", nationalityCode: "NG", weeklyWage: 70_000, marketValue: 7_500_000 },
  { id: "player-metro-16", firstName: "Henrik", lastName: "Müller", position: "LB", ovr: 75, potential: 80, age: 24, nationality: "Germany", nationalityCode: "DE", weeklyWage: 65_000, marketValue: 6_800_000 },
  { id: "player-metro-17", firstName: "Thiago", lastName: "Costa", position: "RB", ovr: 78, potential: 82, age: 26, nationality: "Brazil", nationalityCode: "BR", weeklyWage: 88_000, marketValue: 9_200_000 },
  { id: "player-metro-18", firstName: "Jonas", lastName: "Anderson", position: "CDM", ovr: 80, potential: 84, age: 27, nationality: "Norway", nationalityCode: "NO", weeklyWage: 105_000, marketValue: 11_500_000 },
  { id: "player-metro-19", firstName: "Felipe", lastName: "Martins", position: "CAM", ovr: 81, potential: 86, age: 25, nationality: "Portugal", nationalityCode: "PT", weeklyWage: 125_000, marketValue: 13_000_000 },
  { id: "player-metro-20", firstName: "Leo", lastName: "Kim", position: "RM", ovr: 77, potential: 85, age: 22, nationality: "South Korea", nationalityCode: "KR", weeklyWage: 72_000, marketValue: 8_000_000 },
  { id: "player-metro-21", firstName: "Pedro", lastName: "Santos", position: "ST", ovr: 78, potential: 82, age: 24, nationality: "Portugal", nationalityCode: "PT", weeklyWage: 98_000, marketValue: 10_500_000, goals: 4, assists: 2 },
  { id: "player-metro-22", firstName: "Yuki", lastName: "Nakamura", position: "CM", ovr: 74, potential: 82, age: 21, nationality: "Japan", nationalityCode: "JP", weeklyWage: 48_000, marketValue: 5_200_000 },
  { id: "player-metro-23", firstName: "Antoine", lastName: "Dubois", position: "CB", ovr: 73, potential: 88, age: 19, nationality: "France", nationalityCode: "FR", weeklyWage: 22_000, marketValue: 3_800_000 },
]

const MARKET_PLAYER_SEEDS: (PlayerSeed & { clubId: string })[] = [
  { id: "player-mkt-01", firstName: "Marcus", lastName: "Silva", position: "ST", ovr: 84, potential: 88, age: 24, nationality: "Brazil", nationalityCode: "BR", weeklyWage: 85_000, marketValue: 12_500_000, clubId: IDS.clubs.pacific, trend: "rising" },
  { id: "player-mkt-02", firstName: "James", lastName: "Chen", position: "CM", ovr: 87, potential: 90, age: 25, nationality: "China", nationalityCode: "CN", weeklyWage: 120_000, marketValue: 28_000_000, clubId: IDS.clubs.capital, trend: "rising" },
  { id: "player-mkt-03", firstName: "Pierre", lastName: "Dubois", position: "CB", ovr: 83, potential: 87, age: 22, nationality: "France", nationalityCode: "FR", weeklyWage: 65_000, marketValue: 15_000_000, clubId: IDS.clubs.harbor, trend: "rising" },
  { id: "player-mkt-04", firstName: "Johan", lastName: "Berg", position: "GK", ovr: 80, potential: 83, age: 28, nationality: "Norway", nationalityCode: "NO", weeklyWage: 45_000, marketValue: 6_500_000, clubId: IDS.clubs.northVale, trend: "stable" },
  { id: "player-mkt-05", firstName: "Rafael", lastName: "Torres", position: "LW", ovr: 85, potential: 88, age: 23, nationality: "Argentina", nationalityCode: "AR", weeklyWage: 95_000, marketValue: 22_000_000, clubId: IDS.clubs.eastern, trend: "rising" },
  { id: "player-mkt-06", firstName: "Kim", lastName: "Min-Jun", position: "CDM", ovr: 81, potential: 85, age: 26, nationality: "South Korea", nationalityCode: "KR", weeklyWage: 55_000, marketValue: 10_000_000, clubId: IDS.clubs.riverside, trend: "stable" },
  { id: "player-mkt-07", firstName: "Aleksandar", lastName: "Ivic", position: "RB", ovr: 79, potential: 82, age: 24, nationality: "Serbia", nationalityCode: "RS", weeklyWage: 42_000, marketValue: 8_000_000, clubId: IDS.clubs.ironGate, trend: "falling" },
  { id: "player-mkt-08", firstName: "Carlos", lastName: "Mendez", position: "CAM", ovr: 86, potential: 89, age: 27, nationality: "Colombia", nationalityCode: "CO", weeklyWage: 110_000, marketValue: 25_000_000, clubId: IDS.clubs.coastal, trend: "stable" },
]

// ─── Build game save ─────────────────────────────────────────────────────────

function buildMetropolisTactics(lineupPlayerIds: string[]): ClubTactics {
  const slots = FORMATION_PRESETS["4-3-3"].positions
  return {
    formation: "4-3-3",
    formationSlots: slots,
    lineup: slots.map((slot, i) => ({
      slotIndex: i,
      playerId: lineupPlayerIds[i] ?? lineupPlayerIds[0],
      role: slot.role,
      x: slot.x,
      y: slot.y,
      instructions: defaultInstructions(slot.role),
    })),
    playStyle: "Balanced",
    attackStyle: "Possession-based build-up",
    defenseStyle: "High press",
    tempo: "Normal",
    width: "Normal",
    pressing: 68,
    intensity: 72,
  }
}

const SEEDED_MATCH_RESULTS: Record<
  string,
  Pick<Match, "homeScore" | "awayScore" | "attendance" | "playedAt" | "status" | "minute">
> = {
  "8:club-fc-metropolis:club-pacific": { status: "finished", homeScore: 3, awayScore: 1, minute: 90, attendance: 38_200, playedAt: "2025-11-24T17:00:00.000Z" },
  "8:club-capital:club-harbor-city": { status: "finished", homeScore: 2, awayScore: 0, minute: 90, attendance: 31_500, playedAt: "2025-11-23T19:00:00.000Z" },
  "8:club-north-vale:club-riverside": { status: "finished", homeScore: 1, awayScore: 1, minute: 90, attendance: 22_100, playedAt: "2025-11-23T17:00:00.000Z" },
  "8:club-summit:club-iron-gate": { status: "finished", homeScore: 0, awayScore: 2, minute: 90, attendance: 18_400, playedAt: "2025-11-22T17:00:00.000Z" },
  "8:club-eastern:club-coastal": { status: "finished", homeScore: 3, awayScore: 2, minute: 90, attendance: 19_800, playedAt: "2025-11-22T19:00:00.000Z" },
}

function seededResultFor(matchday: number, homeClubId: string, awayClubId: string) {
  return SEEDED_MATCH_RESULTS[`${matchday}:${homeClubId}:${awayClubId}`]
}

function deterministicHistoricalScore(matchday: number, slot: number): { homeScore: number; awayScore: number } {
  return {
    homeScore: (matchday + slot) % 4,
    awayScore: (matchday * 2 + slot) % 3,
  }
}

function buildRoundRobinPairings(clubIds: string[]): { homeClubId: string; awayClubId: string }[][] {
  const teams = [...clubIds]
  if (teams.length % 2 !== 0) teams.push("__bye__")

  const rounds: { homeClubId: string; awayClubId: string }[][] = []
  const lastIndex = teams.length - 1

  for (let round = 0; round < lastIndex; round += 1) {
    const pairings: { homeClubId: string; awayClubId: string }[] = []

    for (let i = 0; i < teams.length / 2; i += 1) {
      const left = teams[i]
      const right = teams[lastIndex - i]
      if (left === "__bye__" || right === "__bye__") continue

      const shouldSwapHome = round % 2 === 0
      pairings.push({
        homeClubId: shouldSwapHome ? right : left,
        awayClubId: shouldSwapHome ? left : right,
      })
    }

    rounds.push(pairings)
    teams.splice(1, 0, teams.pop()!)
  }

  return [
    ...rounds,
    ...rounds.map((round) =>
      round.map((match) => ({
        homeClubId: match.awayClubId,
        awayClubId: match.homeClubId,
      })),
    ),
  ]
}

function orderedCalendarClubIds(clubIds: string[]): string[] {
  const preferredOrder = [
    IDS.clubs.metropolis,
    IDS.clubs.harbor,
    IDS.clubs.pacific,
    IDS.clubs.capital,
    IDS.clubs.northVale,
    IDS.clubs.summit,
    IDS.clubs.eastern,
    IDS.clubs.coastal,
    IDS.clubs.ironGate,
    IDS.clubs.riverside,
  ]

  return preferredOrder.every((clubId) => clubIds.includes(clubId)) ? preferredOrder : clubIds
}

function createSeasonMatch(
  seasonId: string,
  leagueId: string,
  matchday: number,
  slot: number,
  homeClubId: string,
  awayClubId: string,
  currentMatchday: number,
): Match {
  const seeded = seededResultFor(matchday, homeClubId, awayClubId)
  const isHistorical = matchday < currentMatchday || Boolean(seeded)
  const score = seeded ?? (isHistorical ? deterministicHistoricalScore(matchday, slot) : null)
  const scheduledAt = new Date(Date.UTC(2025, 7 + matchday, 7 + slot, 15, 0, 0)).toISOString()

  return {
    id: `match-md${matchday}-${slot + 1}`,
    seasonId,
    leagueId,
    matchday,
    homeClubId,
    awayClubId,
    scheduledAt,
    status: seeded?.status ?? (isHistorical ? "finished" : "scheduled"),
    homeScore: score?.homeScore ?? null,
    awayScore: score?.awayScore ?? null,
    events: [],
    homeStats: null,
    awayStats: null,
    homeAdvantageApplied: true,
    simulationMode: "summary",
    minute: seeded?.minute ?? (isHistorical ? 90 : null),
    attendance: seeded?.attendance ?? (isHistorical ? 16_000 + matchday * 900 + slot * 450 : null),
    playedAt: seeded?.playedAt ?? (isHistorical ? scheduledAt : null),
    createdAt: NOW,
  }
}

function hasCompleteSeasonCalendar(save: GameSave): boolean {
  const league = save.leagues[0]
  const season = save.seasons.find((item) => item.id === save.currentSeasonId)
  if (!league || !season) return true

  const expectedMatchesPerRound = league.clubIds.length / 2
  return Array.from({ length: season.totalMatchdays }, (_, index) => index + 1).every(
    (matchday) =>
      save.matches.filter((match) => match.seasonId === season.id && match.matchday === matchday).length ===
      expectedMatchesPerRound,
  )
}

export function ensureFullSeasonCalendar(save: GameSave): GameSave {
  if (hasCompleteSeasonCalendar(save)) return save

  const league = save.leagues[0]
  const season = save.seasons.find((item) => item.id === save.currentSeasonId)
  if (!league || !season) return save

  const generatedMatches = buildRoundRobinPairings(orderedCalendarClubIds(league.clubIds))
    .slice(0, season.totalMatchdays)
    .flatMap((round, roundIndex) =>
      round.map((pairing, slot) =>
        createSeasonMatch(
          season.id,
          league.id,
          roundIndex + 1,
          slot,
          pairing.homeClubId,
          pairing.awayClubId,
          save.currentMatchday,
        ),
      ),
    )

  const existingByFixture = new Map(
    save.matches.map((match) => [`${match.matchday}:${match.homeClubId}:${match.awayClubId}`, match]),
  )

  const matches = generatedMatches.map((match) => {
    const existing = existingByFixture.get(`${match.matchday}:${match.homeClubId}:${match.awayClubId}`)
    return existing ? { ...match, ...existing, id: match.id } : match
  })
  const matchIds = matches.filter((match) => match.seasonId === season.id).map((match) => match.id)

  return {
    ...save,
    matches,
    seasons: save.seasons.map((item) => (item.id === season.id ? { ...item, matchIds } : item)),
    updatedAt: NOW,
  }
}

function buildGameSave(): GameSave {
  const seasonId = IDS.season
  const lineupIds = [
    "player-metro-01",
    "player-metro-04",
    "player-metro-02",
    "player-metro-03",
    "player-metro-05",
    "player-metro-06",
    "player-metro-07",
    "player-metro-08",
    "player-metro-09",
    "player-metro-11",
    "player-metro-10",
  ]

  const contracts: Contract[] = []
  const metropolisPlayers = METROPOLIS_SQUAD_SEEDS.map((seed, i) => {
    const contractId = `contract-metro-${String(i + 1).padStart(2, "0")}`
    contracts.push(
      createContract(contractId, seed.id, IDS.userClub, seed.weeklyWage, seed.age <= 22 ? 3 : 4, i < 11 ? i + 1 : null),
    )
    return createPlayer(seed, IDS.userClub, contractId, seasonId)
  })

  const marketContracts: Contract[] = []
  const marketPlayers = MARKET_PLAYER_SEEDS.map((seed, i) => {
    const contractId = `contract-mkt-${String(i + 1).padStart(2, "0")}`
    marketContracts.push(createContract(contractId, seed.id, seed.clubId, seed.weeklyWage, 4, null))
    return createPlayer(seed, seed.clubId, contractId, seasonId)
  })

  const players = [...metropolisPlayers, ...marketPlayers]
  const allContracts = [...contracts, ...marketContracts]

  const clubDefs: {
    id: string
    name: string
    shortName: string
    managerName: string
    managerType: ManagerType
    isUser: boolean
    reputation: number
  }[] = [
    { id: IDS.clubs.metropolis, name: "FC Metropolis", shortName: "FCM", managerName: "You", managerType: "human", isUser: true, reputation: 78 },
    { id: IDS.clubs.capital, name: "Capital Dynamo", shortName: "CDY", managerName: "IA Elite", managerType: "ai", isUser: false, reputation: 76 },
    { id: IDS.clubs.harbor, name: "Harbor City FC", shortName: "HCF", managerName: "S. Blake", managerType: "human", isUser: false, reputation: 74 },
    { id: IDS.clubs.northVale, name: "North Vale United", shortName: "NVU", managerName: "IA Standard", managerType: "ai", isUser: false, reputation: 70 },
    { id: IDS.clubs.pacific, name: "Pacific Rovers", shortName: "PFR", managerName: "M. Santos", managerType: "human", isUser: false, reputation: 72 },
    { id: IDS.clubs.riverside, name: "Riverside Athletic", shortName: "RIV", managerName: "IA Standard", managerType: "ai", isUser: false, reputation: 68 },
    { id: IDS.clubs.summit, name: "Summit Wanderers", shortName: "SUM", managerName: "IA Low", managerType: "ai", isUser: false, reputation: 62 },
    { id: IDS.clubs.ironGate, name: "Iron Gate FC", shortName: "IRG", managerName: "IA Standard", managerType: "ai", isUser: false, reputation: 66 },
    { id: IDS.clubs.eastern, name: "Eastern Phoenix", shortName: "EPH", managerName: "IA Low", managerType: "ai", isUser: false, reputation: 64 },
    { id: IDS.clubs.coastal, name: "Coastal Rangers", shortName: "CSR", managerName: "IA Low", managerType: "ai", isUser: false, reputation: 60 },
  ]

  const clubs: Club[] = clubDefs.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    leagueId: IDS.league,
    stadium: {
      name: c.isUser ? "Metropolis Arena" : `${c.shortName} Stadium`,
      capacity: c.isUser ? 42_500 : 28_000,
      level: c.isUser ? 4 : 2,
      builtYear: c.isUser ? 2018 : 2005,
    },
    foundedYear: c.isUser ? 1924 : 1950,
    managerId: `manager-${c.id}`,
    managerName: c.managerName,
    managerType: c.managerType,
    isUserControlled: c.isUser,
    reputation: c.reputation,
    colors: c.isUser
      ? { primary: "#F2B42D", secondary: "#1a1a1a", accent: "#48A8E2" }
      : { primary: "#48A8E2", secondary: "#0f172a" },
    badgeUrl: null,
    customBadgePath: null,
    finances: c.isUser
      ? {
          balance: 68_000_000,
          transferBudget: 42_500_000,
          wageBillPercent: 62,
          weeklyWageBill: 820_000,
          weeklyWageRoom: 180_000,
          longTermDebt: 12_000_000,
          monthlyProjectedIncome: 4_250_000,
          monthlyProjectedExpenses: 3_150_000,
          incomeBreakdown: {
            tickets: 980_000,
            tvRights: 1_450_000,
            sponsors: 1_120_000,
            playerSales: 400_000,
            europeanPrizes: 0,
            aiSubsidy: 300_000,
          },
          wageCapPenalty: "none",
          fairPlayEnabled: true,
        }
      : {
          balance: 25_000_000,
          transferBudget: 15_000_000,
          wageBillPercent: 58,
          weeklyWageBill: 420_000,
          weeklyWageRoom: 80_000,
          longTermDebt: 5_000_000,
          monthlyProjectedIncome: 2_100_000,
          monthlyProjectedExpenses: 1_800_000,
          incomeBreakdown: {
            tickets: 520_000,
            tvRights: 800_000,
            sponsors: 600_000,
            playerSales: 0,
            europeanPrizes: 0,
            aiSubsidy: 180_000,
          },
          wageCapPenalty: "none",
          fairPlayEnabled: false,
        },
    facilities: [
      { type: "training_ground", level: c.isUser ? 3 : 2, upgradingUntil: null, effectSummary: "General training performance" },
      { type: "youth_academy", level: c.isUser ? 2 : 1, upgradingUntil: null, effectSummary: "Youth intake quality" },
      { type: "stadium", level: c.isUser ? 4 : 2, upgradingUntil: null, effectSummary: "Matchday ticket revenue" },
      { type: "medical_center", level: c.isUser ? 3 : 2, upgradingUntil: null, effectSummary: "Injury recovery speed" },
      { type: "scouting", level: c.isUser ? 2 : 1, upgradingUntil: null, effectSummary: "Scouting network reach" },
    ],
    staff: [
      { id: `staff-${c.id}-1`, name: "Alex Turner", role: "head_coach", rating: 78, experience: 12, trainingBonus: 1.08, weeklyWage: 25_000, hiredAt: "2024-07-01" },
      { id: `staff-${c.id}-2`, name: "Maria Costa", role: "fitness_coach", rating: 74, experience: 8, trainingBonus: 1.05, weeklyWage: 12_000, hiredAt: "2024-07-01" },
    ],
    tactics: c.isUser ? buildMetropolisTactics(lineupIds) : buildMetropolisTactics([]),
    currentTrainingPlan: null,
    squadPlayerIds: c.isUser ? metropolisPlayers.map((p) => p.id) : [],
    youthProspects: c.isUser
      ? [
          {
            id: "prospect-metro-1",
            generatedName: "Luca Ferreira",
            age: 17,
            position: "CAM",
            positionGroup: "MID",
            potentialHidden: true,
            revealedPotential: null,
            overallRating: 68,
            academyCategory: "u18",
            weeksInAcademy: 24,
          },
        ]
      : [],
    sponsorDeals: c.isUser
      ? [
          {
            id: "sponsor-metro-1",
            sponsorName: "MetroTech",
            weeklyIncome: 185_000,
            durationWeeks: 52,
            objectiveBonuses: [{ objective: "Top 3 finish", bonus: 2_000_000 }],
            signedAt: "2025-07-01",
            expiresAt: "2026-06-30",
          },
        ]
      : [],
    squadMorale: c.isUser ? 78 : 65,
    tacticalCohesion: c.isUser ? 82 : 70,
    createdAt: NOW,
    updatedAt: NOW,
  }))

  const league: League = {
    id: IDS.league,
    name: "Metro Premier Cooperative",
    shortName: "MPC",
    country: "International",
    countryCode: "INT",
    tier: 1,
    rules: {
      teamsCount: 10,
      matchdays: 18,
      pointsForWin: 3,
      pointsForDraw: 1,
      promotionSpots: 0,
      relegationSpots: 2,
      championsLeagueSpots: 2,
      europaLeagueSpots: 1,
      conferenceLeagueSpots: 1,
    },
    cooperativeSettings: {
      maxHumanManagers: 10,
      turnWindowHours: 48,
      privacy: "private",
      inviteCode: "METRO26",
      commissionerClubId: IDS.clubs.harbor,
      marketRules: {
        salaryCap: null,
        minPlayerAge: null,
        maxPlayerAge: null,
        localPlayerQuotaPercent: null,
        transferDeadlineMatchday: 16,
      },
      format: {
        totalMatchdays: 18,
        playoffSpots: 0,
        relegationSpots: 2,
        promotionSpots: 0,
      },
      fairPlayFinancial: true,
    },
    clubIds: clubDefs.map((c) => c.id),
    humanManagerIds: ["manager-club-fc-metropolis", "manager-club-harbor-city", "manager-club-pacific"],
    currentSeasonId: seasonId,
    isCooperative: true,
    createdAt: NOW,
  }

  const season: Season = {
    id: seasonId,
    leagueId: IDS.league,
    name: "2025/26",
    startDate: SEASON_START,
    endDate: SEASON_END,
    status: "in_progress",
    currentMatchday: 8,
    totalMatchdays: 18,
    transferWindows: [
      { name: "Summer", opensAt: "2025-06-01", closesAt: "2025-09-01", isOpen: false },
      { name: "Winter", opensAt: "2026-01-01", closesAt: "2026-02-01", isOpen: true },
    ],
    matchIds: ["match-md8-1", "match-md8-2", "match-md9-1"],
    championClubId: null,
    archivedAt: null,
    createdAt: NOW,
  }

  const standings: LeagueStanding[] = [
    { clubId: IDS.clubs.capital, seasonId, position: 1, played: 8, won: 6, drawn: 1, lost: 1, goalsFor: 20, goalsAgainst: 8, goalDifference: 12, points: 19, form: ["W", "W", "D", "W", "W"], positionChange: "same", zone: "champions", isUserClub: false },
    { clubId: IDS.userClub, seasonId, position: 2, played: 8, won: 5, drawn: 2, lost: 1, goalsFor: 18, goalsAgainst: 9, goalDifference: 9, points: 17, form: ["W", "D", "W", "W", "L"], positionChange: "up", zone: "champions", isUserClub: true },
    { clubId: IDS.clubs.harbor, seasonId, position: 3, played: 8, won: 5, drawn: 1, lost: 2, goalsFor: 16, goalsAgainst: 10, goalDifference: 6, points: 16, form: ["W", "W", "L", "W", "D"], positionChange: "down", zone: "champions", isUserClub: false },
    { clubId: IDS.clubs.northVale, seasonId, position: 4, played: 8, won: 4, drawn: 2, lost: 2, goalsFor: 14, goalsAgainst: 11, goalDifference: 3, points: 14, form: ["D", "W", "W", "L", "W"], positionChange: "up", zone: "europa", isUserClub: false },
    { clubId: IDS.clubs.pacific, seasonId, position: 5, played: 8, won: 4, drawn: 1, lost: 3, goalsFor: 15, goalsAgainst: 14, goalDifference: 1, points: 13, form: ["L", "W", "W", "D", "W"], positionChange: "down", zone: null, isUserClub: false },
    { clubId: IDS.clubs.riverside, seasonId, position: 6, played: 8, won: 3, drawn: 2, lost: 3, goalsFor: 12, goalsAgainst: 13, goalDifference: -1, points: 11, form: ["W", "L", "D", "W", "L"], positionChange: "same", zone: null, isUserClub: false },
    { clubId: IDS.clubs.summit, seasonId, position: 7, played: 8, won: 2, drawn: 2, lost: 4, goalsFor: 9, goalsAgainst: 16, goalDifference: -7, points: 8, form: ["L", "D", "L", "W", "L"], positionChange: "down", zone: null, isUserClub: false },
    { clubId: IDS.clubs.ironGate, seasonId, position: 8, played: 8, won: 2, drawn: 2, lost: 4, goalsFor: 10, goalsAgainst: 15, goalDifference: -5, points: 8, form: ["L", "W", "D", "L", "D"], positionChange: "same", zone: null, isUserClub: false },
    { clubId: IDS.clubs.eastern, seasonId, position: 9, played: 8, won: 1, drawn: 3, lost: 4, goalsFor: 8, goalsAgainst: 14, goalDifference: -6, points: 6, form: ["D", "L", "L", "D", "W"], positionChange: "down", zone: "relegation", isUserClub: false },
    { clubId: IDS.clubs.coastal, seasonId, position: 10, played: 8, won: 1, drawn: 2, lost: 5, goalsFor: 7, goalsAgainst: 18, goalDifference: -11, points: 5, form: ["L", "L", "D", "L", "L"], positionChange: "down", zone: "relegation", isUserClub: false },
  ]

  const matches: Match[] = [
    {
      id: "match-md8-1",
      seasonId,
      leagueId: IDS.league,
      matchday: 8,
      homeClubId: IDS.userClub,
      awayClubId: IDS.clubs.pacific,
      scheduledAt: "2025-11-24T15:00:00.000Z",
      status: "finished",
      homeScore: 3,
      awayScore: 1,
      events: [],
      homeStats: null,
      awayStats: null,
      homeAdvantageApplied: true,
      simulationMode: "summary",
      minute: 90,
      attendance: 38_200,
      playedAt: "2025-11-24T17:00:00.000Z",
      createdAt: NOW,
    },
    {
      id: "match-md8-2",
      seasonId,
      leagueId: IDS.league,
      matchday: 8,
      homeClubId: IDS.clubs.capital,
      awayClubId: IDS.clubs.harbor,
      scheduledAt: "2025-11-23T17:00:00.000Z",
      status: "finished",
      homeScore: 2,
      awayScore: 0,
      events: [],
      homeStats: null,
      awayStats: null,
      homeAdvantageApplied: true,
      simulationMode: "summary",
      minute: 90,
      attendance: 31_500,
      playedAt: "2025-11-23T19:00:00.000Z",
      createdAt: NOW,
    },
    {
      id: "match-md8-3",
      seasonId,
      leagueId: IDS.league,
      matchday: 8,
      homeClubId: IDS.clubs.northVale,
      awayClubId: IDS.clubs.riverside,
      scheduledAt: "2025-11-23T15:00:00.000Z",
      status: "finished",
      homeScore: 1,
      awayScore: 1,
      events: [],
      homeStats: null,
      awayStats: null,
      homeAdvantageApplied: true,
      simulationMode: "summary",
      minute: 90,
      attendance: 22_100,
      playedAt: "2025-11-23T17:00:00.000Z",
      createdAt: NOW,
    },
    {
      id: "match-md8-4",
      seasonId,
      leagueId: IDS.league,
      matchday: 8,
      homeClubId: IDS.clubs.summit,
      awayClubId: IDS.clubs.ironGate,
      scheduledAt: "2025-11-22T15:00:00.000Z",
      status: "finished",
      homeScore: 0,
      awayScore: 2,
      events: [],
      homeStats: null,
      awayStats: null,
      homeAdvantageApplied: true,
      simulationMode: "summary",
      minute: 90,
      attendance: 18_400,
      playedAt: "2025-11-22T17:00:00.000Z",
      createdAt: NOW,
    },
    {
      id: "match-md8-5",
      seasonId,
      leagueId: IDS.league,
      matchday: 8,
      homeClubId: IDS.clubs.eastern,
      awayClubId: IDS.clubs.coastal,
      scheduledAt: "2025-11-22T17:00:00.000Z",
      status: "finished",
      homeScore: 3,
      awayScore: 2,
      events: [],
      homeStats: null,
      awayStats: null,
      homeAdvantageApplied: true,
      simulationMode: "summary",
      minute: 90,
      attendance: 19_800,
      playedAt: "2025-11-22T19:00:00.000Z",
      createdAt: NOW,
    },
    {
      id: "match-md9-1",
      seasonId,
      leagueId: IDS.league,
      matchday: 9,
      homeClubId: IDS.clubs.harbor,
      awayClubId: IDS.userClub,
      scheduledAt: "2025-12-15T15:00:00.000Z",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      events: [],
      homeStats: null,
      awayStats: null,
      homeAdvantageApplied: true,
      simulationMode: "summary",
      minute: null,
      attendance: null,
      playedAt: null,
      createdAt: NOW,
    },
  ]

  const transfers: Transfer[] = [
    {
      id: "transfer-pending-01",
      playerId: "player-metro-08",
      fromClubId: IDS.userClub,
      toClubId: IDS.clubs.pacific,
      initiatedByClubId: IDS.clubs.pacific,
      type: "permanent",
      direction: "outgoing",
      status: "pending",
      terms: {
        fee: 38_000_000,
        offeredWeeklyWage: 240_000,
        contractLengthYears: 5,
        releaseClause: null,
        sellOnClausePercent: 15,
        buyOptionFee: null,
        buyOptionDeadline: null,
        coOwnershipPercent: null,
        futureProfitSharePercent: null,
        swapPlayerIds: [],
      },
      negotiationDeadlineAt: "2025-12-12T12:00:00.000Z",
      counterOfferCount: 0,
      parentTransferId: null,
      isHot: true,
      isWatchlisted: false,
      leagueId: IDS.league,
      notes: "Pacific Rovers want Andre Kovacs",
      createdAt: "2025-12-09T10:00:00.000Z",
      updatedAt: NOW,
      completedAt: null,
      resultingContractId: null,
    },
    {
      id: "transfer-pending-03",
      playerId: "player-mkt-06",
      fromClubId: IDS.clubs.riverside,
      toClubId: IDS.userClub,
      initiatedByClubId: IDS.userClub,
      type: "permanent",
      direction: "incoming",
      status: "pending",
      terms: {
        fee: 9_000_000,
        offeredWeeklyWage: 58_000,
        contractLengthYears: 4,
        releaseClause: null,
        sellOnClausePercent: null,
        buyOptionFee: null,
        buyOptionDeadline: null,
        coOwnershipPercent: null,
        futureProfitSharePercent: null,
        swapPlayerIds: [],
      },
      negotiationDeadlineAt: "2025-12-13T12:00:00.000Z",
      counterOfferCount: 0,
      parentTransferId: null,
      isHot: false,
      isWatchlisted: true,
      leagueId: IDS.league,
      notes: null,
      createdAt: "2025-12-09T08:00:00.000Z",
      updatedAt: NOW,
      completedAt: null,
      resultingContractId: null,
    },
    {
      id: "transfer-pending-04",
      playerId: "player-mkt-01",
      fromClubId: IDS.clubs.pacific,
      toClubId: IDS.userClub,
      initiatedByClubId: IDS.userClub,
      type: "permanent",
      direction: "incoming",
      status: "rejected",
      terms: {
        fee: 12_500_000,
        offeredWeeklyWage: 90_000,
        contractLengthYears: 5,
        releaseClause: null,
        sellOnClausePercent: null,
        buyOptionFee: null,
        buyOptionDeadline: null,
        coOwnershipPercent: null,
        futureProfitSharePercent: null,
        swapPlayerIds: [],
      },
      negotiationDeadlineAt: "2025-12-08T12:00:00.000Z",
      counterOfferCount: 0,
      parentTransferId: null,
      isHot: true,
      isWatchlisted: false,
      leagueId: IDS.league,
      notes: null,
      createdAt: "2025-12-07T10:00:00.000Z",
      updatedAt: NOW,
      completedAt: null,
      resultingContractId: null,
    },
    {
      id: "transfer-pending-02",
      playerId: "player-mkt-03",
      fromClubId: IDS.clubs.harbor,
      toClubId: IDS.userClub,
      initiatedByClubId: IDS.userClub,
      type: "permanent",
      direction: "incoming",
      status: "countered",
      terms: {
        fee: 13_500_000,
        offeredWeeklyWage: 78_000,
        contractLengthYears: 4,
        releaseClause: 45_000_000,
        sellOnClausePercent: null,
        buyOptionFee: null,
        buyOptionDeadline: null,
        coOwnershipPercent: null,
        futureProfitSharePercent: null,
        swapPlayerIds: [],
      },
      negotiationDeadlineAt: "2025-12-11T18:00:00.000Z",
      counterOfferCount: 1,
      parentTransferId: null,
      isHot: false,
      isWatchlisted: true,
      leagueId: IDS.league,
      notes: "Harbor City countered: €16M asking",
      createdAt: "2025-12-08T14:00:00.000Z",
      updatedAt: NOW,
      completedAt: null,
      resultingContractId: null,
    },
  ]

  const transferOffers: TransferOffer[] = [
    {
      id: "offer-01",
      transferId: "transfer-pending-02",
      fromClubId: IDS.userClub,
      toClubId: IDS.clubs.harbor,
      terms: transfers[1].terms,
      status: "countered",
      submittedAt: "2025-12-08T14:00:00.000Z",
      expiresAt: "2025-12-11T18:00:00.000Z",
    },
    {
      id: "offer-02",
      transferId: "transfer-pending-01",
      fromClubId: IDS.clubs.pacific,
      toClubId: IDS.userClub,
      terms: transfers[0].terms,
      status: "pending",
      submittedAt: "2025-12-09T10:00:00.000Z",
      expiresAt: "2025-12-12T12:00:00.000Z",
    },
  ]

  const marketListings: MarketListing[] = MARKET_PLAYER_SEEDS.map((seed, i) => ({
    playerId: seed.id,
    listedByClubId: seed.clubId,
    askingPrice: seed.marketValue,
    minimumFee: Math.round(seed.marketValue * 0.9),
    listedAt: "2025-12-01",
    deadlineAt: i % 3 === 0 ? "2025-12-12" : null,
    isHot: seed.trend === "rising" && seed.ovr >= 84,
  }))

  return ensureFullSeasonCalendar({
    id: IDS.save,
    name: "Metro Cooperative Demo",
    userClubId: IDS.userClub,
    currentSeasonId: seasonId,
    currentMatchday: 8,
    turnDeadlineAt: "2025-12-12T12:00:00.000Z",
    players,
    clubs,
    leagues: [league],
    seasons: [season],
    matches,
    contracts: allContracts,
    transfers,
    transferOffers,
    standings,
    marketListings,
    turnSubmissions: [],
    messages: [],
    resourcePacks: [],
    createdAt: NOW,
    updatedAt: NOW,
  })
}

export const gameSave = buildGameSave()
let activeGameSave: GameSave = gameSave

export function setActiveGameSave(save: GameSave): void {
  activeGameSave = save
}

// ─── Selectors ───────────────────────────────────────────────────────────────

export function getUserClub(): Club {
  return activeGameSave.clubs.find((c) => c.id === activeGameSave.userClubId)!
}

export function getClub(clubId: string): Club | undefined {
  return activeGameSave.clubs.find((c) => c.id === clubId)
}

export function getPlayer(playerId: string): Player | undefined {
  return activeGameSave.players.find((p) => p.id === playerId)
}

export function getLeague(): League {
  return activeGameSave.leagues[0]!
}

export function getSeason(): Season {
  return activeGameSave.seasons.find((s) => s.id === activeGameSave.currentSeasonId)!
}

export function getUserSquad(): Player[] {
  const club = getUserClub()
  return activeGameSave.players.filter((p) => club.squadPlayerIds.includes(p.id))
}

export function getContractForPlayer(playerId: string): Contract | undefined {
  return activeGameSave.contracts.find((c) => c.playerId === playerId && c.status === "active")
}

export type LeagueTableRow = LeagueStanding & {
  club: Club
}

export function getLeagueTableRows(limit?: number): LeagueTableRow[] {
  const rows = [...activeGameSave.standings]
    .sort((a, b) => a.position - b.position)
    .map((standing) => ({
      ...standing,
      club: getClub(standing.clubId)!,
    }))
  return limit ? rows.slice(0, limit) : rows
}

export type MarketBrowsePlayer = {
  player: Player
  club: Club
  listing: MarketListing
  contract: Contract
}

export function getMarketBrowsePlayers(): MarketBrowsePlayer[] {
  return activeGameSave.marketListings
    .map((listing) => {
      const player = getPlayer(listing.playerId)!
      const club = getClub(listing.listedByClubId!)!
      const contract = getContractForPlayer(listing.playerId)!
      return { player, club, listing, contract }
    })
    .filter(Boolean)
}

const WATCHLIST_IDS = new Set(["player-mkt-03", "player-mkt-06"])

export function isPlayerWatchlisted(playerId: string): boolean {
  return WATCHLIST_IDS.has(playerId)
}

export type UserBidRow = {
  transfer: Transfer
  player: Player
  timeAgoLabel: string
  uiStatus: "pending" | "accepted" | "rejected" | "negotiating"
}

export function mapTransferStatusToUi(status: TransferStatus): UserBidRow["uiStatus"] {
  switch (status) {
    case "countered":
      return "negotiating"
    case "accepted":
    case "completed":
      return "accepted"
    case "rejected":
    case "expired":
    case "cancelled":
      return "rejected"
    default:
      return "pending"
  }
}

const BID_TIME_LABELS: Record<string, string> = {
  "transfer-pending-02": "2h ago",
  "transfer-pending-03": "6h ago",
  "transfer-pending-04": "1d ago",
}

export function getUserOutgoingBids(): UserBidRow[] {
  return activeGameSave.transfers
    .filter((t) => t.initiatedByClubId === activeGameSave.userClubId)
    .map((transfer) => ({
      transfer,
      player: getPlayer(transfer.playerId)!,
      timeAgoLabel: BID_TIME_LABELS[transfer.id] ?? "Recently",
      uiStatus: mapTransferStatusToUi(transfer.status),
    }))
}

export type FormationKey = keyof typeof FORMATION_PRESETS

export function getTacticsLineupForFormation(formation: FormationKey) {
  const base = getTacticsLineup()
  const slots = FORMATION_PRESETS[formation].positions
  return slots.map((slot, i) => ({
    slot,
    player: base[i]?.player ?? base[Math.min(i, base.length - 1)]!.player,
  }))
}

export function getPendingTransfers(): Transfer[] {
  return activeGameSave.transfers.filter((t) => t.status === "pending" || t.status === "countered")
}

export function getTacticsLineup(): { slot: FormationSlot; player: Player }[] {
  const club = getUserClub()
  const formation = club.tactics.formation as keyof typeof FORMATION_PRESETS
  const slots =
    FORMATION_PRESETS[formation]?.positions ?? FORMATION_PRESETS["4-3-3"].positions

  return club.tactics.lineup.map((assignment, i) => {
    const slot = slots[i] ?? assignment
    const player = getPlayer(assignment.playerId)!
    return { slot, player }
  })
}

export function getMarketStats() {
  const club = getUserClub()
  return {
    transferBudget: club.finances.transferBudget,
    wageRoom: club.finances.weeklyWageRoom,
    scouted: activeGameSave.marketListings.length,
    activeBids: getUserOutgoingBids().filter((b) => b.uiStatus !== "rejected").length,
  }
}

export function getUserStanding(): LeagueStanding {
  return activeGameSave.standings.find((s) => s.isUserClub)!
}

export function formatOrdinal(position: number): string {
  const mod100 = position % 100
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`
  const mod10 = position % 10
  if (mod10 === 1) return `${position}st`
  if (mod10 === 2) return `${position}nd`
  if (mod10 === 3) return `${position}rd`
  return `${position}th`
}

export function formatMatchSchedule(iso: string): string {
  const date = new Date(iso)
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })
  const dayMonth = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${weekday}, ${dayMonth} - ${time}`
}

export type NextMatchView = {
  match: Match
  homeClub: Club
  awayClub: Club
  isUserHome: boolean
  scheduleLabel: string
}

export function getNextUserMatch(): NextMatchView | null {
  const userClubId = activeGameSave.userClubId
  const match = activeGameSave.matches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        (m.homeClubId === userClubId || m.awayClubId === userClubId),
    )
    .sort((a, b) => a.matchday - b.matchday)[0]

  if (!match) return null

  const homeClub = getClub(match.homeClubId)!
  const awayClub = getClub(match.awayClubId)!

  return {
    match,
    homeClub,
    awayClub,
    isUserHome: match.homeClubId === userClubId,
    scheduleLabel: formatMatchSchedule(match.scheduledAt),
  }
}

export type QuickStatItem = {
  label: string
  value: string
  trend: string
  trendUp: boolean
  color: string
  bg: string
}

export function getDashboardQuickStats(): QuickStatItem[] {
  const standing = getUserStanding()
  const squad = getUserSquad()
  const winRate = standing.played > 0 ? Math.round((standing.won / standing.played) * 100) : 0
  const injured = squad.filter((p) => p.isInjured).length
  const recentWins = standing.form.filter((r) => r === "W").length
  const lastMatch = activeGameSave.matches
    .filter(
      (m) =>
        m.status === "finished" &&
        (m.homeClubId === activeGameSave.userClubId || m.awayClubId === activeGameSave.userClubId),
    )
    .sort((a, b) => b.matchday - a.matchday)[0]
  const lastGoals =
    lastMatch && lastMatch.homeClubId === activeGameSave.userClubId
      ? lastMatch.homeScore ?? 0
      : lastMatch?.awayScore ?? 0

  const posTrend =
    standing.positionChange === "up" ? "+1" : standing.positionChange === "down" ? "-1" : "—"
  const posTrendUp = standing.positionChange === "up"

  return [
    {
      label: "League Pos",
      value: formatOrdinal(standing.position),
      trend: posTrend,
      trendUp: posTrendUp,
      color: "var(--amber)",
      bg: "var(--amber-glow)",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      trend: recentWins >= 3 ? "+5%" : recentWins <= 1 ? "-3%" : "—",
      trendUp: recentWins >= 3,
      color: "var(--success-green)",
      bg: "var(--success-green-glow)",
    },
    {
      label: "Goals",
      value: String(standing.goalsFor),
      trend: lastGoals > 0 ? `+${lastGoals}` : "0",
      trendUp: lastGoals > 0,
      color: "var(--stats-blue)",
      bg: "var(--stats-blue-glow)",
    },
    {
      label: "Injuries",
      value: String(injured),
      trend: injured > 0 ? `+${injured}` : "0",
      trendUp: false,
      color: "var(--alert-red)",
      bg: "var(--alert-red-glow)",
    },
  ]
}

export type SquadMoraleSummary = {
  moralePercent: number
  happyCount: number
  neutralCount: number
  unhappyCount: number
}

export function getSquadMoraleSummary(): SquadMoraleSummary {
  const squad = getUserSquad()
  return {
    moralePercent: getUserClub().squadMorale,
    happyCount: squad.filter((p) => p.moraleBand === "happy").length,
    neutralCount: squad.filter((p) => p.moraleBand === "neutral").length,
    unhappyCount: squad.filter((p) => p.moraleBand === "unhappy").length,
  }
}

export type TransferAlertView = {
  id: string
  type: "incoming" | "outgoing" | "interest"
  player: string
  position: string
  team: string
  amount: string
  rating: number
  isHot?: boolean
  timeAgo: string
}

const TRANSFER_ALERT_META: Record<
  string,
  { type: TransferAlertView["type"]; timeAgo: string; labelTeam?: boolean }
> = {
  "transfer-pending-01": { type: "incoming", timeAgo: "2h ago" },
  "transfer-pending-02": { type: "interest", timeAgo: "2h ago" },
  "transfer-pending-03": { type: "outgoing", timeAgo: "6h ago" },
}

export function getTransferAlertsForDashboard(): TransferAlertView[] {
  return getPendingTransfers()
    .slice(0, 3)
    .map((transfer) => {
      const player = getPlayer(transfer.playerId)!
      const meta = TRANSFER_ALERT_META[transfer.id] ?? {
        type: "interest" as const,
        timeAgo: "Recently",
      }
      const otherClubId =
        transfer.initiatedByClubId === activeGameSave.userClubId
          ? transfer.toClubId
          : transfer.fromClubId ?? transfer.initiatedByClubId
      const team = getClub(otherClubId ?? transfer.initiatedByClubId)!

      let type = meta.type
      if (transfer.id === "transfer-pending-01") type = "incoming"
      if (transfer.initiatedByClubId === activeGameSave.userClubId && transfer.status !== "countered") {
        type = "outgoing"
      }
      if (transfer.status === "countered") type = "interest"

      return {
        id: transfer.id,
        type,
        player: player.displayName,
        position: player.position,
        team: team.name,
        amount: formatMoney(transfer.terms.fee),
        rating: player.overallRating,
        isHot: transfer.isHot,
        timeAgo: meta.timeAgo,
      }
    })
}

export function getNotificationCount(): number {
  return getPendingTransfers().length
}

export type LeagueFullTableRow = LeagueTableRow & {
  gf: number
  ga: number
  gdLabel: string
}

export function getLeagueFullTable(): LeagueFullTableRow[] {
  return getLeagueTableRows().map((row) => ({
    ...row,
    gf: row.goalsFor,
    ga: row.goalsAgainst,
    gdLabel: formatGoalDifference(row.goalDifference),
  }))
}

export type LeagueSectionSummary = {
  league: League
  season: Season
  userClub: Club
  standing: LeagueStanding
  pointsFromLeader: number
  zoneLabel: string
}

export function getLeagueSectionSummary(): LeagueSectionSummary {
  const league = getLeague()
  const season = getSeason()
  const userClub = getUserClub()
  const standing = getUserStanding()
  const leader = activeGameSave.standings.find((s) => s.position === 1)!
  const zoneLabel =
    standing.zone === "champions"
      ? "Champions League Zone"
      : standing.zone === "europa"
        ? "Europa League Zone"
        : standing.zone === "relegation"
          ? "Relegation Zone"
          : "League Position"

  return {
    league,
    season,
    userClub,
    standing,
    pointsFromLeader: leader.points - standing.points,
    zoneLabel,
  }
}

export type MatchResultView = {
  id: string
  homeTeam: string
  homeScore: number
  awayTeam: string
  awayScore: number
  matchday: number
  isUserMatch: boolean
}

export function getRecentMatchResults(matchday?: number): MatchResultView[] {
  const md = matchday ?? getSeason().currentMatchday
  return activeGameSave.matches
    .filter((m) => m.status === "finished" && m.matchday === md)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .map((m) => ({
      id: m.id,
      homeTeam: getClub(m.homeClubId)!.name,
      homeScore: m.homeScore ?? 0,
      awayTeam: getClub(m.awayClubId)!.name,
      awayScore: m.awayScore ?? 0,
      matchday: m.matchday,
      isUserMatch: m.homeClubId === activeGameSave.userClubId || m.awayClubId === activeGameSave.userClubId,
    }))
}

export type TopScorerView = {
  name: string
  club: string
  goals: number
  assists: number
  isUser: boolean
}

export function getTopScorers(limit = 5): TopScorerView[] {
  const leagueClubIds = new Set(getLeague().clubIds)
  return activeGameSave.players
    .filter((p) => p.clubId && leagueClubIds.has(p.clubId))
    .sort((a, b) => b.seasonStats.goals - a.seasonStats.goals || b.seasonStats.assists - a.seasonStats.assists)
    .slice(0, limit)
    .map((p) => ({
      name: p.displayName,
      club: getClub(p.clubId!)!.name,
      goals: p.seasonStats.goals,
      assists: p.seasonStats.assists,
      isUser: p.clubId === activeGameSave.userClubId,
    }))
}
