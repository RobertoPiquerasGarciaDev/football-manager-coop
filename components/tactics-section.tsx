"use client"

import { useState } from "react"
import { ChevronDown, RotateCcw, Save, Zap } from "lucide-react"
import type { PlayStyle, Tempo, Width } from "@/lib/types"
import { useGame, type FormationKey } from "@/lib/game-provider"

const playStyles: { name: PlayStyle; description: string }[] = [
  { name: "Attacking", description: "High press, aggressive pushing" },
  { name: "Balanced", description: "Solid shape, opportunistic" },
  { name: "Defensive", description: "Deep block, compact lines" },
  { name: "Counter-Attack", description: "Absorb pressure, quick breaks" },
]

function getRatingColor(r: number) {
  if (r >= 85) return "from-[var(--success-green)] to-[#22c55e]"
  if (r >= 80) return "from-[var(--amber)] to-[#D4961A]"
  return "from-[var(--stats-blue)] to-[#2E8BC4]"
}

function getRatingBg(r: number) {
  if (r >= 85) return "var(--success-green)"
  if (r >= 80) return "var(--amber)"
  return "var(--stats-blue)"
}

export function TacticsSection() {
  const { formationPresets, getTacticsLineupForFormation, getUserClub } = useGame()
  const clubTactics = getUserClub().tactics
  const defaultFormation: FormationKey =
    clubTactics.formation in formationPresets ? (clubTactics.formation as FormationKey) : "4-3-3"

  const [formation, setFormation] = useState<FormationKey>(defaultFormation)
  const [showFormations, setShowFormations] = useState(false)
  const [playStyle, setPlayStyle] = useState<PlayStyle>(clubTactics.playStyle)
  const [tempo, setTempo] = useState<Tempo>(clubTactics.tempo)
  const [width, setWidth] = useState<Width>(clubTactics.width)

  const currentFormation = formationPresets[formation]

  const positionsToRender = getTacticsLineupForFormation(formation).map(({ slot, player }) => ({
    role: slot.role,
    x: slot.x,
    y: slot.y,
    player: {
      id: player.id,
      name: player.displayName,
      shortName: player.shortName,
      position: player.position,
      rating: player.overallRating,
    },
  }))

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      {/* Formation selector */}
      <div className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--amber-glow)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M12 3v14" strokeDasharray="2 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Formation</h2>
              <p className="text-[11px] text-muted-foreground">Team shape & positioning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Reset</span>
            </button>
          </div>
        </div>

        {/* Formation dropdown */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowFormations(!showFormations)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/60 border border-border/50 hover:bg-secondary transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-[var(--amber)]">{formation}</span>
              <span className="text-xs text-muted-foreground font-medium">{currentFormation.positions.length} players positioned</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showFormations ? "rotate-180" : ""}`} />
          </button>
          {showFormations && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-card border border-border/50 shadow-2xl z-10 overflow-hidden">
              {(Object.keys(formationPresets) as FormationKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFormation(f); setShowFormations(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${
                    f === formation ? "bg-[var(--amber)]/10" : ""
                  }`}
                >
                  <span className={`text-lg font-bold ${f === formation ? "text-[var(--amber)]" : "text-foreground"}`}>{f}</span>
                  <span className="text-[11px] text-muted-foreground">{formationPresets[f].positions.length} positions</span>
                  {f === formation && <span className="ml-auto text-[10px] font-bold text-[var(--amber)]">ACTIVE</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pitch View */}
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-[#1a3a1a] border border-[#2a5a2a]/40">
          {/* Pitch markings */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" fill="none" preserveAspectRatio="xMidYMid meet">
            {/* Outer boundary */}
            <rect x="5" y="5" width="90" height="123" rx="1" stroke="#2a5a2a" strokeWidth="0.5" fill="none" />
            {/* Center line */}
            <line x1="5" y1="66.5" x2="95" y2="66.5" stroke="#2a5a2a" strokeWidth="0.5" />
            {/* Center circle */}
            <circle cx="50" cy="66.5" r="12" stroke="#2a5a2a" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="66.5" r="0.8" fill="#2a5a2a" />
            {/* Top penalty area */}
            <rect x="22" y="5" width="56" height="20" stroke="#2a5a2a" strokeWidth="0.5" fill="none" />
            <rect x="33" y="5" width="34" height="8" stroke="#2a5a2a" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="18" r="0.8" fill="#2a5a2a" />
            {/* Bottom penalty area */}
            <rect x="22" y="108" width="56" height="20" stroke="#2a5a2a" strokeWidth="0.5" fill="none" />
            <rect x="33" y="120" width="34" height="8" stroke="#2a5a2a" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="115" r="0.8" fill="#2a5a2a" />
            {/* Corner arcs */}
            <path d="M5 8 Q8 5 11 5" stroke="#2a5a2a" strokeWidth="0.4" fill="none" />
            <path d="M89 5 Q95 5 95 11" stroke="#2a5a2a" strokeWidth="0.4" fill="none" />
            <path d="M5 125 Q5 128 8 128" stroke="#2a5a2a" strokeWidth="0.4" fill="none" />
            <path d="M95 122 Q95 128 89 128" stroke="#2a5a2a" strokeWidth="0.4" fill="none" />
          </svg>

          {/* Grass stripes effect */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 16.6%, white 16.6%, white 33.3%)`,
          }} />

          {/* Player positions */}
          {positionsToRender.map((pos, idx) => (
            <div
              key={idx}
              className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {/* Player dot */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${getRatingBg(pos.player.rating)}dd, ${getRatingBg(pos.player.rating)}88)`,
                  borderColor: `${getRatingBg(pos.player.rating)}`,
                  boxShadow: `0 0 12px ${getRatingBg(pos.player.rating)}55`,
                }}
              >
                <span className="text-[10px] font-black text-white drop-shadow-sm">{pos.player.rating}</span>
              </div>
              {/* Player name */}
              <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                <span className="text-[8px] font-bold text-white whitespace-nowrap">{pos.player.shortName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical instructions */}
      <div className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--stats-blue-glow)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[var(--stats-blue)]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Tactical Instructions</h2>
            <p className="text-[11px] text-muted-foreground">Play style & team mentality</p>
          </div>
        </div>

        {/* Play Style */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Play Style</span>
          <div className="grid grid-cols-2 gap-1.5">
            {playStyles.map((ps) => (
              <button
                key={ps.name}
                onClick={() => setPlayStyle(ps.name)}
                className={`flex flex-col gap-0.5 p-3 rounded-xl transition-all active:scale-[0.98] ${
                  playStyle === ps.name
                    ? "bg-[var(--amber)]/15 border-2 border-[var(--amber)]/40 shadow-[0_0_16px_var(--amber-glow)]"
                    : "bg-secondary/40 border-2 border-transparent hover:bg-secondary/70"
                }`}
              >
                <span className={`text-xs font-bold ${playStyle === ps.name ? "text-[var(--amber)]" : "text-foreground"}`}>{ps.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{ps.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tempo */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tempo</span>
          <div className="flex gap-1.5">
            {(["Fast", "Normal", "Slow"] as Tempo[]).map((t) => (
              <button
                key={t}
                onClick={() => setTempo(t)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  tempo === t
                    ? "bg-[var(--stats-blue)]/15 border-2 border-[var(--stats-blue)]/40 text-[var(--stats-blue)]"
                    : "bg-secondary/40 border-2 border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Width */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Width</span>
          <div className="flex gap-1.5">
            {(["Wide", "Normal", "Narrow"] as Width[]).map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  width === w
                    ? "bg-[var(--success-green)]/15 border-2 border-[var(--success-green)]/40 text-[var(--success-green)]"
                    : "bg-secondary/40 border-2 border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[var(--amber)] to-[#D4961A] text-[var(--primary-foreground)] text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_2px_16px_var(--amber-glow)]">
          <Save className="w-4 h-4" />
          Save Tactics
        </button>
      </div>
    </div>
  )
}
