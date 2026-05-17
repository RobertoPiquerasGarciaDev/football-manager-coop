"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { fetchStaff, hireStaff, type StaffMember } from "@/lib/api"

const roles = [
  "goalkeeper_coach",
  "fitness_coach",
  "club_doctor",
  "tactical_analyst",
  "scout",
  "sporting_director",
  "set_piece_coach",
]

export function StaffSection({ leagueId }: { leagueId?: string | null }) {
  const { token } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isHiring, setIsHiring] = useState(false)

  useEffect(() => {
    if (!token || !leagueId) return
    void fetchStaff(token, leagueId).then(setStaff).catch(() => setStaff([]))
  }, [leagueId, token])

  async function handleHire(role: string) {
    if (!token || !leagueId) return
    setIsHiring(true)
    try {
      const member = await hireStaff(token, leagueId, { role, level: role === "tactical_analyst" ? 4 : 3, region: "Europe" })
      setStaff((items) => [member, ...items])
    } finally {
      setIsHiring(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <Card className="border-border/50 bg-card">
        <CardContent className="p-4">
          <h2 className="text-sm font-black text-foreground">Technical Staff</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Contrata staff nivel 1-5: porteros, físico, médico, analista, ojeadores, director deportivo y balón parado.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {roles.map((role) => (
          <Button key={role} type="button" variant="secondary" disabled={isHiring || !leagueId} onClick={() => handleHire(role)}>
            {role.replaceAll("_", " ")}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {staff.map((member) => (
          <div key={member.id} className="rounded-2xl border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">{member.name}</p>
                <p className="text-[11px] text-muted-foreground">{member.role.replaceAll("_", " ")}</p>
              </div>
              <Badge>Lvl {member.level}</Badge>
            </div>
          </div>
        ))}
        {staff.length === 0 && <p className="text-xs text-muted-foreground">Sin staff contratado todavía.</p>}
      </div>
    </div>
  )
}
