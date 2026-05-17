"use client"

import { useState } from "react"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import type { MatchResultCode, PositionChange, TableZone } from "@/lib/types"
import { useGame } from "@/lib/game-provider"

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

function getZoneColor(zone: TableZone) {
  if (zone === "champions") return "border-l-[var(--stats-blue)]"
  if (zone === "europa") return "border-l-[var(--amber)]"
  if (zone === "relegation") return "border-l-[var(--alert-red)]"
  return "border-l-transparent"
}

type LeagueTab = "table" | "results" | "scorers"

export function LeagueSection() {
  const [tab, setTab] = useState<LeagueTab>("table")
  const {
    getLeagueFullTable,
    getLeagueSectionSummary,
    getRecentMatchResults,
    getTopScorers,
  } = useGame()

  const summary = getLeagueSectionSummary()
  const fullTable = getLeagueFullTable()
  const recentResults = getRecentMatchResults()
  const topScorers = getTopScorers()
  const userClubName = summary.userClub.name

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">{summary.league.name}</h2>
            <p className="text-[11px] text-muted-foreground">
              Season {summary.season.name} · Matchday {summary.season.currentMatchday}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--amber-glow)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 1.1-.9 2.76-2 3.34M14 14.66V17c0 1.1.9 2.76 2 3.34" />
              <path d="M18 2H6v7a6 6 0 1012 0V2z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--amber)] to-[#D4961A] flex items-center justify-center shadow-[0_0_16px_var(--amber-glow)]">
              <span className="text-lg font-black text-[var(--primary-foreground)]">{summary.standing.position}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--amber)]">{userClubName}</p>
              <p className="text-[11px] text-muted-foreground">{summary.zoneLabel}</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-2xl font-black text-foreground">
              {summary.standing.points}{" "}
              <span className="text-[11px] font-semibold text-muted-foreground">pts</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summary.pointsFromLeader} pts from 1st
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center p-1 rounded-xl bg-card border border-border/50">
        {([
          { id: "table" as const, label: "Standings" },
          { id: "results" as const, label: "Results" },
          { id: "scorers" as const, label: "Top Scorers" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              tab === t.id
                ? "bg-[var(--amber)] text-[var(--primary-foreground)] shadow-[0_2px_12px_var(--amber-glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "table" && (
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2.5 bg-secondary/30 border-b border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[var(--stats-blue)]" />
              <span className="text-[10px] font-semibold text-muted-foreground">Champions League</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[var(--amber)]" />
              <span className="text-[10px] font-semibold text-muted-foreground">Europa League</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[var(--alert-red)]" />
              <span className="text-[10px] font-semibold text-muted-foreground">Relegation</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Full league standings">
              <thead>
                <tr className="bg-secondary/40 border-b border-border/50">
                  <th className="py-2.5 pl-4 pr-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">#</th>
                  <th className="py-2.5 px-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Team</th>
                  <th className="py-2.5 px-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-7" scope="col">P</th>
                  <th className="py-2.5 px-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-7" scope="col">W</th>
                  <th className="py-2.5 px-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-7" scope="col">D</th>
                  <th className="py-2.5 px-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-7" scope="col">L</th>
                  <th className="py-2.5 px-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10" scope="col">GD</th>
                  <th className="py-2.5 px-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">Pts</th>
                  <th className="py-2.5 px-2 pr-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Form</th>
                </tr>
              </thead>
              <tbody>
                {fullTable.map((team) => (
                  <tr
                    key={team.clubId}
                    className={`border-t border-border/20 transition-colors border-l-2 ${getZoneColor(team.zone)} ${
                      team.isUserClub ? "bg-[var(--amber)]/8" : ""
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-1">
                      <div className="flex items-center gap-1">
                        {team.isUserClub ? (
                          <span className="w-5 h-5 rounded bg-[var(--amber)] text-[10px] font-black text-[var(--primary-foreground)] flex items-center justify-center">{team.position}</span>
                        ) : (
                          <span className="w-5 h-5 rounded bg-secondary text-[10px] font-bold text-muted-foreground flex items-center justify-center">{team.position}</span>
                        )}
                        <PositionChangeIcon change={team.positionChange} />
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[12px] font-semibold whitespace-nowrap ${team.isUserClub ? "text-[var(--amber)]" : "text-foreground"}`}>{team.club.name}</span>
                    </td>
                    <td className="py-2.5 px-1.5 text-center text-[12px] text-muted-foreground">{team.played}</td>
                    <td className="py-2.5 px-1.5 text-center text-[12px] text-foreground font-medium">{team.won}</td>
                    <td className="py-2.5 px-1.5 text-center text-[12px] text-muted-foreground">{team.drawn}</td>
                    <td className="py-2.5 px-1.5 text-center text-[12px] text-muted-foreground">{team.lost}</td>
                    <td className="py-2.5 px-1.5 text-center">
                      <span className={`text-[12px] font-semibold ${team.gdLabel.startsWith("+") ? "text-[var(--success-green)]" : team.gdLabel.startsWith("-") ? "text-[var(--alert-red)]" : "text-muted-foreground"}`}>{team.gdLabel}</span>
                    </td>
                    <td className="py-2.5 px-1.5 text-center">
                      <span className={`text-[12px] font-black ${team.isUserClub ? "text-[var(--amber)]" : "text-foreground"}`}>{team.points}</span>
                    </td>
                    <td className="py-2.5 px-2 pr-4">
                      <div className="flex items-center justify-center gap-0.5">
                        {team.form.map((r, i) => <FormIndicator key={i} result={r} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "results" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Matchday {summary.season.currentMatchday} Results
            </h3>
          </div>
          {recentResults.map((match) => (
            <div
              key={match.id}
              className={`flex items-center gap-3 p-3 rounded-xl bg-card border transition-colors ${
                match.isUserMatch ? "border-[var(--amber)]/30 bg-[var(--amber)]/5" : "border-border/50"
              }`}
            >
              <div className="flex-1 text-right">
                <span className={`text-[13px] font-semibold ${match.isUserMatch && match.homeTeam === userClubName ? "text-[var(--amber)]" : "text-foreground"}`}>{match.homeTeam}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 shrink-0">
                <span className={`text-lg font-black ${match.homeScore > match.awayScore ? "text-foreground" : "text-muted-foreground"}`}>{match.homeScore}</span>
                <span className="text-xs text-muted-foreground/50">-</span>
                <span className={`text-lg font-black ${match.awayScore > match.homeScore ? "text-foreground" : "text-muted-foreground"}`}>{match.awayScore}</span>
              </div>
              <div className="flex-1">
                <span className={`text-[13px] font-semibold ${match.isUserMatch && match.awayTeam === userClubName ? "text-[var(--amber)]" : "text-foreground"}`}>{match.awayTeam}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "scorers" && (
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm" role="table" aria-label="Top scorers">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/50">
                <th className="py-2.5 pl-4 pr-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8" scope="col">#</th>
                <th className="py-2.5 px-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Player</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Club</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Goals</th>
                <th className="py-2.5 px-2 pr-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" scope="col">Assists</th>
              </tr>
            </thead>
            <tbody>
              {topScorers.map((scorer, idx) => (
                <tr key={scorer.name} className={`border-t border-border/20 ${scorer.isUser ? "bg-[var(--amber)]/8" : ""}`}>
                  <td className="py-3 pl-4 pr-1">
                    {idx < 3 ? (
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        idx === 0 ? "bg-[var(--amber)] text-[var(--primary-foreground)]" :
                        idx === 1 ? "bg-secondary text-foreground" :
                        "bg-[#CD7F32]/20 text-[#CD7F32]"
                      }`}>{idx + 1}</span>
                    ) : (
                      <span className="w-6 h-6 flex items-center justify-center text-[11px] font-bold text-muted-foreground">{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-[13px] font-semibold ${scorer.isUser ? "text-[var(--amber)]" : "text-foreground"}`}>{scorer.name}</span>
                  </td>
                  <td className="py-3 px-2 text-center text-[12px] text-muted-foreground">{scorer.club}</td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-[13px] font-black text-[var(--amber)]">{scorer.goals}</span>
                  </td>
                  <td className="py-3 px-2 pr-4 text-center">
                    <span className="text-[13px] font-semibold text-[var(--stats-blue)]">{scorer.assists}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
