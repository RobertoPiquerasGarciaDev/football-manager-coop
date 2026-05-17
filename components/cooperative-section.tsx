"use client"

import { type FormEvent, useState } from "react"
import { Crown, MessageCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGame } from "@/lib/game-provider"

export function CooperativeSection() {
  const { save, getLeague, getUserClub, sendLeagueMessage } = useGame()
  const [message, setMessage] = useState("")
  const league = getLeague()
  const club = getUserClub()
  const pendingTurns = save.turnSubmissions.filter((turn) => !turn.submittedAt).length
  const readyTurns = save.turnSubmissions.filter((turn) => turn.submittedAt).length
  const leagueMessages = save.messages.filter((item) => item.channel === "league_general").slice(-8).reverse()

  function handleMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendLeagueMessage(message)
    setMessage("")
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground">Cooperative Control Room</h2>
            <p className="text-[11px] text-muted-foreground">Create, invite, submit turns and simulate together</p>
          </div>
          <Users className="h-5 w-5 text-[var(--amber)]" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="Managers" value={league.humanManagerIds.length} />
          <Metric label="Ready" value={readyTurns} />
          <Metric label="Pending" value={pendingTurns} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-[var(--amber)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Commissioner Panel</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <PanelItem label="Turn Window" value={`${league.cooperativeSettings?.turnWindowHours ?? 48}h`} />
          <PanelItem label="Privacy" value={league.cooperativeSettings?.privacy ?? "private"} />
          <PanelItem label="Invite Code" value={league.cooperativeSettings?.inviteCode ?? "Use backend code"} />
          <PanelItem label="Fair Play" value={league.cooperativeSettings?.fairPlayFinancial ? "Enabled" : "Disabled"} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {club.managerName} can start simulation once every manager has submitted a turn. Supabase Realtime refreshes turn status in production.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[var(--stats-blue)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">League Chat</h3>
        </div>
        <div className="mb-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {leagueMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Welcome your league members.</p>
          ) : (
            leagueMessages.map((item) => (
              <div key={item.id} className="rounded-xl bg-secondary/50 p-2">
                <p className="text-xs font-bold text-foreground">{item.senderClubId === club.id ? club.shortName : "League"}</p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleMessage} className="flex gap-2">
          <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message the league..." />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/40 p-3 text-center">
      <p className="text-lg font-black text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function PanelItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  )
}
