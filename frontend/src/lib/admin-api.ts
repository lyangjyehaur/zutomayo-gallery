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
export const getR2Domain = () => normalizeApiRoot((import.meta as any).env?.VITE_R2_DOMAIN || "https://r2.dan.tw")

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { ...init, credentials: "include" })
}
