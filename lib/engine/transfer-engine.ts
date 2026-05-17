import type { Club, Money, Player, Transfer, TransferOffer } from "@/lib/types"

export type TransferDecision =
  | {
      type: "accepted"
      reason: string
    }
  | {
      type: "rejected"
      reason: string
    }
  | {
      type: "counteroffer"
      reason: string
      fee: Money
      weeklyWage: Money
    }

type EvaluatedOffer = Pick<TransferOffer | Transfer, "terms">

function wagePressure(club: Club): number {
  const capPressure = club.finances.wageBillPercent / 100
  const roomPressure = club.finances.weeklyWageRoom <= 0 ? 0.25 : 0
  return capPressure + roomPressure
}

export function evaluateTransfer(offer: EvaluatedOffer, player: Player, club: Club): TransferDecision {
  const offeredFee = offer.terms.fee
  const offeredWage = offer.terms.offeredWeeklyWage
  const marketValue = player.marketValue
  const wageRoom = club.finances.weeklyWageRoom
  const pressure = wagePressure(club)
  const minimumAcceptable = marketValue * (player.age >= 30 ? 0.9 : 1.08)
  const premiumTarget = marketValue * (player.potentialRating >= 84 ? 1.25 : 1.15)

  if (offeredWage > wageRoom && wageRoom > 0) {
    return {
      type: "rejected",
      reason: "Offered wage would exceed available wage room.",
    }
  }

  if (offeredFee >= premiumTarget || (pressure > 0.9 && offeredFee >= marketValue)) {
    return {
      type: "accepted",
      reason: "Fee meets market premium and improves wage structure.",
    }
  }

  if (offeredFee >= minimumAcceptable) {
    return {
      type: "counteroffer",
      reason: "Offer is close, but the selling club wants a market premium.",
      fee: Math.round(premiumTarget),
      weeklyWage: offeredWage,
    }
  }

  return {
    type: "rejected",
    reason: "Offer is below the player's market value.",
  }
}
