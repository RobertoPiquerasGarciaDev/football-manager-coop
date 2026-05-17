"use client"

import { type FormEvent, useState } from "react"
import { CheckCircle2, Lock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"

type AuthMode = "login" | "register"
type AuthStage = "welcome" | "auth"

const clubs = [
  { id: "metropolis", name: "FC Metropolis", city: "Capital", taken: false },
  { id: "harbor", name: "Harbor City", city: "Bay", taken: true },
  { id: "dynamo", name: "Capital Dynamo", city: "Capital", taken: false },
  { id: "rovers", name: "Pacific Rovers", city: "Pacific", taken: false },
]

export function AuthScreen() {
  const [stage, setStage] = useState<AuthStage>("welcome")
  const [mode, setMode] = useState<AuthMode>("login")
  const [selectedClub, setSelectedClub] = useState("metropolis")
  const [tutorialStep, setTutorialStep] = useState(0)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, register } = useAuth()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === "register") {
        await register(email, password, displayName)
      } else {
        await login(email, password)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background max-w-md mx-auto flex items-center px-4 overflow-hidden">
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          className="animate-float-ball pointer-events-none absolute h-2 w-2 rounded-full border border-[var(--amber)]/70"
          style={{
            left: `${(index * 23) % 100}%`,
            top: `${(index * 17) % 100}%`,
            animationDelay: `${index * 180}ms`,
          }}
        />
      ))}
      {stage === "welcome" ? (
        <div className="relative z-10 w-full text-center animate-card-enter">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--amber)] shadow-[0_0_60px_var(--amber-glow)]">
            <Trophy className="h-12 w-12 text-[var(--primary-foreground)]" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Pitch Perfect</h1>
          <p className="mt-3 text-sm text-muted-foreground">Build, negotiate and simulate a cooperative football empire.</p>
          <Button className="mt-8 w-full" onClick={() => setStage("auth")}>
            Enter the dugout
          </Button>
        </div>
      ) : (
      <Card className="w-full border-border/50 bg-card/95">
        <CardHeader>
          <CardTitle className="text-xl font-black text-foreground">
            {mode === "register" ? "Crear cuenta" : "Iniciar sesion"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Accede para crear o unirte a ligas cooperativas.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "register" && (
              <>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nombre de manager"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  {clubs.map((club, index) => {
                    const selected = selectedClub === club.id
                    return (
                      <button
                        key={club.id}
                        type="button"
                        disabled={club.taken}
                        onClick={() => setSelectedClub(club.id)}
                        className={`card-3d relative rounded-xl border p-3 text-left animate-card-enter ${
                          selected ? "border-[var(--amber)] bg-[var(--amber)]/10" : "border-border/50 bg-secondary/30"
                        } ${club.taken ? "opacity-55" : ""}`}
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <p className="text-xs font-black text-foreground">{club.name}</p>
                        <p className="text-[10px] text-muted-foreground">{club.city}</p>
                        {selected && !club.taken && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-[var(--amber)]" />}
                        {club.taken && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45">
                            <Lock className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-3">
                  <p className="text-xs font-bold text-foreground">Tutorial {tutorialStep + 1}/3</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {[
                      "Pick a club and create your first cooperative league.",
                      "Submit turns before deadline to keep the league moving.",
                      "Use training, morale and transfers to build an advantage.",
                    ][tutorialStep]}
                  </p>
                  <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => setTutorialStep((tutorialStep + 1) % 3)}>
                    Next tip
                  </Button>
                </div>
              </>
            )}
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              minLength={8}
              required
            />

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Procesando..." : mode === "register" ? "Registrarme" : "Entrar"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => {
              setError(null)
              setMode(mode === "register" ? "login" : "register")
            }}
          >
            {mode === "register" ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
          </Button>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
