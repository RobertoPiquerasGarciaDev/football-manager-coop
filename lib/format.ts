import type { Money } from "@/lib/types"

export function formatMoney(amount: Money): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    const m = amount / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `$${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}M`
  }
  if (abs >= 1_000) return `$${Math.round(amount / 1_000)}K`
  return `$${amount}`
}

export function formatWage(weeklyWage: Money): string {
  return `${formatMoney(weeklyWage)}/w`
}

export function formatGoalDifference(gd: number): string {
  return gd > 0 ? `+${gd}` : `${gd}`
}
