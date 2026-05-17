/**
 * Domain model — Football Manager Cooperative (GDD v1.0)
 * @see Football-Manager-Cooperative-Game-Design-Document.pdf
 */

// ─── Primitives ─────────────────────────────────────────────────────────────

export type EntityId = string
export type ISODate = string
/** Whole currency units (EUR by default in GDD examples). */
export type Money = number
/** OpenFootball external identifier. */
export type OpenFootballId = string

// ─── Shared enums (GDD) ─────────────────────────────────────────────────────

export type PositionGroup = "GK" | "DEF" | "MID" | "FWD"

export type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "LWB"
  | "RWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "ST"

/** GDD: 30+ formations available; extend as the tactical editor grows. */
export type Formation =
  | "4-3-3"
  | "4-4-2"
  | "3-5-2"
  | "4-2-3-1"
  | "5-3-2"
  | string

export type CareerPhase =
  | "youth" // 16–19
  | "development" // 20–23
  | "peak" // 24–29
  | "veteran" // 30–33
  | "twilight" // 34+

export type InjurySeverity = "light" | "moderate" | "severe"

export type MatchResultCode = "W" | "D" | "L"

export type TableZone = "champions" | "europa" | "conference" | "relegation" | null

export type PositionChange = "up" | "down" | "same"

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled"

export type SeasonStatus = "upcoming" | "in_progress" | "completed" | "archived"

export type ContractStatus = "active" | "expired" | "terminated" | "loan"

export type TransferType =
  | "permanent"
  | "loan"
  | "loan_with_buy_option"
  | "player_swap"
  | "co_ownership"
  | "free"

export type TransferDirection = "incoming" | "outgoing"

/** GDD: accept, reject, counter-offer; max 48h negotiation window. */
export type TransferStatus =
  | "draft"
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "expired"
  | "completed"
  | "cancelled"

export type ValueTrend = "rising" | "stable" | "falling"

/** GDD: team instructions — pressure, tempo, width. */
export type PlayStyle = "Attacking" | "Balanced" | "Defensive" | "Counter-Attack"

export type Tempo = "Fast" | "Normal" | "Slow"

export type Width = "Wide" | "Normal" | "Narrow"

export type ManagerType = "human" | "ai"

/** UI-friendly morale band derived from numeric morale (±10% match impact per GDD). */
export type MoraleBand = "happy" | "neutral" | "unhappy"

export type TrainingCategory = "physical" | "technical" | "tactical" | "mental" | "recovery"

export type FacilityType =
  | "training_ground"
  | "youth_academy"
  | "stadium"
  | "medical_center"
  | "scouting"

export type StaffRole =
  | "head_coach"
  | "assistant"
  | "fitness_coach"
  | "goalkeeper_coach"
  | "video_analyst"
  | "scout"

export type LeaguePrivacy = "public" | "private"

/** GDD: configurable async turn window (24–72 hours). */
export type TurnWindowHours = 24 | 48 | 72

export type WageCapPenaltyLevel = "none" | "warning" | "transfer_ban" | "points_deduction"

export type MessageChannelType =
  | "league_general"
  | "negotiation_private"
  | "commissioner_board"

export type MatchEventType =
  | "goal"
  | "assist"
  | "yellow_card"
  | "red_card"
  | "injury"
  | "substitution"
  | "key_chance"
  | "save"

export type SimulationViewMode = "summary" | "detailed"

// ─── Player attributes (GDD: 24 attrs, 4 categories) ─────────────────────────

/** Technical — pase, regate, tiro, cabeceo (+ extensión a 6). */
export interface TechnicalAttributes {
  passing: number
  dribbling: number
  shooting: number
  heading: number
  crossing: number
  technique: number
}

/** Physical — velocidad, resistencia, fuerza, agilidad (+ extensión a 6). */
export interface PhysicalAttributes {
  pace: number
  stamina: number
  strength: number
  agility: number
  acceleration: number
  jumping: number
}

/** Mental — visión, agresividad, liderazgo, concentración (+ extensión a 6). */
export interface MentalAttributes {
  vision: number
  aggression: number
  leadership: number
  concentration: number
  decisions: number
  teamwork: number
}

/** Goalkeeper — reflejos, posicionamiento, salidas, distribución (+ extensión a 6). */
export interface GoalkeeperAttributes {
  reflexes: number
  positioning: number
  rushingOut: number
  distribution: number
  handling: number
  aerialReach: number
}

export interface PlayerAttributes {
  technical: TechnicalAttributes
  physical: PhysicalAttributes
  mental: MentalAttributes
  goalkeeping: GoalkeeperAttributes
}

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface Injury {
  type: string
  severity: InjurySeverity
  /** GDD: light 1–2w, moderate 3–8w, severe 8+w. */
  weeksOut: number
  description: string
  injuredAt: ISODate
  expectedReturnAt: ISODate
  /** Severe youth injuries may permanently reduce potential (GDD). */
  potentialReduced: boolean
}

/** GDD: morale factors — minutes, results, coach, contract, random events. */
export interface MoraleFactors {
  minutesPlayedScore: number
  recentResultsScore: number
  coachRelationshipScore: number
  contractExpectationsScore: number
  randomEventsScore: number
}

export interface PlayerSeasonStats {
  seasonId: EntityId
  appearances: number
  starts: number
  minutesPlayed: number
  goals: number
  assists: number
  cleanSheets: number
  yellowCards: number
  redCards: number
  averageRating: number
  manOfTheMatch: number
}

/** GDD: market value reacts to wage, age and form in real time. */
export interface MarketValueFactors {
  baseValue: Money
  ageMultiplier: number
  formMultiplier: number
  wageMultiplier: number
  trend: ValueTrend
}

export interface IndividualInstructions {
  /** Role within formation (e.g. inverted winger, ball-playing defender). */
  role: string
  pressingIntensity?: number
  forwardRuns?: "rarely" | "sometimes" | "often"
  creativeFreedom?: "low" | "medium" | "high"
  markingTightness?: "loose" | "normal" | "tight"
}

export interface FormationSlot {
  role: PlayerPosition
  /** Pitch coordinates 0–100 (%). */
  x: number
  y: number
}

export interface LineupAssignment {
  slotIndex: number
  playerId: EntityId
  role: PlayerPosition
  x: number
  y: number
  instructions: IndividualInstructions
}

export interface ClubTactics {
  formation: Formation
  formationSlots: FormationSlot[]
  lineup: LineupAssignment[]
  playStyle: PlayStyle
  attackStyle: string
  defenseStyle: string
  tempo: Tempo
  width: Width
  /** Team pressing intensity 0–100. */
  pressing: number
  intensity: number
}

export interface TrainingSession {
  id: EntityId
  category: TrainingCategory
  /** Attribute focus keys affected this session. */
  focusAttributes: string[]
  fatigueCost: number
  scheduledDay: number
}

export interface WeeklyTrainingPlan {
  weekNumber: number
  sessions: TrainingSession[]
}

export interface StaffMember {
  id: EntityId
  name: string
  role: StaffRole
  /** Staff attributes evolve with experience at the club (GDD). */
  rating: number
  experience: number
  /** Multiplier applied to related training sessions. */
  trainingBonus: number
  weeklyWage: Money
  hiredAt: ISODate
}

export interface Facility {
  type: FacilityType
  level: number
  /** Upgrade in progress. */
  upgradingUntil: ISODate | null
  /** GDD: long-term returns per facility type. */
  effectSummary: string
}

export interface SponsorDeal {
  id: EntityId
  sponsorName: string
  weeklyIncome: Money
  durationWeeks: number
  objectiveBonuses: { objective: string; bonus: Money }[]
  signedAt: ISODate
  expiresAt: ISODate
}

export interface ClubFinances {
  balance: Money
  transferBudget: Money
  /** GDD: wage bill as % of total income. */
  wageBillPercent: number
  weeklyWageBill: Money
  weeklyWageRoom: Money
  longTermDebt: Money
  monthlyProjectedIncome: Money
  monthlyProjectedExpenses: Money
  /** Sources: tickets, TV, sponsors, sales, European prizes. */
  incomeBreakdown: {
    tickets: Money
    tvRights: Money
    sponsors: Money
    playerSales: Money
    europeanPrizes: Money
    aiSubsidy: Money
  }
  wageCapPenalty: WageCapPenaltyLevel
  fairPlayEnabled: boolean
}

export interface Stadium {
  name: string
  capacity: number
  level: number
  builtYear?: number
}

export interface ClubColors {
  primary: string
  secondary: string
  accent?: string
}

export interface YouthProspect {
  id: EntityId
  generatedName: string
  age: number
  position: PlayerPosition
  positionGroup: PositionGroup
  /** Hidden until scouted/developed (GDD). */
  potentialHidden: boolean
  revealedPotential: number | null
  overallRating: number
  academyCategory: "u16" | "u18" | "u21"
  weeksInAcademy: number
}

export interface LeagueMarketRules {
  salaryCap: Money | null
  minPlayerAge: number | null
  maxPlayerAge: number | null
  localPlayerQuotaPercent: number | null
  transferDeadlineMatchday: number | null
}

export interface CooperativeLeagueSettings {
  maxHumanManagers: number
  turnWindowHours: TurnWindowHours
  privacy: LeaguePrivacy
  inviteCode: string | null
  commissionerClubId: EntityId
  marketRules: LeagueMarketRules
  /** Playoff, relegation, matchday count (GDD: commissioner configurable). */
  format: {
    totalMatchdays: number
    playoffSpots: number
    relegationSpots: number
    promotionSpots: number
  }
  fairPlayFinancial: boolean
}

export interface LeagueRules {
  teamsCount: number
  matchdays: number
  pointsForWin: number
  pointsForDraw: number
  promotionSpots: number
  relegationSpots: number
  championsLeagueSpots: number
  europaLeagueSpots: number
  conferenceLeagueSpots: number
}

export interface TransferWindow {
  name: string
  opensAt: ISODate
  closesAt: ISODate
  isOpen: boolean
}

export interface TransferNegotiationTerms {
  fee: Money
  offeredWeeklyWage: Money
  contractLengthYears: number
  releaseClause: Money | null
  sellOnClausePercent: number | null
  /** Loan with purchase option (GDD). */
  buyOptionFee: Money | null
  buyOptionDeadline: ISODate | null
  /** Co-ownership / future profit share (GDD). */
  coOwnershipPercent: number | null
  futureProfitSharePercent: number | null
  /** Player swap: players offered in exchange. */
  swapPlayerIds: EntityId[]
}

export interface MatchEvent {
  id: EntityId
  minute: number
  type: MatchEventType
  playerId?: EntityId
  clubId: EntityId
  description?: string
  secondaryPlayerId?: EntityId
}

export interface MatchStats {
  possession: number
  shots: number
  shotsOnTarget: number
  corners: number
  fouls: number
  offsides: number
}

export interface MatchTeamStats extends MatchStats {
  clubId: EntityId
  /** Effective rating after morale (±10%) and fatigue (GDD). */
  effectiveStrength: number
}

export interface TurnSubmission {
  clubId: EntityId
  seasonId: EntityId
  matchday: number
  tactics: ClubTactics
  submittedAt: ISODate | null
  /** GDD: auto-apply last saved tactics if deadline missed. */
  usedFallbackTactics: boolean
}

export interface LeagueMessage {
  id: EntityId
  channel: MessageChannelType
  senderClubId: EntityId
  recipientClubId: EntityId | null
  body: string
  transferId: EntityId | null
  createdAt: ISODate
}

export interface ResourcePack {
  id: EntityId
  name: string
  author: string
  /** Stored locally on device (GDD) — path or URI, not server-hosted. */
  localPath: string
  clubLogosIncluded: boolean
  playerImagesIncluded: boolean
  importedAt: ISODate
}

// ─── Core entities ───────────────────────────────────────────────────────────

export interface Player {
  id: EntityId
  openFootballId: OpenFootballId | null
  firstName: string
  lastName: string
  displayName: string
  shortName: string
  nationalityCode: string
  nationality: string
  dateOfBirth: ISODate
  age: number
  careerPhase: CareerPhase
  preferredFoot: "left" | "right" | "both"
  position: PlayerPosition
  positionGroup: PositionGroup
  attributes: PlayerAttributes
  /** Weighted mean by position (GDD). */
  overallRating: number
  /** Genetic ceiling; partially hidden for youth (GDD). */
  potentialRating: number
  potentialRevealedPercent: number
  form: number
  /** 0–100; ±10% effective rating in matches (GDD). */
  morale: number
  moraleBand: MoraleBand
  moraleFactors: MoraleFactors
  /** 0–100; fatigue from training / matches (GDD). */
  fatigue: number
  fitness: number
  marketValue: Money
  marketValueFactors: MarketValueFactors
  valueTrend: ValueTrend
  clubId: EntityId | null
  contractId: EntityId | null
  isCaptain: boolean
  isInjured: boolean
  injury: Injury | null
  isAcademyPlayer: boolean
  seasonStats: PlayerSeasonStats
  individualInstructions: IndividualInstructions | null
  customImagePath: string | null
  createdAt: ISODate
  updatedAt: ISODate
}

export interface Contract {
  id: EntityId
  playerId: EntityId
  clubId: EntityId
  status: ContractStatus
  weeklyWage: Money
  signingBonus: Money
  releaseClause: Money | null
  sellOnClausePercent: number | null
  startDate: ISODate
  endDate: ISODate
  lengthYears: number
  shirtNumber: number | null
  goalBonus: Money
  cleanSheetBonus: Money
  appearanceBonus: Money
  /** Morale: expectations met or not (GDD). */
  promisedRole: "starter" | "rotation" | "backup" | null
  isLoan: boolean
  loanFromClubId: EntityId | null
  buyOptionFee: Money | null
  buyOptionDeadline: ISODate | null
  coOwnershipPercent: number | null
  renewedFromContractId: EntityId | null
  signedAt: ISODate
}

export interface Club {
  id: EntityId
  name: string
  shortName: string
  leagueId: EntityId
  stadium: Stadium
  foundedYear: number
  managerId: EntityId
  managerName: string
  managerType: ManagerType
  isUserControlled: boolean
  reputation: number
  colors: ClubColors
  badgeUrl: string | null
  customBadgePath: string | null
  finances: ClubFinances
  facilities: Facility[]
  staff: StaffMember[]
  tactics: ClubTactics
  currentTrainingPlan: WeeklyTrainingPlan | null
  squadPlayerIds: EntityId[]
  youthProspects: YouthProspect[]
  sponsorDeals: SponsorDeal[]
  /** Weighted average of squad morale (GDD: dressing room / cohesion). */
  squadMorale: number
  tacticalCohesion: number
  createdAt: ISODate
  updatedAt: ISODate
}

export interface League {
  id: EntityId
  name: string
  shortName: string
  country: string
  countryCode: string
  tier: number
  rules: LeagueRules
  cooperativeSettings: CooperativeLeagueSettings | null
  clubIds: EntityId[]
  humanManagerIds: EntityId[]
  currentSeasonId: EntityId | null
  isCooperative: boolean
  createdAt: ISODate
}

export interface Season {
  id: EntityId
  leagueId: EntityId
  name: string
  startDate: ISODate
  endDate: ISODate
  status: SeasonStatus
  currentMatchday: number
  totalMatchdays: number
  transferWindows: TransferWindow[]
  matchIds: EntityId[]
  /** Archived stats & champions gallery (GDD). */
  championClubId: EntityId | null
  archivedAt: ISODate | null
  createdAt: ISODate
}

export interface Match {
  id: EntityId
  seasonId: EntityId
  leagueId: EntityId
  matchday: number
  homeClubId: EntityId
  awayClubId: EntityId
  scheduledAt: ISODate
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  events: MatchEvent[]
  homeStats: MatchTeamStats | null
  awayStats: MatchTeamStats | null
  /** GDD: home advantage factor in simulation. */
  homeAdvantageApplied: boolean
  simulationMode: SimulationViewMode
  minute: number | null
  attendance: number | null
  playedAt: ISODate | null
  createdAt: ISODate
}

export interface Transfer {
  id: EntityId
  playerId: EntityId
  fromClubId: EntityId | null
  toClubId: EntityId | null
  initiatedByClubId: EntityId
  type: TransferType
  direction: TransferDirection
  status: TransferStatus
  terms: TransferNegotiationTerms
  /** GDD: max 48h negotiation between users. */
  negotiationDeadlineAt: ISODate
  counterOfferCount: number
  parentTransferId: EntityId | null
  isHot: boolean
  isWatchlisted: boolean
  leagueId: EntityId
  notes: string | null
  createdAt: ISODate
  updatedAt: ISODate
  completedAt: ISODate | null
  resultingContractId: EntityId | null
}

// ─── Views & aggregates ──────────────────────────────────────────────────────

export interface LeagueStanding {
  clubId: EntityId
  seasonId: EntityId
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: MatchResultCode[]
  positionChange: PositionChange
  zone: TableZone
  isUserClub: boolean
}

export interface MarketListing {
  playerId: EntityId
  listedByClubId: EntityId | null
  askingPrice: Money
  minimumFee: Money
  listedAt: ISODate
  deadlineAt: ISODate | null
  isHot: boolean
}

export interface TransferOffer {
  id: EntityId
  transferId: EntityId
  fromClubId: EntityId
  toClubId: EntityId
  terms: TransferNegotiationTerms
  status: TransferStatus
  submittedAt: ISODate
  expiresAt: ISODate
}

export interface GameSave {
  id: EntityId
  name: string
  userClubId: EntityId
  currentSeasonId: EntityId
  currentMatchday: number
  turnDeadlineAt: ISODate | null
  players: Player[]
  clubs: Club[]
  leagues: League[]
  seasons: Season[]
  matches: Match[]
  contracts: Contract[]
  transfers: Transfer[]
  transferOffers: TransferOffer[]
  standings: LeagueStanding[]
  marketListings: MarketListing[]
  turnSubmissions: TurnSubmission[]
  messages: LeagueMessage[]
  resourcePacks: ResourcePack[]
  createdAt: ISODate
  updatedAt: ISODate
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const POSITION_TO_GROUP: Record<PlayerPosition, PositionGroup> = {
  GK: "GK",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LW: "FWD",
  RW: "FWD",
  ST: "FWD",
}

/** GDD career phases by age. */
export function careerPhaseFromAge(age: number): CareerPhase {
  if (age <= 19) return "youth"
  if (age <= 23) return "development"
  if (age <= 29) return "peak"
  if (age <= 33) return "veteran"
  return "twilight"
}

/** Maps numeric morale (0–100) to UI band. */
export function moraleBandFromScore(morale: number): MoraleBand {
  if (morale >= 70) return "happy"
  if (morale >= 40) return "neutral"
  return "unhappy"
}

/** GDD: effective rating modifier from morale (±10%). */
export function moralePerformanceMultiplier(morale: number): number {
  const normalized = (morale - 50) / 50
  return 1 + normalized * 0.1
}
