export const getApiRoot = () => {
  return (import.meta as any).env?.VITE_API_ROOT || "/api"
}

export const getAuthApiBase = () => {
  return `${getApiRoot()}/auth`
}

export const getMvsApiBase = () => {
  return `${getApiRoot()}/mvs`
}

export const getAdminPassword = () => {
  try {
    return localStorage.getItem("ztmy_admin_pwd") || ""
  } catch {
    return ""
  }
}

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || undefined)
  if (!headers.has("x-admin-password")) {
    const pwd = getAdminPassword()
    if (pwd) headers.set("x-admin-password", pwd)
  }
  return fetch(input, { ...init, headers, credentials: "include" })
}

