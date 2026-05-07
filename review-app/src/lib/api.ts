const getApiOrigin = () => {
  const env = (import.meta as any).env || {}
  const fallback = import.meta.env.DEV ? '' : 'https://api.ztmr.club'
  return (env.VITE_API_ORIGIN || fallback).replace(/\/+$/, '')
}

const getApiRoot = () => {
  const env = (import.meta as any).env || {}
  const raw = (env.VITE_API_ROOT || env.VITE_API_URL || '/api') as string
  const root = raw.replace(/\/+$/, '')
  return root.startsWith('/') ? root : `/${root}`
}

export const getApiBase = () => `${getApiOrigin()}${getApiRoot()}`

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { ...init, credentials: 'include' })
}

export interface StagingFanart {
  id: string
  tweet_id: string
  author_name: string
  author_handle: string
  source_text: string
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url: string | null
  original_url: string
  r2_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  like_count: number
  retweet_count: number
  view_count: number
  hashtags: string[]
  crawled_at: string
  post_date: string
  media_width: number | null
  media_height: number | null
}

export interface SubmissionMedia {
  id: string
  media_type: 'image' | 'video'
  original_url: string
  r2_url: string | null
  thumbnail_url: string | null
  width: number | null
  height: number | null
}

export interface Submission {
  id: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  note: string
  special_tags: string[]
  submitted_at: string
  review_reason: string | null
  media: SubmissionMedia[]
  mvs: Array<{ id: string; title: string }>
  submitter: { id: string; display_name: string } | null
}

export interface MV {
  id: string
  title: string
}

export async function fetchStagingFanarts(status: string, page: number, limit: number) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts?status=${status}&page=${page}&limit=${limit}`)
  return res.json()
}

export async function fetchStagingProgress() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/progress`)
  return res.json()
}

export async function approveStagingFanart(id: string, mvs: string[] = []) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mvs }),
  })
  return res.json()
}

export async function rejectStagingFanart(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json()
}

export async function restoreStagingFanart(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/${id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json()
}

export async function fetchSubmissions(status: string, page: number, limit: number) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/admin/submissions?status=${status}&page=${page}&limit=${limit}`)
  return res.json()
}

export async function approveSubmission(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/admin/submissions/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json()
}

export async function rejectSubmission(id: string, reason: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/admin/submissions/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return res.json()
}

export async function fetchMvs() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/mvs`)
  return res.json()
}

export const login = async (username: string, password: string) => {
  const res = await adminFetch(`${getApiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

export const loginWithPasskey = async (username: string) => {
  const base = getApiBase()

  const optRes = await adminFetch(`${base}/auth/generate-auth-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  if (!optRes.ok) {
    const err = await optRes.json()
    throw new Error(err.error || '無法生成 Passkey 認證選項')
  }

  const options = await optRes.json()

  const { startAuthentication } = await import('@simplewebauthn/browser')
  const asseResp = await startAuthentication({ optionsJSON: options })

  const verifyRes = await adminFetch(`${base}/auth/verify-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asseResp),
  })
  return verifyRes.json()
}

export const checkAuth = async () => {
  const res = await adminFetch(`${getApiBase()}/auth/me`)
  if (!res.ok) return null
  const data = await res.json()
  return data.success ? data.data : null
}

export const logout = async () => {
  await adminFetch(`${getApiBase()}/auth/logout`, { method: 'POST' })
}

export const getPushPublicKey = async (): Promise<string | null> => {
  const base = getApiBase()
  const res = await adminFetch(`${base}/push/public-key`)
  if (!res.ok) return null
  const data = await res.json()
  return data.success ? data.publicKey : null
}

export const subscribePush = async (subscription: PushSubscriptionJSON) => {
  const base = getApiBase()
  const res = await adminFetch(`${base}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })
  return res.json()
}

export const unsubscribePush = async (endpoint: string) => {
  const base = getApiBase()
  const res = await adminFetch(`${base}/push/unsubscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
  return res.json()
}

export interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPreferences {
  staging: boolean
  submission: boolean
  error: boolean
  crawler: boolean
}

export const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>) => {
  const base = getApiBase()
  const res = await adminFetch(`${base}/auth/me/notification-preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  return res.json()
}
