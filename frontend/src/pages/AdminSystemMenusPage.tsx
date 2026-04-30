import React from "react"
import { Helmet } from "react-helmet-async"
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import { useConfirmDialog } from "@/components/admin/useConfirmDialog"

type MenuRow = {
  id: string
  label: string
  path: string
  icon: string | null
  sort: number
  parent_id: string | null
  permission: string | null
}

export function AdminSystemMenusPage() {
  const invalidate = useInvalidate()
  const menusQuery = useList<MenuRow>({ resource: "systemMenus", hasPagination: false })
  const permissionsQuery = useList<string>({ resource: "systemPermissions", hasPagination: false })
  const createMenu = useCreate()
  const updateMenu = useUpdate()
  const del = useDelete()
  const [confirm, ConfirmDialog] = useConfirmDialog()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<MenuRow | null>(null)

  const [label, setLabel] = React.useState("")
  const [path, setPath] = React.useState("")
  const [icon, setIcon] = React.useState("")
  const [sort, setSort] = React.useState("0")
  const [parentId, setParentId] = React.useState<string | null>(null)
  const [permission, setPermission] = React.useState<string | null>(null)

  const menus = menusQuery.data?.data || []

  const menuOptions: Option[] = React.useMemo(() => {
    return menus
      .map((m) => ({ label: `${m.label} (${m.path})`, value: m.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [menus])

  const permissionOptions: Option[] = React.useMemo(() => {
    const list = permissionsQuery.data?.data || []
    return list.map((p) => ({ label: String(p), value: String(p) })).sort((a, b) => a.label.localeCompare(b.label))
  }, [permissionsQuery.data])

  const openCreate = () => {
    setEditing(null)
    setLabel("")
    setPath("/admin/")
    setIcon("")
    setSort("0")
    setParentId(null)
    setPermission(null)
    setDialogOpen(true)
  }

  const openEdit = (m: MenuRow) => {
    setEditing(m)
    setLabel(m.label || "")
    setPath(m.path || "")
    setIcon(m.icon || "")
    setSort(String(m.sort ?? 0))
    setParentId(m.parent_id || null)
    setPermission(m.permission || null)
    setDialogOpen(true)
  }

  const save = async () => {
    const payload: any = {
      label: label.trim(),
      path: path.trim(),
      icon: icon.trim() || null,
      sort: Number(sort || 0),
      parent_id: parentId,
      permission,
    }
    if (editing) {
      await updateMenu.mutateAsync({
        resource: "systemMenus",
        id: editing.id,
        values: payload,
        successNotification: { message: "已更新菜單", type: "success" },
        errorNotification: (err: any) => ({ message: "更新失敗", description: err?.message, type: "error" }),
      })
    } else {
      await createMenu.mutateAsync({
        resource: "systemMenus",
        values: payload,
        successNotification: { message: "已新增菜單", type: "success" },
        errorNotification: (err: any) => ({ message: "新增失敗", description: err?.message, type: "error" }),
      })
    }
    setDialogOpen(false)
    setEditing(null)
    await invalidate({ resource: "systemMenus", invalidates: ["list"] })
  }

  const handleDelete = async (m: MenuRow) => {
    const ok = await confirm({
      title: "刪除菜單",
      description: `確定要刪除 ${m.label}？`,
      confirmText: "刪除",
      cancelText: "取消",
    })
    if (!ok) return
    await del.mutateAsync({
      resource: "systemMenus",
      id: m.id,
      successNotification: { message: "已刪除菜單", type: "success" },
      errorNotification: (err: any) => ({ message: "刪除失敗", description: err?.message, type: "error" }),
    })
    await invalidate({ resource: "systemMenus", invalidates: ["list"] })
  }

  return (
    <div className="p-6">
      <Helmet>
        <title>Admin Menus</title>
      </Helmet>
      <div className="text-xl font-semibold">Admin Menus</div>

      <div className="mt-6 flex">
        <Button onClick={openCreate}>新增菜單</Button>
      </div>

      <div className="mt-4 border-4 border-black bg-card shadow-neo p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr className="border-b-2 border-black">
              <th className="py-2 pr-2">Label</th>
              <th className="py-2 pr-2">Path</th>
              <th className="py-2 pr-2">Sort</th>
              <th className="py-2 pr-2">Permission</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((m) => (
              <tr key={m.id} className="border-b border-black/20">
                <td className="py-2 pr-2">{m.label}</td>
                <td className="py-2 pr-2 font-mono">{m.path}</td>
                <td className="py-2 pr-2 font-mono">{m.sort}</td>
                <td className="py-2 pr-2 font-mono break-all">{m.permission || ""}</td>
                <td className="py-2 pr-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void handleDelete(m)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {menus.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center opacity-70">
                  {menusQuery.isLoading ? "Loading..." : "No data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "編輯菜單" : "新增菜單"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label" />
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/admin/xxx" />
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="icon (optional)" />
            <Input value={sort} onChange={(e) => setSort(e.target.value)} placeholder="sort" />
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono opacity-70">Parent</div>
              <MultiSelect
                options={menuOptions}
                value={parentId ? [parentId] : []}
                onValueChange={(v) => setParentId(v[0] || null)}
                placeholder="選擇 parent (可空)"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono opacity-70">Permission</div>
              <MultiSelect
                options={permissionOptions}
                value={permission ? [permission] : []}
                onValueChange={(v) => setPermission(v[0] || null)}
                placeholder="選擇 permission (可空)"
              />
            </div>
            <Button onClick={() => void save()} disabled={createMenu.isLoading || updateMenu.isLoading}>
              儲存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
