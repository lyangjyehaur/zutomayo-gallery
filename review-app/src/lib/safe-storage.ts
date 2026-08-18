type StorageArea = 'local' | 'session'
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const resolveStorage = (area: StorageArea): StorageLike | null => {
  if (typeof window === 'undefined') return null
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const safeStorageGet = (
  area: StorageArea,
  key: string,
  storageOverride?: StorageLike | null,
): string | null => {
  try {
    return (storageOverride === undefined ? resolveStorage(area) : storageOverride)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export const safeStorageSet = (
  area: StorageArea,
  key: string,
  value: string,
  storageOverride?: StorageLike | null,
): boolean => {
  try {
    const storage = storageOverride === undefined ? resolveStorage(area) : storageOverride
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export const safeStorageRemove = (
  area: StorageArea,
  key: string,
  storageOverride?: StorageLike | null,
): boolean => {
  try {
    const storage = storageOverride === undefined ? resolveStorage(area) : storageOverride
    if (!storage) return false
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}
