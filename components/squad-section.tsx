"use client"

import { useState } from "react"
import { ChevronRight, ArrowUpDown, Search } from "lucide-react"
import type { MoraleBand, PositionGroup } from "@/lib/types"
import { formatMoney } from "@/lib/format"
import { useGame } from "@/lib/game-provider"

const posFilters = ["All", "GK", "DEF", "MID", "FWD"] as const

function getRatingColor(r: number) {
  if (r >= 85) return "text-[var(--success-green)] bg-[var(--success-green)]/15 border-[var(--success-green)]/25"
  if (r >= 80) return "text-[var(--amber)] bg-[var(--amber)]/15 border-[var(--amber)]/25"
  if (r >= 75) return "text-[var(--stats-blue)] bg-[var(--stats-blue)]/15 border-[var(--stats-blue)]/25"
  return "text-muted-foreground bg-secondary border-border"
}

function getFitnessColor(f: number) {
  if (f >= 90) return "bg-[var(--success-green)]"
  if (f >= 75) return "bg-[var(--amber)]"
  return "bg-[var(--alert-red)]"
}

function getMoraleIcon(m: MoraleBand) {
  if (m === "happy") return { color: "var(--success-green)", path: "M8 14s1.5 2 4 2 4-2 4-2" }
  if (m === "neutral") return { color: "var(--amber)", path: "M8 15h8" }
  return { color: "var(--alert-red)", path: "M8 16s1.5-2 4-2 4 2 4 2" }
}

function getPosColor(p: PositionGroup) {
  if (p === "GK") return "text-[var(--amber)] bg-[var(--amber)]/10"
  if (p === "DEF") return "text-[var(--stats-blue)] bg-[var(--stats-blue)]/10"
  if (p === "MID") return "text-[var(--success-green)] bg-[var(--success-green)]/10"
  return "text-[var(--alert-red)] bg-[var(--alert-red)]/10"
}

export function SquadSection() {
  const { getUserSquad } = useGame()
  const players = getUserSquad()
  const [filter, setFilter] = useState<(typeof posFilters)[number]>("All")
  const [search, setSearch] = useState("")

  const filtered = players.filter((p) => {
    if (filter !== "All" && p.positionGroup !== filter) return false
    if (search && !p.displayName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const squadStats = {
    total: players.length,
    avgRating: Math.round(players.reduce((a, p) => a + p.overallRating, 0) / players.length),
    avgAge: (players.reduce((a, p) => a + p.age, 0) / players.length).toFixed(1),
    injured: players.filter((p) => p.isInjured).length,
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Players", value: squadStats.total, color: "var(--foreground)" },
          { label: "Avg Rating", value: squadStats.avgRating, color: "var(--amber)" },
          { label: "Avg Age", value: squadStats.avgAge, color: "var(--stats-blue)" },
          { label: "Injured", value: squadStats.injured, color: "var(--alert-red)" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</span>
            <span className="text-lg font-black" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)]/40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {posFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                filter === f
                  ? "bg-[var(--amber)] text-[var(--primary-foreground)] shadow-[0_2px_12px_var(--amber-glow)]"
                  : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="flex-1" />
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-border/50 text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors">
            <ArrowUpDown className="w-3 h-3" />
            Sort
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {filtered.map((player) => {
          const moraleInfo = getMoraleIcon(player.moraleBand)
          return (
            <button
              key={player.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-secondary/50 active:scale-[0.99] transition-all text-left w-full group relative overflow-hidden"
            >
              {player.isInjured && (
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--alert-red)]" />
              )}

              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <span className="text-lg font-black text-muted-foreground/60">{player.displayName.charAt(0)}</span>
                </div>
                <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${getRatingColor(player.overallRating)}`}>
                  {player.overallRating}
                </div>
                {player.isCaptain && (
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-md bg-[var(--amber)] flex items-center justify-center text-[8px] font-black text-[var(--primary-foreground)]">C</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground truncate">{player.displayName}</span>
                  {player.isInjured && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--alert-red)]/15 text-[var(--alert-red)] text-[9px] font-black">INJ</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getPosColor(player.positionGroup)}`}>{player.position}</span>
                  <span className="text-[11px] text-muted-foreground">{player.age}y</span>
                  <span className="text-[11px] text-border">|</span>
                  <span className="text-[11px] text-muted-foreground">{player.nationality}</span>
                </div>
                {player.isInjured && player.injury && (
                  <p className="text-[10px] text-[var(--alert-red)] font-medium mt-0.5">{player.injury.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke={moraleInfo.color} strokeWidth="2" />
                  <path d={moraleInfo.path} stroke={moraleInfo.color} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="9" cy="9" r="1" fill={moraleInfo.color} />
                  <circle cx="15" cy="9" r="1" fill={moraleInfo.color} />
                </svg>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-8 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getFitnessColor(player.fitness)}`} style={{ width: `${player.fitness}%` }} />
                  </div>
                  <span className="text-[9px] font-semibold text-muted-foreground">{player.fitness}%</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-foreground">{player.seasonStats.goals}G {player.seasonStats.assists}A</p>
                  <p className="text-[10px] text-muted-foreground">{formatMoney(player.marketValue)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
