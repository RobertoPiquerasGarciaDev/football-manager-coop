import {
  careerPhaseFromAge,
  moraleBandFromScore,
  type CareerPhase,
  type Player,
  type PlayerAttributes,
  type WeeklyTrainingPlan,
} from "@/lib/types"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const PHASE_GROWTH: Record<CareerPhase, number> = {
  youth: 1.4,
  development: 1,
  peak: 0.25,
  veteran: -0.15,
  twilight: -0.35,
}

function randomVariance(): number {
  return 1 + (Math.random() * 0.1 - 0.05)
}

function trainingFocus(weeklyPlan: WeeklyTrainingPlan): Record<string, number> {
  return weeklyPlan.sessions.reduce<Record<string, number>>((focus, session) => {
    const intensity = session.category === "recovery" ? -0.15 : 0.2 + session.fatigueCost / 100
    for (const attribute of session.focusAttributes) {
      focus[attribute] = (focus[attribute] ?? 0) + intensity
    }
    return focus
  }, {})
}

function adjustAttribute(value: number, key: string, phaseGrowth: number, decline: number, focus: Record<string, number>): number {
  const focusedGrowth = phaseGrowth + (focus[key] ?? 0)
  return Math.round(clamp(value + focusedGrowth * randomVariance() - decline, 1, 99))
}

function progressAttributes(player: Player, focus: Record<string, number>): PlayerAttributes {
  const phaseGrowth = PHASE_GROWTH[player.careerPhase]
  const physicalDecline = player.age >= 30 ? Math.min(2.2, (player.age - 29) * 0.35) : 0

  return {
    technical: {
      passing: adjustAttribute(player.attributes.technical.passing, "passing", phaseGrowth, 0, focus),
      dribbling: adjustAttribute(player.attributes.technical.dribbling, "dribbling", phaseGrowth, 0, focus),
      shooting: adjustAttribute(player.attributes.technical.shooting, "shooting", phaseGrowth, 0, focus),
      heading: adjustAttribute(player.attributes.technical.heading, "heading", phaseGrowth, 0, focus),
      crossing: adjustAttribute(player.attributes.technical.crossing, "crossing", phaseGrowth, 0, focus),
      technique: adjustAttribute(player.attributes.technical.technique, "technique", phaseGrowth, 0, focus),
    },
    physical: {
      pace: adjustAttribute(player.attributes.physical.pace, "pace", phaseGrowth, physicalDecline, focus),
      stamina: adjustAttribute(player.attributes.physical.stamina, "stamina", phaseGrowth, physicalDecline, focus),
      strength: adjustAttribute(player.attributes.physical.strength, "strength", phaseGrowth, physicalDecline * 0.5, focus),
      agility: adjustAttribute(player.attributes.physical.agility, "agility", phaseGrowth, physicalDecline, focus),
      acceleration: adjustAttribute(player.attributes.physical.acceleration, "acceleration", phaseGrowth, physicalDecline, focus),
      jumping: adjustAttribute(player.attributes.physical.jumping, "jumping", phaseGrowth, physicalDecline * 0.75, focus),
    },
    mental: {
      vision: adjustAttribute(player.attributes.mental.vision, "vision", phaseGrowth, 0, focus),
      aggression: adjustAttribute(player.attributes.mental.aggression, "aggression", phaseGrowth * 0.25, 0, focus),
      leadership: adjustAttribute(player.attributes.mental.leadership, "leadership", Math.max(0, phaseGrowth), 0, focus),
      concentration: adjustAttribute(player.attributes.mental.concentration, "concentration", phaseGrowth, 0, focus),
      decisions: adjustAttribute(player.attributes.mental.decisions, "decisions", phaseGrowth, 0, focus),
      teamwork: adjustAttribute(player.attributes.mental.teamwork, "teamwork", phaseGrowth, 0, focus),
    },
    goalkeeping: {
      reflexes: adjustAttribute(player.attributes.goalkeeping.reflexes, "reflexes", phaseGrowth, physicalDecline, focus),
      positioning: adjustAttribute(player.attributes.goalkeeping.positioning, "positioning", phaseGrowth, 0, focus),
      rushingOut: adjustAttribute(player.attributes.goalkeeping.rushingOut, "rushingOut", phaseGrowth, physicalDecline * 0.5, focus),
      distribution: adjustAttribute(player.attributes.goalkeeping.distribution, "distribution", phaseGrowth, 0, focus),
      handling: adjustAttribute(player.attributes.goalkeeping.handling, "handling", phaseGrowth, 0, focus),
      aerialReach: adjustAttribute(player.attributes.goalkeeping.aerialReach, "aerialReach", phaseGrowth, physicalDecline * 0.5, focus),
    },
  }
}

function averageRating(attributes: PlayerAttributes): number {
  const values = [
    ...Object.values(attributes.technical),
    ...Object.values(attributes.physical),
    ...Object.values(attributes.mental),
    ...Object.values(attributes.goalkeeping),
  ]
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function progressPlayers(squad: Player[], weeklyPlan: WeeklyTrainingPlan): Player[] {
  const focus = trainingFocus(weeklyPlan)
  const fatigueCost = weeklyPlan.sessions.reduce((sum, session) => sum + session.fatigueCost, 0)
  const hasRecovery = weeklyPlan.sessions.some((session) => session.category === "recovery")

  return squad.map((player) => {
    const attributes = progressAttributes(player, focus)
    const overallRating = averageRating(attributes)
    const fatigue = clamp(player.fatigue + fatigueCost * 0.35 - (hasRecovery ? 12 : 4), 0, 100)
    const fitness = clamp(player.fitness - fatigueCost * 0.15 + (hasRecovery ? 8 : 2), 0, 100)
    const morale = clamp(player.morale + (overallRating > player.overallRating ? 1 : -1), 0, 100)

    return {
      ...player,
      careerPhase: careerPhaseFromAge(player.age),
      attributes,
      overallRating,
      fatigue,
      fitness,
      morale,
      moraleBand: moraleBandFromScore(morale),
      updatedAt: new Date().toISOString(),
    }
  })
}
