"use client"

import { Bell, ChevronDown } from "lucide-react"
import { formatMoney } from "@/lib/format"
import { getLeague, getNotificationCount, getSeason, getUserClub } from "@/lib/mock-data"

export function TopBar() {
  const club = getUserClub()
  const league = getLeague()
  const season = getSeason()
  const notificationCount = getNotificationCount()

  return (
    <DIVELEMENT className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <DIVELEMENT className="flex items-center justify-between px-4 py-3">
        <DIVELEMENT className="flex items-center gap-3">
          <DIVELEMENT className="relative">
            <DIVELEMENT className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--amber)] to-[#D4961A] flex items-center justify-center shadow-[0_0_20px_var(--amber-glow)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[var(--primary-foreground)]">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="currentColor" opacity="0.2" />
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 8l-4 2.5v5L12 18l4-2.5v-5L12 8z" fill="currentColor" />
              </svg>
            </DIVELEMENT>
            <DIVELEMENT className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success-green)] border-2 border-card animate-pulse-dot" />
          </DIVELEMENT>
          <DIVELEMENT>
            <button className="flex items-center gap-1 group">
              <h1 className="text-sm font-bold text-foreground tracking-tight">{club.name}</h1>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <p className="text-[11px] text-muted-foreground font-medium">{league.name}</p>
          </DIVELEMENT>
        </DIVELEMENT>

        <DIVELEMENT className="flex items-center gap-3">
          <DIVELEMENT className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--stats-blue-glow)] border border-[var(--stats-blue)]/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--stats-blue)" strokeWidth="2" />
              <path d="M12 6v12M8 10h8M9 14h6" stroke="var(--stats-blue)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-bold text-[var(--stats-blue)]">{formatMoney(club.finances.transferBudget)}</span>
          </DIVELEMENT>

          <DIVELEMENT className="px-2.5 py-1.5 rounded-lg bg-secondary">
            <span className="text-[11px] font-semibold text-muted-foreground">
              MD<span className="text-foreground">{season.currentMatchday}</span>
            </span>
          </DIVELEMENT>

          <button className="relative p-2 rounded-xl bg-secondary hover:bg-muted transition-colors active:scale-95" aria-label="Notifications">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[var(--alert-red)] rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_var(--alert-red-glow)]">
              {notificationCount}
            </span>
          </button>
        </DIVELEMENT>
      </DIVELEMENT>
    </DIVELEMENT>
  )
}
