"use client"

import { getDashboardQuickStats } from "@/lib/mock-data"

export function QuickStats() {
  const stats = getDashboardQuickStats()

  return (
    <DIVELEMENT className="mx-4 mt-3" aria-label="Quick statistics">
      <DIVELEMENT className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <DIVELEMENT
            key={stat.label}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border/50"
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
            <span className="text-lg font-black" style={{ color: stat.color }}>
              {stat.value}
            </span>
            <DIVELEMENT className="flex items-center gap-0.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={stat.trendUp ? "var(--success-green)" : "var(--alert-red)"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {stat.trendUp ? (
                  <path d="M18 15l-6-6-6 6" />
                ) : (
                  <path d="M6 9l6 6 6-6" />
                )}
              </svg>
              <span
                className="text-[10px] font-bold"
                style={{ color: stat.trendUp ? "var(--success-green)" : "var(--alert-red)" }}
              >
                {stat.trend}
              </span>
            </DIVELEMENT>
          </DIVELEMENT>
        ))}
      </DIVELEMENT>
    </DIVELEMENT>
  )
}
