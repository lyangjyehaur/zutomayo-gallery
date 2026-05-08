const normalizeBaseUrl = (value: unknown, fallback: string) => {
  const raw = typeof value === "string" ? value.trim() : ""
  return (raw || fallback).replace(/\/+$/, "")
}

const normalizeApiRoot = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : ""
  const root = raw || "/api"
  return root.replace(/\/mvs\/?$/, "").replace(/\/+$/, "") || "/api"
}

const normalizeApiPathRoot = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : ""
  const root = raw || "/api"
  return root.startsWith("/") ? root.replace(/\/+$/, "") : `/${root.replace(/\/+$/, "")}`
}

export const getApiOrigin = () => {
  const env = (import.meta as any).env || {}
  const fallback = import.meta.env.DEV ? "http://localhost:5010" : "https://api.ztmr.club"
  return normalizeBaseUrl(env.VITE_API_ORIGIN, fallback)
}

export const getApiPathRoot = () => {
  const env = (import.meta as any).env || {}
  return normalizeApiPathRoot(env.VITE_API_ROOT || env.VITE_API_URL)
}

export const getApiRoot = () => `${getApiOrigin()}${getApiPathRoot()}`

const joinApiPath = (...segments: Array<string | undefined | null>) => {
  const base = getApiRoot()
  const tail = segments
    .flatMap((segment) => {
      if (!segment) return []
      return String(segment)
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean)
    })
    .join("/")
  return tail ? `${base}/${tail}` : base
}

export const getAuthApiBase = () => joinApiPath("auth")
export const getPublicAuthApiBase = () => joinApiPath("public-auth")
export const getMvsApiBase = () => joinApiPath("mvs")
export const getAlbumApiBase = () => joinApiPath("album")
export const getArtistApiBase = () => joinApiPath("artist")
export const getSystemApiBase = () => joinApiPath("system")
export const getFanartsApiBase = () => joinApiPath("fanarts")
export const getStagingFanartsApiBase = () => joinApiPath("staging-fanarts")
export const getSubmissionsApiBase = () => joinApiPath("submissions")
export const getAnnotationsApiBase = () => joinApiPath("annotations")
export const getR2Domain = () => normalizeApiRoot((import.meta as any).env?.VITE_R2_DOMAIN || "https://r2.dan.tw")

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { ...init, credentials: "include" })
}

export const getAllAnnotations = async () => {
  const res = await adminFetch(getAnnotationsApiBase())
  if (!res.ok) throw new Error("Failed to fetch all annotations")
  const json = await res.json()
  return (json.data || {}) as Record<string, MediaAnnotationRow[]>
}

export const getAnnotations = async (mediaId: string) => {
  const res = await adminFetch(`${getAnnotationsApiBase()}/media/${encodeURIComponent(mediaId)}`)
  if (!res.ok) throw new Error("Failed to fetch annotations")
  const json = await res.json()
  return (json.data || []) as MediaAnnotationRow[]
}

export const getAnnotationsByMv = async (mvId: string) => {
  const res = await adminFetch(`${getAnnotationsApiBase()}/mv/${encodeURIComponent(mvId)}`)
  if (!res.ok) throw new Error("Failed to fetch annotations by MV")
  const json = await res.json()
  return (json.data || {}) as Record<string, MediaAnnotationRow[]>
}

export const createAnnotation = async (data: CreateAnnotationPayload) => {
  const res = await adminFetch(getAnnotationsApiBase(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error((json as any)?.error || "Failed to create annotation")
  }
  const json = await res.json()
  return (json.data || json) as MediaAnnotationRow
}

export const updateAnnotation = async (id: string, data: Partial<CreateAnnotationPayload>) => {
  const res = await adminFetch(`${getAnnotationsApiBase()}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error((json as any)?.error || "Failed to update annotation")
  }
  const json = await res.json()
  return (json.data || json) as MediaAnnotationRow
}

export const deleteAnnotation = async (id: string) => {
  const res = await adminFetch(`${getAnnotationsApiBase()}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete annotation")
  return true
}

export type MediaAnnotationRow = {
  id: string
  media_id: string
  label: string
  x: number
  y: number
  style?: string
  sort_order?: number
  created_by?: string
  created_at?: string
  updated_at?: string
}

export type CreateAnnotationPayload = {
  media_id: string
  label: string
  x: number
  y: number
  style?: string
  sort_order?: number
}
