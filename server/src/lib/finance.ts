/**
 * Calibrated weekly finance computations (v7).
 *
 * Brief calibration targets:
 *   - Taquilla: aforo × ocupación% × precio
 *       ocupación = 60% base + posición_tabla × 2% + racha × 3%
 *   - Derechos TV: 500K + 50K × (21 - posición) base/jornada
 *   - Patrocinios: nivel_estadio × 200K / 38 jornadas
 *   - Premios liga (fin de temporada): 1º 5M, 2º 3M, 3º 2M
 *       Cada jornada cabe esperar una fracción proporcional al rendimiento.
 */

export type FinanceInputs = {
  /** 1-based position in current standings */
  position: number
  /** total clubs in the league (typically 20) */
  totalClubs: number
  /** count of recent wins in the last 5 matches (used as racha) */
  recentWins: number
  /** stadium attributes */
  stadiumCapacity: number
  ticketPrice: number
  /** 1-5 facilities level (affects sponsors) */
  stadiumLevel: number
  /** prior wage bill — weekly */
  weeklyWageBill: number
  /** total transfer budget — used to amortise signings (52 weeks horizon) */
  transferBudget: number
  /** existing long term debt principal */
  longTermDebt: number
  /** whether the club won its last match */
  wonLast: boolean
  /** annual income projection (used for FFP ratios) */
  annualIncomeProjection: number
}

export type WeeklyFinanceResult = {
  income: {
    tickets: number
    tvRights: number
    sponsors: number
    prizeMoney: number
    playerSales: number
    total: number
  }
  expenses: {
    wages: number
    staffWages: number
    amortization: number
    facilities: number
    performanceBonuses: number
    interest: number
    total: number
  }
  net: number
  nextBalance: number
  nextDebt: number
  wageRatio: number
  ffpStatus: "compliant" | "warning" | "transfer_restricted" | "administration"
  bankrupt: boolean
  projection: { week: number; projectedBalance: number; projectedDebt: number }[]
  alerts: string[]
}

export function computeWeeklyFinance(currentBalance: number, inputs: FinanceInputs): WeeklyFinanceResult {
  const safePosition = Math.max(1, Math.min(inputs.totalClubs || 20, inputs.position || 10))
  const totalClubs = Math.max(2, inputs.totalClubs || 20)

  // ── Ingresos ──────────────────────────────────────────
  // Ocupación = 60% base + posición × 2% (mejor posición ⇒ más ocupación) + racha × 3%
  const positionBoost = ((totalClubs - safePosition) / Math.max(1, totalClubs - 1)) * 0.02 * (totalClubs - 1)
  const occupancyRaw = 0.6 + positionBoost + inputs.recentWins * 0.03
  const occupancy = Math.min(0.99, Math.max(0.45, occupancyRaw))
  const tickets = Math.round(inputs.stadiumCapacity * occupancy * inputs.ticketPrice)

  // Derechos TV: 500K base + 50K × (totalClubs - position)
  const tvRights = 500_000 + 50_000 * (totalClubs - safePosition)

  // Patrocinios: stadium level × 200K / 38 jornadas
  const sponsors = Math.round((Math.max(1, Math.min(5, inputs.stadiumLevel)) * 200_000) / 38)

  // Premios: cada jornada repartimos prorrata sobre 38
  // 1º 5M, 2º 3M, 3º 2M, 4º-6º 800K, 7º-10º 300K, resto 0
  const seasonPrize =
    safePosition === 1 ? 5_000_000 :
    safePosition === 2 ? 3_000_000 :
    safePosition === 3 ? 2_000_000 :
    safePosition <= 6 ? 800_000 :
    safePosition <= 10 ? 300_000 : 0
  const prizeMoney = Math.round(seasonPrize / 38)

  const playerSales = 0 // venta puntual: gestionada en endpoint de transfer

  const incomeTotal = tickets + tvRights + sponsors + prizeMoney + playerSales

  // ── Gastos ───────────────────────────────────────────
  const wages = inputs.weeklyWageBill
  const staffWages = 130_000
  const amortization = Math.round(inputs.transferBudget / 260)
  const facilities = Math.round(45_000 + inputs.stadiumLevel * 12_000)
  const performanceBonuses = inputs.wonLast ? 60_000 : 15_000
  const interest = inputs.longTermDebt > 0 ? Math.round(inputs.longTermDebt * 0.0018) : 0
  const expenseTotal = wages + staffWages + amortization + facilities + performanceBonuses + interest

  const net = incomeTotal - expenseTotal
  const nextDebt = net < 0 && currentBalance + net < 0
    ? inputs.longTermDebt + Math.abs(currentBalance + net)
    : inputs.longTermDebt
  const nextBalance = Math.max(-25_000_000, currentBalance + net)

  // ── FFP ──────────────────────────────────────────────
  const wageRatio = incomeTotal > 0 ? wages / incomeTotal : 1
  const ffpStatus: WeeklyFinanceResult["ffpStatus"] =
    wageRatio > 0.85 ? "transfer_restricted" :
    wageRatio > 0.7 ? "warning" :
    nextDebt > Math.max(1, inputs.annualIncomeProjection) * 3 ? "administration" :
    "compliant"

  const bankrupt = nextBalance <= -20_000_000 || ffpStatus === "administration"

  // ── Proyección 12 semanas ────────────────────────────
  const projection = Array.from({ length: 12 }, (_, week) => ({
    week: week + 1,
    projectedBalance: nextBalance + net * week,
    projectedDebt: nextDebt,
  }))

  const alerts: string[] = []
  if (wageRatio > 0.7) alerts.push(`Masa salarial al ${Math.round(wageRatio * 100)}% de ingresos`)
  if (bankrupt) alerts.push("Riesgo de quiebra: ingresa fondos o vende activos")
  if (ffpStatus === "transfer_restricted") alerts.push("Fair Play: restricción de fichajes activa")
  if (ffpStatus === "administration") alerts.push("Fair Play: intervención por deuda excesiva")

  return {
    income: { tickets, tvRights, sponsors, prizeMoney, playerSales, total: incomeTotal },
    expenses: {
      wages,
      staffWages,
      amortization,
      facilities,
      performanceBonuses,
      interest,
      total: expenseTotal,
    },
    net,
    nextBalance,
    nextDebt,
    wageRatio,
    ffpStatus,
    bankrupt,
    projection,
    alerts,
  }
}
