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
    await api(`/leagues/${leagueId}/turn`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ clubId: clubA.id, matchday: full.currentMatchday, lineup: Array.from({ length: 11 }, (_, index) => `A${index}`), tactics: { formation: "4-3-3" } }),
    })
    const turn = await api(`/leagues/${leagueId}/turn`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ clubId: clubB.id, matchday: full.currentMatchday, lineup: Array.from({ length: 11 }, (_, index) => `B${index}`), tactics: { formation: "4-2-3-1" } }),
    })
    expect(turn.advanced).toBe(true)
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
})
