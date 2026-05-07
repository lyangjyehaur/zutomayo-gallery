const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
  'http://localhost:3000',
]

const getAllowedOrigins = (): string[] => {
  const origins: string[] = []

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean))
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.push(...DEV_ORIGINS)
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
