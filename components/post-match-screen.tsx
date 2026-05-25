"use client"

import { Trophy, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { GameSave, Match, MatchEvent } from "@/lib/types"

function getClubName(save: GameSave, clubId: string): string {
  return save.clubs.find((c) => c.id === clubId)?.name ?? "Equipo"
}

function getPlayerName(save: GameSave, event: MatchEvent): string {
  if (!event.playerId) return "Jugador"
  return save.players.find((p) => p.id === event.playerId)?.displayName ?? "Jugador"
}

function PlayerRating({ rating }: { rating: number }) {
  const stars = Math.max(0, Math.min(5, Math.round(rating / 2)))
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < stars ? "fill-[var(--amber)] text-[var(--amber)]" : "text-muted-foreground/30"}`}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1 text-[10px] font-black text-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

export function PostMatchScreen({
  match,
  save,
  onShowStandings,
  onShowNext,
}: {
  match: Match
  save: GameSave
  onShowStandings?: () => void
  onShowNext?: () => void
}) {
  const isUserHome = match.homeClubId === save.userClubId
  const isUserAway = match.awayClubId === save.userClubId
  const userIsInvolved = isUserHome || isUserAway
  const userScore = (isUserHome ? match.homeScore : isUserAway ? match.awayScore : 0) ?? 0
  const rivalScore = (isUserHome ? match.awayScore : isUserAway ? match.homeScore : 0) ?? 0
  const outcome = !userIsInvolved
    ? "neutral"
    : userScore > rivalScore
      ? "win"
      : userScore < rivalScore
        ? "loss"
        : "draw"

  const goals = match.events.filter((e) => e.type === "goal")
  const cards = match.events.filter((e) => e.type === "yellow_card" || e.type === "red_card")
  const injuries = match.events.filter((e) => e.type === "injury")
  const keyChances = match.events.filter((e) => e.type === "key_chance")

  // Simple stats derived from the events array
  const homeShots = keyChances.filter((e) => e.clubId === match.homeClubId).length +
    goals.filter((g) => g.clubId === match.homeClubId).length
  const awayShots = keyChances.filter((e) => e.clubId === match.awayClubId).length +
    goals.filter((g) => g.clubId === match.awayClubId).length
  const homeCards = cards.filter((c) => c.clubId === match.homeClubId).length
  const awayCards = cards.filter((c) => c.clubId === match.awayClubId).length
  // Posesión simulada — pondera por shots
  const totalShots = homeShots + awayShots || 1
  const homePossession = Math.round(40 + (homeShots / totalShots) * 20)
  const awayPossession = 100 - homePossession

  const outcomeColor =
    outcome === "win" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
    outcome === "loss" ? "bg-red-500/20 text-red-300 border-red-500/30" :
    outcome === "draw" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
    "bg-secondary"

  const outcomeLabel =
    outcome === "win" ? "VICTORIA" :
    outcome === "loss" ? "DERROTA" :
    outcome === "draw" ? "EMPATE" : "JORNADA SIMULADA"

  // MVP from match payload metadata if present
  const mvpData = (match as unknown as { events: MatchEvent[]; payload?: { mvp?: { player?: string; rating?: number } } })
  const mvp = mvpData.payload?.mvp ?? goals[0]
    ? { player: getPlayerName(save, goals[0]), rating: 8.4 }
    : null

  return (
    <div className="flex flex-col gap-3">
      <Card className={`overflow-hidden border-2 ${outcomeColor}`}>
        <CardContent className="px-4 py-5">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{outcomeLabel}</p>
            <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{getClubName(save, match.homeClubId)}</p>
                <Badge variant="secondary" className="text-[9px]">CASA</Badge>
              </div>
              <div className="animate-flip-score rounded-xl bg-background/60 px-4 py-2 text-3xl font-black text-foreground">
                {match.homeScore} - {match.awayScore}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{getClubName(save, match.awayClubId)}</p>
                <Badge variant="outline" className="text-[9px]">FUERA</Badge>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Jornada {match.matchday}</p>
          </div>
        </CardContent>
      </Card>

      {mvp && (
        <div className="rounded-2xl border border-[var(--amber)]/40 bg-[var(--amber)]/10 p-3 shadow-[0_0_30px_var(--amber-glow)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--amber)]">
              <Trophy className="h-5 w-5 text-background" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--amber)]">MVP del partido</p>
              <p className="text-sm font-black text-foreground">{mvp.player}</p>
            </div>
            <PlayerRating rating={mvp.rating ?? 8.4} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Estadísticas</h3>
        <StatBar label="Posesión" home={homePossession} away={awayPossession} unit="%" />
        <StatBar label="Tiros" home={homeShots} away={awayShots} />
        <StatBar label="Tarjetas" home={homeCards} away={awayCards} />
        <StatBar label="Lesiones" home={injuries.filter((i) => i.clubId === match.homeClubId).length} away={injuries.filter((i) => i.clubId === match.awayClubId).length} />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Goles</h3>
        {goals.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {goals.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 px-2 py-1.5 text-sm">
                <span className="font-semibold text-foreground">⚽ {event.minute}' · {getPlayerName(save, event)}</span>
                <span className="text-[10px] text-muted-foreground">{getClubName(save, event.clubId)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin goles en este partido.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Timeline</h3>
        <div className="flex flex-col gap-1.5">
          {match.events.slice(0, 12).map((event) => (
            <div key={event.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-9 rounded bg-secondary px-1.5 py-0.5 text-center font-bold text-foreground">{event.minute}'</span>
              <span className="text-muted-foreground">{event.description ?? event.type.replace("_", " ")}</span>
            </div>
          ))}
          {match.events.length === 0 && <p className="text-sm text-muted-foreground">Partido tranquilo, sin acontecimientos destacados.</p>}
        </div>
      </div>

      {(onShowStandings || onShowNext) && (
        <div className="flex gap-2">
          {onShowStandings && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onShowStandings}>
              Ver clasificación
            </Button>
          )}
          {onShowNext && (
            <Button type="button" className="flex-1" onClick={onShowNext}>
              Próximo partido
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function StatBar({ label, home, away, unit = "" }: { label: string; home: number; away: number; unit?: string }) {
  const total = home + away || 1
  const homePct = (home / total) * 100
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-foreground">
        <span>{home}{unit}</span>
        <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
        <span>{away}{unit}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary/40">
        <div className="animate-progress-fill bg-[var(--amber)]" style={{ width: `${homePct}%` }} />
        <div className="bg-blue-500/70" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  )
}
