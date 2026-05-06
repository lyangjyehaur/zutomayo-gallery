export type ApiErrorPayload = {
  success?: boolean
  error?: string
  message?: string
  code?: string
  requestId?: string
  statusCode?: number
  details?: unknown
}

export type ApiErrorLike = Error & {
  status?: number
  statusCode?: number
  code?: string
  requestId?: string
  details?: unknown
}

export const readJsonResponse = async <T = unknown>(res: Response): Promise<T | null> => {
  const text = await res.text().catch(() => "")
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export const getApiErrorMessage = (payload: unknown, fallback = "REQUEST_FAILED") => {
  if (!payload || typeof payload !== "object") return fallback
  const data = payload as ApiErrorPayload
  const message = data.error || data.message || data.code
  return typeof message === "string" && message.trim() ? message : fallback
}

export const createApiError = (
  payload: unknown,
  fallback = "REQUEST_FAILED",
  status?: number
): ApiErrorLike => {
  const message = getApiErrorMessage(payload, fallback)
  const err = new Error(message) as ApiErrorLike
  if (typeof status === "number") {
    err.status = status
    err.statusCode = status
  }

  if (payload && typeof payload === "object") {
    const data = payload as ApiErrorPayload
    if (typeof data.code === "string" && data.code) err.code = data.code
    if (typeof data.requestId === "string" && data.requestId) err.requestId = data.requestId
    if ("details" in data) err.details = data.details
    if (typeof data.statusCode === "number") err.statusCode = data.statusCode
  }

  return err
}

export const throwApiError = (
  res: Response,
  payload: unknown,
  fallback = "REQUEST_FAILED"
): never => {
  throw createApiError(payload, fallback, res.status)
}
