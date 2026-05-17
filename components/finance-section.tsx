"use client"

import { AlertTriangle, Landmark, ReceiptText } from "lucide-react"
import { formatMoney, formatWage } from "@/lib/format"
import { useGame } from "@/lib/game-provider"

export function FinanceSection() {
  const { getUserClub } = useGame()
  const club = getUserClub()
  const finances = club.finances
  const sponsorIncome = club.sponsorDeals.reduce((sum, deal) => sum + deal.weeklyIncome, 0)
  const staffWages = club.staff.reduce((sum, staff) => sum + staff.weeklyWage, 0)
  const weeklyIncome = Math.round(finances.incomeBreakdown.tickets / 4 + finances.incomeBreakdown.tvRights / 4 + sponsorIncome)
  const weeklyExpenses = finances.weeklyWageBill + staffWages
  const projectedProfit = weeklyIncome - weeklyExpenses
  const penaltyLabel =
    finances.wageCapPenalty === "transfer_ban"
      ? "Transfer ban risk"
      : finances.wageCapPenalty === "warning"
        ? "Wage cap warning"
        : "Compliant"

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground">Club Finances</h2>
            <p className="text-[11px] text-muted-foreground">Real weekly cash flow, revenue and wage controls</p>
          </div>
          <Landmark className="h-5 w-5 text-[var(--stats-blue)]" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label="Balance" value={formatMoney(finances.balance)} />
          <Metric label="Transfer Budget" value={formatMoney(finances.transferBudget)} tone="amber" />
          <Metric label="Weekly Wage Bill" value={formatWage(finances.weeklyWageBill)} tone="danger" />
          <Metric label="Wage Room" value={formatWage(finances.weeklyWageRoom)} tone="success" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-[var(--amber)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revenue Streams</h3>
        </div>
        <Line label="Tickets" value={formatMoney(finances.incomeBreakdown.tickets)} />
        <Line label="TV rights" value={formatMoney(finances.incomeBreakdown.tvRights)} />
        <Line label="Sponsors" value={formatMoney(finances.incomeBreakdown.sponsors)} />
        <Line label="Player sales" value={formatMoney(finances.incomeBreakdown.playerSales)} />
        <Line label="Projected weekly result" value={formatMoney(projectedProfit)} highlight={projectedProfit >= 0 ? "success" : "danger"} />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${finances.wageCapPenalty === "none" ? "text-[var(--success-green)]" : "text-[var(--alert-red)]"}`} />
          <div>
            <p className="text-sm font-bold text-foreground">{penaltyLabel}</p>
            <p className="text-[11px] text-muted-foreground">
              Wage bill is {finances.wageBillPercent}% of monthly projected income. Crossing 80% triggers warnings; 95% risks transfer restrictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "amber" | "success" | "danger" }) {
  const color = tone === "amber" ? "text-[var(--amber)]" : tone === "success" ? "text-[var(--success-green)]" : tone === "danger" ? "text-[var(--alert-red)]" : "text-foreground"
  return (
    <div className="rounded-xl bg-secondary/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  )
}

function Line({ label, value, highlight }: { label: string; value: string; highlight?: "success" | "danger" }) {
  const color = highlight === "success" ? "text-[var(--success-green)]" : highlight === "danger" ? "text-[var(--alert-red)]" : "text-foreground"
  return (
    <div className="flex items-center justify-between border-t border-border/30 py-2 first:border-t-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  )
}
