"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play, FastForward } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type LiveEvent = {
  minute: number
  type: "goal" | "yellow_card" | "red_card" | "injury" | "substitution" | "penalty" | "miss" | "key_chance"
  team: "home" | "away"
  player?: string
  description: string
}

type Props = {
  homeName: string
  awayName: string
  events: LiveEvent[]
  finalHome: number
  finalAway: number
  onClose?: () => void
}

const SPEED_OPTIONS = [1, 2, 5] as const

export function LiveMatchScreen({ homeName, awayName, events, finalHome, finalAway, onClose }: Props) {
  const [minute, setMinute] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<typeof SPEED_OPTIONS[number]>(2)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Score up to the current minute
  const visibleEvents = events.filter((e) => e.minute <= minute)
  const homeScore = visibleEvents.filter((e) => e.type === "goal" && e.team === "home").length
  const awayScore = visibleEvents.filter((e) => e.type === "goal" && e.team === "away").length

  useEffect(() => {
    if (!playing || minute >= 90) return
    const ms = 1000 / speed
    timeoutRef.current = setTimeout(() => setMinute((m) => Math.min(90, m + 1)), ms)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [minute, playing, speed])

  // Auto-pause at full time
  useEffect(() => {
    if (minute >= 90 && playing) setPlaying(false)
  }, [minute, playing])

  const lastEvent = visibleEvents[visibleEvents.length - 1]
  const showCelebration = lastEvent?.type === "goal" && minute - lastEvent.minute < 2

  return (
    <div className="flex flex-col gap-3">
      {/* Score header */}
      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-black text-foreground">{homeName}</p>
            <Badge variant="secondary" className="text-[9px]">CASA</Badge>
          </div>
          <div className={`animate-flip-score rounded-xl bg-secondary/60 px-4 py-2 text-2xl font-black ${showCelebration ? "scale-110 text-[var(--amber)]" : "text-foreground"} transition-transform`}>
            {homeScore} - {awayScore}
          </div>
          <div>
            <p className="text-sm font-black text-foreground">{awayName}</p>
            <Badge variant="outline" className="text-[9px]">FUERA</Badge>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground">{minute}'</span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPlaying((p) => !p)} disabled={minute >= 90}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            {SPEED_OPTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={speed === s ? "default" : "ghost"}
                onClick={() => setSpeed(s)}
                className="h-7 px-2 text-[10px]"
              >
                x{s}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setMinute(90)}>
              <FastForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pitch SVG */}
      <div className="relative h-44 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-emerald-900/30 to-emerald-700/20">
        <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full">
          <rect x="2" y="2" width="96" height="56" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <line x1="50" y1="2" x2="50" y2="58" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <circle cx="50" cy="30" r="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <rect x="2" y="20" width="10" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <rect x="88" y="20" width="10" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          {/* Player positions — 11 dots per team in a basic 4-3-3 */}
          {homePositions.map((p, i) => (
            <circle key={`h${i}`} cx={p.x} cy={p.y} r="1.4" fill="#fbbf24" stroke="#000" strokeWidth="0.3" />
          ))}
          {awayPositions.map((p, i) => (
            <circle key={`a${i}`} cx={p.x} cy={p.y} r="1.4" fill="#60a5fa" stroke="#000" strokeWidth="0.3" />
          ))}
          {showCelebration && (
            <text x="50" y="32" textAnchor="middle" fontSize="6" fill="#fbbf24" className="animate-pulse">
              ⚽ GOOOL
            </text>
          )}
        </svg>
        {lastEvent && (
          <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-2 py-1 backdrop-blur animate-slide-in-soft">
            <p className="text-[11px] font-bold text-white">
              {lastEvent.minute}' — {lastEvent.description}
            </p>
          </div>
        )}
      </div>

      {/* Event timeline scrollable */}
      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Eventos</h3>
        <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
          {visibleEvents.slice().reverse().map((e, i) => (
            <div key={`${e.minute}-${i}`} className="flex items-start gap-2 rounded-lg bg-secondary/30 px-2 py-1.5 text-[11px] animate-slide-in-soft">
              <span className="w-9 rounded bg-secondary px-1 py-0.5 text-center font-bold text-foreground">{e.minute}'</span>
              <span className="flex-1 text-muted-foreground">{e.description}</span>
            </div>
          ))}
          {visibleEvents.length === 0 && (
            <p className="rounded-lg bg-secondary/30 px-2 py-2 text-center text-[11px] text-muted-foreground">
              El balón rueda…
            </p>
          )}
        </div>
      </div>

      {minute >= 90 && (
        <div className="rounded-2xl border-2 border-[var(--amber)]/40 bg-[var(--amber)]/10 p-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--amber)]">FINAL DEL PARTIDO</p>
          <p className="mt-1 text-lg font-black text-foreground">{finalHome} - {finalAway}</p>
          {onClose && (
            <Button type="button" className="mt-2 w-full" onClick={onClose}>
              Ver resumen
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Fixed positions for a 4-3-3 home and 4-3-3 away (mirrored)
const homePositions = [
  { x: 6, y: 30 },   // GK
  { x: 18, y: 12 }, { x: 18, y: 24 }, { x: 18, y: 36 }, { x: 18, y: 48 }, // back 4
  { x: 32, y: 20 }, { x: 32, y: 30 }, { x: 32, y: 40 }, // mid 3
  { x: 44, y: 16 }, { x: 44, y: 30 }, { x: 44, y: 44 }, // fwd 3
]

const awayPositions = [
  { x: 94, y: 30 },
  { x: 82, y: 12 }, { x: 82, y: 24 }, { x: 82, y: 36 }, { x: 82, y: 48 },
  { x: 68, y: 20 }, { x: 68, y: 30 }, { x: 68, y: 40 },
  { x: 56, y: 16 }, { x: 56, y: 30 }, { x: 56, y: 44 },
]
