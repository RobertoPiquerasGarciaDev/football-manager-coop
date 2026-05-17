"use client"

import { ArrowDownLeft, ArrowUpRight, Star, ChevronRight } from "lucide-react"
import type { TransferAlertView } from "@/lib/mock-data"
import { getTransferAlertsForDashboard } from "@/lib/mock-data"

function getRatingColor(rating: number) {
  if (rating >= 85) return "text-[var(--success-green)] bg-[var(--success-green)]/15"
  if (rating >= 80) return "text-[var(--amber)] bg-[var(--amber)]/15"
  return "text-muted-foreground bg-secondary"
}

function getTypeConfig(type: TransferAlertView["type"]) {
  switch (type) {
    case "incoming":
      return {
        icon: ArrowDownLeft,
        color: "text-[var(--success-green)]",
        bg: "bg-[var(--success-green)]/15",
        label: "Offer received",
      }
    case "outgoing":
      return {
        icon: ArrowUpRight,
        color: "text-[var(--alert-red)]",
        bg: "bg-[var(--alert-red)]/15",
        label: "Bid placed",
      }
    case "interest":
      return {
        icon: Star,
        color: "text-[var(--stats-blue)]",
        bg: "bg-[var(--stats-blue)]/15",
        label: "Club interest",
      }
  }
}

export function TransferAlerts() {
  const alerts = getTransferAlertsForDashboard()

  return (
    <DIVELEMENT className="mx-4 mt-3" aria-label="Transfer alerts">
      <DIVELEMENT className="p-4 rounded-2xl bg-card border border-border/50">
        <DIVELEMENT className="flex items-center justify-between mb-4">
          <DIVELEMENT className="flex items-center gap-2.5">
            <DIVELEMENT className="w-8 h-8 rounded-lg bg-[var(--alert-red-glow)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M2 12h4l3-9 6 18 3-9h4" stroke="var(--alert-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </DIVELEMENT>
            <DIVELEMENT>
              <h2 className="text-sm font-bold text-foreground">Transfer Market</h2>
              <p className="text-[11px] text-muted-foreground">Active negotiations</p>
            </DIVELEMENT>
          </DIVELEMENT>
          <DIVELEMENT className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--alert-red)]/15 border border-[var(--alert-red)]/20">
            <DIVELEMENT className="w-1.5 h-1.5 rounded-full bg-[var(--alert-red)] animate-pulse-dot" />
            <span className="text-[11px] font-bold text-[var(--alert-red)]">{alerts.length} Active</span>
          </DIVELEMENT>
        </DIVELEMENT>

        <DIVELEMENT className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const config = getTypeConfig(alert.type)
            const Icon = config.icon
            return (
              <button
                key={alert.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 active:scale-[0.99] transition-all text-left w-full group"
              >
                <DIVELEMENT className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </DIVELEMENT>

                <DIVELEMENT className="flex-1 min-w-0">
                  <DIVELEMENT className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-foreground truncate">{alert.player}</span>
                    {alert.isHot && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--alert-red)]/15 text-[var(--alert-red)] text-[9px] font-black uppercase tracking-wider">
                        HOT
                      </span>
                    )}
                  </DIVELEMENT>
                  <DIVELEMENT className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">{alert.position}</span>
                    <span className="text-[11px] text-border">|</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {config.label} from {alert.team}
                    </span>
                  </DIVELEMENT>
                </DIVELEMENT>

                <DIVELEMENT className="flex items-center gap-2.5 shrink-0">
                  <DIVELEMENT className={`px-2 py-1 rounded-lg text-xs font-black ${getRatingColor(alert.rating)}`}>
                    {alert.rating}
                  </DIVELEMENT>
                  <DIVELEMENT className="text-right">
                    <p className="text-sm font-bold text-[var(--amber)]">{alert.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{alert.timeAgo}</p>
                  </DIVELEMENT>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </DIVELEMENT>
              </button>
            )
          })}
        </DIVELEMENT>

        <button className="w-full mt-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-[0.99]">
          View All Transfers
        </button>
      </DIVELEMENT>
    </DIVELEMENT>
  )
}
