import { createContext } from 'react'
import type { ReviewUser } from '../lib/api'

interface AuthContextValue {
  user: ReviewUser | null
  loading: boolean
  isLoggedIn: boolean
  login: (user: ReviewUser) => void
  logout: () => Promise<void>
  setUser: (user: ReviewUser | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
