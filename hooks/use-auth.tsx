"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { login as loginRequest, register as registerRequest, type AuthUser } from "@/lib/api"

const TOKEN_KEY = "fm-coop-auth-token"
const USER_KEY = "fm-coop-auth-user"

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string, clubId: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    const storedUser = window.localStorage.getItem(USER_KEY)

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as AuthUser)
      } catch {
        window.localStorage.removeItem(TOKEN_KEY)
        window.localStorage.removeItem(USER_KEY)
      }
    }

    setIsLoading(false)
  }, [])

  const persistSession = useCallback((nextUser: AuthUser, nextToken: string) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken)
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    setToken(nextToken)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginRequest(email, password)
      persistSession(response.user, response.token)
    },
    [persistSession],
  )

  const register = useCallback(
    async (email: string, password: string, displayName: string, clubId: string) => {
      const response = await registerRequest(email, password, displayName, clubId)
      persistSession(response.user, response.token)
    },
    [persistSession],
  )

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
    setUser(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [isLoading, login, logout, register, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
