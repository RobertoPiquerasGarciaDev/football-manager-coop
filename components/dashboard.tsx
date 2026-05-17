"use client"

import { useCallback, useState } from "react"
import { CalendarDays, Users } from "lucide-react"
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
import { useLeagueRealtime } from "@/hooks/use-league-realtime"
import { useToast } from "@/hooks/use-toast"
import { createLeague, fetchLeague, joinLeague, submitTurn, type LeagueResponse } from "@/lib/api"
import { useGame } from "@/lib/game-provider"
import type { GameSave, Match, MatchEvent } from "@/lib/types"

const AcademySection = dynamic(() => import("@/components/academy-section").then((mod) => mod.AcademySection))
const CooperativeSection = dynamic(() => import("@/components/cooperative-section").then((mod) => mod.CooperativeSection))
const FinanceSection = dynamic(() => import("@/components/finance-section").then((mod) => mod.FinanceSection))
const SettingsSection = dynamic(() => import("@/components/settings-section").then((mod) => mod.SettingsSection))

export type TabId = "dashboard" | "squad" | "tactics" | "market" | "league" | "academy" | "finance" | "coop" | "settings"

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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [resultSave, setResultSave] = useState<GameSave | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [leagueSyncMessage, setLeagueSyncMessage] = useState<string | null>(null)
  const [leagueSyncError, setLeagueSyncError] = useState<string | null>(null)
  const [remoteLeague, setRemoteLeague] = useState<LeagueResponse | null>(null)
  const [isLeagueActionPending, setIsLeagueActionPending] = useState(false)
  const [isTurnSubmitting, setIsTurnSubmitting] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem("fm-coop-onboarded") !== "true",
  )
  const { isLoading, token, user, logout } = useAuth()
  const { toast } = useToast()
  const { save, advanceTurn } = useGame()

  const goals = resultMatch?.events.filter((event) => event.type === "goal") ?? []
  const cards =
    resultMatch?.events.filter((event) => event.type === "yellow_card" || event.type === "red_card") ?? []

  function handleSimulateMatchday() {
    const nextSave = advanceTurn()
    const simulatedMatch = findSimulatedUserMatch(save, nextSave)
    setResultSave(nextSave)
    setResultMatch(simulatedMatch)
    setIsResultOpen(true)
    toast({
      title: "Matchday simulated",
      description: simulatedMatch ? "Results, morale, finances and training progression were applied." : "No scheduled matches were pending.",
    })
  }

  const refreshRemoteLeague = useCallback(async () => {
    if (!token || !remoteLeague?.id) return

    try {
      const league = await fetchLeague(token, remoteLeague.id)
      setRemoteLeague(league)
      if (league.turnStatus?.allSubmitted) {
        setLeagueSyncMessage("Todos los managers han enviado su turno. Dashboard actualizado.")
      } else if (league.turnStatus) {
        setLeagueSyncMessage(`Turnos enviados: ${league.turnStatus.submitted}/${league.turnStatus.total}`)
      }
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo refrescar la liga")
    }
  }, [remoteLeague?.id, token])

  useLeagueRealtime({
    leagueId: remoteLeague?.id ?? null,
    onTurnChange: refreshRemoteLeague,
  })

  async function handleCreateLeague() {
    if (!token) return
    setIsLeagueActionPending(true)
    setLeagueSyncError(null)
    setLeagueSyncMessage(null)

    try {
      const league = await createLeague(token, `${save.name} League`)
      setRemoteLeague(league)
      setLeagueSyncMessage(`Liga creada. Codigo: ${league.inviteCode ?? "sin codigo"}`)
      toast({ title: "Cooperative league created", description: `Invite code: ${league.inviteCode ?? "pending"}` })
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
      const league = await joinLeague(token, inviteCode)
      setRemoteLeague(league)
      setLeagueSyncMessage(`Te has unido a ${league.name}`)
      toast({ title: "Joined league", description: league.name })
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo unir a la liga")
    } finally {
      setIsLeagueActionPending(false)
    }
  }

  async function handleSubmitTurn() {
    const clubId = remoteLeague?.clubs?.[0]?.id
    if (!token || !remoteLeague?.id || !clubId) return

    setIsTurnSubmitting(true)
    setLeagueSyncError(null)
    setLeagueSyncMessage(null)

    try {
      const response = await submitTurn(token, remoteLeague.id, {
        clubId,
        matchday: remoteLeague.currentMatchday,
        lineup: save.clubs.find((club) => club.id === save.userClubId)?.tactics.lineup ?? [],
        tactics: save.clubs.find((club) => club.id === save.userClubId)?.tactics ?? {},
      })
      setRemoteLeague((league) => (league ? { ...league, turnStatus: response.turnStatus } : league))
      setLeagueSyncMessage(
        response.turnStatus.allSubmitted
          ? "Todos los managers han enviado su turno. Dashboard actualizado."
          : `Turno enviado: ${response.turnStatus.submitted}/${response.turnStatus.total}`,
      )
      toast({
        title: "Turn submitted",
        description: response.turnStatus.allSubmitted ? "All managers are ready to simulate." : `${response.turnStatus.submitted}/${response.turnStatus.total} ready`,
      })
    } catch (error) {
      setLeagueSyncError(error instanceof Error ? error.message : "No se pudo enviar el turno")
    } finally {
      setIsTurnSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center text-sm text-muted-foreground">Cargando sesion...</div>
  }

  if (!user || !token) {
    return <AuthScreen />
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--amber)] opacity-[0.03] blur-[120px] pointer-events-none" />

      <TopBar />
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
            <Button
              type="button"
              onClick={handleCreateLeague}
              disabled={isLeagueActionPending}
              className="w-full bg-[var(--amber)] text-[var(--primary-foreground)] hover:bg-[var(--amber)]/90"
            >
              <Users className="w-4 h-4" />
              Crear Liga Cooperativa
            </Button>
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
            {(leagueSyncMessage || remoteLeague) && (
              <p className="text-[11px] text-[var(--success-green)]">
                {leagueSyncMessage ?? `Liga activa: ${remoteLeague?.name}`}
              </p>
            )}
            {remoteLeague && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmitTurn}
                disabled={isTurnSubmitting || !remoteLeague.clubs?.[0]?.id}
              >
                {isTurnSubmitting ? "Enviando turno..." : "Enviar Turno"}
              </Button>
            )}
            {remoteLeague?.turnStatus && (
              <p className="text-[11px] text-muted-foreground">
                Turnos enviados: {remoteLeague.turnStatus.submitted}/{remoteLeague.turnStatus.total}
              </p>
            )}
            {leagueSyncError && <p className="text-[11px] text-destructive">{leagueSyncError}</p>}
          </div>
        </div>
      </div>

      <main className="pb-24">
        {activeTab === "dashboard" && (
          <>
            <div className="px-4 pt-4">
              <Button
                onClick={handleSimulateMatchday}
                className="w-full bg-[var(--amber)] text-[var(--primary-foreground)] hover:bg-[var(--amber)]/90"
              >
                <CalendarDays className="w-4 h-4" />
                Simular Jornada
              </Button>
            </div>
            <NextMatchCard />
            <QuickStats />
            <SquadMorale />
            <TransferAlerts />
            <LeagueTable />
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
            <TacticsSection />
          </>
        )}

        {activeTab === "market" && (
          <>
            <SectionTitle title="Transfer Market" subtitle="Scout, bid & negotiate player transfers" />
            <MarketSection />
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
