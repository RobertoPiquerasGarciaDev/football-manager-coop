"use client"

import { Sparkles, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useGame } from "@/lib/game-provider"
import type { TrainingCategory, WeeklyTrainingPlan } from "@/lib/types"

const plans: Array<{ id: string; label: string; category: TrainingCategory; focus: string[]; fatigue: number }> = [
  { id: "technical", label: "Technical Growth", category: "technical", focus: ["passing", "technique", "shooting"], fatigue: 16 },
  { id: "physical", label: "Physical Block", category: "physical", focus: ["pace", "stamina", "strength"], fatigue: 20 },
  { id: "tactical", label: "Tactical Cohesion", category: "tactical", focus: ["decisions", "teamwork", "concentration"], fatigue: 12 },
  { id: "recovery", label: "Recovery Week", category: "recovery", focus: ["concentration", "teamwork"], fatigue: 4 },
]

export function AcademySection() {
  const { getUserClub, setTrainingPlan, promoteYouthProspect } = useGame()
  const { toast } = useToast()
  const club = getUserClub()
  const activePlan = club.currentTrainingPlan

  function applyPlan(planId: string) {
    const selected = plans.find((plan) => plan.id === planId) ?? plans[0]
    const plan: WeeklyTrainingPlan = {
      weekNumber: activePlan ? activePlan.weekNumber + 1 : 1,
      sessions: [
        { id: `${selected.id}-1`, category: selected.category, focusAttributes: selected.focus, fatigueCost: selected.fatigue, scheduledDay: 1 },
        { id: `${selected.id}-2`, category: selected.category, focusAttributes: selected.focus.slice(0, 2), fatigueCost: selected.fatigue, scheduledDay: 3 },
        { id: "recovery-5", category: "recovery", focusAttributes: ["teamwork"], fatigueCost: 4, scheduledDay: 5 },
      ],
    }
    setTrainingPlan(plan)
    toast({ title: "Training plan saved", description: `${selected.label} will apply on the next matchday.` })
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground">Youth Academy</h2>
            <p className="text-[11px] text-muted-foreground">Procedural intake, scouting and promotion pipeline</p>
          </div>
          <Sparkles className="h-5 w-5 text-[var(--amber)]" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-secondary/50 p-3 text-center">
            <p className="text-lg font-black text-foreground">{club.youthProspects.length}</p>
            <p className="text-[10px] text-muted-foreground">Prospects</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3 text-center">
            <p className="text-lg font-black text-[var(--amber)]">{club.facilities.find((f) => f.type === "youth_academy")?.level ?? 1}</p>
            <p className="text-[10px] text-muted-foreground">Academy Lv</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3 text-center">
            <p className="text-lg font-black text-[var(--success-green)]">{activePlan?.weekNumber ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Plan Week</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {plans.map((plan) => (
          <Button
            key={plan.id}
            type="button"
            variant="secondary"
            draggable
            className="h-auto cursor-grab flex-col items-start p-3 active:cursor-grabbing"
            onClick={() => applyPlan(plan.id)}
            onDragStart={(event) => event.dataTransfer.setData("text/training-plan", plan.id)}
          >
            <span className="text-xs font-bold">{plan.label}</span>
            <span className="text-[10px] text-muted-foreground">{plan.focus.join(", ")}</span>
          </Button>
        ))}
      </div>

      <div
        className="rounded-2xl border border-dashed border-[var(--amber)]/40 bg-[var(--amber)]/10 p-4 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          applyPlan(event.dataTransfer.getData("text/training-plan"))
        }}
      >
        <p className="text-xs font-bold text-foreground">Drag a weekly training block here</p>
        <p className="text-[11px] text-muted-foreground">Drop to activate the plan for next matchday progression.</p>
      </div>

      <div className="flex flex-col gap-2">
        {club.youthProspects.map((prospect) => (
          <div key={prospect.id} className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{prospect.generatedName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {prospect.age}y · {prospect.position} · {prospect.academyCategory.toUpperCase()} · {prospect.weeksInAcademy} weeks
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[var(--amber)]">{prospect.overallRating}</p>
                <p className="text-[10px] text-muted-foreground">
                  POT {prospect.revealedPotential ?? "Hidden"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--success-green)]" />
              <p className="flex-1 text-[11px] text-muted-foreground">Progresses weekly from the selected training plan.</p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  promoteYouthProspect(prospect.id)
                  toast({ title: "Prospect promoted", description: `${prospect.generatedName} joined the senior squad.` })
                }}
              >
                Promote
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
