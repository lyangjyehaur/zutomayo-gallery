import type { AuthProvider } from "@refinedev/core"
import { adminFetch, getAuthApiBase } from "@/lib/admin-api"

type MePayload = {
  username?: string
  roles?: string[]
  permissions?: string[]
  menus?: unknown[]
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string; message?: string }

const fetchMe = async () => {
  const authApiBase = getAuthApiBase()
  const res = await adminFetch(`${authApiBase}/me`)
  const json = (await res.json().catch(() => null)) as ApiResponse<MePayload> | null
  if (!res.ok || !json || !("success" in json) || !json.success) {
    throw new Error("UNAUTHENTICATED")
  }
  return json.data
}

export const adminAuthProvider: AuthProvider = {
  login: async (params: { username?: string; password?: string } = {}) => {
    const authApiBase = getAuthApiBase()
    const res = await adminFetch(`${authApiBase}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: params.username, password: params.password }),
    })
    const json = (await res.json().catch(() => null)) as ApiResponse<MePayload> | null
    if (!res.ok || !json?.success) {
      const msg = (json as any)?.error || (json as any)?.message || "LOGIN_FAILED"
      return { success: false, error: new Error(String(msg)) }
    }
    return { success: true }
  },
  logout: async () => {
    const authApiBase = getAuthApiBase()
    await adminFetch(`${authApiBase}/logout`, { method: "POST" }).catch(() => undefined)
    return { success: true, redirectTo: "/admin" }
  },
  check: async () => {
    try {
      await fetchMe()
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
    const me = await fetchMe()
    return me.permissions || []
  },
  getIdentity: async () => {
    const me = await fetchMe()
    return me || null
  },
}

