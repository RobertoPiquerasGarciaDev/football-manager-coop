"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/hooks/use-auth"
import { GameProvider } from "@/lib/game-provider"
import { PwaRegister } from "@/components/pwa-register"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        {children}
        <PwaRegister />
        <Toaster />
      </GameProvider>
    </AuthProvider>
  )
}
