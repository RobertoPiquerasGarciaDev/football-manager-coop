const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

type ApiOptions = RequestInit & {
  token?: string | null
}

export type AuthUser = {
  id: string
  email: string
  displayName: string
  clubId: string | null
}

export type AuthResponse = {
  user: AuthUser
  token: string
}

export type LeagueResponse = {
  id: string
  name: string
  inviteCode: string | null
  commissionerUserId?: string | null
  settings: Record<string, unknown>
  currentMatchday: number
  status: string
  createdAt: string
  updatedAt: string
  clubs?: ClubResponse[]
  matches?: unknown[]
  turns?: unknown[]
  tacticDrafts?: unknown[]
  standings?: StandingRow[]
  turnStatus?: TurnStatus
  transferWindow?: TransferWindow | null
}

export type ClubResponse = {
  id: string
  leagueId: string
  managerUserId: string | null
  name: string
  shortName: string
  squad: unknown[]
  tactics: Record<string, unknown>
  finances: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type TurnStatus = {
  submitted: number
  total: number
  allSubmitted: boolean
}

export type TransferWindow = {
  phase: "lobby" | "summer_market" | "season" | "winter_market" | string
  summerReady: string[]
  winterReady: string[]
  budget: number
}

export type ClubAvailability = {
  id: string
  name: string
  shortName: string
  taken: boolean
  managerName: string | null
}

export type NotificationItem = {
  id: string
  userId: string
  leagueId?: string | null
  type: string
  payload: Record<string, unknown>
  read: boolean
  createdAt: string
}

export type ClubFinance = {
  clubId: string
  leagueId: string
  balance: number
  transferBudget: number
  wageBudget: number
  weeklyWageBill: number
  longTermDebt: number
  annualIncomeProjection: number
  bankrupt: boolean
  ffpStatus: string
  projection: Array<{ week: number; projectedBalance: number; projectedDebt: number }>
  updatedAt: string
}

export type StandingRow = {
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

export type TurnPayload = {
  clubId: string
  matchday?: number
  lineup: unknown
  tactics: unknown
}

async function apiFetch<T>(path: string, { token, headers, ...options }: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const responseText = await response.text()
  const payload = responseText
    ? (() => {
        try {
          return JSON.parse(responseText) as { error?: string }
        } catch {
          return null
        }
      })()
    : null
  if (!response.ok) {
    throw new Error(payload?.error ?? (responseText || "API request failed"))
  }

  return payload as T
}

export function register(email: string, password: string, displayName: string, clubId: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName, clubId }),
  })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function createLeague(
  token: string,
  name = "Cooperative League",
  clubId = "metropolis",
  options: { budget?: number; humanManagers?: number; turnWindowHours?: 24 | 48 | 72 } = {},
): Promise<LeagueResponse> {
  const budget = options.budget ?? 25000000
  const humanManagers = options.humanManagers ?? 2
  const turnWindowHours = options.turnWindowHours ?? 48
  return apiFetch<LeagueResponse>("/leagues", {
    method: "POST",
    token,
    body: JSON.stringify({
      name,
      clubId,
      budget,
      humanManagers,
      turnWindowHours,
      settings: {
        turnWindowHours,
        humanManagers,
        botManagers: 20 - humanManagers,
        initialBudget: budget,
        privacy: "private",
      },
    }),
  })
}

export function joinLeague(token: string, inviteCode: string, clubId = "metropolis"): Promise<LeagueResponse> {
  return apiFetch<LeagueResponse>("/leagues/join", {
    method: "POST",
    token,
    body: JSON.stringify({ inviteCode, clubId }),
  })
}

export function listLeagues(token: string): Promise<LeagueResponse[]> {
  return apiFetch<LeagueResponse[]>("/leagues", { token })
}

export function fetchLeague(token: string, leagueId: string): Promise<LeagueResponse> {
  return apiFetch<LeagueResponse>(`/leagues/${leagueId}`, { token })
}

export function fetchClubAvailability(token: string, leagueId: string): Promise<ClubAvailability[]> {
  return apiFetch<ClubAvailability[]>(`/leagues/${leagueId}/clubs/availability`, { token })
}

export function fetchClubAvailabilityByInvite(token: string, inviteCode: string): Promise<ClubAvailability[]> {
  return apiFetch<ClubAvailability[]>(`/leagues/invite/${inviteCode.trim().toUpperCase()}/clubs/availability`, { token })
}

export function markLeagueReady(token: string, leagueId: string) {
  return apiFetch<{ ok: boolean; status: string; transferWindow: TransferWindow | null; readyCount: number; total: number }>(
    `/leagues/${leagueId}/ready`,
    {
      method: "POST",
      token,
    },
  )
}

export function submitTurn(token: string, leagueId: string, payload: TurnPayload) {
  return apiFetch<{ ok: boolean; turn: unknown; turnStatus: TurnStatus; advanced: boolean }>(`/leagues/${leagueId}/turn`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
}

export function saveTactics(token: string, leagueId: string, payload: TurnPayload) {
  return apiFetch<{ ok: boolean; draft: unknown; turnStatus: TurnStatus }>(`/leagues/${leagueId}/tactics`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
}

export function simulateMatchday(token: string, leagueId: string) {
  return apiFetch<{ ok: boolean; turnStatus: TurnStatus; advanced: boolean; standings: StandingRow[] }>(
    `/leagues/${leagueId}/simulate-matchday`,
    {
      method: "POST",
      token,
    },
  )
}

export function fetchMatchday(token: string, leagueId: string) {
  return apiFetch<{ leagueId: string; matchday: number; status: string; turnStatus: TurnStatus; matches: unknown[]; turns: unknown[] }>(
    `/leagues/${leagueId}/matchday`,
    { token },
  )
}

export function getStandings(token: string, leagueId: string): Promise<StandingRow[]> {
  return apiFetch<StandingRow[]>(`/leagues/${leagueId}/standings`, { token })
}

export function getNotifications(token: string): Promise<NotificationItem[]> {
  return apiFetch<NotificationItem[]>("/notifications", { token })
}

export function markNotificationRead(token: string, notificationId: string): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${notificationId}/read`, { method: "POST", token })
}

export function createTransfer(token: string, leagueId: string, playerName: string, fee: number) {
  return apiFetch<{ ok: boolean; transfer: unknown }>(`/leagues/${leagueId}/transfers`, {
    method: "POST",
    token,
    body: JSON.stringify({ playerName, fee }),
  })
}

export function fetchFinances(token: string, leagueId: string): Promise<{ finance: ClubFinance; events: unknown[] }> {
  return apiFetch<{ finance: ClubFinance; events: unknown[] }>(`/leagues/${leagueId}/finances`, { token })
}

export function valuePlayer(token: string, leagueId: string, params: { age: number; rating: number; potential?: number }) {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))
  return apiFetch<{ value: number }>(`/leagues/${leagueId}/market/valuation?${query.toString()}`, { token })
}

export function createTransferOffer(
  token: string,
  leagueId: string,
  payload: { playerName: string; offerFee: number; rating?: number; age?: number; operationType?: string },
) {
  return apiFetch<unknown>(`/leagues/${leagueId}/transfer-offers`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
}

export function sendChatMessage(token: string, leagueId: string, body: string, channel = "general") {
  return apiFetch<unknown>(`/leagues/${leagueId}/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ body, channel }),
  })
}

export type StaffMember = {
  id: string
  name: string
  role: string
  level: number
  region?: string | null
  weekly_wage?: number
}

export function fetchPlayers(token: string, leagueId: string) {
  return apiFetch<unknown[]>(`/leagues/${leagueId}/players`, { token })
}

export function fetchFormations(token: string) {
  return apiFetch<{ formations: Array<{ id: string; description: string; strengths: string; weaknesses: string }> }>("/tactics/formations", {
    token,
  })
}

export function fetchStaff(token: string, leagueId: string): Promise<StaffMember[]> {
  return apiFetch<StaffMember[]>(`/leagues/${leagueId}/staff`, { token })
}

export function hireStaff(token: string, leagueId: string, payload: { role: string; level: number; region?: string }) {
  return apiFetch<StaffMember>(`/leagues/${leagueId}/staff/hire`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
}

export function generateYouth(token: string, leagueId: string, academyLevel = 3) {
  return apiFetch<{ ok: boolean; youthPlayers: unknown[] }>(`/leagues/${leagueId}/youth/generate`, {
    method: "POST",
    token,
    body: JSON.stringify({ academyLevel }),
  })
}

export function simulateWeek(token: string, leagueId: string, week = 1) {
  return apiFetch<{ ok: boolean; injuries: number; personalEvents: number; nationalCalls: number; playersProcessed: number }>(
    `/leagues/${leagueId}/simulate-week`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ week }),
    },
  )
}
