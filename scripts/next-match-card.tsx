"use client"

import { Zap, Eye } from "lucide-react"
import { getNextUserMatch, getUserClub } from "@/lib/mock-data"

export function NextMatchCard() {
  const next = getNextUserMatch()
  const userClub = getUserClub()

  if (!next) return null

  const userSide = next.isUserHome
    ? { club: next.homeClub, badge: "HOME" as const, accent: "amber" as const }
    : { club: next.awayClub, badge: "AWAY" as const, accent: "stats-blue" as const }
  const opponent = next.isUserHome ? next.awayClub : next.homeClub
  const opponentAccent = next.isUserHome ? "stats-blue" : "amber"

  return (
    <DIVELEMENT className="mx-4 mt-4" aria-label="Next match">
      <DIVELEMENT className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-secondary/50 border border-border/50">
        <DIVELEMENT
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <DIVELEMENT className="relative flex items-center justify-between px-4 pt-4 pb-2">
          <DIVELEMENT className="flex items-center gap-2">
            <DIVELEMENT className="w-1.5 h-1.5 rounded-full bg-[var(--success-green)] animate-pulse-dot" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Next Match</span>
          </DIVELEMENT>
          <DIVELEMENT className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="var(--muted-foreground)" strokeWidth="2" />
              <path d="M3 10h18M16 2v4M8 2v4" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-medium text-muted-foreground">{next.scheduleLabel}</span>
          </DIVELEMENT>
        </DIVELEMENT>

        <DIVELEMENT className="relative flex items-center justify-between px-5 py-5">
          <DIVELEMENT className="flex flex-col items-center gap-2.5 flex-1">
            <DIVELEMENT
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                next.homeClub.id === userClub.id
                  ? "bg-gradient-to-br from-[var(--amber)] to-[#D4961A] shadow-[0_4px_24px_var(--amber-glow)]"
                  : "bg-gradient-to-br from-[var(--stats-blue)] to-[#2E8BC4] shadow-[0_4px_24px_var(--stats-blue-glow)]"
              }`}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="rgba(0,0,0,0.2)" />
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 8l-4 2.5v5L12 18l4-2.5v-5L12 8z" fill="rgba(0,0,0,0.4)" />
              </svg>
            </DIVELEMENT>
            <DIVELEMENT className="text-center">
              <p className="text-sm font-bold text-foreground">{next.homeClub.name}</p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                  next.homeClub.id === userClub.id
                    ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                    : "bg-[var(--stats-blue)]/15 text-[var(--stats-blue)]"
                }`}
              >
                HOME
              </span>
            </DIVELEMENT>
          </DIVELEMENT>

          <DIVELEMENT className="flex flex-col items-center gap-1 px-3">
            <DIVELEMENT className="w-12 h-12 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
              <span className="text-sm font-black text-muted-foreground tracking-tight">VS</span>
            </DIVELEMENT>
          </DIVELEMENT>

          <DIVELEMENT className="flex flex-col items-center gap-2.5 flex-1">
            <DIVELEMENT
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                next.awayClub.id === userClub.id
                  ? "bg-gradient-to-br from-[var(--amber)] to-[#D4961A] shadow-[0_4px_24px_var(--amber-glow)]"
                  : "bg-gradient-to-br from-[var(--stats-blue)] to-[#2E8BC4] shadow-[0_4px_24px_var(--stats-blue-glow)]"
              }`}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill="rgba(0,0,0,0.2)" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
                <path d="M12 6l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z" fill="rgba(0,0,0,0.4)" />
              </svg>
            </DIVELEMENT>
            <DIVELEMENT className="text-center">
              <p className="text-sm font-bold text-foreground">{next.awayClub.name}</p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                  next.awayClub.id === userClub.id
                    ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                    : "bg-[var(--stats-blue)]/15 text-[var(--stats-blue)]"
                }`}
              >
                AWAY
              </span>
            </DIVELEMENT>
          </DIVELEMENT>
        </DIVELEMENT>

        <DIVELEMENT className="relative flex items-center gap-2 px-4 pb-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[var(--amber)] to-[#D4961A] text-[var(--primary-foreground)] text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_2px_16px_var(--amber-glow)]">
            <Zap className="w-4 h-4" />
            Quick Tactics
          </button>
          <button className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-secondary hover:bg-muted text-secondary-foreground text-sm font-semibold active:scale-[0.98] transition-all border border-border/50">
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </DIVELEMENT>
      </DIVELEMENT>
    </DIVELEMENT>
  )
}
