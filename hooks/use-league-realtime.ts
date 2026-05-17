"use client"

import { useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase"

type UseLeagueRealtimeOptions = {
  leagueId: string | null
  onTurnChange: () => void
}

export function useLeagueRealtime({ leagueId, onTurnChange }: UseLeagueRealtimeOptions) {
  useEffect(() => {
    if (!leagueId) return

    const supabase = getSupabaseClient()
    if (!supabase) return

    const channel = supabase
      .channel(`league-realtime:${leagueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "turns", filter: `league_id=eq.${leagueId}` },
        onTurnChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tactic_drafts", filter: `league_id=eq.${leagueId}` },
        onTurnChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "league_events", filter: `league_id=eq.${leagueId}` },
        onTurnChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leagues", filter: `id=eq.${leagueId}` },
        onTurnChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `league_id=eq.${leagueId}` },
        onTurnChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "standings", filter: `league_id=eq.${leagueId}` },
        onTurnChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfers", filter: `league_id=eq.${leagueId}` },
        onTurnChange,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "transfer_offers", filter: `league_id=eq.${leagueId}` }, onTurnChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `league_id=eq.${leagueId}` }, onTurnChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "club_finances", filter: `league_id=eq.${leagueId}` }, onTurnChange)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [leagueId, onTurnChange])
}
