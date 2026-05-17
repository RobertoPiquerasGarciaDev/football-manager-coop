import { Router, type Request, type Response } from "express"
import type { AuthenticatedRequest } from "../auth"
import { pool } from "../db/pool"

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
  type: string
  payload: Record<string, unknown>
  read: boolean
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
}

const clubKeys = Object.keys(clubProfiles)

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
    type: row.type,
    payload: row.payload,
    read: row.read,
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
      `INSERT INTO notifications (user_id, type, payload)
       VALUES ($1, $2, $3)`,
      [member.user_id, type, jsonb({ leagueId, ...payload })],
    )
  }
}

async function getTurnStatus(leagueId: string, matchday: number): Promise<TurnStatus> {
  const result = await pool.query<{ total: string; submitted: string }>(
    `SELECT
       (SELECT COUNT(*) FROM league_members WHERE league_id = $1) AS total,
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

function scoreFor(seed: string): number {
  return Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4
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
       VALUES ($1, $2, $3, $4, 'scheduled', $5)
       ON CONFLICT (league_id, matchday, home_club_id, away_club_id) DO NOTHING
       RETURNING *`,
      [leagueId, matchday, home.id, away.id, jsonb([])],
    )
    if (result.rows[0]) created.push(result.rows[0])
  }
  return created
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
    const finishedMatches: MatchRow[] = []
    for (const match of matches) {
      const homeScore = scoreFor(`${match.home_club_id}:${matchday}:home`)
      const awayScore = scoreFor(`${match.away_club_id}:${matchday}:away`)
      const result = await client.query<MatchRow>(
        `UPDATE matches
         SET status = 'finished', home_score = $1, away_score = $2, played_at = NOW(),
             events = $3
         WHERE id = $4
         RETURNING *`,
        [
          homeScore,
          awayScore,
          jsonb([
            { minute: 12, type: "key_chance", description: "Opening pressure from the home side" },
            ...(homeScore + awayScore > 0 ? [{ minute: 54, type: "goal", description: "Decisive cooperative turn goal" }] : []),
          ]),
          match.id,
        ],
      )
      finishedMatches.push(result.rows[0])
    }

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
        }),
      ],
    )
    if (nextMatchday === 19) {
      await notifyLeagueMembers(client, league.id, "winter_market_opened", {
        message: "Mercado de invierno abierto",
        matchday: nextMatchday,
      })
    } else {
      await notifyLeagueMembers(client, league.id, "matchday_advanced", { matchday, nextMatchday })
    }
    await client.query("COMMIT")
    console.log("[coop] matchday advanced", { leagueId: league.id, matchday, nextMatchday })
    return { advanced: true, turnStatus: status }
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[coop] failed to advance matchday", { leagueId: league.id, matchday, error })
    throw error
  } finally {
    client.release()
  }
}

async function getStandings(leagueId: string): Promise<StandingRow[]> {
  const clubs = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY name ASC", [leagueId])
  const matches = await pool.query<MatchRow>(
    "SELECT * FROM matches WHERE league_id = $1 AND status = 'finished' AND home_score IS NOT NULL AND away_score IS NOT NULL",
    [leagueId],
  )

  const standings = new Map<string, StandingRow>()
  for (const club of clubs.rows) {
    standings.set(club.id, {
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
    const home = standings.get(match.home_club_id)
    const away = standings.get(match.away_club_id)
    if (!home || !away || match.home_score == null || match.away_score == null) continue

    const homeWon = match.home_score > match.away_score
    const awayWon = match.away_score > match.home_score
    const drawn = match.home_score === match.away_score

    home.played += 1
    home.won += homeWon ? 1 : 0
    home.drawn += drawn ? 1 : 0
    home.lost += awayWon ? 1 : 0
    home.goalsFor += match.home_score
    home.goalsAgainst += match.away_score
    home.goalDifference = home.goalsFor - home.goalsAgainst
    home.points += homeWon ? 3 : drawn ? 1 : 0

    away.played += 1
    away.won += awayWon ? 1 : 0
    away.drawn += drawn ? 1 : 0
    away.lost += homeWon ? 1 : 0
    away.goalsFor += match.away_score
    away.goalsAgainst += match.home_score
    away.goalDifference = away.goalsFor - away.goalsAgainst
    away.points += awayWon ? 3 : drawn ? 1 : 0
  }

  return [...standings.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.goalsAgainst - b.goalsAgainst ||
      a.clubName.localeCompare(b.clubName),
  )
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

    const leagueResult = await client.query<LeagueRow>(
      `INSERT INTO leagues (name, invite_code, commissioner_user_id, settings, current_matchday, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.body?.name ?? "Cooperative League",
        req.body?.inviteCode ?? generateInviteCode(),
        userId,
        req.body?.settings ?? {},
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
    const window = await ensureTransferWindow(client, league.id, Number(req.body?.budget ?? 25_000_000))

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
              finances: {},
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
          jsonb(club.finances ?? {}),
        ],
      )
      insertedClubs.push(clubResult.rows[0])
    }

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
    await ensureTransferWindow(client, row.id)
    await notifyLeagueMembers(client, row.id, "manager_joined", {
      message: `${club.name} joined ${row.name}`,
      clubName: club.name,
    })
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[coop] failed to create joined manager club", { leagueId: row.id, userId, error })
    res.status(500).json({ error: "Failed to assign club to user" })
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

leagueRouter.post("/leagues/:id/ready", async (req: AuthenticatedRequest, res: Response) => {
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
    const members = await client.query<{ count: string }>("SELECT COUNT(*) AS count FROM league_members WHERE league_id = $1", [
      league.id,
    ])
    const total = Number(members.rows[0]?.count ?? 0)
    const readyCount = (readyColumn === "winter_ready" ? updated.rows[0].winter_ready : updated.rows[0].summer_ready).length
    let status = league.status
    if (total > 0 && readyCount >= total) {
      status = "active"
      await client.query("UPDATE leagues SET status = 'active', updated_at = NOW() WHERE id = $1", [league.id])
      await client.query("UPDATE league_transfer_windows SET phase = 'season', updated_at = NOW() WHERE league_id = $1", [
        league.id,
      ])
      await notifyLeagueMembers(client, league.id, "market_closed", { message: "All managers are ready. Season started." })
      await client.query(
        `INSERT INTO league_events (league_id, type, payload)
         VALUES ($1, 'market_closed', $2)`,
        [league.id, jsonb({ readyCount, total })],
      )
    } else {
      await notifyLeagueMembers(client, league.id, "manager_ready", { readyCount, total })
    }
    await client.query("COMMIT")
    res.json({ ok: true, status, transferWindow: mapTransferWindow(updated.rows[0]), readyCount, total })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[coop] failed to mark ready", { leagueId: league.id, userId, error })
    res.status(500).json({ error: "Failed to mark manager ready" })
  } finally {
    client.release()
  }
})

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

leagueRouter.get("/leagues/:id", async (req: Request, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }

  const [clubs, matches, turns, standings, turnStatus, transferWindow] = await Promise.all([
    pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY name ASC", [league.id]),
    pool.query<MatchRow>("SELECT * FROM matches WHERE league_id = $1 ORDER BY matchday ASC, scheduled_at ASC", [league.id]),
    pool.query<TurnRow>("SELECT * FROM turns WHERE league_id = $1 ORDER BY submitted_at DESC", [league.id]),
    getStandings(league.id),
    getTurnStatus(league.id, league.current_matchday),
    pool.query<TransferWindowRow>("SELECT * FROM league_transfer_windows WHERE league_id = $1", [league.id]),
  ])

  res.json({
    ...mapLeague(league),
    clubs: clubs.rows.map(mapClub),
    matches: matches.rows.map(mapMatch),
    turns: turns.rows.map(mapTurn),
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

  if (!req.body?.clubId || !req.body?.lineup || !req.body?.tactics) {
    res.status(400).json({ error: "clubId, lineup and tactics are required" })
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

    console.log("[coop] submitting turn", { leagueId: league.id, matchday, userId: req.user.id, clubId: req.body.clubId })
    const turnResult = await pool.query<TurnRow>(
      `INSERT INTO turns (league_id, club_id, user_id, matchday, lineup, tactics)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (league_id, club_id, matchday)
       DO UPDATE SET user_id = EXCLUDED.user_id, lineup = EXCLUDED.lineup, tactics = EXCLUDED.tactics, submitted_at = NOW()
       RETURNING *`,
      [league.id, req.body.clubId, req.user.id, matchday, jsonb(req.body.lineup), jsonb(req.body.tactics)],
    )
    const { advanced, turnStatus } = await advanceLeagueIfReady(league, matchday)
    console.log("[coop] turn submitted", { leagueId: league.id, matchday, advanced, turnStatus })

    res.status(201).json({ ok: true, turn: mapTurn(turnResult.rows[0]), turnStatus, advanced })
  } catch (error) {
    console.error("Failed to submit turn", error)
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
