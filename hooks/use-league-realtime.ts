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
      .channel(`league-turns:${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turns",
          filter: `league_id=eq.${leagueId}`,
        },
        onTurnChange,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [leagueId, onTurnChange])
}
