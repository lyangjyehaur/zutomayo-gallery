interface ImportMetaEnv {
  VITE_API_ORIGIN?: string
  VITE_API_ROOT?: string
  VITE_API_URL?: string
  DEV: boolean
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const getApiOrigin = () => {
  const env = import.meta.env as unknown as ImportMetaEnv
  const fallback = env.DEV ? '' : 'https://api.ztmr.club'
  return trimTrailingSlash(env.VITE_API_ORIGIN || fallback)
}

const getApiRoot = () => {
  const env = import.meta.env as unknown as ImportMetaEnv
  const raw = (env.VITE_API_ROOT || '/api') as string
  const root = trimTrailingSlash(raw)
  return root.startsWith('/') ? root : `/${root}`
}

export const getApiBase = () => {
  const env = import.meta.env as unknown as ImportMetaEnv
  const explicitUrl = env.VITE_API_URL?.trim()
  if (explicitUrl) {
    return isAbsoluteUrl(explicitUrl)
      ? trimTrailingSlash(explicitUrl)
      : (explicitUrl.startsWith('/') ? trimTrailingSlash(explicitUrl) : `/${trimTrailingSlash(explicitUrl)}`)
  }
  return `${getApiOrigin()}${getApiRoot()}`
}

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { ...init, credentials: 'include' })
}

export interface NotificationPreferences {
  staging: boolean
  submission: boolean
  error: boolean
  crawler: boolean
}

export interface ReviewUser {
  id: string | number
  username: string
  role: string
  notification_preferences?: NotificationPreferences
}

export interface ReviewResponse<T> {
  success?: boolean
  data?: T
  message?: string
  error?: string
}

export interface ApiListMeta {
  page?: number
  limit?: number
  offset?: number
  total?: number | null
  totalPages?: number
  hasMore?: boolean
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
  tweet_id?: string | null
  r2_key?: string | null
}

export interface SubmissionSubmitter {
  id: string
  display_name: string | null
  email?: string | null
  email_masked?: string | null
  social_links?: Record<string, string>
  public_profile_enabled?: boolean
  public_profile_fields?: {
    display_name?: boolean
    socials?: boolean
    email_masked?: boolean
  }
}

export interface Submission {
  id: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  note: string
  special_tags: string[]
  submitted_at: string
  created_at?: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  contact?: string | null
  review_reason: string | null
  media: SubmissionMedia[]
  mvs: Array<{ id: string; title: string }>
  submitter: SubmissionSubmitter | null
}

export interface MVImage {
  id?: string
  type?: string
  usage?: string
  url?: string
  original_url?: string
  thumbnail_url?: string | null
  media_type?: string | null
  width?: number | null
  height?: number | null
  caption?: string
  alt?: string
  tags?: string[]
  tweetUrl?: string
  tweetText?: string | null
  tweetAuthor?: string | null
  tweetHandle?: string | null
  tweetDate?: string | null
}

export interface MV {
  id: string
  title: string
  images?: MVImage[]
}

export interface StagingProgressData {
  syncProgress: {
    status?: string
    current_run_processed?: number
    current_run_total?: number
    total_crawled?: number
    total_tweets?: number
    processed_tweets?: number
    saved_images?: number
    saved_videos?: number
    last_processed_id?: string
  } | null
  statusCounts: {
    pending: number
    approved: number
    rejected: number
  }
}

export interface StagingFanartListResponse {
  success?: boolean
  data?: StagingFanart[]
  meta?: ApiListMeta
}

export interface SubmissionListResponse {
  data?: Submission[]
  meta?: ApiListMeta
}

export interface FanartGroupMeta {
  id: string
  source_url?: string | null
  source_text?: string | null
  author_name?: string | null
  author_handle?: string | null
  post_date?: string | null
  status?: string | null
  like_count?: number | null
  retweet_count?: number | null
  view_count?: number | null
  hashtags?: string[] | null
}

export interface FanartMedia {
  id: string
  type?: string
  usage?: string
  url?: string | null
  original_url?: string | null
  thumbnail_url?: string | null
  media_type?: string | null
  tags?: string[]
  width?: number | null
  height?: number | null
  group_id?: string | null
  group?: FanartGroupMeta | null
  mvs?: Array<{ id: string; title: string }>
}

export interface FanartGroup extends FanartGroupMeta {
  media?: FanartMedia[]
}

export interface FanartGalleryResponse {
  success?: boolean
  data?: FanartMedia[]
  meta?: ApiListMeta
}

export interface RepairGroupListResponse {
  success?: boolean
  data?: {
    items?: RepairGroup[]
    total?: number
    limit?: number
    offset?: number
  }
}

export interface RepairGroup {
  id: string
  source_url?: string | null
  source_text?: string | null
  author_name?: string | null
  author_handle?: string | null
  post_date?: string | null
  status?: string | null
  media_count?: number
  mv_count?: number
  preview_url?: string | null
  sample_url?: string | null
  sample_original_url?: string | null
  missing_source_url?: boolean
  missing_post_date?: boolean
}

export interface MediaGroupOption {
  id: string
  source_url?: string | null
  author_name?: string | null
  author_handle?: string | null
  post_date?: string | null
  status?: string | null
}

export interface RepairReparsePreviewItem {
  group_id: string
  source_url: string
  current: Record<string, unknown>
  parsed: Record<string, unknown>
  diff: string[]
  media_updates: Array<{
    media_id: string
    action: 'update'
    current: Record<string, unknown>
    parsed: Record<string, unknown>
    diff: string[]
  }>
  media_new: Array<{
    action: 'create'
    parsed: {
      url: string
      original_url: string
      thumbnail_url: string | null
      media_type: string
    }
  }>
}

export interface RepairReparsePreviewData {
  results: RepairReparsePreviewItem[]
  errors: Array<{ group_id: string; error: string }>
}

export interface RepairReparseApplyData {
  updated_groups: number
  updated_media: number
  new_media: number
  r2_backups: number
  skipped: number
  errors: Array<{ group_id: string; error: string }>
}

export interface ResolvedTwitterMedia {
  url: string
  thumbnail?: string | null
  thumbnail_url?: string | null
  text?: string | null
  user_name?: string | null
  user_screen_name?: string | null
  date?: string | null
  hashtags?: string[] | null
  like_count?: number | null
  retweet_count?: number | null
  view_count?: number | null
  type?: string | null
}

export async function fetchStagingFanarts(status: string, page: number, limit: number) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts?status=${status}&page=${page}&limit=${limit}`)
  return res.json() as Promise<StagingFanartListResponse>
}

export async function fetchStagingProgress() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/progress`)
  return res.json() as Promise<ReviewResponse<StagingProgressData>>
}

export async function approveStagingFanart(id: string, mvs: string[] = []) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mvs }),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function rejectStagingFanart(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function restoreStagingFanart(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/${id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function batchRestoreStagingFanarts(ids: string[]) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/batch-restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  return res.json() as Promise<ReviewResponse<{ updatedCount?: number }>>
}

export async function triggerStagingCrawler(payload: {
  searchTerms: string
  startDate: string
  endDate: string
  maxItems?: number
}) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/staging-fanarts/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function fetchSubmissions(status: string, page: number, limit: number) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/admin/submissions?status=${status}&page=${page}&limit=${limit}`)
  return res.json() as Promise<SubmissionListResponse>
}

export async function approveSubmission(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/admin/submissions/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function rejectSubmission(id: string, reason: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/admin/submissions/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function fetchMvs() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/mvs`)
  return res.json() as Promise<ReviewResponse<MV[]>>
}

export async function updateMvsPartial(data: MV[]) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/mvs/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, partial: true }),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function fetchUnorganizedFanarts() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/unorganized`)
  const json = await res.json() as ReviewResponse<FanartGroup[]>
  return Array.isArray(json.data) ? json.data : []
}

export async function fetchDeletedFanarts() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/deleted`)
  const json = await res.json() as ReviewResponse<FanartGroup[]>
  return Array.isArray(json.data) ? json.data : []
}

export async function fetchLegacyFanarts() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/legacy`)
  const json = await res.json() as ReviewResponse<FanartMedia[]>
  return Array.isArray(json.data) ? json.data : []
}

export async function fetchFanartTagSummary() {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/tag-summary`)
  const json = await res.json() as ReviewResponse<Record<string, number>>
  return typeof json.data === 'object' && json.data ? json.data : {}
}

export async function fetchFanartsByTag(tagId: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/by-tag/${encodeURIComponent(tagId)}`)
  const json = await res.json() as ReviewResponse<FanartMedia[]>
  return Array.isArray(json.data) ? json.data : []
}

export async function fetchFanartGallery(params: {
  tags?: string[]
  mvIds?: string[]
  all?: boolean
  limit?: number
  offset?: number
  withTotal?: boolean
}) {
  const base = getApiBase()
  const search = new URLSearchParams()
  if (params.tags) {
    params.tags.forEach((tag) => {
      if (tag) search.append('tags', tag)
    })
  }
  if (params.mvIds) {
    params.mvIds.forEach((mvId) => {
      if (mvId) search.append('mvIds', mvId)
    })
  }
  if (params.all) search.set('all', '1')
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (typeof params.offset === 'number') search.set('offset', String(params.offset))
  if (params.withTotal) search.set('withTotal', '1')
  const qs = search.toString()
  const res = await adminFetch(`${base}/fanarts/gallery${qs ? `?${qs}` : ''}`)
  return res.json() as Promise<FanartGalleryResponse>
}

export async function assignFanartMedia(mediaId: string, mvs: string[], groupId?: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/media/${encodeURIComponent(mediaId)}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mvs, groupId }),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function syncFanartMedia(mediaId: string, mvs: string[], groupId?: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/media/${encodeURIComponent(mediaId)}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mvs, groupId }),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function updateFanartGroupStatus(id: string, status: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/fanarts/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function resolveTwitterMedia(url: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/mvs/twitter-resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return res.json() as Promise<ReviewResponse<ResolvedTwitterMedia[]>>
}

export async function fetchFanartOverview() {
  const [unorganized, deleted, legacy, tagSummary] = await Promise.all([
    fetchUnorganizedFanarts(),
    fetchDeletedFanarts(),
    fetchLegacyFanarts(),
    fetchFanartTagSummary(),
  ])

  return {
    unorganizedGroups: unorganized.length,
    unorganizedMedia: unorganized.reduce((sum, group) => sum + (Array.isArray(group.media) ? group.media.length : 0), 0),
    deletedGroups: deleted.length,
    legacyMedia: legacy.length,
    tagBuckets: Object.keys(tagSummary).length,
    tagSummary,
  }
}

export async function fetchRepairGroups(params: { limit: number; offset: number; q?: string; all?: boolean }) {
  const base = getApiBase()
  const search = new URLSearchParams()
  search.set('limit', String(params.limit))
  search.set('offset', String(params.offset))
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.all) search.set('all', 'true')
  const res = await adminFetch(`${base}/system/media/groups/repair?${search.toString()}`)
  return res.json() as Promise<RepairGroupListResponse>
}

export async function fetchRepairOverview() {
  const response = await fetchRepairGroups({ limit: 20, offset: 0 })
  const items = Array.isArray(response.data?.items) ? response.data.items : []
  return {
    total: Number(response.data?.total || 0),
    inferableCount: items.filter((item) => !!item.sample_original_url || !!item.sample_url || !!item.preview_url).length,
    items,
  }
}

export async function fetchMediaGroups(limit = 200, offset = 0) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/system/media/groups?limit=${limit}&offset=${offset}`)
  const json = await res.json() as ReviewResponse<{ items?: MediaGroupOption[] } | MediaGroupOption[]>
  if (Array.isArray(json.data)) return json.data
  return Array.isArray(json.data?.items) ? json.data.items : []
}

export async function updateRepairGroup(id: string, payload: Partial<RepairGroup>) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<ReviewResponse<RepairGroup>>
}

export async function mergeRepairGroup(id: string, payload: {
  target_group_id?: string
  target_source_url?: string
  carry_fields?: boolean
}) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(id)}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function unassignRepairGroup(id: string) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(id)}/unassign`, {
    method: 'POST',
  })
  return res.json() as Promise<ReviewResponse<unknown>>
}

export async function previewRepairReparse(groupIds: string[], overwrite = false) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/system/media/groups/reparse-twitter/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_ids: groupIds, overwrite }),
  })
  return res.json() as Promise<ReviewResponse<RepairReparsePreviewData>>
}

export async function applyRepairReparse(payload: {
  group_ids: string[]
  overwrite?: boolean
  include_new_media?: boolean
  selected_group_fields?: Record<string, string[]>
  selected_media_fields?: Record<string, string[]>
  new_media_urls?: string[]
}) {
  const base = getApiBase()
  const res = await adminFetch(`${base}/system/media/groups/reparse-twitter/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<ReviewResponse<RepairReparseApplyData>>
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
  try {
    const res = await adminFetch(`${getApiBase()}/auth/me`)
    if (!res.ok) return null
    const data = await res.json()
    return (data.success ? data.data : null) as ReviewUser | null
  } catch {
    return null
  }
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

export const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>) => {
  const base = getApiBase()
  const res = await adminFetch(`${base}/auth/me/notification-preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  return res.json()
}
