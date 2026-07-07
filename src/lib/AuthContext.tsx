import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTH_EXPIRED_EVENT, getAuthToken } from './apiClient'
import {
  fetchCurrentUser,
  getStoredUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthUser,
  type RegisterPayload,
  type UserRole,
} from './authClient'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string, role?: UserRole) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [loading, setLoading] = useState(Boolean(getAuthToken()))

  useEffect(() => {
    const handleExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false)
      return
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (username, password, role) => {
        const nextUser = await loginRequest(username, password, role)
        setUser(nextUser)
        return nextUser
      },
      register: async (payload) => {
        const nextUser = await registerRequest(payload)
        setUser(nextUser)
        return nextUser
      },
      logout: async () => {
        await logoutRequest()
        setUser(null)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
