const API_BASE_URL = process.env.TEST_API_URL || "http://localhost:3001"

async function api(path, options = {}) {
  const { token, ...rest } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers || {}),
    },
  })
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${text}`)
  }
  if (!payload && text) {
    throw new Error(`${path} returned non-JSON: ${text.slice(0, 120)}`)
  }
  return payload
}

async function registerUser(prefix, clubId, stamp) {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: `${prefix}-${stamp}@test.local`,
      password: "Password123!",
      displayName: prefix,
      clubId,
    }),
  })
}

describe("Pitch Perfect production API", () => {
  let stamp
  let userA
  let userB
  let leagueId
  let league

  beforeAll(async () => {
    stamp = Date.now()
    await expect(api("/health")).resolves.toEqual({ ok: true })
  })

  test("crear usuario, login y obtener JWT", async () => {
    userA = await registerUser("qa-a", "metropolis", stamp)
    expect(userA.token).toBeTruthy()
    const login = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: `qa-a-${stamp}@test.local`, password: "Password123!" }),
    })
    expect(login.user.id).toBe(userA.user.id)
  })

  test("crear liga y unirse con código", async () => {
    userB = await registerUser("qa-b", "harbor", stamp)
    const created = await api("/leagues", {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ name: `QA League ${stamp}`, clubId: "metropolis" }),
    })
    leagueId = created.id
    expect(created.inviteCode).toBeTruthy()
    league = await api("/leagues/join", {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ inviteCode: created.inviteCode, clubId: "harbor" }),
    })
    expect(league.clubs.length).toBeGreaterThanOrEqual(2)
  })

  test("restricción de mercado y flujo de ready", async () => {
    await api(`/leagues/${leagueId}/ready`, { method: "POST", token: userA.token })
    const ready = await api(`/leagues/${leagueId}/ready`, { method: "POST", token: userB.token })
    expect(ready.status).toBe("summer_market")
    await expect(
      api(`/leagues/${leagueId}/turn`, {
        method: "POST",
        token: userA.token,
        body: JSON.stringify({ clubId: league.clubs[0].id, lineup: [], tactics: {} }),
      }),
    ).rejects.toThrow("409")
  })

  test("hacer oferta, contraoferta y aceptar", async () => {
    const valuation = await api(`/leagues/${leagueId}/market/valuation?age=25&rating=85`, { token: userA.token })
    expect(valuation.value).toBeGreaterThanOrEqual(40000000)
    const countered = await api(`/leagues/${leagueId}/transfer-offers`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ playerName: "QA Midfielder", rating: 85, age: 25, offerFee: Math.round(valuation.value * 0.8) }),
    })
    expect(countered.status).toBe("countered")
    const accepted = await api(`/transfer-offers/${countered.id}/respond`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ status: "accepted" }),
    })
    expect(accepted.status).toBe("accepted")
  })

  test("flujo cooperativo completo: turnos, simulación, standings y finanzas", async () => {
    await api(`/leagues/${leagueId}/ready`, { method: "POST", token: userA.token })
    const active = await api(`/leagues/${leagueId}/ready`, { method: "POST", token: userB.token })
    expect(active.status).toBe("active")
    const full = await api(`/leagues/${leagueId}`, { token: userA.token })
    const clubA = full.clubs.find((club) => club.managerUserId === userA.user.id)
    const clubB = full.clubs.find((club) => club.managerUserId === userB.user.id)
    const draft = await api(`/leagues/${leagueId}/tactics`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ clubId: clubA.id, matchday: full.currentMatchday, lineup: Array.from({ length: 11 }, (_, index) => `A${index}`), tactics: { formation: "4-3-3" } }),
    })
    expect(draft.ok).toBe(true)
    const afterDraft = await api(`/leagues/${leagueId}`, { token: userA.token })
    expect(afterDraft.currentMatchday).toBe(full.currentMatchday)
    expect(afterDraft.turnStatus.submitted).toBe(0)
    const firstTurn = await api(`/leagues/${leagueId}/turn`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ clubId: clubA.id, matchday: full.currentMatchday }),
    })
    expect(firstTurn.advanced).toBe(false)
    await expect(
      api(`/leagues/${leagueId}/turn`, {
        method: "POST",
        token: userA.token,
        body: JSON.stringify({ clubId: clubA.id, matchday: full.currentMatchday }),
      }),
    ).rejects.toThrow("409")
    await api(`/leagues/${leagueId}/tactics`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ clubId: clubB.id, matchday: full.currentMatchday, lineup: Array.from({ length: 11 }, (_, index) => `B${index}`), tactics: { formation: "4-2-3-1" } }),
    })
    const turn = await api(`/leagues/${leagueId}/turn`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ clubId: clubB.id, matchday: full.currentMatchday }),
    })
    expect(turn.advanced).toBe(true)
    const afterAdvance = await api(`/leagues/${leagueId}`, { token: userA.token })
    expect(afterAdvance.turns.some((item) => item.userId === null && item.matchday === full.currentMatchday)).toBe(true)
    const standings = await api(`/leagues/${leagueId}/standings`, { token: userA.token })
    expect(standings.length).toBeGreaterThanOrEqual(6)
    expect(standings[0]).toHaveProperty("points")
    const finances = await api(`/leagues/${leagueId}/finances`, { token: userA.token })
    expect(finances.finance.projection).toHaveLength(12)
  })

  test("chat y notificaciones cooperativas", async () => {
    const message = await api(`/leagues/${leagueId}/chat`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ body: "QA negotiation ping", channel: "negotiations" }),
    })
    expect(message.body).toBe("QA negotiation ping")
    const notifications = await api("/notifications", { token: userB.token })
    expect(notifications.length).toBeGreaterThan(0)
  })

  test("modo solitario: enviar turno simula inmediatamente", async () => {
    const solo = await registerUser("qa-solo", "dynamo", stamp)
    const created = await api("/leagues", {
      method: "POST",
      token: solo.token,
      body: JSON.stringify({ name: `Solo League ${stamp}`, clubId: "dynamo" }),
    })
    await api(`/leagues/${created.id}/ready`, { method: "POST", token: solo.token })
    await api(`/leagues/${created.id}/ready`, { method: "POST", token: solo.token })
    const active = await api(`/leagues/${created.id}`, { token: solo.token })
    const club = active.clubs.find((item) => item.managerUserId === solo.user.id)
    await api(`/leagues/${created.id}/tactics`, {
      method: "POST",
      token: solo.token,
      body: JSON.stringify({ clubId: club.id, matchday: active.currentMatchday, lineup: Array.from({ length: 11 }, (_, index) => `S${index}`), tactics: { formation: "4-3-3" } }),
    })
    const turn = await api(`/leagues/${created.id}/turn`, {
      method: "POST",
      token: solo.token,
      body: JSON.stringify({ clubId: club.id, matchday: active.currentMatchday }),
    })
    expect(turn.turnStatus.total).toBe(1)
    expect(turn.advanced).toBe(true)
  })

  test("v5 jugadores, lesiones, forma, staff, cantera y fair play", async () => {
    const players = await api("/players?limit=25", { token: userA.token })
    expect(players.length).toBe(25)
    expect(players[0].attributes).toBeTruthy()
    expect(players[0].market_value).toBeGreaterThan(0)
    const playerDetail = await api(`/players/${players[0].id}`, { token: userA.token })
    expect(playerDetail.scouting.highLevel).toContain("potential_hidden")

    const generated = await api(`/leagues/${leagueId}/players/generate`, { method: "POST", token: userA.token })
    expect(generated.count).toBeGreaterThanOrEqual(100)

    const formations = await api("/tactics/formations", { token: userA.token })
    expect(formations.formations).toHaveLength(20)

    const staff = await api(`/leagues/${leagueId}/staff/hire`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ role: "tactical_analyst", level: 4, region: "Europe" }),
    })
    expect(staff.level).toBe(4)
    const analysis = await api(`/leagues/${leagueId}/tactics/analysis`, { token: userA.token })
    expect(analysis.available).toBe(true)

    const youth = await api(`/leagues/${leagueId}/youth/generate`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ academyLevel: 5, count: 8 }),
    })
    expect(youth.youthPlayers.length).toBeGreaterThanOrEqual(5)
    const promoted = await api(`/youth/${youth.youthPlayers[0].id}/promote`, { method: "POST", token: userA.token })
    expect(promoted.player.club_id).toBeTruthy()

    const loan = await api(`/leagues/${leagueId}/loans`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "short_term", principal: 3000000 }),
    })
    expect(loan.monthly_payment).toBeGreaterThan(0)

    const asset = await api(`/leagues/${leagueId}/assets/naming-rights`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ sponsor: "Emirates", upfront: 8000000 }),
    })
    expect(asset.monetized).toBe(true)
    const monetized = await api(`/leagues/${leagueId}/assets/monetize`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "future_tv_rights", valuation: 4000000 }),
    })
    expect(monetized.type).toBe("future_tv_rights")
    const watchlist = await api(`/leagues/${leagueId}/watchlist`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ playerId: players[0].id, targetPrice: players[0].market_value - 1000000 }),
    })
    expect(watchlist.alert_enabled).toBe(true)

    const week = await api(`/leagues/${leagueId}/simulate-week`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ week: 2 }),
    })
    expect(week.playersProcessed).toBeGreaterThan(0)
    expect(week).toHaveProperty("injuries")
    expect(week).toHaveProperty("personalEvents")

    const ffp = await api(`/leagues/${leagueId}/ffp`, { token: userA.token })
    expect(["1:1", "1:4"]).toContain(ffp.rule)
    expect(ffp.levers).toContain("naming_rights")
  })

  test("v6 configuración de liga: humanos, bots, presupuesto, turn window y disponibilidad", async () => {
    const owner = await registerUser("qa-owner", "metropolis", `${stamp}-v6`)
    const configured = await api("/leagues", {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({
        name: `Configured League ${stamp}`,
        clubId: "metropolis",
        humanManagers: 5,
        budget: 42000000,
        turnWindowHours: 72,
      }),
    })
    const full = await api(`/leagues/${configured.id}`, { token: owner.token })
    expect(full.settings.humanManagers).toBe(5)
    expect(full.settings.botManagers).toBe(15)
    expect(full.settings.turnWindowHours).toBe(72)
    expect(full.transferWindow.budget).toBe(42000000)
    expect(full.clubs.filter((club) => club.managerUserId === null)).toHaveLength(15)
    const availability = await api(`/leagues/invite/${configured.inviteCode}/clubs/availability`, { token: owner.token })
    const metropolis = availability.find((club) => club.id === "metropolis")
    const harbor = availability.find((club) => club.id === "harbor")
    expect(metropolis.taken).toBe(true)
    expect(metropolis.managerName).toBeTruthy()
    expect(harbor.taken).toBe(false)
  })
})
