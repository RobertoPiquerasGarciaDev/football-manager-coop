import type { GameSave } from "@/lib/types"

const SAVE_KEY = "fm-coop-save"

export function saveGame(save: GameSave): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

export function loadGame(): GameSave | null {
  if (typeof window === "undefined") return null

  const rawSave = window.localStorage.getItem(SAVE_KEY)
  if (!rawSave) return null

  try {
    return JSON.parse(rawSave) as GameSave
  } catch {
    return null
  }
}

export function clearGame(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SAVE_KEY)
}
