"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  careerPhaseFromAge,
  moraleBandFromScore,
  type GameSave,
  type LeagueMessage,
  type Player,
  type TransferStatus,
  type WeeklyTrainingPlan,
  type YouthProspect,
} from "@/lib/types"
import { advanceTurn as advanceGameTurn } from "@/lib/engine/season-manager"
import { useAuth } from "@/hooks/use-auth"
import { loadGame, saveGame } from "@/lib/persistence"
import {
  FORMATION_PRESETS,
  IDS,
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
  setTrainingPlan: (plan: WeeklyTrainingPlan) => void
  promoteYouthProspect: (prospectId: string) => void
  processTransfer: (transferId: string, status: Extract<TransferStatus, "accepted" | "rejected" | "countered">) => void
  sendLeagueMessage: (body: string) => void
}

const GameContext = createContext<GameContextValue | null>(null)

const userClubMap: Record<string, string> = {
  metropolis: IDS.clubs.metropolis,
  harbor: IDS.clubs.harbor,
  dynamo: IDS.clubs.capital,
  rovers: IDS.clubs.pacific,
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [save, setSave] = useState<GameSave>(gameSave)
  setActiveGameSave(save)

  useEffect(() => {
    const persistedSave = loadGame()
    if (persistedSave) setSave(ensureFullSeasonCalendar(persistedSave))
  }, [])

  useEffect(() => {
    const nextClubId = user?.clubId ? userClubMap[user.clubId] : null
    if (!nextClubId) return
    setSave((current) => {
      if (current.userClubId === nextClubId) return current
      const nextSave = {
        ...current,
        userClubId: nextClubId,
        standings: current.standings.map((standing) => ({ ...standing, isUserClub: standing.clubId === nextClubId })),
      }
      saveGame(nextSave)
      return nextSave
    })
  }, [user?.clubId])

  const advanceTurn = useCallback(() => {
    const nextSave = advanceGameTurn(save)
    saveGame(nextSave)
    setSave(nextSave)
    return nextSave
  }, [save])

  const persistNextSave = useCallback((nextSave: GameSave) => {
    saveGame(nextSave)
    setSave(nextSave)
  }, [])

  const setTrainingPlan = useCallback(
    (plan: WeeklyTrainingPlan) => {
      const nextSave = {
        ...save,
        clubs: save.clubs.map((club) =>
          club.id === save.userClubId ? { ...club, currentTrainingPlan: plan, updatedAt: new Date().toISOString() } : club,
        ),
        updatedAt: new Date().toISOString(),
      }
      persistNextSave(nextSave)
    },
    [persistNextSave, save],
  )

  const promoteYouthProspect = useCallback(
    (prospectId: string) => {
      const club = save.clubs.find((item) => item.id === save.userClubId)
      const prospect = club?.youthProspects.find((item) => item.id === prospectId)
      if (!club || !prospect) return

      const now = new Date().toISOString()
      const player = createPlayerFromProspect(prospect, club.id, now)
      const nextSave = {
        ...save,
        players: [...save.players, player],
        clubs: save.clubs.map((item) =>
          item.id === club.id
            ? {
                ...item,
                squadPlayerIds: [...item.squadPlayerIds, player.id],
                youthProspects: item.youthProspects.filter((candidate) => candidate.id !== prospectId),
                updatedAt: now,
              }
            : item,
        ),
        updatedAt: now,
      }
      persistNextSave(nextSave)
    },
    [persistNextSave, save],
  )

  const processTransfer = useCallback(
    (transferId: string, status: Extract<TransferStatus, "accepted" | "rejected" | "countered">) => {
      const now = new Date().toISOString()
      const nextSave = {
        ...save,
        transfers: save.transfers.map((transfer) =>
          transfer.id === transferId
            ? {
                ...transfer,
                status,
                counterOfferCount: status === "countered" ? transfer.counterOfferCount + 1 : transfer.counterOfferCount,
                terms:
                  status === "countered"
                    ? { ...transfer.terms, fee: Math.round(transfer.terms.fee * 1.12), offeredWeeklyWage: Math.round(transfer.terms.offeredWeeklyWage * 1.08) }
                    : transfer.terms,
                completedAt: status === "accepted" ? now : transfer.completedAt,
                updatedAt: now,
              }
            : transfer,
        ),
        transferOffers: save.transferOffers.map((offer) =>
          offer.transferId === transferId ? { ...offer, status, submittedAt: now } : offer,
        ),
        messages: [
          ...save.messages,
          {
            id: `message-transfer-${Date.now()}`,
            channel: "negotiation_private",
            senderClubId: save.userClubId,
            recipientClubId: save.transfers.find((transfer) => transfer.id === transferId)?.fromClubId ?? null,
            body: `Transfer ${status}: ${transferId}`,
            transferId,
            createdAt: now,
          } satisfies LeagueMessage,
        ],
        updatedAt: now,
      }
      persistNextSave(nextSave)
    },
    [persistNextSave, save],
  )

  const sendLeagueMessage = useCallback(
    (body: string) => {
      if (!body.trim()) return
      const now = new Date().toISOString()
      persistNextSave({
        ...save,
        messages: [
          ...save.messages,
          {
            id: `message-${Date.now()}`,
            channel: "league_general",
            senderClubId: save.userClubId,
            recipientClubId: null,
            body: body.trim(),
            transferId: null,
            createdAt: now,
          },
        ],
        updatedAt: now,
      })
    },
    [persistNextSave, save],
  )

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
      setTrainingPlan,
      promoteYouthProspect,
      processTransfer,
      sendLeagueMessage,
    }),
    [advanceTurn, processTransfer, promoteYouthProspect, save, sendLeagueMessage, setTrainingPlan],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

function createPlayerFromProspect(prospect: YouthProspect, clubId: string, now: string): Player {
  const base = prospect.overallRating
  const potential = prospect.revealedPotential ?? Math.min(92, base + 18)
  const playerId = `player-${prospect.id}`
  const attrs = {
    technical: { passing: base, dribbling: base, shooting: base - 2, heading: base - 4, crossing: base - 1, technique: base },
    physical: { pace: base, stamina: base - 3, strength: base - 5, agility: base, acceleration: base, jumping: base - 4 },
    mental: { vision: base - 1, aggression: 45, leadership: 45, concentration: base - 2, decisions: base - 2, teamwork: base },
    goalkeeping: { reflexes: base, positioning: base - 2, rushingOut: base - 3, distribution: base - 1, handling: base - 2, aerialReach: base - 1 },
  }

  return {
    id: playerId,
    openFootballId: null,
    firstName: prospect.generatedName.split(" ")[0] ?? prospect.generatedName,
    lastName: prospect.generatedName.split(" ").slice(1).join(" ") || "Academy",
    displayName: prospect.generatedName,
    shortName: prospect.generatedName.split(" ").map((part) => part[0]).join(""),
    nationalityCode: "INT",
    nationality: "Academy",
    dateOfBirth: new Date(new Date(now).getFullYear() - prospect.age, 6, 1).toISOString(),
    age: prospect.age,
    careerPhase: careerPhaseFromAge(prospect.age),
    preferredFoot: "right",
    position: prospect.position,
    positionGroup: prospect.positionGroup,
    attributes: attrs,
    overallRating: base,
    potentialRating: potential,
    potentialRevealedPercent: prospect.potentialHidden ? 35 : 70,
    form: 6.8,
    morale: 72,
    moraleBand: moraleBandFromScore(72),
    moraleFactors: {
      minutesPlayedScore: 50,
      recentResultsScore: 60,
      coachRelationshipScore: 70,
      contractExpectationsScore: 65,
      randomEventsScore: 55,
    },
    fatigue: 15,
    fitness: 92,
    marketValue: Math.round(base * potential * 8500),
    marketValueFactors: { baseValue: Math.round(base * potential * 8500), ageMultiplier: 1.4, formMultiplier: 1, wageMultiplier: 1, trend: "rising" },
    valueTrend: "rising",
    clubId,
    contractId: null,
    isCaptain: false,
    isInjured: false,
    injury: null,
    isAcademyPlayer: true,
    seasonStats: {
      seasonId: "season-2025-26",
      appearances: 0,
      starts: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      averageRating: 0,
      manOfTheMatch: 0,
    },
    individualInstructions: null,
    customImagePath: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within GameProvider")
  }
  return context
}
