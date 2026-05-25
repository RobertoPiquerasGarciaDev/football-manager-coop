import { Router, type Request, type Response } from "express"
import type { AuthenticatedRequest } from "../auth"
import { pool } from "../db/pool"
import { logger } from "../lib/logger"
import { simulateMatch, deriveClubRating, type ClubProfile, type TacticInstructions } from "../lib/simulator"
import { botPersonality, botTacticalSetup } from "../lib/bot-ai"
import { computeWeeklyFinance } from "../lib/finance"

type LeagueRow = {
  id: string
  name: string
  invite_code: string | null
  commissioner_user_id: string | null
  settings: Record<string, unknown>
  current_matchday: number
  status: string
  created_at: Date
  updated_at: Date
}

type ClubRow = {
  id: string
  league_id: string
  manager_user_id: string | null
  name: string
  short_name: string
  squad: unknown[]
  tactics: Record<string, unknown>
  finances: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

type MatchRow = {
  id: string
  league_id: string
  matchday: number
  home_club_id: string
  away_club_id: string
  status: string
  home_score: number | null
  away_score: number | null
  events: unknown[]
  scheduled_at: Date | null
  played_at: Date | null
  created_at: Date
}

type TurnRow = {
  id: string
  league_id: string
  club_id: string
  user_id: string | null
  matchday: number
  lineup: unknown
  tactics: unknown
  submitted_at: Date
}

type TacticDraftRow = {
  id: string
  league_id: string
  club_id: string
  user_id: string | null
  matchday: number
  lineup: unknown
  tactics: unknown
  updated_at: Date
}

type StandingRow = {
  clubId: string
  clubName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

type TurnStatus = {
  submitted: number
  total: number
  allSubmitted: boolean
}

type UserRow = {
  id: string
  club_id: string | null
  display_name?: string
}

type TransferWindowRow = {
  league_id: string
  phase: string
  summer_ready: string[]
  winter_ready: string[]
  budget: number
}

type NotificationRow = {
  id: string
  user_id: string
  league_id: string | null
  type: string
  payload: Record<string, unknown>
  read: boolean
  created_at: Date
}

type StandingDbRow = {
  club_id: string
  club_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

type ClubFinanceRow = {
  club_id: string
  league_id: string
  balance: number
  transfer_budget: number
  wage_budget: number
  weekly_wage_bill: number
  long_term_debt: number
  annual_income_projection: number
  bankrupt: boolean
  ffp_status: string
  projection: unknown[]
  updated_at: Date
}

type TransferOfferRow = {
  id: string
  league_id: string
  from_club_id: string | null
  to_club_id: string | null
  player_name: string
  operation_type: string
  market_value: number
  offer_fee: number
  wage_offer: number
  contract_years: string
  agent_commission_percent: string
  status: string
  counter_fee: number | null
  clauses: Record<string, unknown>
  expires_at: Date
  created_at: Date
  updated_at: Date
}

type ChatMessageRow = {
  id: string
  league_id: string
  sender_user_id: string | null
  channel: string
  body: string
  payload: Record<string, unknown>
  created_at: Date
}

type ClubInput = {
  id?: string
  name?: string
  shortName?: string
  short_name?: string
  squad?: unknown[]
  tactics?: Record<string, unknown>
  finances?: Record<string, unknown>
}

type MatchInput = {
  matchday?: number
  homeClubId?: string
  home_club_id?: string
  awayClubId?: string
  away_club_id?: string
  status?: string
  homeScore?: number | null
  home_score?: number | null
  awayScore?: number | null
  away_score?: number | null
  events?: unknown[]
  scheduledAt?: string | null
  scheduled_at?: string | null
  playedAt?: string | null
  played_at?: string | null
}

export const leagueRouter = Router()

const clubProfiles: Record<string, { name: string; shortName: string }> = {
  metropolis: { name: "FC Metropolis", shortName: "MET" },
  harbor: { name: "Harbor City", shortName: "HBC" },
  dynamo: { name: "Capital Dynamo", shortName: "DYN" },
  rovers: { name: "Pacific Rovers", shortName: "PFR" },
  northbridge: { name: "Northbridge Athletic", shortName: "NBA" },
  valencia: { name: "Valencia Coast", shortName: "VLC" },
  borough: { name: "Royal Borough", shortName: "RYB" },
  olympic: { name: "Olympic United", shortName: "OLU" },
  ironworks: { name: "Ironworks FC", shortName: "IRN" },
  sierra: { name: "Sierra Union", shortName: "SIU" },
  atlantic: { name: "Atlantic Sporting", shortName: "ATS" },
  aurora: { name: "Aurora FC", shortName: "AUR" },
  monarchs: { name: "City Monarchs", shortName: "MON" },
  victoria: { name: "Victoria 1889", shortName: "VIC" },
  riverside: { name: "Riverside Town", shortName: "RIV" },
  alpine: { name: "Alpine Club", shortName: "ALP" },
  desert: { name: "Desert Falcons", shortName: "DSF" },
  celticbay: { name: "Celtic Bay", shortName: "CLB" },
  frontera: { name: "Frontera Norte", shortName: "FRN" },
  marina: { name: "Marina Azul", shortName: "MAZ" },
}

const clubKeys = Object.keys(clubProfiles)

const botProfiles = Array.from({ length: 20 }, (_, index) => ({
  name: `AI Manager Club ${String(index + 1).padStart(2, "0")}`,
  shortName: `AI${String(index + 1).padStart(2, "0")}`,
}))

function jsonb(value: unknown): string {
  return JSON.stringify(value)
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

async function getUserClubProfile(userId: string, requestedClubId?: string) {
  const result = await pool.query<UserRow>("SELECT id, club_id FROM users WHERE id = $1", [userId])
  const key = requestedClubId ?? result.rows[0]?.club_id ?? "metropolis"
  return clubProfiles[key] ?? clubProfiles.metropolis
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? "")
}

function mapLeague(row: LeagueRow) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    commissionerUserId: row.commissioner_user_id,
    settings: row.settings,
    currentMatchday: row.current_matchday,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapClub(row: ClubRow) {
  return {
    id: row.id,
    leagueId: row.league_id,
    managerUserId: row.manager_user_id,
    name: row.name,
    shortName: row.short_name,
    squad: row.squad,
    tactics: row.tactics,
    finances: row.finances,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMatch(row: MatchRow) {
  return {
    id: row.id,
    leagueId: row.league_id,
    matchday: row.matchday,
    homeClubId: row.home_club_id,
    awayClubId: row.away_club_id,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    events: row.events,
    scheduledAt: row.scheduled_at,
    playedAt: row.played_at,
    createdAt: row.created_at,
  }
}

function mapTurn(row: TurnRow) {
  return {
    id: row.id,
    leagueId: row.league_id,
    clubId: row.club_id,
    userId: row.user_id,
    matchday: row.matchday,
    lineup: row.lineup,
    tactics: row.tactics,
    submittedAt: row.submitted_at,
  }
}

function mapTacticDraft(row: TacticDraftRow) {
  return {
    id: row.id,
    leagueId: row.league_id,
    clubId: row.club_id,
    userId: row.user_id,
    matchday: row.matchday,
    lineup: row.lineup,
    tactics: row.tactics,
    updatedAt: row.updated_at,
  }
}

function mapTransferWindow(row?: TransferWindowRow | null) {
  return row
    ? {
        phase: row.phase,
        summerReady: row.summer_ready,
        winterReady: row.winter_ready,
        budget: row.budget,
      }
    : null
}

function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    leagueId: row.league_id,
    type: row.type,
    payload: row.payload,
    read: row.read,
    createdAt: row.created_at,
  }
}

function mapStandingRow(row: StandingDbRow): StandingRow {
  return {
    clubId: row.club_id,
    clubName: row.club_name,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDifference: row.goal_difference,
    points: row.points,
  }
}

function mapFinance(row: ClubFinanceRow) {
  return {
    clubId: row.club_id,
    leagueId: row.league_id,
    balance: row.balance,
    transferBudget: row.transfer_budget,
    wageBudget: row.wage_budget,
    weeklyWageBill: row.weekly_wage_bill,
    longTermDebt: row.long_term_debt,
    annualIncomeProjection: row.annual_income_projection,
    bankrupt: row.bankrupt,
    ffpStatus: row.ffp_status,
    projection: row.projection,
    updatedAt: row.updated_at,
  }
}

function mapTransferOffer(row: TransferOfferRow) {
  return {
    id: row.id,
    leagueId: row.league_id,
    fromClubId: row.from_club_id,
    toClubId: row.to_club_id,
    playerName: row.player_name,
    operationType: row.operation_type,
    marketValue: row.market_value,
    offerFee: row.offer_fee,
    wageOffer: row.wage_offer,
    contractYears: Number(row.contract_years),
    agentCommissionPercent: Number(row.agent_commission_percent),
    status: row.status,
    counterFee: row.counter_fee,
    clauses: row.clauses,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapChatMessage(row: ChatMessageRow) {
  return {
    id: row.id,
    leagueId: row.league_id,
    senderUserId: row.sender_user_id,
    channel: row.channel,
    body: row.body,
    payload: row.payload,
    createdAt: row.created_at,
  }
}

async function getLeagueById(id: string) {
  const result = await pool.query<LeagueRow>("SELECT * FROM leagues WHERE id = $1", [id])
  return result.rows[0] ?? null
}

async function createManagedClub(
  client: { query: typeof pool.query },
  leagueId: string,
  userId: string,
  fallbackName = "Manager FC",
  requestedClubId?: string,
) {
  const profile = await getUserClubProfile(userId, requestedClubId)
  const existing = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2", [
    leagueId,
    userId,
  ])
  if (existing.rows[0]) return existing.rows[0]

  const taken = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND name = $2", [leagueId, profile.name])
  if (taken.rows[0]) {
    throw new Error("Selected club is already taken in this league")
  }

  const result = await client.query<ClubRow>(
    `INSERT INTO clubs (league_id, manager_user_id, name, short_name, squad, tactics, finances)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      leagueId,
      userId,
      profile.name ?? fallbackName,
      profile.shortName ?? "MFC",
      jsonb([]),
      jsonb({ formation: "4-3-3", lineup: [] }),
      jsonb({ balance: 50000000, transferBudget: 25000000, weeklyWageBill: 0 }),
    ],
  )
  return result.rows[0]
}

async function ensureTransferWindow(client: { query: typeof pool.query }, leagueId: string, budget = 25_000_000) {
  const result = await client.query<TransferWindowRow>(
    `INSERT INTO league_transfer_windows (league_id, phase, budget)
     VALUES ($1, 'lobby', $2)
     ON CONFLICT (league_id) DO UPDATE SET league_id = EXCLUDED.league_id
     RETURNING *`,
    [leagueId, budget],
  )
  return result.rows[0]
}

async function notifyLeagueMembers(
  client: { query: typeof pool.query },
  leagueId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const members = await client.query<{ user_id: string }>("SELECT user_id FROM league_members WHERE league_id = $1", [leagueId])
  for (const member of members.rows) {
    await client.query(
      `INSERT INTO notifications (user_id, league_id, type, payload)
       VALUES ($1, $2, $3, $4)`,
      [member.user_id, leagueId, type, jsonb({ leagueId, ...payload })],
    )
  }
}

function normalizeHumanManagers(value: unknown) {
  return Math.min(20, Math.max(1, Number(value ?? 2)))
}

function normalizeTurnWindowHours(value: unknown) {
  const hours = Number(value ?? 48)
  return hours === 24 || hours === 48 || hours === 72 ? hours : 48
}

async function createBotClubs(client: { query: typeof pool.query }, leagueId: string, humanManagers = 2) {
  const targetBotCount = Math.max(0, 20 - normalizeHumanManagers(humanManagers))
  const existing = await client.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM clubs WHERE league_id = $1 AND manager_user_id IS NULL",
    [leagueId],
  )
  const remainingSlots = Math.max(0, targetBotCount - Number(existing.rows[0]?.count ?? 0))
  for (const profile of botProfiles.slice(0, remainingSlots)) {
    await client.query(
      `INSERT INTO clubs (league_id, manager_user_id, name, short_name, squad, tactics, finances)
       SELECT $1, NULL, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE league_id = $1 AND name = $2)`,
      [
        leagueId,
        profile.name,
        profile.shortName,
        jsonb([]),
        jsonb({ formation: "4-4-2", lineup: [], ai: true }),
        jsonb({ balance: 50000000, transferBudget: 25000000, weeklyWageBill: 0, isBot: true }),
      ],
    )
  }
}

async function hasClosedCurrentMarket(leagueId: string, userId: string, status: string) {
  if (status !== "summer_market" && status !== "winter_market") return false
  const result = await pool.query<TransferWindowRow>("SELECT * FROM league_transfer_windows WHERE league_id = $1", [leagueId])
  const window = result.rows[0]
  if (!window) return false
  const closedManagers = status === "winter_market" ? window.winter_ready : window.summer_ready
  return closedManagers.includes(userId)
}

function calculateMarketValue(input: {
  age: number
  rating: number
  potential?: number
  recentForm?: number
  contractMonths?: number
  scarcity?: number
}) {
  const ratingBase = Math.pow(Math.max(40, input.rating), 3) * 78
  const potentialBoost = 1 + Math.max(0, (input.potential ?? input.rating) - input.rating) * 0.015
  const primeFactor = input.age <= 21 ? 1.08 : input.age <= 25 ? 1.18 : input.age <= 29 ? 1 : Math.max(0.55, 1 - (input.age - 29) * 0.05)
  const formFactor = 1 + ((input.recentForm ?? 6.8) - 6.8) * 0.04
  const contractFactor = Math.max(0.65, Math.min(1.15, (input.contractMonths ?? 36) / 36))
  const scarcityFactor = input.scarcity ?? 1
  return Math.round((ratingBase * potentialBoost * primeFactor * formFactor * contractFactor * scarcityFactor) / 100000) * 100000
}

async function ensureClubFinance(client: { query: typeof pool.query }, club: ClubRow) {
  const existing = await client.query<ClubFinanceRow>("SELECT * FROM club_finances WHERE club_id = $1", [club.id])
  if (existing.rows[0]) return existing.rows[0]

  const finances = club.finances as {
    balance?: number
    transferBudget?: number
    weeklyWageBill?: number
    wageBudget?: number
    longTermDebt?: number
  }
  const result = await client.query<ClubFinanceRow>(
    `INSERT INTO club_finances (
      club_id, league_id, balance, transfer_budget, wage_budget, weekly_wage_bill,
      long_term_debt, annual_income_projection, projection
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      club.id,
      club.league_id,
      finances.balance ?? 50_000_000,
      finances.transferBudget ?? 25_000_000,
      finances.wageBudget ?? 1_200_000,
      finances.weeklyWageBill ?? 650_000,
      finances.longTermDebt ?? 0,
      52_000_000,
      jsonb([]),
    ],
  )
  return result.rows[0]
}

async function applyWeeklyFinance(
  client: { query: typeof pool.query },
  leagueId: string,
  matchday: number,
  standings: StandingRow[],
  recentResults: Map<string, { wonLast: boolean; recentWins: number }>,
) {
  const clubs = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1", [leagueId])
  const byClubId = new Map(standings.map((row, index) => [row.clubId, { ...row, position: index + 1 }]))

  for (const club of clubs.rows) {
    const finance = await ensureClubFinance(client, club)
    const standing = byClubId.get(club.id)
    const last = recentResults.get(club.id) ?? { wonLast: false, recentWins: 0 }
    const stadiumCapacity = Number((club.finances as { stadiumCapacity?: number }).stadiumCapacity ?? 42_000)
    const ticketPrice = Number((club.finances as { ticketPrice?: number }).ticketPrice ?? 42)
    const stadiumLevel = Number((club.finances as { stadiumLevel?: number }).stadiumLevel ?? 3)

    const result = computeWeeklyFinance(finance.balance, {
      position: standing?.position ?? 10,
      totalClubs: standings.length || 20,
      recentWins: last.recentWins,
      stadiumCapacity,
      ticketPrice,
      stadiumLevel,
      weeklyWageBill: finance.weekly_wage_bill,
      transferBudget: finance.transfer_budget,
      longTermDebt: finance.long_term_debt,
      wonLast: last.wonLast,
      annualIncomeProjection: finance.annual_income_projection,
    })

    await client.query(
      `UPDATE club_finances
       SET balance = $2, long_term_debt = $3, ffp_status = $4, bankrupt = $5,
           annual_income_projection = $6, projection = $7, updated_at = NOW()
       WHERE club_id = $1`,
      [
        club.id,
        result.nextBalance,
        result.nextDebt,
        result.ffpStatus,
        result.bankrupt,
        result.income.total * 52,
        jsonb(result.projection),
      ],
    )
    await client.query(
      `INSERT INTO financial_events (club_id, league_id, matchday, income, expenses, net_result, balance_after, alerts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        club.id,
        leagueId,
        matchday,
        jsonb(result.income),
        jsonb(result.expenses),
        result.net,
        result.nextBalance,
        jsonb(result.alerts),
      ],
    )
  }
}

async function getTurnStatus(leagueId: string, matchday: number): Promise<TurnStatus> {
  const result = await pool.query<{ total: string; submitted: string }>(
    `SELECT
       (SELECT COUNT(*) FROM league_members WHERE league_id = $1 AND is_bot = FALSE) AS total,
       (SELECT COUNT(DISTINCT user_id)
        FROM turns
        WHERE league_id = $1 AND matchday = $2 AND user_id IS NOT NULL) AS submitted`,
    [leagueId, matchday],
  )

  const total = Number(result.rows[0]?.total ?? 0)
  const submitted = Number(result.rows[0]?.submitted ?? 0)

  return {
    submitted,
    total,
    allSubmitted: total > 0 && submitted >= total,
  }
}

async function ensureBotTurns(client: { query: typeof pool.query }, leagueId: string, matchday: number) {
  const bots = await client.query<ClubRow>(
    `SELECT c.*
     FROM clubs c
     LEFT JOIN league_members lm ON lm.club_id = c.id
     WHERE c.league_id = $1
       AND c.manager_user_id IS NULL
       AND (lm.id IS NULL OR lm.is_bot = TRUE)`,
    [leagueId],
  )

  // Find each bot's next opponent so the bot can react tactically
  const fixtures = await client.query<MatchRow>(
    "SELECT * FROM matches WHERE league_id = $1 AND matchday = $2",
    [leagueId, matchday],
  )
  const opponentByClub = new Map<string, string>()
  for (const m of fixtures.rows) {
    opponentByClub.set(m.home_club_id, m.away_club_id)
    opponentByClub.set(m.away_club_id, m.home_club_id)
  }

  for (const bot of bots.rows) {
    const personality = botPersonality(bot.id)
    const myRating = deriveClubRating(bot.id)
    const oppId = opponentByClub.get(bot.id)
    const oppRating = oppId ? deriveClubRating(oppId) : undefined
    const setup = botTacticalSetup(personality, oppRating, myRating)
    const lineup = Array.from({ length: 11 }, (_, index) => `${bot.short_name} Bot ${index + 1}`)
    const tactics = { ...setup.tactics, ai: true, personality, note: setup.lineupNote }

    await client.query(
      `INSERT INTO tactic_drafts (league_id, club_id, user_id, matchday, lineup, tactics)
       VALUES ($1, $2, NULL, $3, $4, $5)
       ON CONFLICT (league_id, club_id, matchday)
       DO UPDATE SET lineup = EXCLUDED.lineup, tactics = EXCLUDED.tactics, updated_at = NOW()`,
      [leagueId, bot.id, matchday, jsonb(lineup), jsonb(tactics)],
    )
    await client.query(
      `INSERT INTO turns (league_id, club_id, user_id, matchday, lineup, tactics)
       VALUES ($1, $2, NULL, $3, $4, $5)
       ON CONFLICT (league_id, club_id, matchday) DO NOTHING`,
      [leagueId, bot.id, matchday, jsonb(lineup), jsonb(tactics)],
    )
  }
}

/**
 * Build a `ClubProfile` for the simulator using stored tactics and form data.
 * Falls back to deterministic values when no historical data is present.
 */
async function buildSimClubProfile(
  client: { query: typeof pool.query },
  club: ClubRow,
  tacticsByClub: Map<string, TacticInstructions>,
): Promise<ClubProfile> {
  // Form: derived from last 5 matches (wins boost form)
  const last5 = await client.query<{ won: boolean; matchday: number }>(
    `SELECT CASE
        WHEN home_club_id = $1 AND home_score > away_score THEN TRUE
        WHEN away_club_id = $1 AND away_score > home_score THEN TRUE
        ELSE FALSE
      END AS won
     FROM matches
     WHERE league_id = $2 AND status IN ('played','finished')
       AND (home_club_id = $1 OR away_club_id = $1)
     ORDER BY matchday DESC LIMIT 5`,
    [club.id, club.league_id],
  )
  const wins = last5.rows.filter((r) => r.won).length
  const formScore = Math.min(95, 50 + wins * 8)

  // Staff bonuses derived from staff_members table when present
  const staffRows = await client.query<{ role: string; level: number }>(
    "SELECT role, level FROM staff_members WHERE club_id = $1",
    [club.id],
  )
  const staffMap = new Map<string, number>()
  for (const s of staffRows.rows) staffMap.set(s.role, Math.max(staffMap.get(s.role) ?? 0, s.level))
  const staffBonus = (role: string) => Math.max(0, (staffMap.get(role) ?? 0) - 2.5) / 2.5 // level 1-5 → -0.6..+1

  const tactics = tacticsByClub.get(club.id) ?? (club.tactics as TacticInstructions) ?? { formation: "4-4-2" }
  const isBot = !club.manager_user_id
  const personality: ClubProfile["personality"] = isBot ? botPersonality(club.id) : "human"

  return {
    id: club.id,
    name: club.name,
    shortName: club.short_name,
    rating: deriveClubRating(club.id),
    form: formScore,
    morale: 65,
    fatigue: Math.min(80, last5.rows.length * 8),
    homeBoost: 50,
    tactics,
    staff: {
      physical: staffBonus("preparador_fisico"),
      medic: staffBonus("medico"),
      analyst: staffBonus("analista_tactico"),
      setPiece: staffBonus("entrenador_balon_parado"),
      gkCoach: staffBonus("entrenador_porteros"),
    },
    personality,
    analystApplied: (tactics as { analystApplied?: boolean }).analystApplied === true,
  }
}

async function ensureMatchdayMatches(client: { query: typeof pool.query }, leagueId: string, matchday: number) {
  const existing = await client.query<MatchRow>("SELECT * FROM matches WHERE league_id = $1 AND matchday = $2", [
    leagueId,
    matchday,
  ])
  if (existing.rows.length > 0) return existing.rows

  const clubs = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY created_at ASC", [leagueId])
  const created: MatchRow[] = []
  for (let index = 0; index < clubs.rows.length - 1; index += 2) {
    const home = clubs.rows[index]
    const away = clubs.rows[index + 1]
    const result = await client.query<MatchRow>(
      `INSERT INTO matches (league_id, matchday, home_club_id, away_club_id, status, events)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       ON CONFLICT (league_id, matchday, home_club_id, away_club_id) DO NOTHING
       RETURNING *`,
      [leagueId, matchday, home.id, away.id, jsonb([])],
    )
    if (result.rows[0]) created.push(result.rows[0])
  }
  return created
}

async function recalculateStandings(client: { query: typeof pool.query }, leagueId: string) {
  const clubs = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY name ASC", [leagueId])
  const matches = await client.query<MatchRow>(
    "SELECT * FROM matches WHERE league_id = $1 AND status IN ('played', 'finished') AND home_score IS NOT NULL AND away_score IS NOT NULL",
    [leagueId],
  )
  const table = new Map<string, StandingRow>()

  for (const club of clubs.rows) {
    table.set(club.id, {
      clubId: club.id,
      clubName: club.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })
  }

  for (const match of matches.rows) {
    const home = table.get(match.home_club_id)
    const away = table.get(match.away_club_id)
    if (!home || !away || match.home_score == null || match.away_score == null) continue
    const drawn = match.home_score === match.away_score
    const homeWon = match.home_score > match.away_score
    const awayWon = match.away_score > match.home_score
    home.played += 1
    away.played += 1
    home.won += homeWon ? 1 : 0
    home.drawn += drawn ? 1 : 0
    home.lost += awayWon ? 1 : 0
    away.won += awayWon ? 1 : 0
    away.drawn += drawn ? 1 : 0
    away.lost += homeWon ? 1 : 0
    home.goalsFor += match.home_score
    home.goalsAgainst += match.away_score
    away.goalsFor += match.away_score
    away.goalsAgainst += match.home_score
    home.goalDifference = home.goalsFor - home.goalsAgainst
    away.goalDifference = away.goalsFor - away.goalsAgainst
    home.points += homeWon ? 3 : drawn ? 1 : 0
    away.points += awayWon ? 3 : drawn ? 1 : 0
  }

  for (const row of table.values()) {
    await client.query(
      `INSERT INTO standings (league_id, club_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (league_id, club_id)
       DO UPDATE SET played = EXCLUDED.played, won = EXCLUDED.won, drawn = EXCLUDED.drawn,
         lost = EXCLUDED.lost, goals_for = EXCLUDED.goals_for, goals_against = EXCLUDED.goals_against,
         goal_difference = EXCLUDED.goal_difference, points = EXCLUDED.points, updated_at = NOW()`,
      [
        leagueId,
        row.clubId,
        row.played,
        row.won,
        row.drawn,
        row.lost,
        row.goalsFor,
        row.goalsAgainst,
        row.goalDifference,
        row.points,
      ],
    )
  }

  return [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.goalsAgainst - b.goalsAgainst ||
      a.clubName.localeCompare(b.clubName),
  )
}

async function advanceLeagueIfReady(league: LeagueRow, matchday: number) {
  const status = await getTurnStatus(league.id, matchday)
  if (!status.allSubmitted) return { advanced: false, turnStatus: status }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`advance:${league.id}:${matchday}`])
    const lockedLeague = await client.query<LeagueRow>(
      "UPDATE leagues SET current_matchday = current_matchday + 1, updated_at = NOW() WHERE id = $1 AND current_matchday = $2 RETURNING *",
      [league.id, matchday],
    )
    if (!lockedLeague.rows[0]) {
      await client.query("ROLLBACK")
      return { advanced: false, turnStatus: status }
    }

    const matches = await ensureMatchdayMatches(client, league.id, matchday)
    await ensureBotTurns(client, league.id, matchday)

    // Pull all clubs once + the committed tactics for this matchday
    const clubsResult = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1", [league.id])
    const clubById = new Map(clubsResult.rows.map((c) => [c.id, c]))
    const turnsResult = await client.query<TurnRow>(
      "SELECT * FROM turns WHERE league_id = $1 AND matchday = $2",
      [league.id, matchday],
    )
    const draftsResult = await client.query<TacticDraftRow>(
      "SELECT * FROM tactic_drafts WHERE league_id = $1 AND matchday = $2",
      [league.id, matchday],
    )
    const tacticsByClub = new Map<string, TacticInstructions>()
    for (const d of draftsResult.rows) {
      tacticsByClub.set(d.club_id, (d.tactics as TacticInstructions) ?? {})
    }
    for (const t of turnsResult.rows) {
      // turn tactics override drafts because they were the ones submitted
      tacticsByClub.set(t.club_id, (t.tactics as TacticInstructions) ?? tacticsByClub.get(t.club_id) ?? {})
    }

    const finishedMatches: MatchRow[] = []
    const wonClubs = new Map<string, boolean>()
    for (const match of matches) {
      const home = clubById.get(match.home_club_id)
      const away = clubById.get(match.away_club_id)
      if (!home || !away) continue
      const homeProfile = await buildSimClubProfile(client, home, tacticsByClub)
      const awayProfile = await buildSimClubProfile(client, away, tacticsByClub)
      const sim = simulateMatch(homeProfile, awayProfile, `${league.id}:${match.id}:${matchday}`)

      wonClubs.set(match.home_club_id, sim.homeScore > sim.awayScore)
      wonClubs.set(match.away_club_id, sim.awayScore > sim.homeScore)

      const result = await client.query<MatchRow>(
        `UPDATE matches
         SET status = 'played', home_score = $1, away_score = $2, played_at = NOW(),
             events = $3
         WHERE id = $4
         RETURNING *`,
        [
          sim.homeScore,
          sim.awayScore,
          jsonb({
            timeline: sim.events,
            mvp: sim.mvp,
            xg: { home: sim.homeXg, away: sim.awayXg },
            ratings: { home: sim.homeRating, away: sim.awayRating },
          }),
          match.id,
        ],
      )
      finishedMatches.push(result.rows[0])
      logger.info("[sim] match played", {
        leagueId: league.id,
        matchday,
        home: home.short_name,
        away: away.short_name,
        score: `${sim.homeScore}-${sim.awayScore}`,
      })
    }

    const standings = await recalculateStandings(client, league.id)

    // Build recent results lookup for finance calibration
    const recentResults = new Map<string, { wonLast: boolean; recentWins: number }>()
    for (const club of clubsResult.rows) {
      const last5 = await client.query<{ won: boolean }>(
        `SELECT CASE
            WHEN home_club_id = $1 AND home_score > away_score THEN TRUE
            WHEN away_club_id = $1 AND away_score > home_score THEN TRUE
            ELSE FALSE END AS won
         FROM matches
         WHERE league_id = $2 AND status IN ('played','finished')
           AND (home_club_id = $1 OR away_club_id = $1)
         ORDER BY matchday DESC LIMIT 5`,
        [club.id, league.id],
      )
      recentResults.set(club.id, {
        wonLast: wonClubs.get(club.id) ?? false,
        recentWins: last5.rows.filter((r) => r.won).length,
      })
    }
    await applyWeeklyFinance(client, league.id, matchday, standings, recentResults)
    const nextMatchday = matchday + 1
    const nextStatus = nextMatchday === 19 ? "winter_market" : "active"
    const nextPhase = nextMatchday === 19 ? "winter_market" : "season"
    await client.query("UPDATE leagues SET status = $2 WHERE id = $1", [league.id, nextStatus])
    await client.query("UPDATE league_transfer_windows SET phase = $2, updated_at = NOW() WHERE league_id = $1", [
      league.id,
      nextPhase,
    ])
    await client.query(
      `INSERT INTO league_events (league_id, type, payload)
       VALUES ($1, 'matchday_advanced', $2)`,
      [
        league.id,
        jsonb({
          matchday,
          nextMatchday,
          turnStatus: status,
          matches: finishedMatches.map(mapMatch),
          standings,
        }),
      ],
    )
    if (nextMatchday === 19) {
      await notifyLeagueMembers(client, league.id, "winter_market_opened", {
        message: "Mercado de invierno abierto",
        matchday: nextMatchday,
      })
    } else {
      await notifyLeagueMembers(client, league.id, "matchday_advanced", {
        message: `Jornada ${matchday} simulada`,
        matchday,
        nextMatchday,
      })
    }
    await client.query("COMMIT")
    logger.info("matchday advanced", { leagueId: league.id, matchday, nextMatchday })
    return { advanced: true, turnStatus: status }
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("failed to advance matchday", { leagueId: league.id, matchday, error: String(error) })
    throw error
  } finally {
    client.release()
  }
}

async function getStandings(leagueId: string): Promise<StandingRow[]> {
  const result = await pool.query<StandingDbRow>(
    `SELECT s.club_id, c.name AS club_name, s.played, s.won, s.drawn, s.lost,
      s.goals_for, s.goals_against, s.goal_difference, s.points
     FROM standings s
     INNER JOIN clubs c ON c.id = s.club_id
     WHERE s.league_id = $1
     ORDER BY s.points DESC, s.goal_difference DESC, s.goals_for DESC, s.goals_against ASC, c.name ASC`,
    [leagueId],
  )
  if (result.rows.length > 0) return result.rows.map(mapStandingRow)
  return recalculateStandings(pool, leagueId)
}

leagueRouter.post("/leagues", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const humanManagers = normalizeHumanManagers(req.body?.humanManagers ?? (req.body?.settings as { humanManagers?: unknown } | undefined)?.humanManagers)
    const turnWindowHours = normalizeTurnWindowHours(req.body?.turnWindowHours ?? (req.body?.settings as { turnWindowHours?: unknown } | undefined)?.turnWindowHours)
    const budget = Number(req.body?.budget ?? 25_000_000)
    const leagueSettings = {
      ...(typeof req.body?.settings === "object" && req.body.settings ? req.body.settings : {}),
      humanManagers,
      botManagers: 20 - humanManagers,
      turnWindowHours,
      initialBudget: budget,
      format: req.body?.format ?? "regular",
      division: req.body?.division ?? "top",
    }
    const leagueResult = await client.query<LeagueRow>(
      `INSERT INTO leagues (name, invite_code, commissioner_user_id, settings, current_matchday, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.body?.name ?? "Cooperative League",
        req.body?.inviteCode ?? generateInviteCode(),
        userId,
        jsonb(leagueSettings),
        req.body?.currentMatchday ?? 1,
        "lobby",
      ],
    )
    const league = leagueResult.rows[0]
    await client.query(
      `INSERT INTO league_members (league_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (league_id, user_id) DO NOTHING`,
      [league.id, userId, "commissioner"],
    )
    const window = await ensureTransferWindow(client, league.id, budget)

    const clubs = Array.isArray(req.body?.clubs) ? (req.body.clubs as ClubInput[]) : []
    const matches = Array.isArray(req.body?.matches) ? (req.body.matches as MatchInput[]) : []
    const insertedClubs: ClubRow[] = []
    const selectedClubId = typeof req.body?.clubId === "string" ? req.body.clubId : undefined
    const userClubProfile = await getUserClubProfile(userId, selectedClubId)

    const clubsToCreate: ClubInput[] =
      clubs.length > 0
        ? clubs
        : [
            {
              name: req.body?.clubName ?? userClubProfile.name,
              shortName: req.body?.clubShortName ?? userClubProfile.shortName,
              squad: [],
              tactics: {},
              finances: { balance: 50_000_000, transferBudget: budget, weeklyWageBill: 650_000 },
            },
          ]

    for (const club of clubsToCreate) {
      const clubResult = await client.query<ClubRow>(
        `INSERT INTO clubs (id, league_id, manager_user_id, name, short_name, squad, tactics, finances)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          club.id ?? null,
          league.id,
          userId,
          club.name ?? "New Club",
          club.shortName ?? club.short_name ?? "NEW",
          jsonb(club.squad ?? []),
          jsonb(club.tactics ?? {}),
          jsonb({ balance: 50_000_000, transferBudget: budget, weeklyWageBill: 650_000, ...(club.finances ?? {}) }),
        ],
      )
      insertedClubs.push(clubResult.rows[0])
    }

    if (insertedClubs[0]) {
      await client.query("UPDATE league_members SET club_id = $3 WHERE league_id = $1 AND user_id = $2", [
        league.id,
        userId,
        insertedClubs[0].id,
      ])
    }
    await createBotClubs(client, league.id, humanManagers)
    const allClubs = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1", [league.id])
    for (const club of allClubs.rows) {
      await ensureClubFinance(client, club)
    }
    await recalculateStandings(client, league.id)

    for (const match of matches) {
      const homeClubId = match.homeClubId ?? match.home_club_id
      const awayClubId = match.awayClubId ?? match.away_club_id
      if (!homeClubId || !awayClubId) continue

      await client.query(
        `INSERT INTO matches (
          league_id, matchday, home_club_id, away_club_id, status,
          home_score, away_score, events, scheduled_at, played_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (league_id, matchday, home_club_id, away_club_id)
        DO NOTHING`,
        [
          league.id,
          match.matchday ?? 1,
          homeClubId,
          awayClubId,
          match.status ?? "scheduled",
          match.homeScore ?? match.home_score ?? null,
          match.awayScore ?? match.away_score ?? null,
          jsonb(match.events ?? []),
          match.scheduledAt ?? match.scheduled_at ?? null,
          match.playedAt ?? match.played_at ?? null,
        ],
      )
    }

    await notifyLeagueMembers(client, league.id, "manager_joined", {
      message: `${insertedClubs[0]?.name ?? "A manager"} created the league`,
    })
    await client.query("COMMIT")
    res.status(201).json({ ...mapLeague(league), clubs: insertedClubs.map(mapClub), matches, transferWindow: mapTransferWindow(window) })
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("failed to create league", { userId, error: String(error) })
    res.status(500).json({ error: "Failed to create league" })
  } finally {
    client.release()
  }
})

leagueRouter.post("/leagues/join", async (req: AuthenticatedRequest, res: Response) => {
  const inviteCode = typeof req.body?.inviteCode === "string" ? req.body.inviteCode.trim().toUpperCase() : ""
  const userId = req.user?.id

  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  if (!inviteCode) {
    res.status(400).json({ error: "inviteCode is required" })
    return
  }

  const league = await pool.query<LeagueRow>("SELECT * FROM leagues WHERE invite_code = $1", [inviteCode])
  const row = league.rows[0]
  if (!row) {
    res.status(404).json({ error: "League not found for invite code" })
    return
  }

  await pool.query(
    `INSERT INTO league_members (league_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (league_id, user_id) DO NOTHING`,
    [row.id, userId, "manager"],
  )
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const selectedClubId = typeof req.body?.clubId === "string" ? req.body.clubId : undefined
    const club = await createManagedClub(client, row.id, userId, "Manager FC", selectedClubId)
    await client.query("UPDATE league_members SET club_id = $3 WHERE league_id = $1 AND user_id = $2", [
      row.id,
      userId,
      club.id,
    ])
    await ensureTransferWindow(client, row.id, Number((row.settings as { initialBudget?: unknown }).initialBudget ?? 25_000_000))
    await createBotClubs(client, row.id, normalizeHumanManagers((row.settings as { humanManagers?: unknown }).humanManagers))
    const allClubs = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1", [row.id])
    for (const item of allClubs.rows) {
      await ensureClubFinance(client, item)
    }
    await recalculateStandings(client, row.id)
    await notifyLeagueMembers(client, row.id, "manager_joined", {
      message: `${club.name} joined ${row.name}`,
      clubName: club.name,
    })
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("failed to create joined manager club", { leagueId: row.id, userId, error: String(error) })
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to assign club to user" })
    return
  } finally {
    client.release()
  }

  const clubs = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY created_at ASC", [row.id])
  const window = await pool.query<TransferWindowRow>("SELECT * FROM league_transfer_windows WHERE league_id = $1", [row.id])
  res.json({ ...mapLeague(row), clubs: clubs.rows.map(mapClub), transferWindow: mapTransferWindow(window.rows[0]) })
})

leagueRouter.get("/leagues", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const result = await pool.query<LeagueRow>(
    `SELECT l.*
     FROM leagues l
     INNER JOIN league_members lm ON lm.league_id = l.id
     WHERE lm.user_id = $1
     ORDER BY l.updated_at DESC`,
    [userId],
  )

  const leagues = await Promise.all(
    result.rows.map(async (league) => {
      const [clubs, window, turnStatus] = await Promise.all([
        pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY created_at ASC", [league.id]),
        pool.query<TransferWindowRow>("SELECT * FROM league_transfer_windows WHERE league_id = $1", [league.id]),
        getTurnStatus(league.id, league.current_matchday),
      ])

      return {
        ...mapLeague(league),
        clubs: clubs.rows.map(mapClub),
        transferWindow: mapTransferWindow(window.rows[0]),
        turnStatus,
      }
    }),
  )

  res.json(leagues)
})

leagueRouter.get("/leagues/:id/clubs/availability", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const assigned = await pool.query<{ name: string; manager: string | null }>(
    `SELECT c.name, u.display_name AS manager
     FROM clubs c
     LEFT JOIN users u ON u.id = c.manager_user_id
     WHERE c.league_id = $1`,
    [leagueId],
  )
  const assignedByName = new Map(assigned.rows.map((row) => [row.name, row.manager]))

  res.json(
    clubKeys.map((key) => ({
      id: key,
      ...clubProfiles[key],
      taken: assignedByName.has(clubProfiles[key].name),
      managerName: assignedByName.get(clubProfiles[key].name) ?? null,
    })),
  )
})

leagueRouter.get("/leagues/invite/:code/clubs/availability", async (req: AuthenticatedRequest, res: Response) => {
  const inviteCode = routeParam(req.params.code).trim().toUpperCase()
  const league = await pool.query<LeagueRow>("SELECT * FROM leagues WHERE invite_code = $1", [inviteCode])
  if (!league.rows[0]) {
    res.status(404).json({ error: "League not found for invite code" })
    return
  }

  const assigned = await pool.query<{ name: string; manager: string | null }>(
    `SELECT c.name, u.display_name AS manager
     FROM clubs c
     LEFT JOIN users u ON u.id = c.manager_user_id
     WHERE c.league_id = $1 AND c.manager_user_id IS NOT NULL`,
    [league.rows[0].id],
  )
  const assignedByName = new Map(assigned.rows.map((row) => [row.name, row.manager]))

  res.json(
    clubKeys.map((key) => ({
      id: key,
      ...clubProfiles[key],
      taken: assignedByName.has(clubProfiles[key].name),
      managerName: assignedByName.get(clubProfiles[key].name) ?? null,
    })),
  )
})

async function handleReady(req: AuthenticatedRequest, res: Response) {
  const league = await getLeagueById(routeParam(req.params.id))
  const userId = req.user?.id
  if (!league || !userId) {
    res.status(league ? 401 : 404).json({ error: league ? "Authentication required" : "League not found" })
    return
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const current = await client.query<TransferWindowRow>("SELECT * FROM league_transfer_windows WHERE league_id = $1", [
      league.id,
    ])
    const window = current.rows[0] ?? (await ensureTransferWindow(client, league.id))
    const readyColumn = window.phase === "winter_market" ? "winter_ready" : "summer_ready"
    const updated = await client.query<TransferWindowRow>(
      `UPDATE league_transfer_windows
       SET ${readyColumn} = CASE WHEN $2 = ANY(${readyColumn}) THEN ${readyColumn} ELSE array_append(${readyColumn}, $2::uuid) END,
           updated_at = NOW()
       WHERE league_id = $1
       RETURNING *`,
      [league.id, userId],
    )
    const members = await client.query<{ count: string }>("SELECT COUNT(*) AS count FROM league_members WHERE league_id = $1 AND is_bot = FALSE", [
      league.id,
    ])
    const total = Number(members.rows[0]?.count ?? 0)
    const readyCount = (readyColumn === "winter_ready" ? updated.rows[0].winter_ready : updated.rows[0].summer_ready).length
    let status = league.status
    if (total > 0 && readyCount >= total) {
      const openingSummer = window.phase === "lobby"
      status = openingSummer ? "summer_market" : "active"
      const nextPhase = openingSummer ? "summer_market" : "season"
      await client.query("UPDATE leagues SET status = $2, updated_at = NOW() WHERE id = $1", [league.id, status])
      await client.query(
        `UPDATE league_transfer_windows
         SET phase = $2, summer_ready = CASE WHEN $2 = 'summer_market' THEN '{}'::uuid[] ELSE summer_ready END,
             updated_at = NOW()
         WHERE league_id = $1`,
        [league.id, nextPhase],
      )
      await client.query(
        `INSERT INTO transfer_window (league_id, type, status, ready_managers)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (league_id, type)
         DO UPDATE SET status = EXCLUDED.status, ready_managers = EXCLUDED.ready_managers, updated_at = NOW()`,
        [league.id, openingSummer ? "summer" : window.phase === "winter_market" ? "winter" : "summer", openingSummer ? "open" : "closed", []],
      )
      await notifyLeagueMembers(
        client,
        league.id,
        openingSummer ? "market_opened" : "market_closed",
        { message: openingSummer ? "Mercado de verano abierto" : "All managers are ready. Season started." },
      )
      await client.query(
        `INSERT INTO league_events (league_id, type, payload)
         VALUES ($1, $2, $3)`,
        [league.id, openingSummer ? "market_opened" : "market_closed", jsonb({ readyCount, total })],
      )
    } else {
      await notifyLeagueMembers(client, league.id, "manager_ready", { readyCount, total })
    }
    await client.query("COMMIT")
    res.json({ ok: true, status, transferWindow: mapTransferWindow(updated.rows[0]), readyCount, total })
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("failed to mark ready", { leagueId: league.id, userId, error: String(error) })
    res.status(500).json({ error: "Failed to mark manager ready" })
  } finally {
    client.release()
  }
}

leagueRouter.post("/leagues/:id/ready", handleReady)

leagueRouter.get("/notifications", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const result = await pool.query<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [userId],
  )
  res.json(result.rows.map(mapNotification))
})

leagueRouter.post("/notifications/:id/read", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const result = await pool.query<NotificationRow>(
    "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *",
    [routeParam(req.params.id), userId],
  )
  if (!result.rows[0]) {
    res.status(404).json({ error: "Notification not found" })
    return
  }
  res.json(mapNotification(result.rows[0]))
})

leagueRouter.get("/leagues/:id/matchday", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }
  const [turnStatus, matches, turns, tacticDrafts] = await Promise.all([
    getTurnStatus(league.id, league.current_matchday),
    pool.query<MatchRow>("SELECT * FROM matches WHERE league_id = $1 AND matchday = $2 ORDER BY created_at ASC", [
      league.id,
      league.current_matchday,
    ]),
    pool.query<TurnRow>("SELECT * FROM turns WHERE league_id = $1 AND matchday = $2 ORDER BY submitted_at DESC", [
      league.id,
      league.current_matchday,
    ]),
    pool.query<TacticDraftRow>("SELECT * FROM tactic_drafts WHERE league_id = $1 AND matchday = $2 ORDER BY updated_at DESC", [
      league.id,
      league.current_matchday,
    ]),
  ])
  res.json({
    leagueId: league.id,
    matchday: league.current_matchday,
    status: league.status,
    turnStatus,
    matches: matches.rows.map(mapMatch),
    turns: turns.rows.map(mapTurn),
    tacticDrafts: tacticDrafts.rows.map(mapTacticDraft),
  })
})

leagueRouter.put("/leagues/:id/transfer-window/ready", async (req: AuthenticatedRequest, res: Response) => {
  await handleReady(req, res)
})

leagueRouter.post("/leagues/:id/transfers", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  const userId = req.user?.id
  if (!league || !userId) {
    res.status(league ? 401 : 404).json({ error: league ? "Authentication required" : "League not found" })
    return
  }
  if (league.status !== "summer_market" && league.status !== "winter_market") {
    res.status(409).json({ error: "Transfers are only available during open transfer windows" })
    return
  }
  if (await hasClosedCurrentMarket(league.id, userId, league.status)) {
    res.status(409).json({ error: "You already closed your market for this window" })
    return
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const club = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2", [
      league.id,
      userId,
    ])
    const playerName = typeof req.body?.playerName === "string" ? req.body.playerName : "Scouted Player"
    const fee = Number(req.body?.fee ?? 0)
    const transfer = await client.query(
      `INSERT INTO transfers (league_id, club_id, player_name, fee, status, payload)
       VALUES ($1, $2, $3, $4, 'accepted', $5)
       RETURNING *`,
      [league.id, club.rows[0]?.id ?? null, playerName, fee, jsonb(req.body ?? {})],
    )
    await notifyLeagueMembers(client, league.id, "transfer_completed", {
      message: `${club.rows[0]?.name ?? "Un club"} ha fichado a ${playerName} por €${fee.toLocaleString("en-US")}`,
      playerName,
      fee,
    })
    await client.query(
      `INSERT INTO league_events (league_id, type, payload)
       VALUES ($1, 'transfer_completed', $2)`,
      [league.id, jsonb({ playerName, fee, clubName: club.rows[0]?.name })],
    )
    await client.query("COMMIT")
    res.status(201).json({ ok: true, transfer: transfer.rows[0] })
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("failed to create transfer", { leagueId: league.id, userId, error: String(error) })
    res.status(500).json({ error: "Failed to create transfer" })
  } finally {
    client.release()
  }
})

leagueRouter.get("/leagues/:id/finances", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  const userId = req.user?.id
  if (!league || !userId) {
    res.status(league ? 401 : 404).json({ error: league ? "Authentication required" : "League not found" })
    return
  }

  const club = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2", [
    league.id,
    userId,
  ])
  if (!club.rows[0]) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  await ensureClubFinance(pool, club.rows[0])
  const [finance, events] = await Promise.all([
    pool.query<ClubFinanceRow>("SELECT * FROM club_finances WHERE club_id = $1", [club.rows[0].id]),
    pool.query(
      "SELECT * FROM financial_events WHERE club_id = $1 ORDER BY created_at DESC LIMIT 52",
      [club.rows[0].id],
    ),
  ])
  res.json({ finance: mapFinance(finance.rows[0]), events: events.rows })
})

leagueRouter.get("/leagues/:id/market/valuation", async (req: AuthenticatedRequest, res: Response) => {
  const age = Number(req.query.age ?? 25)
  const rating = Number(req.query.rating ?? 85)
  const potential = Number(req.query.potential ?? rating)
  const recentForm = Number(req.query.recentForm ?? 6.8)
  const contractMonths = Number(req.query.contractMonths ?? 36)
  const scarcity = Number(req.query.scarcity ?? 1)
  res.json({ value: calculateMarketValue({ age, rating, potential, recentForm, contractMonths, scarcity }) })
})

leagueRouter.post("/leagues/:id/transfer-offers", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  const userId = req.user?.id
  if (!league || !userId) {
    res.status(league ? 401 : 404).json({ error: league ? "Authentication required" : "League not found" })
    return
  }
  if (league.status !== "summer_market" && league.status !== "winter_market") {
    res.status(409).json({ error: "Transfers are only available during open transfer windows" })
    return
  }
  if (await hasClosedCurrentMarket(league.id, userId, league.status)) {
    res.status(409).json({ error: "You already closed your market for this window" })
    return
  }

  const fromClub = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2", [
    league.id,
    userId,
  ])
  if (!fromClub.rows[0]) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  const playerName = typeof req.body?.playerName === "string" ? req.body.playerName : "Unknown Player"
  const marketValue =
    Number(req.body?.marketValue) ||
    calculateMarketValue({
      age: Number(req.body?.age ?? 25),
      rating: Number(req.body?.rating ?? 85),
      potential: Number(req.body?.potential ?? req.body?.rating ?? 85),
      contractMonths: Number(req.body?.contractMonths ?? 36),
    })
  const offerFee = Number(req.body?.offerFee ?? req.body?.fee ?? 0)
  const ratio = marketValue > 0 ? offerFee / marketValue : 0
  const status = ratio < 0.7 ? "rejected" : ratio < 0.9 ? "countered" : "accepted"
  const counterFee = status === "countered" ? Math.round(marketValue * 0.95) : null
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await client.query<TransferOfferRow>(
      `INSERT INTO transfer_offers (
        league_id, from_club_id, to_club_id, player_name, operation_type, market_value,
        offer_fee, wage_offer, contract_years, agent_commission_percent, status, counter_fee, clauses
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        league.id,
        fromClub.rows[0].id,
        req.body?.toClubId ?? null,
        playerName,
        req.body?.operationType ?? "direct_buy",
        marketValue,
        offerFee,
        Number(req.body?.wageOffer ?? 80_000),
        Number(req.body?.contractYears ?? 4),
        Number(req.body?.agentCommissionPercent ?? 5),
        status,
        counterFee,
        jsonb({
          loanDurationMonths: req.body?.loanDurationMonths,
          salarySharePercent: req.body?.salarySharePercent,
          buyOptionFee: req.body?.buyOptionFee,
          goalBonus: req.body?.goalBonus,
          appearanceBonus: req.body?.appearanceBonus,
          sellOnPercent: req.body?.sellOnPercent,
          releaseClause: req.body?.releaseClause,
          signingBonus: req.body?.signingBonus,
        }),
      ],
    )
    await notifyLeagueMembers(client, league.id, "transfer_offer", {
      message:
        status === "accepted"
          ? `${fromClub.rows[0].name} has agreed terms for ${playerName}`
          : status === "countered"
            ? `${playerName} offer countered at €${counterFee?.toLocaleString("en-US")}`
            : `${playerName} offer rejected below 70% valuation`,
      playerName,
      status,
    })
    await client.query("COMMIT")
    res.status(201).json(mapTransferOffer(result.rows[0]))
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("failed to create offer", { leagueId: league.id, error: String(error) })
    res.status(500).json({ error: "Failed to create transfer offer" })
  } finally {
    client.release()
  }
})

leagueRouter.post("/transfer-offers/:id/respond", async (req: AuthenticatedRequest, res: Response) => {
  const status = req.body?.status === "accepted" || req.body?.status === "rejected" || req.body?.status === "countered" ? req.body.status : ""
  if (!status) {
    res.status(400).json({ error: "status must be accepted, rejected or countered" })
    return
  }
  const offer = await pool.query<TransferOfferRow>("SELECT * FROM transfer_offers WHERE id = $1", [routeParam(req.params.id)])
  if (!offer.rows[0]) {
    res.status(404).json({ error: "Transfer offer not found" })
    return
  }
  const result = await pool.query<TransferOfferRow>(
    `UPDATE transfer_offers
     SET status = $2, counter_fee = COALESCE($3, counter_fee), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [offer.rows[0].id, status, req.body?.counterFee ?? null],
  )
  res.json(mapTransferOffer(result.rows[0]))
})

leagueRouter.get("/leagues/:id/chat", async (req: AuthenticatedRequest, res: Response) => {
  const result = await pool.query<ChatMessageRow>(
    "SELECT * FROM chat_messages WHERE league_id = $1 ORDER BY created_at DESC LIMIT 100",
    [routeParam(req.params.id)],
  )
  res.json(result.rows.reverse().map(mapChatMessage))
})

leagueRouter.post("/leagues/:id/chat", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  const userId = req.user?.id
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : ""
  if (!league || !userId || !body) {
    res.status(!league ? 404 : !userId ? 401 : 400).json({ error: !league ? "League not found" : !userId ? "Authentication required" : "body is required" })
    return
  }
  const result = await pool.query<ChatMessageRow>(
    `INSERT INTO chat_messages (league_id, sender_user_id, channel, body, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [league.id, userId, req.body?.channel ?? "general", body, jsonb(req.body?.payload ?? {})],
  )
  res.status(201).json(mapChatMessage(result.rows[0]))
})

leagueRouter.post("/leagues/:id/simulate-matchday", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  if (league.status !== "active") {
    res.status(409).json({ error: "Cannot simulate while the transfer market is open" })
    return
  }

  try {
    const turnStatus = await getTurnStatus(league.id, league.current_matchday)
    if (!turnStatus.allSubmitted) {
      res.status(409).json({ error: `Waiting for managers: ${turnStatus.submitted}/${turnStatus.total} confirmed` })
      return
    }
    const result = await advanceLeagueIfReady(league, league.current_matchday)
    const updatedLeague = await getLeagueById(league.id)
    res.json({ ok: true, ...result, league: updatedLeague ? mapLeague(updatedLeague) : null, standings: await getStandings(league.id) })
  } catch (error) {
    logger.error("manual simulate failed", { leagueId: league.id, error: String(error) })
    res.status(500).json({ error: "Failed to simulate matchday" })
  }
})

leagueRouter.post("/leagues/:id/tactics", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  // Auto-resolve clubId if the caller didn't pass one — saves a round trip and
  // lets the autosave fire even when the UI didn't hydrate the club yet.
  let clubId: string | undefined = req.body?.clubId
  if (!clubId) {
    const owned = await pool.query<ClubRow>(
      "SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2",
      [league.id, req.user.id],
    )
    clubId = owned.rows[0]?.id
  }
  if (!clubId) {
    res.status(400).json({ error: "clubId is required (no club is owned by this user in this league)" })
    return
  }

  // L-1: tactic drafts can be saved in ANY phase (lobby, summer_market,
  // winter_market, active). The simulator only uses them when status=active.
  const matchday = req.body.matchday ?? league.current_matchday
  const club = await pool.query<ClubRow>(
    "SELECT * FROM clubs WHERE id = $1 AND league_id = $2 AND manager_user_id = $3",
    [clubId, league.id, req.user.id],
  )
  if (!club.rows[0]) {
    res.status(403).json({ error: "You can only save tactics for your assigned club" })
    return
  }
  const submitted = await pool.query<TurnRow>(
    "SELECT * FROM turns WHERE league_id = $1 AND club_id = $2 AND matchday = $3 AND user_id IS NOT NULL",
    [league.id, clubId, matchday],
  )
  if (submitted.rows[0]) {
    res.status(409).json({ error: "Turn already submitted for this matchday; tactics are locked" })
    return
  }
  // Provide reasonable defaults so the autosave can fire with partial data
  const lineup = Array.isArray(req.body?.lineup) && req.body.lineup.length > 0
    ? req.body.lineup
    : Array.from({ length: 11 }, (_, i) => `Titular ${i + 1}`)
  const tactics = req.body?.tactics && typeof req.body.tactics === "object"
    ? req.body.tactics
    : { formation: req.body?.formation ?? "4-3-3" }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("UPDATE clubs SET tactics = $2, updated_at = NOW() WHERE id = $1", [
      clubId,
      jsonb(tactics),
    ])
    const result = await client.query<TacticDraftRow>(
      `INSERT INTO tactic_drafts (league_id, club_id, user_id, matchday, lineup, tactics)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (league_id, club_id, matchday)
       DO UPDATE SET user_id = EXCLUDED.user_id, lineup = EXCLUDED.lineup,
         tactics = EXCLUDED.tactics, updated_at = NOW()
       RETURNING *`,
      [league.id, clubId, req.user.id, matchday, jsonb(lineup), jsonb(tactics)],
    )
    await client.query(
      `INSERT INTO league_events (league_id, type, payload)
       VALUES ($1, 'tactics_saved', $2)`,
      [league.id, jsonb({ matchday, clubId, userId: req.user.id, phase: league.status })],
    )
    await client.query("COMMIT")
    res.json({ ok: true, draft: mapTacticDraft(result.rows[0]), turnStatus: await getTurnStatus(league.id, matchday) })
  } catch (error) {
    await client.query("ROLLBACK")
    logger.error("[coop] failed to save tactics", { leagueId: league.id, userId: req.user.id, error: String(error) })
    res.status(500).json({ error: "Failed to save tactics" })
  } finally {
    client.release()
  }
})

leagueRouter.get("/leagues/:id", async (req: Request, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }

  const [clubs, matches, turns, tacticDrafts, standings, turnStatus, transferWindow] = await Promise.all([
    pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY name ASC", [league.id]),
    pool.query<MatchRow>("SELECT * FROM matches WHERE league_id = $1 ORDER BY matchday ASC, scheduled_at ASC", [league.id]),
    pool.query<TurnRow>("SELECT * FROM turns WHERE league_id = $1 ORDER BY submitted_at DESC", [league.id]),
    pool.query<TacticDraftRow>("SELECT * FROM tactic_drafts WHERE league_id = $1 ORDER BY updated_at DESC", [league.id]),
    getStandings(league.id),
    getTurnStatus(league.id, league.current_matchday),
    pool.query<TransferWindowRow>("SELECT * FROM league_transfer_windows WHERE league_id = $1", [league.id]),
  ])

  res.json({
    ...mapLeague(league),
    clubs: clubs.rows.map(mapClub),
    matches: matches.rows.map(mapMatch),
    turns: turns.rows.map(mapTurn),
    tacticDrafts: tacticDrafts.rows.map(mapTacticDraft),
    standings,
    turnStatus,
    transferWindow: mapTransferWindow(transferWindow.rows[0]),
  })
})

leagueRouter.post("/leagues/:id/turn", async (req: AuthenticatedRequest, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  if (!req.body?.clubId) {
    res.status(400).json({ error: "clubId is required" })
    return
  }

  if (league.status !== "active") {
    res.status(409).json({ error: "Matchdays are blocked while the transfer market is open" })
    return
  }

  try {
    const matchday = req.body.matchday ?? league.current_matchday
    const club = await pool.query<ClubRow>(
      "SELECT * FROM clubs WHERE id = $1 AND league_id = $2 AND manager_user_id = $3",
      [req.body.clubId, league.id, req.user.id],
    )
    if (!club.rows[0]) {
      res.status(403).json({ error: "You can only submit turns for your assigned club" })
      return
    }

    const existingTurn = await pool.query<TurnRow>(
      "SELECT * FROM turns WHERE league_id = $1 AND club_id = $2 AND matchday = $3",
      [league.id, req.body.clubId, matchday],
    )
    if (existingTurn.rows[0]) {
      res.status(409).json({ error: "Turn already submitted for this matchday" })
      return
    }
    const draft = await pool.query<TacticDraftRow>(
      "SELECT * FROM tactic_drafts WHERE league_id = $1 AND club_id = $2 AND matchday = $3",
      [league.id, req.body.clubId, matchday],
    )
    const lineup = req.body.lineup ?? draft.rows[0]?.lineup
    const tactics = req.body.tactics ?? draft.rows[0]?.tactics
    if (!lineup || !tactics) {
      res.status(400).json({ error: "Save tactics before submitting turn" })
      return
    }

    logger.info("submitting turn", { leagueId: league.id, matchday, userId: req.user.id, clubId: req.body.clubId })
    const turnResult = await pool.query<TurnRow>(
      `INSERT INTO turns (league_id, club_id, user_id, matchday, lineup, tactics)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [league.id, req.body.clubId, req.user.id, matchday, jsonb(lineup), jsonb(tactics)],
    )
    const { advanced, turnStatus } = await advanceLeagueIfReady(league, matchday)
    logger.info("turn submitted", { leagueId: league.id, matchday, advanced, turnStatus })

    res.status(201).json({ ok: true, turn: mapTurn(turnResult.rows[0]), turnStatus, advanced })
  } catch (error) {
    logger.error("Failed to submit turn", { error: String(error) })
    res.status(500).json({ error: "Failed to submit turn" })
  }
})

leagueRouter.get("/leagues/:id/standings", async (req: Request, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }

  res.json(await getStandings(league.id))
})
