"use client"

import { ChevronRight } from "lucide-react"
import { useGame } from "@/lib/game-provider"

export function SquadMorale() {
  const { getSquadMoraleSummary } = useGame()
  const { moralePercent, happyCount, neutralCount, unhappyCount } = getSquadMoraleSummary()

  return (
    <div className="mx-4 mt-3" aria-label="Squad morale">
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--success-green-glow)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--success-green)" strokeWidth="2" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="var(--success-green)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="9" r="1.5" fill="var(--success-green)" />
                <circle cx="15" cy="9" r="1.5" fill="var(--success-green)" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Squad Morale</h2>
              <p className="text-[11px] text-muted-foreground">Overall team mood</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success-green-glow)]">
            <span className="text-lg font-black text-[var(--success-green)]">{moralePercent}</span>
            <span className="text-[11px] font-semibold text-[var(--success-green)]">%</span>
          </div>
        </div>

        <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--success-green)] via-[#34D399] to-[#6EE7B7] transition-all duration-700 ease-out"
            style={{ width: `${moralePercent}%` }}
          />
          <div
            className="absolute inset-y-0 w-6 rounded-full bg-white/20 blur-sm"
            style={{ left: `calc(${moralePercent}% - 12px)` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--success-green)]/10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--success-green)" strokeWidth="2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="var(--success-green)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-semibold text-[var(--success-green)]">{happyCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--amber)]/10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--amber)" strokeWidth="2" />
              <path d="M8 15h8" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-semibold text-[var(--amber)]">{neutralCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--alert-red)]/10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--alert-red)" strokeWidth="2" />
              <path d="M8 16s1.5-2 4-2 4 2 4 2" stroke="var(--alert-red)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-semibold text-[var(--alert-red)]">{unhappyCount}</span>
          </div>
          <div className="flex-1" />
          <button className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
            Details
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
