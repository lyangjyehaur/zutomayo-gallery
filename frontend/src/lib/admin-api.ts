export const getApiRoot = () => {
  return (import.meta as any).env?.VITE_API_ROOT || "/api"
}

export const getAuthApiBase = () => {
  return `${getApiRoot()}/auth`
}

export const getMvsApiBase = () => {
  return `${getApiRoot()}/mvs`
}

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { ...init, credentials: "include" })
}
