"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Home, Settings, Upload, Users } from "lucide-react"
import { AuthScreen } from "@/components/auth-screen"
import { TopBar } from "@/components/top-bar"
import { NextMatchCard } from "@/components/next-match-card"
import { QuickStats } from "@/components/quick-stats"
import { SquadMorale } from "@/components/squad-morale"
import { TransferAlerts } from "@/components/transfer-alerts"
import { LeagueTable } from "@/components/league-table"
import { BottomNav } from "@/components/bottom-nav"
import { SquadSection } from "@/components/squad-section"
import { TacticsSection } from "@/components/tactics-section"
import { MarketSection } from "@/components/market-section"
import { LeagueSection } from "@/components/league-section"
import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { useLeagueSync } from "@/hooks/use-league-sync"
import { useLeagueRealtime } from "@/hooks/use-league-realtime"
import { useToast } from "@/hooks/use-toast"
import { createLeague, createTransfer, fetchLeague, joinLeague, listLeagues, markLeagueReady, markNotificationRead, submitTurn, type LeagueResponse } from "@/lib/api"
import { useGame } from "@/lib/game-provider"
import { useNotifications } from "@/lib/notifications"
import type { GameSave, Match, MatchEvent } from "@/lib/types"

const AcademySection = dynamic(() => import("@/components/academy-section").then((mod) => mod.AcademySection))
const CooperativeSection = dynamic(() => import("@/components/cooperative-section").then((mod) => mod.CooperativeSection))
const FinanceSection = dynamic(() => import("@/components/finance-section").then((mod) => mod.FinanceSection))
const SettingsSection = dynamic(() => import("@/components/settings-section").then((mod) => mod.SettingsSection))
const StaffSection = dynamic(() => import("@/components/staff-section").then((mod) => mod.StaffSection))

export type TabId = "dashboard" | "squad" | "tactics" | "market" | "league" | "academy" | "finance" | "staff" | "coop" | "settings"

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-4 pt-4 pb-1">
      <h1 className="text-lg font-black text-foreground">{title}</h1>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function findSimulatedUserMatch(previousSave: GameSave, nextSave: GameSave): Match | null {
  const previousMatches = new Map(previousSave.matches.map((match) => [match.id, match]))
  const simulatedMatches = nextSave.matches.filter((match) => {
    const previous = previousMatches.get(match.id)
    return previous?.status === "scheduled" && match.status === "finished"
  })

  return (
    simulatedMatches.find(
      (match) => match.homeClubId === nextSave.userClubId || match.awayClubId === nextSave.userClubId,
    ) ??
    simulatedMatches[0] ??
    null
  )
}

function getClubName(save: GameSave, clubId: string): string {
  return save.clubs.find((club) => club.id === clubId)?.name ?? "Unknown club"
}

function getPlayerName(save: GameSave, event: MatchEvent): string {
  if (!event.playerId) return "Unknown player"
  return save.players.find((player) => player.id === event.playerId)?.displayName ?? "Unknown player"
}

const selectableClubs = [
  { id: "metropolis", name: "FC Metropolis", city: "Capital" },
  { id: "harbor", name: "Harbor City", city: "Bay" },
  { id: "dynamo", name: "Capital Dynamo", city: "Capital" },
  { id: "rovers", name: "Pacific Rovers", city: "Pacific" },
]

function getLeagueStatusLabel(league: LeagueResponse) {
  if (league.status === "active") return `Jornada ${league.currentMatchday}`
  if (league.status === "winter_market") return "Mercado de invierno abierto"
  if (league.transferWindow?.phase === "summer_market") return "Mercado de verano abierto"
  return "Esperando jugadores"
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [resultSave, setResultSave] = useState<GameSave | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [leagueName, setLeagueName] = useState("Pitch Perfect League")
  const [selectedClub, setSelectedClub] = useState("metropolis")
  const [hubLeagues, setHubLeagues] = useState<LeagueResponse[]>([])
  const [leagueSyncMessage, setLeagueSyncMessage] = useState<string | null>(null)
  const [leagueSyncError, setLeagueSyncError] = useState<string | null>(null)
  const [remoteLeague, setRemoteLeague] = useState<LeagueResponse | null>(null)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [isLeagueActionPending, setIsLeagueActionPending] = useState(false)
  const [isTurnSubmitting, setIsTurnSubmitting] = useState(false)
  const [currentTacticsDraft, setCurrentTacticsDraft] = useState<{ lineup: unknown[]; tactics: Record<string, unknown> } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem("fm-coop-onboarded") !== "true",
  )
  const { isLoading, token, user, logout } = useAuth()
  const { toast } = useToast()
  const { save } = useGame()
  const notifications = useNotifications(token, user?.id ?? null)
  const leagueSync = useLeagueSync({
    token,
    leagueId: selectedLeagueId,
    onMessage: setLeagueSyncMessage,
  })

  const goals = resultMatch?.events.filter((event) => event.type === "goal") ?? []
  const cards =
    resultMatch?.events.filter((event) => event.type === "yellow_card" || event.type === "red_card") ?? []

  useEffect(() => {
    if (leagueSync.league) setRemoteLeague(leagueSync.league)
  }, [leagueSync.league])

  const refreshLeagues = useCallback(async () => {
    if (!token) return
    try {
      const leagues = await listLeagues(token)
      setHubLeagues(leagues)
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudieron cargar tus ligas")
    }
  }, [token])

  useEffect(() => {
    void refreshLeagues()
  }, [refreshLeagues])

  const refreshRemoteLeague = useCallback(async () => {
    if (!token || !remoteLeague?.id) return

    try {
      const league = await fetchLeague(token, remoteLeague.id)
      setRemoteLeague(league)
      await refreshLeagues()
      if (league.turnStatus?.allSubmitted) {
        setLeagueSyncMessage("Todos los managers han enviado su turno. Dashboard actualizado.")
      } else if (league.turnStatus) {
        setLeagueSyncMessage(`Turnos enviados: ${league.turnStatus.submitted}/${league.turnStatus.total}`)
      }
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo refrescar la liga")
    }
  }, [refreshLeagues, remoteLeague?.id, token])

  useLeagueRealtime({
    leagueId: remoteLeague?.id ?? null,
    onTurnChange: refreshRemoteLeague,
  })

  const userClubInLeague = useMemo(
    () => remoteLeague?.clubs?.find((club) => club.managerUserId === user?.id) ?? null,
    [remoteLeague?.clubs, user?.id],
  )

  const readyUsers = remoteLeague?.status === "winter_market"
    ? remoteLeague.transferWindow?.winterReady ?? []
    : remoteLeague?.transferWindow?.summerReady ?? []
  const readyCount = readyUsers.length
  const managerCount = remoteLeague?.turnStatus?.total ?? remoteLeague?.clubs?.filter((club) => club.managerUserId).length ?? 0
  const isReady = user?.id ? readyUsers.includes(user.id) : false
  const turnRows = (remoteLeague?.turns ?? []) as Array<{ userId?: string | null; matchday?: number }>
  const hasSubmittedTurn = turnRows.some((turn) => turn.userId === user?.id && turn.matchday === remoteLeague?.currentMatchday)
  const selectedTactics = currentTacticsDraft?.tactics ?? userClubInLeague?.tactics ?? {}
  const selectedLineup = currentTacticsDraft?.lineup?.length
    ? currentTacticsDraft.lineup
    : Array.isArray(selectedTactics.lineup) && selectedTactics.lineup.length > 0
    ? selectedTactics.lineup.slice(0, 11)
    : Array.from({ length: 11 }, (_, index) => `Titular ${index + 1}`)
  const isMarketOpen = remoteLeague?.status === "summer_market" || remoteLeague?.status === "winter_market"

  async function handleCreateLeague() {
    if (!token) return
    setIsLeagueActionPending(true)
    setLeagueSyncError(null)
    setLeagueSyncMessage(null)

    try {
      const league = await createLeague(token, leagueName.trim() || `${save.name} League`, selectedClub)
      setRemoteLeague(league)
      setSelectedLeagueId(league.id)
      setLeagueSyncMessage(`Liga creada. Codigo: ${league.inviteCode ?? "sin codigo"}`)
      toast({ title: "Cooperative league created", description: `Invite code: ${league.inviteCode ?? "pending"}` })
      await refreshLeagues()
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo crear la liga")
    } finally {
      setIsLeagueActionPending(false)
    }
  }

  async function handleJoinLeague() {
    if (!token || !inviteCode.trim()) return
    setIsLeagueActionPending(true)
    setLeagueSyncError(null)
    setLeagueSyncMessage(null)

    try {
      const league = await joinLeague(token, inviteCode, selectedClub)
      setRemoteLeague(league)
      setSelectedLeagueId(league.id)
      setLeagueSyncMessage(`Te has unido a ${league.name}`)
      toast({ title: "Joined league", description: league.name })
      await refreshLeagues()
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo unir a la liga")
    } finally {
      setIsLeagueActionPending(false)
    }
  }

  async function handleReady() {
    if (!token || !remoteLeague?.id) return
    setIsLeagueActionPending(true)
    setLeagueSyncError(null)
    try {
      const response = await markLeagueReady(token, remoteLeague.id)
      const league = await fetchLeague(token, remoteLeague.id)
      setRemoteLeague(league)
      await refreshLeagues()
      toast({
        title: response.status === "active" ? "Temporada iniciada" : "Listo registrado",
        description: `${response.readyCount}/${response.total} managers listos`,
      })
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo marcar listo")
    } finally {
      setIsLeagueActionPending(false)
    }
  }

  async function handleSubmitTurn() {
    const clubId = remoteLeague?.clubs?.find((club) => club.managerUserId === user?.id)?.id
    if (!token || !remoteLeague?.id || !clubId) return

    setIsTurnSubmitting(true)
    setLeagueSyncError(null)
    setLeagueSyncMessage(null)

    try {
      const response = await submitTurn(token, remoteLeague.id, {
        clubId,
        matchday: remoteLeague.currentMatchday,
        lineup: selectedLineup,
        tactics: selectedTactics,
      })
      setRemoteLeague((league) => (league ? { ...league, turnStatus: response.turnStatus } : league))
      setLeagueSyncMessage(
        response.advanced
          ? "Todos los managers enviaron turno. Jornada simulada y resultados actualizados."
          : response.turnStatus.allSubmitted
          ? "Todos los managers han enviado su turno. Dashboard actualizado."
          : `Turno enviado: ${response.turnStatus.submitted}/${response.turnStatus.total}`,
      )
      toast({
        title: response.advanced ? "Matchday advanced" : "Turn submitted",
        description: response.advanced
          ? "Realtime results are now available for every manager."
          : response.turnStatus.total === 1
            ? "Modo solitario: la jornada se simula al enviar."
            : `${Math.max(0, response.turnStatus.total - response.turnStatus.submitted)} managers pendientes`,
      })
      await refreshRemoteLeague()
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo enviar el turno")
    } finally {
      setIsTurnSubmitting(false)
    }
  }

  async function handleCreateTransfer(playerName: string, fee: number) {
    if (!token || !remoteLeague?.id) return
    try {
      await createTransfer(token, remoteLeague.id, playerName, fee)
      await leagueSync.refresh()
      toast({ title: "Fichaje sincronizado", description: `${playerName} aparece en el feed realtime de la liga.` })
    } catch (error) {
      toast({ title: "Mercado bloqueado", description: error instanceof Error ? error.message : "No se pudo crear el fichaje" })
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center text-sm text-muted-foreground">Cargando sesion...</div>
  }

  if (!user || !token) {
    return <AuthScreen />
  }

  if (!remoteLeague) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative overflow-hidden">
        <div className="fixed top-0 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-[var(--amber)]/10 blur-[120px]" />
        <main className="relative z-10 px-4 py-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--amber)]">Pitch Perfect</p>
              <h1 className="mt-2 text-3xl font-black text-foreground">Pantalla de inicio</h1>
              <p className="text-sm text-muted-foreground">Elige una liga activa antes de entrar al dashboard.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>

          <section className="mb-4 rounded-3xl border border-border/50 bg-card/90 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-foreground">Mis Ligas</h2>
              <Badge variant="secondary">{hubLeagues.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {hubLeagues.map((league) => (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => {
                    setRemoteLeague(league)
                    setSelectedLeagueId(league.id)
                  }}
                  className="rounded-2xl border border-border/50 bg-secondary/30 p-3 text-left transition hover:border-[var(--amber)] hover:bg-[var(--amber)]/10 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-foreground">{league.name}</p>
                    <Badge variant={league.status === "active" ? "default" : "outline"}>{getLeagueStatusLabel(league)}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {league.clubs?.find((club) => club.managerUserId === user.id)?.name ?? "Club pendiente"} · Codigo{" "}
                    {league.inviteCode ?? "privado"}
                  </p>
                </button>
              ))}
              {hubLeagues.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Aun no tienes ligas. Crea una o unete con codigo.
                </p>
              )}
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-border/50 bg-card/90 p-4">
            <h2 className="mb-3 text-sm font-black text-foreground">Elige tu equipo</h2>
            <div className="grid grid-cols-2 gap-2">
              {selectableClubs.map((club, index) => {
                const selected = selectedClub === club.id
                return (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => setSelectedClub(club.id)}
                    className={`card-3d rounded-2xl border p-3 text-left animate-card-enter ${
                      selected ? "border-[var(--amber)] bg-[var(--amber)]/15 shadow-[0_0_22px_var(--amber-glow)]" : "border-border/50 bg-secondary/30"
                    }`}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-foreground">{club.name}</p>
                        <p className="text-[10px] text-muted-foreground">{club.city}</p>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-[var(--amber)]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-border/50 bg-card/90 p-4">
            <h2 className="mb-3 text-sm font-black text-foreground">Crear Liga</h2>
            <div className="flex flex-col gap-2">
              <Input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} placeholder="Nombre de liga" />
              <Button type="button" onClick={handleCreateLeague} disabled={isLeagueActionPending}>
                <Users className="h-4 w-4" />
                Crear con {selectableClubs.find((club) => club.id === selectedClub)?.name}
              </Button>
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-border/50 bg-card/90 p-4">
            <h2 className="mb-3 text-sm font-black text-foreground">Unirse a Liga</h2>
            <div className="flex gap-2">
              <Input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder="Codigo de invitacion"
                className="uppercase"
              />
              <Button type="button" variant="secondary" onClick={handleJoinLeague} disabled={isLeagueActionPending}>
                Unirse
              </Button>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border/50 bg-card/90">
              <CardContent className="p-4">
                <Upload className="mb-2 h-5 w-5 text-[var(--amber)]" />
                <p className="text-sm font-black">Gestionar Licencias</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Importa escudos, kits y packs desde localStorage.</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/90">
              <CardContent className="p-4">
                <Settings className="mb-2 h-5 w-5 text-[var(--amber)]" />
                <p className="text-sm font-black">Ajustes</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Perfil, preferencias, tema y sonidos.</p>
              </CardContent>
            </Card>
          </div>
          {leagueSyncError && <p className="mt-3 text-xs text-destructive">{leagueSyncError}</p>}
          {leagueSyncMessage && <p className="mt-3 text-xs text-[var(--success-green)]">{leagueSyncMessage}</p>}
        </main>
      </div>
    )
  }

  if (remoteLeague.status !== "active" && !isMarketOpen) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto px-4 py-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => {
          setRemoteLeague(null)
          setSelectedLeagueId(null)
        }}>
          <Home className="h-4 w-4" />
          Volver al hub
        </Button>
        <div className="mt-5 rounded-3xl border border-border/50 bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--amber)]">Lobby de liga</p>
          <h1 className="mt-2 text-2xl font-black text-foreground">{remoteLeague.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{getLeagueStatusLabel(remoteLeague)}</p>
          <div className="mt-4 rounded-2xl bg-secondary/40 p-3">
            <p className="text-xs font-bold text-foreground">Codigo de invitacion</p>
            <p className="mt-1 text-2xl font-black tracking-[0.25em] text-[var(--amber)]">{remoteLeague.inviteCode ?? "PRIVADO"}</p>
          </div>
        </div>

        <section className="mt-4 rounded-3xl border border-border/50 bg-card p-4">
          <h2 className="mb-3 text-sm font-black text-foreground">Managers unidos</h2>
          <div className="flex flex-col gap-2">
            {remoteLeague.clubs?.map((club) => (
              <div key={club.id} className="flex items-center justify-between rounded-2xl bg-secondary/40 p-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{club.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {club.managerUserId === user.id ? "Tu club" : club.managerUserId ? "Manager rival" : "Disponible"}
                  </p>
                </div>
                <Badge variant={club.managerUserId === user.id ? "default" : "secondary"}>{club.shortName}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-4">
          <h2 className="text-sm font-black text-foreground">
            {remoteLeague.status === "winter_market" ? "Mercado de invierno sincronizado" : "Mercado de verano sincronizado"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Nadie puede entrar al dashboard ni simular jornadas hasta que todos hayan marcado listo.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-[var(--amber)] transition-all"
              style={{ width: `${managerCount > 0 ? Math.min(100, (readyCount / managerCount) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-foreground">
            {readyCount}/{managerCount} managers listos
          </p>
          <Button type="button" className="mt-3 w-full" onClick={handleReady} disabled={isLeagueActionPending || isReady}>
            {isReady ? "Ya estas listo" : "Listo para empezar"}
          </Button>
          {leagueSyncError && <p className="mt-3 text-xs text-destructive">{leagueSyncError}</p>}
        </section>

        <section className="mt-4 rounded-3xl border border-border/50 bg-card p-4">
          <h2 className="text-sm font-black text-foreground">Chat del lobby</h2>
          <p className="mt-2 rounded-2xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            Chat General / Negociaciones / Comisionado preparado para eventos realtime de la liga.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--amber)] opacity-[0.03] blur-[120px] pointer-events-none" />

      <TopBar
        notificationCount={notifications.unreadCount}
        onNotificationsClick={() => notifications.setIsOpen(true)}
        marketStatus={isMarketOpen ? getLeagueStatusLabel(remoteLeague) : "Mercado cerrado · temporada activa"}
      />
      {showOnboarding && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-4">
            <h2 className="text-sm font-black text-foreground">Welcome to Football Manager Cooperative</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a league, invite managers, submit turns, train your academy and simulate matchdays with finance and morale impact.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => {
                window.localStorage.setItem("fm-coop-onboarded", "true")
                setShowOnboarding(false)
              }}
            >
              Start managing
            </Button>
          </div>
        </div>
      )}
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-border/50 bg-card p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-foreground">Manager online</p>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-2xl bg-secondary/40 p-3">
              <div>
                <p className="text-xs font-black text-foreground">{remoteLeague.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {userClubInLeague?.name ?? "Club sin asignar"} · {getLeagueStatusLabel(remoteLeague)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setRemoteLeague(null)
                setSelectedLeagueId(null)
              }}>
                Hub
              </Button>
            </div>
            {(leagueSyncMessage || remoteLeague) && (
              <p className="text-[11px] text-[var(--success-green)]">
                {leagueSyncMessage ?? `Liga activa: ${remoteLeague?.name}`}
              </p>
            )}
            {remoteLeague.status === "active" && (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSubmitTurn}
                  disabled={hasSubmittedTurn || isTurnSubmitting || !remoteLeague.clubs?.some((club) => club.managerUserId === user?.id)}
                >
                  {hasSubmittedTurn
                    ? `✓ Listo - esperando ${Math.max(0, (remoteLeague.turnStatus?.total ?? 0) - (remoteLeague.turnStatus?.submitted ?? 0))} managers`
                    : isTurnSubmitting
                      ? "Enviando turno..."
                      : "Enviar Turno · Estoy listo para esta jornada"}
                </Button>
              </div>
            )}
            {isMarketOpen && (
              <div className="rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-3">
                <p className="text-xs font-black text-foreground">{getLeagueStatusLabel(remoteLeague)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  El mercado esta abierto: puedes fichar, pero la simulacion de jornada esta bloqueada.
                </p>
                <Button type="button" size="sm" className="mt-2 w-full" onClick={handleReady} disabled={isLeagueActionPending || isReady}>
                  {isReady ? "Listo para cerrar mercado" : "Listo para empezar temporada"}
                </Button>
              </div>
            )}
            {remoteLeague?.turnStatus && (
              <p className="text-[11px] text-muted-foreground">
                {remoteLeague.turnStatus.submitted}/{remoteLeague.turnStatus.total} managers humanos han enviado turno
              </p>
            )}
            {leagueSyncError && <p className="text-[11px] text-destructive">{leagueSyncError}</p>}
          </div>
        </div>
      </div>

      <main className="pb-24">
        {activeTab === "dashboard" && (
          <>
            <NextMatchCard />
            <QuickStats />
            <SquadMorale />
            <TransferAlerts />
            <LeagueTable onlineStandings={remoteLeague.standings} />
          </>
        )}

        {activeTab === "squad" && (
          <>
            <SectionTitle title="Squad Management" subtitle="Manage your players, fitness & contracts" />
            <SquadSection />
          </>
        )}

        {activeTab === "tactics" && (
          <>
            <SectionTitle title="Tactics Board" subtitle="Set formation, play style & instructions" />
            <TacticsSection
              online={
                userClubInLeague
                  ? {
                      leagueId: remoteLeague.id,
                      clubId: userClubInLeague.id,
                      matchday: remoteLeague.currentMatchday,
                      initialTactics: userClubInLeague.tactics,
                      hasSubmittedTurn,
                      onDraftChange: setCurrentTacticsDraft,
                      onSaved: leagueSync.refresh,
                    }
                  : undefined
              }
            />
          </>
        )}

        {activeTab === "market" && (
          <>
            <SectionTitle title="Transfer Market" subtitle="Scout, bid & negotiate player transfers" />
            <MarketSection isMarketOpen={isMarketOpen} onCreateTransfer={handleCreateTransfer} />
          </>
        )}

        {activeTab === "league" && (
          <>
            <SectionTitle title="League Overview" subtitle="Standings, results & statistics" />
            <LeagueSection />
          </>
        )}

        {activeTab === "academy" && (
          <>
            <SectionTitle title="Academy & Training" subtitle="Develop prospects and set weekly training" />
            <AcademySection />
          </>
        )}

        {activeTab === "finance" && (
          <>
            <SectionTitle title="Finance Office" subtitle="Track income, expenses and fair play risk" />
            <FinanceSection />
          </>
        )}

        {activeTab === "staff" && (
          <>
            <SectionTitle title="Staff Room" subtitle="Hire coaches, scouts, analysts and medical staff" />
            <StaffSection leagueId={remoteLeague.id} />
          </>
        )}

        {activeTab === "coop" && (
          <>
            <SectionTitle title="Co-op Hub" subtitle="League chat, turn status and commissioner controls" />
            <CooperativeSection />
          </>
        )}

        {activeTab === "settings" && (
          <>
            <SectionTitle title="Settings" subtitle="Club assets, themes, sounds and license packs" />
            <SettingsSection />
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {notifications.isOpen && (
        <div className="fixed inset-0 z-[70] bg-black/40" onClick={() => notifications.setIsOpen(false)}>
          <aside
            className="ml-auto h-full w-[86%] max-w-sm animate-slide-in-soft border-l border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--amber)]">Realtime</p>
                <h2 className="text-lg font-black text-foreground">Notificaciones</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => notifications.setIsOpen(false)}>
                Cerrar
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {notifications.notifications.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/50 bg-secondary/30 p-3">
                  <p className="text-xs font-black text-foreground">{String(item.payload.message ?? item.type)}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()} · {item.read ? "Leida" : "No leida"}
                    </p>
                    {!item.read && token && (
                      <button
                        type="button"
                        className="text-[10px] font-bold text-[var(--amber)]"
                        onClick={async () => {
                          await markNotificationRead(token, item.id)
                          await notifications.refresh()
                        }}
                      >
                        Marcar leida
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.notifications.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Sin notificaciones todavia.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado de la jornada</DialogTitle>
            <DialogDescription>
              {resultMatch && resultSave
                ? `Matchday ${resultMatch.matchday} · ${getClubName(resultSave, resultMatch.homeClubId)} vs ${getClubName(resultSave, resultMatch.awayClubId)}`
                : "No había partidos pendientes para simular."}
            </DialogDescription>
          </DialogHeader>

          {resultMatch && resultSave ? (
            <div className="flex flex-col gap-3">
              <Card className="py-4">
                <CardContent className="px-4">
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-full animate-pulse bg-[var(--amber)]" />
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{getClubName(resultSave, resultMatch.homeClubId)}</p>
                      <Badge variant="secondary">Home</Badge>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-secondary text-2xl font-black text-foreground">
                      {resultMatch.homeScore} - {resultMatch.awayScore}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{getClubName(resultSave, resultMatch.awayClubId)}</p>
                      <Badge variant="outline">Away</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-xl border border-border/50 p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Goles</h3>
                {goals.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {goals.map((event) => (
                      <div key={event.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-foreground">
                          {event.minute}' · {getPlayerName(resultSave, event)}
                        </span>
                        <span className="text-xs text-muted-foreground">{getClubName(resultSave, event.clubId)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin goles.</p>
                )}
              </div>

              <div className="rounded-xl border border-border/50 p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                <div className="flex flex-col gap-2">
                  {resultMatch.events.slice(0, 8).map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-xs">
                      <span className="w-9 rounded bg-secondary px-1.5 py-0.5 text-center font-bold text-foreground">{event.minute}'</span>
                      <span className="text-muted-foreground">{event.description ?? event.type.replace("_", " ")}</span>
                    </div>
                  ))}
                  {resultMatch.events.length === 0 && <p className="text-sm text-muted-foreground">Quiet match with no major events.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tarjetas</h3>
                {cards.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {cards.map((event) => (
                      <div key={event.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-foreground">
                          {event.minute}' · {getPlayerName(resultSave, event)}
                        </span>
                        <Badge variant={event.type === "red_card" ? "destructive" : "secondary"}>
                          {event.type === "red_card" ? "Roja" : "Amarilla"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin tarjetas.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se simuló ningún partido nuevo.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
