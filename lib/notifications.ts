"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getNotifications, type NotificationItem } from "@/lib/api"
import { getSupabaseClient } from "@/lib/supabase"

export function useNotifications(token: string | null, userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) return
    const items = await getNotifications(token)
    setNotifications(items)
  }, [token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh, userId])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    refresh,
  }
}
