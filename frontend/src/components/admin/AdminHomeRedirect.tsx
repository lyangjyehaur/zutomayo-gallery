import { Navigate, useOutletContext } from "react-router-dom"

type AdminOutletContext = {
  menus?: Array<{ path?: string; sort?: number }>
}

export function AdminHomeRedirect() {
  const context = useOutletContext<AdminOutletContext>()
  const firstPath = [...(context?.menus || [])]
    .sort((a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0))
    .find((menu) => {
      const path = String(menu.path || "")
      return path.startsWith("/admin/") && path !== "/admin/auth"
    })?.path

  return <Navigate to={firstPath || "/admin/mvs"} replace />
}

export function AdminSystemRedirect() {
  const context = useOutletContext<AdminOutletContext>()
  const firstPath = [...(context?.menus || [])]
    .sort((a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0))
    .find((menu) => String(menu.path || "").startsWith("/admin/system/"))?.path

  return <Navigate to={firstPath || "/admin/system/users"} replace />
}
