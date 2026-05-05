import React from "react"
import { Link } from "react-router-dom"
import { useCan } from "@refinedev/core"

import { Button } from "@/components/ui/button"

export function AdminRouteGuard({
  resource,
  children,
}: {
  resource?: string
  children: React.ReactNode
}) {
  const query = useCan({
    resource: resource || "__admin_public__",
    action: "access",
    queryOptions: { enabled: !!resource },
  })

  if (!resource) return <>{children}</>

  if (query.isLoading || query.isFetching) {
    return <div className="p-6 font-mono text-sm">Checking access...</div>
  }

  if (!query.data?.can) {
    return (
      <div className="p-6">
        <div className="max-w-xl border-2 border-black bg-card p-5 shadow-neo flex flex-col gap-3">
          <div className="text-xl font-black">無權限</div>
          <div className="text-sm opacity-80">此帳號沒有存取這個後台頁面的權限。</div>
          <div>
            <Button asChild variant="neutral" className="border-2 border-black">
              <Link to="/admin">返回後台</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
