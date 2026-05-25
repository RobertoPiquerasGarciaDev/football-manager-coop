"use client"

import { type FormEvent, useState } from "react"
import { Crown, MessageCircle, Smile, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGame } from "@/lib/game-provider"

const EMOJI_OPTIONS = ["👍", "⚽", "🔥", "💪", "😂", "🤝", "🎉", "🙌"]

type ChatChannel = "general" | "negociaciones" | "comisionado"

export function CooperativeSection() {
  const { save, getLeague, getUserClub, sendLeagueMessage } = useGame()
  const [message, setMessage] = useState("")
  const [channel, setChannel] = useState<ChatChannel>("general")
  const [showPicker, setShowPicker] = useState(false)
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({})
  const league = getLeague()
  const club = getUserClub()
  const pendingTurns = save.turnSubmissions.filter((turn) => !turn.submittedAt).length
  const readyTurns = save.turnSubmissions.filter((turn) => turn.submittedAt).length

  const channelKey = channel === "general" ? "league_general" : channel === "negociaciones" ? "league_negotiations" : "league_commissioner"
  const messages = save.messages.filter((item) => item.channel === channelKey || (channel === "general" && item.channel === "league_general")).slice(-20)

  // Sistema events (transfers, market closures, etc.)
  const systemEvents = save.transfers.slice(-8).reverse().map((transfer, i) => {
    const player = save.players.find((item) => item.id === transfer.playerId)
    const sourceClub = save.clubs.find((item) => item.id === transfer.toClubId || item.id === transfer.initiatedByClubId)
    const verb = transfer.status === "accepted" ? "ha fichado a"
      : transfer.status === "countered" ? "contraoferta por"
      : transfer.status === "rejected" ? "rechaza oferta por"
      : "puja por"
    return {
      id: `sys-${i}`,
      type: "system" as const,
      body: `${sourceClub?.name ?? "Un club"} ${verb} ${player?.displayName ?? "jugador"} por €${Math.round(transfer.terms.fee / 1_000_000)}M`,
    }
  })

  function handleMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!message.trim()) return
    sendLeagueMessage(message)
    setMessage("")
    setShowPicker(false)
  }

  function addReaction(messageId: string, emoji: string) {
    setReactions((prev) => {
      const msg = prev[messageId] ?? {}
      return { ...prev, [messageId]: { ...msg, [emoji]: (msg[emoji] ?? 0) + 1 } }
    })
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground">Sala cooperativa</h2>
            <p className="text-[11px] text-muted-foreground">Crea, invita, envía turnos y simula con tus amigos</p>
          </div>
          <Users className="h-5 w-5 text-[var(--amber)]" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="Managers" value={league.humanManagerIds.length} />
          <Metric label="Listos" value={readyTurns} />
          <Metric label="Pendientes" value={pendingTurns} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Actividad en tiempo real</h3>
        <div className="flex flex-col gap-2">
          {systemEvents.length === 0 && (
            <p className="rounded-xl bg-secondary/30 p-3 text-center text-xs text-muted-foreground">
              Sin actividad reciente.
            </p>
          )}
          {systemEvents.map((item, index) => (
            <div key={item.id} className="animate-slide-in-soft rounded-xl bg-secondary/50 p-2 text-sm text-muted-foreground" style={{ animationDelay: `${index * 70}ms` }}>
              {item.body}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-[var(--amber)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Panel del comisionado</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <PanelItem label="Ventana de turno" value={`${league.cooperativeSettings?.turnWindowHours ?? 48}h`} />
          <PanelItem label="Privacidad" value={league.cooperativeSettings?.privacy === "private" ? "Privada" : "Pública"} />
          <PanelItem label="Código" value={league.cooperativeSettings?.inviteCode ?? "Generado por backend"} />
          <PanelItem label="Fair Play" value={league.cooperativeSettings?.fairPlayFinancial ? "Activo" : "Desactivado"} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {club.managerName} puede iniciar la simulación cuando todos los managers humanos hayan enviado turno. Supabase Realtime actualiza el estado en producción.
        </p>
      </div>

      {/* Chat con canales, emojis y reacciones */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[var(--stats-blue)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chat de liga</h3>
        </div>

        <div className="mb-3 flex gap-1">
          {(["general", "negociaciones", "comisionado"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                channel === c
                  ? "bg-[var(--amber)] text-background"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-3 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="rounded-xl bg-secondary/30 p-3 text-center text-sm text-muted-foreground">
              Sin mensajes todavía. Saluda a tu liga.
            </p>
          ) : (
            messages.map((item) => {
              const isMine = item.senderClubId === club.id
              const msgReactions = reactions[item.id] ?? {}
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-1 rounded-xl p-2 ${
                    isMine ? "ml-6 bg-[var(--amber)]/10 border border-[var(--amber)]/30" : "mr-6 bg-secondary/50"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isMine ? "Tú" : (save.clubs.find((c) => c.id === item.senderClubId)?.shortName ?? "Manager")}
                  </p>
                  <p className="text-sm text-foreground">{item.body}</p>
                  <div className="mt-1 flex items-center gap-1">
                    {Object.entries(msgReactions).map(([emoji, count]) => (
                      <span key={emoji} className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px]">
                        {emoji} {count}
                      </span>
                    ))}
                    <div className="ml-auto flex gap-0.5">
                      {EMOJI_OPTIONS.slice(0, 4).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => addReaction(item.id, emoji)}
                          className="text-xs opacity-50 transition-opacity hover:opacity-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <form onSubmit={handleMessage} className="relative flex gap-2">
          {showPicker && (
            <div className="absolute bottom-12 left-0 z-10 grid grid-cols-4 gap-1 rounded-xl border border-border/50 bg-card p-2 shadow-xl">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setMessage((m) => m + emoji)
                    setShowPicker(false)
                  }}
                  className="rounded p-1 text-lg hover:bg-secondary"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowPicker((p) => !p)}>
            <Smile className="h-4 w-4" />
          </Button>
          <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe a la liga…" />
          <Button type="submit">Enviar</Button>
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
