"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchLeague, type LeagueResponse } from "@/lib/api"
import { getSupabaseClient } from "@/lib/supabase"

type UseLeagueSyncOptions = {
  token: string | null
  leagueId: string | null
  onMessage?: (message: string) => void
}

export function useLeagueSync({ token, leagueId, onMessage }: UseLeagueSyncOptions) {
  const [league, setLeague] = useState<LeagueResponse | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token || !leagueId) return
    setIsSyncing(true)
    setError(null)
    try {
      const nextLeague = await fetchLeague(token, leagueId)
      setLeague(nextLeague)
      if (nextLeague.turnStatus) {
        onMessage?.(`${nextLeague.turnStatus.submitted}/${nextLeague.turnStatus.total} managers han confirmado`)
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudo sincronizar la liga")
    } finally {
      setIsSyncing(false)
    }
  }, [leagueId, onMessage, token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase || !leagueId) return

    const refreshFromRealtime = () => void refresh()
    const channel = supabase
      .channel(`league-sync:${leagueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leagues", filter: `id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "clubs", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "turns", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "standings", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "transfers", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "transfer_offers", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "club_finances", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_events", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_events", filter: `league_id=eq.${leagueId}` }, refreshFromRealtime)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "league_transfer_windows", filter: `league_id=eq.${leagueId}` },
        refreshFromRealtime,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [leagueId, refresh])

  return { league, setLeague, isSyncing, error, refresh }
}
