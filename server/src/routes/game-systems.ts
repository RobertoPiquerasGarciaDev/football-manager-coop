import { Router, type Response } from "express"
import type { AuthenticatedRequest } from "../auth"
import { pool } from "../db/pool"

export const gameSystemsRouter = Router()

type ClubRow = {
  id: string
  league_id: string
  manager_user_id: string | null
  name: string
  finances: Record<string, unknown>
}

type PlayerRow = {
  id: string
  display_name: string
  age: number
  position: string
  rating: number
  potential_hidden: number
  market_value: number
  weekly_wage: number
  club_id: string | null
  morale: number
  fatigue: number
  fitness_form: string
  status: string
}

const formations = [
  ["4-3-3", "Wide front three", "Pressing and wing overloads", "Space behind fullbacks"],
  ["4-4-2", "Classic two-striker shape", "Simple roles and crossing", "Can be outnumbered centrally"],
  ["4-2-3-1", "Balanced modern system", "Double pivot protection", "Needs elite attacking midfielder"],
  ["3-5-2", "Central overload", "Two strikers and wingbacks", "Wide defensive transitions"],
  ["5-3-2", "Compact low block", "Defensive stability", "Limited width in attack"],
  ["4-1-4-1", "Screened midfield", "Protects defence", "Striker isolation"],
  ["3-4-3", "Aggressive back three", "High chance creation", "Vulnerable channels"],
  ["4-3-2-1", "Narrow creators", "Central combinations", "Needs attacking fullbacks"],
  ["4-5-1", "Midfield block", "Controls space", "Low box presence"],
  ["3-4-1-2", "No.10 behind two strikers", "Central threat", "Requires mobile CBs"],
  ["4-2-2-2", "Dual tens", "Fast transitions", "Wide protection risk"],
  ["5-4-1", "Deep defensive block", "Protects leads", "Few attacking outlets"],
  ["4-1-2-1-2", "Diamond midfield", "Central dominance", "Narrow shape"],
  ["3-6-1", "Extreme midfield control", "Possession lock", "Low penalty-box threat"],
  ["4-4-1-1", "Second striker link", "Compact and flexible", "Can lack creativity"],
  ["4-3-1-2", "Narrow attacking triangle", "Two-striker pressure", "Weak wide zones"],
  ["5-2-3", "Back five with counters", "Safe transition base", "Midfield underload"],
  ["4-6-0", "False-nine overload", "Hard to mark", "Needs technical squad"],
  ["3-2-4-1", "Box midfield", "Elite positional play", "Very demanding"],
  ["4-2-4", "All-out attack", "Late goal chasing", "Defensive exposure"],
].map(([id, description, strengths, weaknesses]) => ({ id, description, strengths, weaknesses }))

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? "")
}

function jsonb(value: unknown): string {
  return JSON.stringify(value)
}

function calculateMarketValue(input: {
  age: number
  rating: number
  potential?: number
  recentForm?: number
  contractMonths?: number
  scarcity?: number
}) {
  const base = Math.pow(Math.max(40, input.rating), 3) * 78
  const potentialBoost = 1 + Math.max(0, (input.potential ?? input.rating) - input.rating) * 0.015
  const ageFactor = input.age <= 19 ? 1.05 : input.age <= 23 ? 1.15 : input.age <= 29 ? 1.2 : Math.max(0.5, 1 - (input.age - 29) * 0.05)
  const formFactor = 1 + ((input.recentForm ?? 6.8) - 6.8) * 0.04
  const contractFactor = Math.max(0.65, Math.min(1.2, (input.contractMonths ?? 36) / 36))
  return Math.round((base * potentialBoost * ageFactor * formFactor * contractFactor * (input.scarcity ?? 1)) / 100000) * 100000
}

async function getManagedClub(leagueId: string, userId: string) {
  const result = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 AND manager_user_id = $2", [leagueId, userId])
  return result.rows[0] ?? null
}

async function ensureLeaguePlayers(leagueId: string) {
  const clubs = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1 ORDER BY created_at ASC", [leagueId])
  for (const club of clubs.rows) {
    const count = await pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM players WHERE club_id = $1", [club.id])
    const missing = Math.max(0, 25 - Number(count.rows[0]?.count ?? 0))
    if (missing > 0) {
      await pool.query(
        `UPDATE players
         SET club_id = $1, updated_at = NOW()
         WHERE id IN (
           SELECT id FROM players WHERE club_id IS NULL ORDER BY rating DESC, external_id ASC LIMIT $2
         )`,
        [club.id, missing],
      )
    }
  }
}

gameSystemsRouter.get("/players", async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)))
  const result = await pool.query<PlayerRow>(
    "SELECT * FROM players ORDER BY rating DESC, market_value DESC LIMIT $1",
    [limit],
  )
  res.json(result.rows)
})

gameSystemsRouter.get("/leagues/:id/players", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  await ensureLeaguePlayers(leagueId)
  const result = await pool.query<PlayerRow>(
    `SELECT p.*
     FROM players p
     INNER JOIN clubs c ON c.id = p.club_id
     WHERE c.league_id = $1
     ORDER BY c.name ASC, p.position ASC, p.rating DESC`,
    [leagueId],
  )
  res.json(result.rows)
})

gameSystemsRouter.post("/leagues/:id/players/generate", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  await ensureLeaguePlayers(leagueId)
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM players p INNER JOIN clubs c ON c.id = p.club_id
     WHERE c.league_id = $1`,
    [leagueId],
  )
  res.json({ ok: true, count: Number(result.rows[0]?.count ?? 0) })
})

gameSystemsRouter.get("/tactics/formations", (_req, res) => {
  res.json({
    formations,
    teamInstructions: {
      pressing: ["high", "medium", "low"],
      tempo: ["fast", "medium", "slow"],
      width: ["very_wide", "wide", "normal", "narrow"],
      defensiveLine: ["very_high", "high", "medium", "low", "very_low"],
      style: ["possession", "direct", "counterattack", "gegenpress"],
    },
  })
})

gameSystemsRouter.get("/leagues/:id/staff", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const result = await pool.query("SELECT * FROM staff_members WHERE league_id = $1 ORDER BY role ASC, level DESC", [leagueId])
  res.json(result.rows)
})

gameSystemsRouter.post("/leagues/:id/staff/hire", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  const club = await getManagedClub(leagueId, userId)
  if (!club) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  const role = typeof req.body?.role === "string" ? req.body.role : "scout"
  const level = Math.min(5, Math.max(1, Number(req.body?.level ?? 3)))
  const result = await pool.query(
    `INSERT INTO staff_members (club_id, league_id, name, role, level, region, weekly_wage, contract_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + INTERVAL '24 months')
     RETURNING *`,
    [
      club.id,
      leagueId,
      req.body?.name ?? `${role.replace("_", " ")} ${level}`,
      role,
      level,
      req.body?.region ?? null,
      level * 5500,
    ],
  )
  res.status(201).json(result.rows[0])
})

gameSystemsRouter.get("/leagues/:id/tactics/analysis", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const userId = req.user?.id
  const club = userId ? await getManagedClub(leagueId, userId) : null
  const analyst = club
    ? await pool.query("SELECT * FROM staff_members WHERE club_id = $1 AND role = 'tactical_analyst' ORDER BY level DESC LIMIT 1", [club.id])
    : { rows: [] }
  const level = Number(analyst.rows[0]?.level ?? 0)
  res.json({
    available: level >= 3,
    level,
    recommendation:
      level >= 5
        ? "Opponent heat map flags their right half-space. Use 4-5-1, medium block, fast left transitions and mark their key winger."
        : level >= 3
          ? "Opponent often uses 4-3-3 high press. Recommended: 4-5-1 with direct transitions."
          : "Hire a level 3+ tactical analyst to unlock opponent recommendations.",
  })
})

gameSystemsRouter.post("/leagues/:id/youth/generate", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  const club = await getManagedClub(leagueId, userId)
  if (!club) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  const academyLevel = Math.min(5, Math.max(1, Number(req.body?.academyLevel ?? 3)))
  const count = Math.min(10, Math.max(5, Number(req.body?.count ?? 7)))
  const created = []
  for (let index = 0; index < count; index += 1) {
    const rating = 40 + academyLevel * 5 + ((index * 3) % 10)
    const potential = 55 + academyLevel * 7 + ((index * 5) % 14)
    const result = await pool.query(
      `INSERT INTO youth_players (club_id, league_id, display_name, nationality, age, position, rating, potential_hidden, revealed_potential)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $9::integer >= 4 THEN $8::integer ELSE NULL END)
       RETURNING *`,
      [
        club.id,
        leagueId,
        `Academy Prospect ${Date.now()}-${index + 1}`,
        ["Spain", "Brazil", "France", "Morocco", "Japan"][index % 5],
        16 + (index % 3),
        ["GK", "CB", "CM", "RW", "ST"][index % 5],
        rating,
        potential,
        academyLevel,
      ],
    )
    created.push(result.rows[0])
  }
  res.status(201).json({ ok: true, youthPlayers: created })
})

gameSystemsRouter.get("/leagues/:id/youth", async (req: AuthenticatedRequest, res: Response) => {
  const result = await pool.query("SELECT * FROM youth_players WHERE league_id = $1 ORDER BY potential_hidden DESC", [
    routeParam(req.params.id),
  ])
  res.json(result.rows)
})

gameSystemsRouter.post("/leagues/:id/assets/naming-rights", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const userId = req.user?.id
  const club = userId ? await getManagedClub(leagueId, userId) : null
  if (!club) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  const sponsor = req.body?.sponsor ?? ["Spotify", "Emirates", "Etihad", "Rakuten"][Date.now() % 4]
  const upfront = Number(req.body?.upfront ?? 12_000_000)
  const result = await pool.query(
    `INSERT INTO assets (club_id, league_id, type, name, valuation, monetized, payload)
     VALUES ($1, $2, 'naming_rights', $3, $4, TRUE, $5)
     RETURNING *`,
    [club.id, leagueId, `${sponsor} Stadium`, upfront, jsonb({ sponsor, annualFee: Math.round(upfront / 5), years: 5 })],
  )
  await pool.query("UPDATE club_finances SET balance = balance + $2, updated_at = NOW() WHERE club_id = $1", [club.id, upfront])
  res.status(201).json(result.rows[0])
})

gameSystemsRouter.post("/leagues/:id/loans", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const userId = req.user?.id
  const club = userId ? await getManagedClub(leagueId, userId) : null
  if (!club) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  const type = req.body?.type === "long_term" || req.body?.type === "revolving" ? req.body.type : "short_term"
  const principal = Number(req.body?.principal ?? 5_000_000)
  const interestRate = type === "short_term" ? 0.08 : type === "long_term" ? 0.05 : 0.12
  const termMonths = type === "short_term" ? 12 : type === "long_term" ? 60 : 24
  const monthlyPayment = Math.round((principal * (1 + interestRate)) / termMonths)
  const result = await pool.query(
    `INSERT INTO loans (club_id, league_id, type, principal, interest_rate, term_months, monthly_payment, remaining_balance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $4)
     RETURNING *`,
    [club.id, leagueId, type, principal, interestRate, termMonths, monthlyPayment],
  )
  await pool.query("UPDATE club_finances SET balance = balance + $2, long_term_debt = long_term_debt + $2 WHERE club_id = $1", [
    club.id,
    principal,
  ])
  res.status(201).json(result.rows[0])
})

gameSystemsRouter.get("/leagues/:id/ffp", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  const userId = req.user?.id
  const club = userId ? await getManagedClub(leagueId, userId) : null
  if (!club) {
    res.status(404).json({ error: "Managed club not found" })
    return
  }
  const finance = await pool.query("SELECT * FROM club_finances WHERE club_id = $1", [club.id])
  const row = finance.rows[0]
  const annualIncome = Number(row?.annual_income_projection ?? 52_000_000)
  const wageBillAnnual = Number(row?.weekly_wage_bill ?? 650_000) * 52
  const ratio = wageBillAnnual / Math.max(1, annualIncome)
  const crisis = ratio > 0.85
  res.json({
    wageRatio: ratio,
    salaryLimit: Math.round(annualIncome * 0.7),
    rule: crisis ? "1:4" : "1:1",
    status: row?.ffp_status ?? "compliant",
    levers: ["player_sales", "naming_rights", "capital_increase", "future_tv_rights"],
    sanctions: ratio > 0.95 ? ["transfer_ban", "points_deduction_risk"] : ratio > 0.7 ? ["warning"] : [],
  })
})

gameSystemsRouter.post("/leagues/:id/simulate-week", async (req: AuthenticatedRequest, res: Response) => {
  const leagueId = routeParam(req.params.id)
  await ensureLeaguePlayers(leagueId)
  const week = Number(req.body?.week ?? 1)
  const players = await pool.query<PlayerRow>(
    `SELECT p.*
     FROM players p INNER JOIN clubs c ON c.id = p.club_id
     WHERE c.league_id = $1
     ORDER BY p.fatigue DESC, p.age DESC
     LIMIT 200`,
    [leagueId],
  )
  let injuries = 0
  let personalEvents = 0
  let nationalCalls = 0
  for (const player of players.rows) {
    const injuryRisk = Number(player.fatigue) + Math.max(0, player.age - 30) * 3
    const injured = injuryRisk > 58 && injuries < 8
    const form = Math.max(1, Math.min(10, Number(player.fitness_form) + (player.morale - 55) / 80 - Number(player.fatigue) / 100))
    await pool.query(
      `INSERT INTO player_form (player_id, league_id, week, form, morale, fatigue, minutes_played)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [player.id, leagueId, week, form, player.morale, player.fatigue, player.status === "available" ? 90 : 0],
    )
    if (injured) {
      injuries += 1
      const type = player.age > 31 ? "muscular_reinjury" : player.fatigue > 70 ? "hamstring_tear" : "minor_muscle"
      await pool.query(
        `INSERT INTO player_events (player_id, league_id, type, payload, morale_delta, performance_delta, ends_at)
         VALUES ($1, $2, 'injury', $3, -5, -0.25, NOW() + ($4 || ' weeks')::interval)`,
        [player.id, leagueId, jsonb({ type, weeks: type === "hamstring_tear" ? 6 : 2 }), type === "hamstring_tear" ? 6 : 2],
      )
      await pool.query("UPDATE players SET status = 'injured', fatigue = 20, updated_at = NOW() WHERE id = $1", [player.id])
    } else if (personalEvents < 10 && player.morale < 50) {
      personalEvents += 1
      await pool.query(
        `INSERT INTO player_events (player_id, league_id, type, payload, morale_delta, performance_delta)
         VALUES ($1, $2, 'personal_event', $3, 15, 0.05)`,
        [player.id, leagueId, jsonb({ event: "family_good_news", description: "Birth of a child improves morale" })],
      )
    }
    if ([3, 6, 9, 10, 11].includes(new Date().getMonth() + 1) && player.rating > 78 && nationalCalls < 20) {
      nationalCalls += 1
      await pool.query(
        `INSERT INTO national_team_calls (player_id, league_id, nation, window_month, starts_at, ends_at, fatigue_return)
         VALUES ($1, $2, $3, EXTRACT(MONTH FROM CURRENT_DATE)::int, CURRENT_DATE, CURRENT_DATE + 14, 12)`,
        [player.id, leagueId, "Senior National Team"],
      )
    }
  }

  const clubs = await pool.query<ClubRow>("SELECT * FROM clubs WHERE league_id = $1", [leagueId])
  for (const club of clubs.rows) {
    const finance = await pool.query("SELECT * FROM club_finances WHERE club_id = $1", [club.id])
    const balance = Number(finance.rows[0]?.balance ?? 50_000_000)
    const income = { tickets: 750_000, tv: 650_000, sponsors: 180_000, prizes: 90_000 }
    const expenses = { wages: Number(finance.rows[0]?.weekly_wage_bill ?? 650_000), facilities: 95_000, staff: 130_000, bonuses: 40_000 }
    const net = Object.values(income).reduce((sum, value) => sum + value, 0) - Object.values(expenses).reduce((sum, value) => sum + value, 0)
    await pool.query(
      `INSERT INTO financial_history (club_id, league_id, week, income, expenses, net_result, balance_after, ffp_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [club.id, leagueId, week, jsonb(income), jsonb(expenses), net, balance + net, finance.rows[0]?.ffp_status ?? "compliant"],
    )
  }

  res.json({
    ok: true,
    week,
    playersProcessed: players.rows.length,
    injuries,
    personalEvents,
    nationalCalls,
    injuryModel: {
      seniorAgePenalty: "players over 30 gain extra risk",
      fatigueDriven: "high accumulated fatigue triggers muscle injuries",
      medicalCenterMitigation: "future club facility level reduces risk",
    },
  })
})
