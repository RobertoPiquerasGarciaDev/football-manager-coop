"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type Step = {
  title: string
  body: string
  spotlightSelector?: string
}

const STEPS: Step[] = [
  {
    title: "Bienvenido a Pitch Perfect",
    body: "Desde el Hub puedes crear ligas cooperativas, unirte con código y ver el estado de todas tus competiciones.",
  },
  {
    title: "Crea tu primera liga",
    body: "Configura número de humanos (1-20), presupuesto inicial y ventana de turno. El resto de clubes los lleva la IA con personalidad propia.",
  },
  {
    title: "Elige tu club",
    body: "Verás los 20 clubes disponibles. Los ocupados aparecen bloqueados con el nombre del manager actual.",
  },
  {
    title: "Mercado y tácticas",
    body: "Durante el mercado puedes fichar libremente. Pulsa \"Cerrar mi mercado\" cuando termines. Las tácticas se autoguardan en cualquier fase.",
  },
  {
    title: "Envía tu turno",
    body: "Cuando todos los managers humanos envían turno, la jornada se simula automáticamente y recibes los resultados al instante.",
  },
]

export function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      {/* Spotlight glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--amber)]/20 blur-[80px]" />

      <div className="relative z-10 mx-4 w-full max-w-sm rounded-3xl border border-[var(--amber)]/40 bg-card p-6 shadow-2xl animate-card-enter">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--amber)]">
            Tutorial · {step + 1}/{STEPS.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            Saltar
          </button>
        </div>
        <h2 className="text-xl font-black text-foreground">{current.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.body}</p>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index === step ? "bg-[var(--amber)]" : index < step ? "bg-[var(--amber)]/40" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          {step > 0 && (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              Atrás
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              if (isLast) onClose()
              else setStep((s) => s + 1)
            }}
          >
            {isLast ? "Empezar" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  )
}
