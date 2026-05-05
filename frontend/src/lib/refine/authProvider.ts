import type { AuthProvider } from "@refinedev/core"
import { adminFetch, getAuthApiBase } from "@/lib/admin-api"
import { clearAdminMeCache, fetchAdminMe } from "@/lib/admin-session"

export const adminAuthProvider: AuthProvider = {
  login: async (params: { username?: string; password?: string } = {}) => {
    const authApiBase = getAuthApiBase()
    const res = await adminFetch(`${authApiBase}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: params.username, password: params.password }),
    })
    const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string; message?: string } | null
    if (!res.ok || !json?.success) {
      const msg = (json as any)?.error || (json as any)?.message || "LOGIN_FAILED"
      return { success: false, error: new Error(String(msg)) }
    }
    clearAdminMeCache()
    return { success: true }
  },
  logout: async () => {
    const authApiBase = getAuthApiBase()
    await adminFetch(`${authApiBase}/logout`, { method: "POST" }).catch(() => undefined)
    clearAdminMeCache()
    return { success: true, redirectTo: "/admin" }
  },
  check: async () => {
    try {
      const me = await fetchAdminMe()
      if (!me) throw new Error("UNAUTHENTICATED")
      return { authenticated: true }
    } catch {
      return { authenticated: false, redirectTo: "/admin" }
    }
  },
  onError: async (error) => {
    const status = (error as any)?.statusCode || (error as any)?.status
    if (status === 401 || status === 403) return { logout: true, redirectTo: "/admin" }
    return { error }
  },
  getPermissions: async () => {
    const me = await fetchAdminMe()
    if (!me) return []
    return me.permissions || []
  },
  getIdentity: async () => {
    const me = await fetchAdminMe()
    return me || null
  },
}
