import React from "react"
import { startRegistration } from "@simplewebauthn/browser"
import { toast } from "sonner"

import { adminFetch, getAuthApiBase } from "@/lib/admin-api"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type PasskeyRow = { id: string; name?: string; createdAt: string }
type MePayload = {
  username?: string
  email?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

export function AdminAccountPage() {
  const authApiBase = React.useMemo(() => getAuthApiBase(), [])

  const [loading, setLoading] = React.useState(false)
  const [profileLoading, setProfileLoading] = React.useState(false)
  const [passkeys, setPasskeys] = React.useState<PasskeyRow[]>([])
  const [newName, setNewName] = React.useState("")
  const [removeId, setRemoveId] = React.useState<string | null>(null)
  const [profile, setProfile] = React.useState<MePayload | null>(null)
  const [email, setEmail] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState("")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminFetch(`${authApiBase}/passkeys`)
      const data = await r.json().catch(() => null)
      if (Array.isArray(data)) setPasskeys(data)
      else setPasskeys([])
    } finally {
      setLoading(false)
    }
  }, [authApiBase])

  const loadProfile = React.useCallback(async () => {
    setProfileLoading(true)
    try {
      const r = await adminFetch(`${authApiBase}/me`)
      const json = await r.json().catch(() => null)
      const data = json?.success ? (json.data as MePayload) : null
      if (data) {
        setProfile(data)
        setEmail(typeof data.email === "string" ? data.email : "")
        setDisplayName(typeof data.display_name === "string" ? data.display_name : "")
        setAvatarUrl(typeof data.avatar_url === "string" ? data.avatar_url : "")
      } else {
        setProfile(null)
      }
    } finally {
      setProfileLoading(false)
    }
  }, [authApiBase])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const saveProfile = React.useCallback(async () => {
    setProfileLoading(true)
    try {
      const res = await adminFetch(`${authApiBase}/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          display_name: displayName,
          avatar_url: avatarUrl,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "SAVE_FAILED"))
      toast.success("已保存帳戶資料")
      window.location.reload()
    } catch (e: any) {
      toast.error(`保存失敗：${String(e?.message || e)}`)
    } finally {
      setProfileLoading(false)
    }
  }, [authApiBase, avatarUrl, displayName, email])

  const handleRegister = React.useCallback(async () => {
    const name = newName.trim()
    if (!name) return
    setLoading(true)
    try {
      const headers = { "Content-Type": "application/json" }
      const resp = await adminFetch(`${authApiBase}/generate-reg-options`, { headers })
      const options = await resp.json()
      if (!resp.ok || (options as any)?.error) throw new Error(String((options as any)?.error || "OPTIONS_FAILED"))

      const attResp = await startRegistration({ optionsJSON: options })
      const verifyResp = await adminFetch(`${authApiBase}/verify-reg`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: attResp, name }),
      })
      const verifyResult = await verifyResp.json().catch(() => null)
      if (!verifyResp.ok || !verifyResult?.success) throw new Error(String((verifyResult as any)?.error || "VERIFY_FAILED"))
      toast.success("Passkey 註冊成功")
      setNewName("")
      await load()
    } catch (e: any) {
      toast.error(`Passkey 註冊失敗：${String(e?.message || e)}`)
    } finally {
      setLoading(false)
    }
  }, [authApiBase, load, newName])

  const confirmRemove = React.useCallback(async () => {
    if (!removeId) return
    setLoading(true)
    try {
      const res = await adminFetch(`${authApiBase}/passkeys/${encodeURIComponent(removeId)}`, { method: "DELETE" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "DELETE_FAILED"))
      toast.success("Passkey 已刪除")
      setRemoveId(null)
      await load()
    } catch (e: any) {
      toast.error(`刪除失敗：${String(e?.message || e)}`)
    } finally {
      setLoading(false)
    }
  }, [authApiBase, load, removeId])

  return (
    <div className="p-6 flex flex-col gap-4">
      <AdminPageHeader title="帳戶設定" description="管理本帳戶的基本資料與登入方式（Passkeys）。" />

      <AdminPanel className="flex flex-col gap-3 max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-black uppercase tracking-widest">Profile</div>
          <Button variant="neutral" onClick={() => void loadProfile()} disabled={profileLoading} className="border-2 border-black">
            {profileLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={profile?.username || ""} disabled placeholder="username" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email (optional)" />
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="display name (optional)" />
          <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="avatar url (optional)" />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void saveProfile()} disabled={profileLoading} className="border-2 border-black">
            保存
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-black uppercase tracking-widest">Passkeys</div>
          <Button variant="neutral" onClick={() => void load()} disabled={loading} className="border-2 border-black">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：My MacBook / iPhone"
          />
          <Button onClick={() => void handleRegister()} disabled={loading || !newName.trim()} className="border-2 border-black">
            註冊新 Passkey
          </Button>
        </div>

        {passkeys.length === 0 ? (
          <div className="text-xs font-mono opacity-60">尚未註冊任何 Passkey。</div>
        ) : (
          <div className="flex flex-col gap-2">
            {passkeys.map((pk) => (
              <div key={pk.id} className="border-2 border-black bg-card p-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-bold truncate">{pk.name || "未命名設備"}</div>
                  <div className="text-[10px] font-mono opacity-60 truncate">ID: {pk.id}</div>
                  <div className="text-[10px] font-mono opacity-60">建立於: {new Date(pk.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setRemoveId(pk.id)}>
                    刪除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      <AlertDialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除 Passkey</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除這個 Passkey 嗎？刪除後該設備將無法使用 Passkey 登入。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRemove()}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
