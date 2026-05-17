const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

type ApiOptions = RequestInit & {
  token?: string | null
}

export type AuthUser = {
  id: string
  email: string
  displayName: string
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
  standings?: StandingRow[]
  turnStatus?: TurnStatus
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

  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    throw new Error(payload?.error ?? "API request failed")
  }

  return payload as T
}

export function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function createLeague(token: string, name = "Cooperative League"): Promise<LeagueResponse> {
  return apiFetch<LeagueResponse>("/leagues", {
    method: "POST",
    token,
    body: JSON.stringify({
      name,
      settings: {
        turnWindowHours: 48,
        privacy: "private",
      },
    }),
  })
}

export function joinLeague(token: string, inviteCode: string): Promise<LeagueResponse> {
  return apiFetch<LeagueResponse>("/leagues/join", {
    method: "POST",
    token,
    body: JSON.stringify({ inviteCode }),
  })
}

export function fetchLeague(token: string, leagueId: string): Promise<LeagueResponse> {
  return apiFetch<LeagueResponse>(`/leagues/${leagueId}`, { token })
}

export function submitTurn(token: string, leagueId: string, payload: TurnPayload) {
  return apiFetch<{ ok: boolean; turn: unknown; turnStatus: TurnStatus }>(`/leagues/${leagueId}/turn`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
}

export function getStandings(token: string, leagueId: string): Promise<StandingRow[]> {
  return apiFetch<StandingRow[]>(`/leagues/${leagueId}/standings`, { token })
}
