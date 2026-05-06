import { useState, useEffect, useCallback } from 'react'
import { checkAuth, logout as apiLogout } from '../lib/api'

interface User {
  id: string | number
  username: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
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

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return { user, loading, isLoggedIn: !!user, logout }
}
