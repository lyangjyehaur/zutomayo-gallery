import type { DataProvider } from "@refinedev/core"
import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { createApiError, readJsonResponse } from "@/lib/api-error"

const parseJson = async (res: Response) => {
  const json = await readJsonResponse<any>(res)
  if (res.ok) return json

  const message =
    (json && typeof json === "object" && (json.error || json.message)) ||
    res.statusText ||
    "Request failed"

  throw createApiError(json || { error: message, statusCode: res.status }, "Request failed", res.status)
}

const unwrap = (json: any) => {
  if (json && typeof json === "object" && "success" in json) {
    if (json.success) return json.data
    throw createApiError(json, "Request failed", 400)
  }
  return json
}

const getResourceBaseUrl = (resource: string) => {
  const apiRoot = getApiRoot()
  const map: Record<string, string> = {
    mvs: `${apiRoot}/mvs`,
    artists: `${apiRoot}/artist`,
    albums: `${apiRoot}/album`,
    appleMusicAlbums: `${apiRoot}/album/apple-music`,
    dicts: `${apiRoot}/system/dicts`,
    fanart: `${apiRoot}/fanarts`,
    stagingFanarts: `${apiRoot}/staging-fanarts`,
    systemUsers: `${apiRoot}/admin/system/users`,
    systemRoles: `${apiRoot}/admin/system/roles`,
    systemMenus: `${apiRoot}/admin/system/menus`,
    systemPermissions: `${apiRoot}/admin/system/permissions`,
  }
  return map[resource]
}

const getResourceCreateUrl = (resource: string) => {
  const base = getResourceBaseUrl(resource)
  if (!base) return null
  if (resource === 'albums') return `${base}/create`
  if (resource === 'artists') return `${base}/create`
  if (resource === 'dicts') return `${base}/create`
  return base
}

export const adminDataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const base = getResourceBaseUrl(resource)
    if (!base) throw new Error(`UNKNOWN_RESOURCE:${resource}`)

    const u = new URL(base, window.location.origin)
    if (pagination) {
      const current = (pagination as any).current
      const pageSize = (pagination as any).pageSize
      if (typeof current === "number") u.searchParams.set("page", String(current))
      if (typeof pageSize === "number") u.searchParams.set("limit", String(pageSize))
    }
    if (Array.isArray(filters)) {
      for (const f of filters as any[]) {
        if (!f || typeof f !== "object") continue
        if (f.operator && f.operator !== "eq") continue
        if (typeof f.field !== "string") continue
        if (f.value === undefined || f.value === null) continue
        u.searchParams.set(f.field, String(f.value))
      }
    }
    if (Array.isArray(sorters) && sorters.length > 0) {
      const s = sorters[0] as any
      if (s?.field) u.searchParams.set("sortField", String(s.field))
      if (s?.order) u.searchParams.set("sortOrder", String(s.order))
    }

    const res = await adminFetch(u.toString())
    const json = await parseJson(res)
    const data = unwrap(json)
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
    const total =
      typeof (json as any)?.meta?.total === "number"
        ? (json as any).meta.total
        : typeof (json as any)?.total === "number"
          ? (json as any).total
          : Array.isArray(list)
            ? list.length
            : 0
    return { data: list, total }
  },

  getOne: async ({ resource, id }) => {
    const base = getResourceBaseUrl(resource)
    if (!base) throw new Error(`UNKNOWN_RESOURCE:${resource}`)
    const res = await adminFetch(`${base}/${encodeURIComponent(String(id))}`)
    const json = await parseJson(res)
    return { data: unwrap(json) }
  },

  create: async ({ resource, variables }) => {
    const url = getResourceCreateUrl(resource)
    if (!url) throw new Error(`UNKNOWN_RESOURCE:${resource}`)
    const res = await adminFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables || {}),
    })
    const json = await parseJson(res)
    return { data: unwrap(json) }
  },

  update: async ({ resource, id, variables }) => {
    const base = getResourceBaseUrl(resource)
    if (!base) throw new Error(`UNKNOWN_RESOURCE:${resource}`)
    const res = await adminFetch(`${base}/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables || {}),
    })
    const json = await parseJson(res)
    return { data: unwrap(json) }
  },

  deleteOne: async ({ resource, id }) => {
    const base = getResourceBaseUrl(resource)
    if (!base) throw new Error(`UNKNOWN_RESOURCE:${resource}`)
    const res = await adminFetch(`${base}/${encodeURIComponent(String(id))}`, { method: "DELETE" })
    const json = await parseJson(res)
    return { data: unwrap(json) }
  },

  custom: async ({ url, method, payload, query, headers }) => {
    const u = new URL(url, window.location.origin)
    if (query && typeof query === "object") {
      for (const [k, v] of Object.entries(query as any)) {
        if (v === undefined || v === null) continue
        u.searchParams.set(k, String(v))
      }
    }

    const res = await adminFetch(u.toString(), {
      method: (method || "GET").toUpperCase(),
      headers: { ...(headers || {}), ...(payload ? { "Content-Type": "application/json" } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    const json = await parseJson(res)
    return { data: unwrap(json) }
  },

  getApiUrl: () => getApiRoot(),
}
