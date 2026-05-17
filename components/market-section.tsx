"use client"

import { useState } from "react"
import { Search, ChevronRight, ArrowDownLeft, Star, TrendingUp, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { PositionGroup, ValueTrend } from "@/lib/types"
import { formatMoney, formatWage } from "@/lib/format"
import { useGame, type UserBidRow } from "@/lib/game-provider"

const posFilters = ["All", "GK", "DEF", "MID", "FWD"] as const
type MarketTab = "browse" | "bids" | "watchlist"

function getRatingColor(r: number) {
  if (r >= 85) return "text-[var(--success-green)] bg-[var(--success-green)]/15 border-[var(--success-green)]/25"
  if (r >= 80) return "text-[var(--amber)] bg-[var(--amber)]/15 border-[var(--amber)]/25"
  if (r >= 75) return "text-[var(--stats-blue)] bg-[var(--stats-blue)]/15 border-[var(--stats-blue)]/25"
  return "text-muted-foreground bg-secondary border-border"
}

function getPosColor(p: PositionGroup) {
  if (p === "GK") return "text-[var(--amber)] bg-[var(--amber)]/10"
  if (p === "DEF") return "text-[var(--stats-blue)] bg-[var(--stats-blue)]/10"
  if (p === "MID") return "text-[var(--success-green)] bg-[var(--success-green)]/10"
  return "text-[var(--alert-red)] bg-[var(--alert-red)]/10"
}

function getBidStatusConfig(status: UserBidRow["uiStatus"]) {
  switch (status) {
    case "accepted":
      return { label: "Accepted", color: "text-[var(--success-green)] bg-[var(--success-green)]/15" }
    case "rejected":
      return { label: "Rejected", color: "text-[var(--alert-red)] bg-[var(--alert-red)]/15" }
    case "negotiating":
      return { label: "Negotiating", color: "text-[var(--amber)] bg-[var(--amber)]/15" }
    case "pending":
      return { label: "Pending", color: "text-[var(--stats-blue)] bg-[var(--stats-blue)]/15" }
  }
}

function listingDeadlineLabel(deadlineAt: string | null): string | undefined {
  if (!deadlineAt) return undefined
  const days = Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 86400000)
  if (days <= 0) return "Today"
  return `${days}d left`
}

export function MarketSection() {
  const {
    getMarketBrowsePlayers,
    getMarketStats,
    getUserOutgoingBids,
    isPlayerWatchlisted,
    processTransfer,
  } = useGame()
  const { toast } = useToast()
  const marketPlayers = getMarketBrowsePlayers()
  const yourBids = getUserOutgoingBids()
  const marketStatsRaw = getMarketStats()
  const marketStats = {
    budget: formatMoney(marketStatsRaw.transferBudget),
    wageRoom: formatWage(marketStatsRaw.wageRoom),
    scouted: marketStatsRaw.scouted,
    activeBids: marketStatsRaw.activeBids,
  }

  const [tab, setTab] = useState<MarketTab>("browse")
  const [posFilter, setPosFilter] = useState<(typeof posFilters)[number]>("All")
  const [search, setSearch] = useState("")

  const filtered = marketPlayers.filter(({ player }) => {
    if (posFilter !== "All" && player.positionGroup !== posFilter) return false
    if (search && !player.displayName.toLowerCase().includes(search.toLowerCase())) return false
    if (tab === "watchlist") return isPlayerWatchlisted(player.id)
    return true
  })

  const watchlistCount = marketPlayers.filter(({ player }) => isPlayerWatchlisted(player.id)).length

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-card border border-border/50">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transfer Budget</span>
          <span className="text-xl font-black text-[var(--stats-blue)]">{marketStats.budget}</span>
        </div>
        <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-card border border-border/50">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Wage Room</span>
          <span className="text-xl font-black text-[var(--success-green)]">{marketStats.wageRoom}</span>
        </div>
      </div>

      <div className="flex items-center p-1 rounded-xl bg-card border border-border/50">
        {([
          { id: "browse" as const, label: "Browse", count: marketPlayers.length },
          { id: "bids" as const, label: "My Bids", count: yourBids.length },
          { id: "watchlist" as const, label: "Watchlist", count: watchlistCount },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              tab === t.id
                ? "bg-[var(--amber)] text-[var(--primary-foreground)] shadow-[0_2px_12px_var(--amber-glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                tab === t.id ? "bg-black/20 text-[var(--primary-foreground)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {(tab === "browse" || tab === "watchlist") && (
        <>
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {posFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => setPosFilter(f)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                    posFilter === f
                      ? "bg-[var(--amber)] text-[var(--primary-foreground)]"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {filtered.map(({ player, club, listing, contract }) => {
              const deadline = listingDeadlineLabel(listing.deadlineAt)
              const isFavorite = isPlayerWatchlisted(player.id)
              const trend: ValueTrend = player.valueTrend
              return (
                <button
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-secondary/50 active:scale-[0.99] transition-all text-left w-full group"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <span className="text-lg font-black text-muted-foreground/60">{player.displayName.charAt(0)}</span>
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${getRatingColor(player.overallRating)}`}
                    >
                      {player.overallRating}
                    </div>
                    {isFavorite && (
                      <div className="absolute -top-1 -left-1 w-5 h-5 rounded-md bg-[var(--amber)] flex items-center justify-center">
                        <Star className="w-3 h-3 text-[var(--primary-foreground)] fill-[var(--primary-foreground)]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-foreground truncate">{player.displayName}</span>
                      {listing.isHot && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--alert-red)]/15 text-[var(--alert-red)] text-[9px] font-black">
                          HOT
                        </span>
                      )}
                      {deadline && (
                        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--amber)]/10 text-[var(--amber)] text-[9px] font-bold">
                          <Clock className="w-2.5 h-2.5" />
                          {deadline}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getPosColor(player.positionGroup)}`}>
                        {player.position}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{player.age}y</span>
                      <span className="text-[11px] text-border">|</span>
                      <span className="text-[11px] text-muted-foreground">{club.shortName}</span>
                      <span className="text-[11px] text-border">|</span>
                      <span className="text-[11px] text-muted-foreground">{player.nationality}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--amber)]">{formatMoney(player.marketValue)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatWage(contract.weeklyWage)}</p>
                    </div>
                    {trend === "rising" && <TrendingUp className="w-4 h-4 text-[var(--success-green)]" />}
                    {trend === "falling" && <TrendingUp className="w-4 h-4 text-[var(--alert-red)] rotate-180" />}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === "bids" && (
        <div className="flex flex-col gap-1.5">
          {yourBids.map((bid) => {
            const statusConfig = getBidStatusConfig(bid.uiStatus)
            return (
              <button
                key={bid.transfer.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-secondary/50 active:scale-[0.99] transition-all text-left w-full group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/10 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-5 h-5 text-[var(--amber)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-foreground truncate">{bid.player.displayName}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{bid.player.position}</span>
                    <span className="text-[11px] text-border">|</span>
                    <span className="text-[11px] text-muted-foreground">
                      Bid: <span className="text-[var(--amber)] font-semibold">{formatMoney(bid.transfer.terms.fee)}</span>
                    </span>
                    <span className="text-[11px] text-border">|</span>
                    <span className="text-[11px] text-muted-foreground">{bid.timeAgoLabel}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {bid.uiStatus === "negotiating" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation()
                        processTransfer(bid.transfer.id, "accepted")
                        toast({ title: "Counteroffer accepted", description: `${bid.player.displayName} negotiation completed.` })
                      }}
                    >
                      Accept
                    </Button>
                  )}
                  {bid.uiStatus === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation()
                        processTransfer(bid.transfer.id, "countered")
                        toast({ title: "Counteroffer sent", description: "The other club was notified in the transfer feed." })
                      }}
                    >
                      Counter
                    </Button>
                  )}
                  {bid.uiStatus !== "accepted" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation()
                        processTransfer(bid.transfer.id, "rejected")
                        toast({ title: "Offer rejected", description: `${bid.player.displayName} stays on your shortlist.` })
                      }}
                    >
                      Reject
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            )
          })}
          {yourBids.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowDownLeft className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No active bids</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Browse players and place bids to see them here</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
