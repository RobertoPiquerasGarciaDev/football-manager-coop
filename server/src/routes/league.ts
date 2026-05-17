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

function jsonb(value: unknown): string {
  return JSON.stringify(value)
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

async function getUserClubProfile(userId: string) {
  const result = await pool.query<UserRow>("SELECT id, club_id FROM users WHERE id = $1", [userId])
  const key = result.rows[0]?.club_id ?? "metropolis"
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

async function getLeagueById(id: string) {
  const result = await pool.query<LeagueRow>("SELECT * FROM leagues WHERE id = $1", [id])
  return result.rows[0] ?? null
}

async function createManagedClub(
  client: { query: typeof pool.query },
  leagueId: string,
  userId: string,
  fallbackName = "Manager FC",
) {
  const profile = await getUserClubProfile(userId)
  const existing = await client.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2", [
    leagueId,
    userId,
  ])
  if (existing.rows[0]) return existing.rows[0]

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

    await client.query(
      `INSERT INTO league_events (league_id, type, payload)
       VALUES ($1, 'matchday_advanced', $2)`,
      [
        league.id,
        jsonb({
          matchday,
          nextMatchday: matchday + 1,
          turnStatus: status,
          matches: finishedMatches.map(mapMatch),
        }),
      ],
    )
    await client.query("COMMIT")
    console.log("[coop] matchday advanced", { leagueId: league.id, matchday, nextMatchday: matchday + 1 })
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
      `INSERT INTO leagues (name, invite_code, commissioner_user_id, settings, current_matchday)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.body?.name ?? "Cooperative League",
        req.body?.inviteCode ?? generateInviteCode(),
        userId,
        req.body?.settings ?? {},
        req.body?.currentMatchday ?? 1,
      ],
    )
    const league = leagueResult.rows[0]
    await client.query(
      `INSERT INTO league_members (league_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (league_id, user_id) DO NOTHING`,
      [league.id, userId, "commissioner"],
    )

    const clubs = Array.isArray(req.body?.clubs) ? (req.body.clubs as ClubInput[]) : []
    const matches = Array.isArray(req.body?.matches) ? (req.body.matches as MatchInput[]) : []
    const insertedClubs: ClubRow[] = []
    const userClubProfile = await getUserClubProfile(userId)

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

    await client.query("COMMIT")
    res.status(201).json({ ...mapLeague(league), clubs: insertedClubs.map(mapClub), matches })
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
    await createManagedClub(client, row.id, userId)
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
  res.json({ ...mapLeague(row), clubs: clubs.rows.map(mapClub) })
})

leagueRouter.get("/leagues/:id", async (req: Request, res: Response) => {
  const league = await getLeagueById(routeParam(req.params.id))
  if (!league) {
    res.status(404).json({ error: "League not found" })
    return
  }

  const [clubs, matches, turns, standings, turnStatus] = await Promise.all([
    pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY name ASC", [league.id]),
    pool.query<MatchRow>("SELECT * FROM matches WHERE league_id = $1 ORDER BY matchday ASC, scheduled_at ASC", [league.id]),
    pool.query<TurnRow>("SELECT * FROM turns WHERE league_id = $1 ORDER BY submitted_at DESC", [league.id]),
    getStandings(league.id),
    getTurnStatus(league.id, league.current_matchday),
  ])

  res.json({
    ...mapLeague(league),
    clubs: clubs.rows.map(mapClub),
    matches: matches.rows.map(mapMatch),
    turns: turns.rows.map(mapTurn),
    standings,
    turnStatus,
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
