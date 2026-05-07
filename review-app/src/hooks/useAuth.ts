import { useState, useEffect, useCallback } from 'react'
import { checkAuth, logout as apiLogout, type NotificationPreferences } from '../lib/api'

interface User {
  id: string | number
  username: string
  role: string
  notification_preferences?: NotificationPreferences
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

  return { user, loading, isLoggedIn: !!user, logout, setUser }
}
