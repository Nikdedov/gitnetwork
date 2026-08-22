import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createApp, type App } from '../lib/app'
import type { GitHubUser } from '../lib/api/github/types'

interface AppContextValue {
  app: App
  user: GitHubUser | null
  ready: boolean
  logout: () => void
  refetchUser: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [app] = useState(() => createApp())
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [ready, setReady] = useState(false)

  const refreshUser = useCallback(async () => {
    const me = await app.auth.currentUser()
    setUser(me)
  }, [app])

  useEffect(() => {
    refreshUser().finally(() => setReady(true))
  }, [refreshUser])

  const logout = useCallback(() => {
    app.auth.logout()
    setUser(null)
  }, [app])

  const refetchUser = useCallback(async () => {
    const me = await app.auth.currentUser()
    setUser(me)
  }, [app])

  const value = useMemo(
    () => ({ app, user, ready, logout, refetchUser }),
    [app, user, ready, logout, refetchUser],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
