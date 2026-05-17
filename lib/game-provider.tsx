"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { GameSave } from "@/lib/types"
import { advanceTurn as advanceGameTurn } from "@/lib/engine/season-manager"
import { loadGame, saveGame } from "@/lib/persistence"
import {
  FORMATION_PRESETS,
  gameSave,
  getClub,
  getContractForPlayer,
  getDashboardQuickStats,
  getLeague,
  getLeagueFullTable,
  getLeagueSectionSummary,
  getLeagueTableRows,
  getMarketBrowsePlayers,
  getMarketStats,
  getNextUserMatch,
  getNotificationCount,
  getPendingTransfers,
  getPlayer,
  getRecentMatchResults,
  getSeason,
  getSquadMoraleSummary,
  getTacticsLineup,
  getTacticsLineupForFormation,
  getTopScorers,
  getTransferAlertsForDashboard,
  getUserClub,
  getUserOutgoingBids,
  getUserSquad,
  getUserStanding,
  ensureFullSeasonCalendar,
  isPlayerWatchlisted,
  setActiveGameSave,
  type FormationKey,
  type LeagueFullTableRow,
  type LeagueSectionSummary,
  type LeagueTableRow,
  type MarketBrowsePlayer,
  type MatchResultView,
  type NextMatchView,
  type QuickStatItem,
  type SquadMoraleSummary,
  type TopScorerView,
  type TransferAlertView,
  type UserBidRow,
} from "@/lib/mock-data"

export type {
  FormationKey,
  LeagueFullTableRow,
  LeagueSectionSummary,
  LeagueTableRow,
  MarketBrowsePlayer,
  MatchResultView,
  NextMatchView,
  QuickStatItem,
  SquadMoraleSummary,
  TopScorerView,
  TransferAlertView,
  UserBidRow,
}

export type GameContextValue = {
  save: GameSave
  advanceTurn: () => GameSave
  formationPresets: typeof FORMATION_PRESETS
  getUserClub: typeof getUserClub
  getClub: typeof getClub
  getPlayer: typeof getPlayer
  getLeague: typeof getLeague
  getSeason: typeof getSeason
  getUserSquad: typeof getUserSquad
  getContractForPlayer: typeof getContractForPlayer
  getLeagueTableRows: typeof getLeagueTableRows
  getLeagueFullTable: typeof getLeagueFullTable
  getLeagueSectionSummary: typeof getLeagueSectionSummary
  getRecentMatchResults: typeof getRecentMatchResults
  getTopScorers: typeof getTopScorers
  getMarketBrowsePlayers: typeof getMarketBrowsePlayers
  isPlayerWatchlisted: typeof isPlayerWatchlisted
  getUserOutgoingBids: typeof getUserOutgoingBids
  getMarketStats: typeof getMarketStats
  getTacticsLineup: typeof getTacticsLineup
  getTacticsLineupForFormation: typeof getTacticsLineupForFormation
  getPendingTransfers: typeof getPendingTransfers
  getUserStanding: typeof getUserStanding
  getNextUserMatch: typeof getNextUserMatch
  getDashboardQuickStats: typeof getDashboardQuickStats
  getSquadMoraleSummary: typeof getSquadMoraleSummary
  getTransferAlertsForDashboard: typeof getTransferAlertsForDashboard
  getNotificationCount: typeof getNotificationCount
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<GameSave>(gameSave)
  setActiveGameSave(save)

  useEffect(() => {
    const persistedSave = loadGame()
    if (persistedSave) setSave(ensureFullSeasonCalendar(persistedSave))
  }, [])

  const advanceTurn = useCallback(() => {
    const nextSave = advanceGameTurn(save)
    saveGame(nextSave)
    setSave(nextSave)
    return nextSave
  }, [save])

  const value = useMemo<GameContextValue>(
    () => ({
      save,
      advanceTurn,
      formationPresets: FORMATION_PRESETS,
      getUserClub,
      getClub,
      getPlayer,
      getLeague,
      getSeason,
      getUserSquad,
      getContractForPlayer,
      getLeagueTableRows,
      getLeagueFullTable,
      getLeagueSectionSummary,
      getRecentMatchResults,
      getTopScorers,
      getMarketBrowsePlayers,
      isPlayerWatchlisted,
      getUserOutgoingBids,
      getMarketStats,
      getTacticsLineup,
      getTacticsLineupForFormation,
      getPendingTransfers,
      getUserStanding,
      getNextUserMatch,
      getDashboardQuickStats,
      getSquadMoraleSummary,
      getTransferAlertsForDashboard,
      getNotificationCount,
    }),
    [advanceTurn, save],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within GameProvider")
  }
  return context
}
