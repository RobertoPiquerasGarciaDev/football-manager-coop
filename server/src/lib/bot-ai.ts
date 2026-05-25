/**
 * Bot AI v7 — Personality-driven tactical and market behaviour.
 *
 * Each bot is deterministically assigned one of three personalities by hashing
 * its club id. Each personality drives:
 *   - Default formation & instructions
 *   - Reactive tactical adjustments when the opponent rating is higher / lower
 *   - Transfer/budget appetite
 */

import { createHash } from "crypto"
import type { TacticInstructions } from "./simulator"

export type BotPersonality = "aggressive" | "conservative" | "balanced"

export function botPersonality(clubId: string): BotPersonality {
  const hash = createHash("md5").update(clubId).digest()
  const v = hash.readUInt8(0) % 3
  return v === 0 ? "aggressive" : v === 1 ? "conservative" : "balanced"
}

/** Return the bot's tactical setup, possibly reacting to a known opponent rating */
export function botTacticalSetup(
  personality: BotPersonality,
  opponentRating?: number,
  myRating?: number,
): { formation: string; tactics: TacticInstructions; lineupNote: string } {
  const ratingDiff = (myRating ?? 70) - (opponentRating ?? 70)
  // If I'm noticeably worse → defend; if much better → attack
  const stronger = ratingDiff > 4
  const weaker = ratingDiff < -4

  if (personality === "aggressive") {
    return {
      formation: stronger ? "4-2-4" : weaker ? "4-3-3" : "4-3-3",
      tactics: {
        formation: stronger ? "4-2-4" : weaker ? "4-3-3" : "4-3-3",
        pressing: "high",
        tempo: "high",
        style: stronger ? "direct" : weaker ? "counter" : "press",
        width: "wide",
        defensiveLine: stronger ? "high" : "balanced",
      },
      lineupNote: "Bot agresivo: presión alta y tempo rápido",
    }
  }

  if (personality === "conservative") {
    return {
      formation: weaker ? "5-4-1" : "5-3-2",
      tactics: {
        formation: weaker ? "5-4-1" : "5-3-2",
        pressing: weaker ? "low" : "medium",
        tempo: "low",
        style: weaker ? "counter" : "possession",
        width: "narrow",
        defensiveLine: weaker ? "deep" : "balanced",
      },
      lineupNote: "Bot conservador: cierra atrás y juega al contragolpe",
    }
  }

  // balanced
  return {
    formation: stronger ? "4-3-3" : weaker ? "4-5-1" : "4-4-2",
    tactics: {
      formation: stronger ? "4-3-3" : weaker ? "4-5-1" : "4-4-2",
      pressing: stronger ? "high" : weaker ? "low" : "medium",
      tempo: "medium",
      style: stronger ? "possession" : weaker ? "counter" : "direct",
      width: "balanced",
      defensiveLine: stronger ? "high" : weaker ? "deep" : "balanced",
    },
    lineupNote: "Bot equilibrado: adapta su táctica al rival",
  }
}

/** Determine how aggressively a bot bids for players (multiplier over market value) */
export function botBidMultiplier(personality: BotPersonality): number {
  if (personality === "aggressive") return 1.15
  if (personality === "conservative") return 0.85
  return 1
}

/** Determine wage offer multiplier */
export function botWageMultiplier(personality: BotPersonality): number {
  if (personality === "aggressive") return 1.2
  if (personality === "conservative") return 0.9
  return 1.05
}
