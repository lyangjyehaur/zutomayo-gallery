const getDevOrigins = (): string[] => String(process.env.DEV_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const getAllowedOrigins = (): string[] => {
  const origins: string[] = []

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean))
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.push(...getDevOrigins())
  }

  return [...new Set(origins)]
}

export { getAllowedOrigins }

export const resolveCorsOrigin = (requestOrigin: string | undefined): string | undefined => {
  if (!requestOrigin) return '*'
  const origins = getAllowedOrigins()
  if (origins.includes(requestOrigin) || origins.includes('*')) {
    return requestOrigin
  }
  return undefined
}

export const isCorsOriginAllowed = (requestOrigin: string | undefined): boolean => {
  return !requestOrigin || Boolean(resolveCorsOrigin(requestOrigin))
}
