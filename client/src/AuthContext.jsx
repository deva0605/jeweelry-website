/**
 * AuthContext.jsx — Real auth backed by the Express API.
 *
 * Security notes:
 * - The JWT is stored server-side in an httpOnly cookie — it never
 *   touches JavaScript, preventing XSS token theft.
 * - On mount, /api/auth/me restores the session from the cookie
 *   (so page refreshes keep the user logged in).
 * - All error messages come from the server (generic by design).
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true) // true while restoring session

  // ── Restore session on mount ───────────────────────────────────────────
  useEffect(() => {
    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))   // 401 = not logged in, that's fine
      .finally(() => setLoading(false))
  }, [])

  // ── Auth actions ───────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { user } = await authApi.login(email, password)
    setUser(user)
  }

  const signup = async (name, email, password, confirmPassword) => {
    const { user } = await authApi.register(name, email, password, confirmPassword)
    setUser(user)
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
