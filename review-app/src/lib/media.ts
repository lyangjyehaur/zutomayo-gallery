const normalizeUrl = (value?: string | null) => {
  const trimmed = String(value || '').trim()
  return trimmed || ''
}

export const isTwimgUrl = (value?: string | null) => {
  const url = normalizeUrl(value)
  if (!url) return false
  try {
    return /(^|\.)twimg\.com$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

export const preferTwimgUrl = (...candidates: Array<string | null | undefined>) => {
  const normalized = candidates.map(normalizeUrl).filter(Boolean)
  return normalized.find((url) => isTwimgUrl(url)) || normalized[0] || ''
}
