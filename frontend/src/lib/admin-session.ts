import { adminFetch, getAuthApiBase } from "@/lib/admin-api"

export type AdminMePayload = {
  username?: string
  email?: string | null
  display_name?: string | null
  avatar_url?: string | null
  roles?: string[]
  permissions?: string[]
  menus?: Array<{ label?: string; path?: string; sort?: number }>
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string; message?: string }

let mePromise: Promise<AdminMePayload | null> | null = null

export const clearAdminMeCache = () => {
  mePromise = null
}

export const fetchAdminMe = async (): Promise<AdminMePayload | null> => {
  if (!mePromise) {
    mePromise = (async () => {
      const res = await adminFetch(`${getAuthApiBase()}/me`)
      const json = (await res.json().catch(() => null)) as ApiResponse<AdminMePayload> | null
      if (!res.ok || !json?.success) return null
      return json.data
    })().catch(() => null)
  }

  return mePromise
}
