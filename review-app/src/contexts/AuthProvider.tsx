import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { checkAuth, logout as apiLogout, type ReviewUser } from '../lib/api'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReviewUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth().then((data) => {
      setUser(data)
      setLoading(false)
    }).catch(() => {
      setUser(null)
      setLoading(false)
    })
  }, [])

  const login = useCallback((newUser: typeof user) => {
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isLoggedIn: !!user,
      login,
      logout,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
