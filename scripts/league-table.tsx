"use client"

import { ChevronRight, ArrowUp, ArrowDown, Minus } from "lucide-react"
import type { MatchResultCode, PositionChange } from "@/lib/types"
import { formatGoalDifference } from "@/lib/format"
import { getLeague, getLeagueTableRows, getSeason } from "@/lib/mock-data"

function FormIndicator({ result }: { result: MatchResultCode }) {
  const config = {
    W: "bg-[var(--success-green)] text-[#052e16]",
    D: "bg-[var(--amber)] text-[#422006]",
    L: "bg-[var(--alert-red)] text-white",
  }
  return (
    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${config[result]}`}>
      {result}
    </span>
  )
}

function PositionChangeIcon({ change }: { change: PositionChange }) {
  if (change === "up") return <ArrowUp className="w-3 h-3 text-[var(--success-green)]" />
  if (change === "down") return <ArrowDown className="w-3 h-3 text-[var(--alert-red)]" />
  return <Minus className="w-3 h-3 text-muted-foreground/40" />
}

export function LeagueTable() {
  const league = getLeague()
  const teams = getLeagueTableRows(5)

  return (
    <DIVELEMENT className="mx-4 mt-3 mb-4" aria-label="League standings">
      <DIVELEMENT className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <DIVELEMENT className="flex items-center justify-between px-4 py-3.5">
          <DIVELEMENT className="flex items-center gap-2.5">
            <DIVELEMENT className="w-8 h-8 rounded-lg bg-[var(--amber-glow)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 22h16" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 14.66V17c0 1.1-.9 2.76-2 3.34M14 14.66V17c0 1.1.9 2.76 2 3.34" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 2H6v7a6 6 0 1012 0V2z" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </DIVELEMENT>
            <DIVELEMENT>
              <h2 className="text-sm font-bold text-foreground">League Standings</h2>
              <p className="text-[11px] text-muted-foreground">{league.name} {getSeason().name}</p>
            </DIVELEMENT>
          </DIVELEMENT>
          <button className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
            Full Table
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </DIVELEMENT>

        <DIVELEMENT className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="League table top 5">
            <thead>
              <tr className="bg-secondary/40 border-y border-border/50">
                <th className="py-2.5 pl-4 pr-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">#</th>
                <th className="py-2.5 px-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Team</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">P</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">W</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">D</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">L</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10" scope="col">GD</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10" scope="col">Pts</th>
                <th className="py-2.5 px-2 pr-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Form</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((row, idx) => {
                const gd = formatGoalDifference(row.goalDifference)
                return (
                  <tr
                    key={row.clubId}
                    className={`border-t border-border/30 transition-colors ${
                      row.isUserClub
                        ? "bg-[var(--amber)]/8"
                        : idx % 2 === 0
                          ? "bg-transparent"
                          : "bg-secondary/15"
                    }`}
                  >
                    <td className="py-3 pl-4 pr-1">
                      <DIVELEMENT className="flex items-center gap-1">
                        {row.isUserClub ? (
                          <span className="w-5 h-5 rounded bg-[var(--amber)] text-[10px] font-black text-[var(--primary-foreground)] flex items-center justify-center">
                            {row.position}
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded bg-secondary text-[10px] font-bold text-muted-foreground flex items-center justify-center">
                            {row.position}
                          </span>
                        )}
                        <PositionChangeIcon change={row.positionChange} />
                      </DIVELEMENT>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[13px] font-semibold ${row.isUserClub ? "text-[var(--amber)]" : "text-foreground"}`}>
                        {row.club.name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-[13px] text-muted-foreground font-medium">{row.played}</td>
                    <td className="py-3 px-2 text-center text-[13px] text-foreground font-medium">{row.won}</td>
                    <td className="py-3 px-2 text-center text-[13px] text-muted-foreground font-medium">{row.drawn}</td>
                    <td className="py-3 px-2 text-center text-[13px] text-muted-foreground font-medium">{row.lost}</td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`text-[13px] font-semibold ${row.goalDifference >= 0 ? "text-[var(--success-green)]" : "text-[var(--alert-red)]"}`}
                      >
                        {gd}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[13px] font-black ${row.isUserClub ? "text-[var(--amber)]" : "text-foreground"}`}>
                        {row.points}
                      </span>
                    </td>
                    <td className="py-3 px-2 pr-4">
                      <DIVELEMENT className="flex items-center justify-center gap-0.5">
                        {row.form.map((result, i) => (
                          <FormIndicator key={i} result={result} />
                        ))}
                      </DIVELEMENT>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DIVELEMENT>
      </DIVELEMENT>
    </DIVELEMENT>
  )
}
