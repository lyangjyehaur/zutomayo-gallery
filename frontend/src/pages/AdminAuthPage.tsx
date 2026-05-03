import React from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { startAuthentication } from "@simplewebauthn/browser"
import { VERSION_CONFIG } from "@/config/version"
import { adminFetch, getAuthApiBase, getMvsApiBase } from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type MePayload = {
  username?: string
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string; message?: string }

const fetchMe = async (): Promise<MePayload | null> => {
  const res = await adminFetch(`${getAuthApiBase()}/me`)
  const json = (await res.json().catch(() => null)) as ApiResponse<MePayload> | null
  if (!res.ok || !json?.success) return null
  return json.data
}

const verifyLegacy = async (password: string) => {
  const res = await adminFetch(`${getMvsApiBase()}/verify-admin`, {
    method: "POST",
    headers: { "x-admin-password": password },
  })
  return res.ok
}

const getTo = (raw: string | null) => {
  const v = typeof raw === "string" ? raw : ""
  if (!v) return "/admin"
  if (!v.startsWith("/admin")) return "/admin"
  return v
}

export function AdminAuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const allowLegacy = Boolean((import.meta as any).env?.DEV)
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [legacyPassword, setLegacyPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const to = React.useMemo(() => getTo(params.get("to")), [params])

  React.useEffect(() => {
    const run = async () => {
      try {
        const me = await fetchMe()
        if (me) {
          navigate(to, { replace: true })
          return
        }
      } finally {
        setIsInitializing(false)
      }
    }
    run()
  }, [navigate, to])

  const handleLogin = React.useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      try {
        localStorage.removeItem("ztmy_admin_pwd")
      } catch {
      }
      const res = await adminFetch(`${getAuthApiBase()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const json = (await res.json().catch(() => null)) as ApiResponse<any> | null
      if (!res.ok || !json?.success) throw new Error(String((json as any)?.error || "LOGIN_FAILED"))
      toast.success("登入成功")
      navigate(to, { replace: true })
    } catch (e) {
      setError("帳號或密碼錯誤，或伺服器拒絕登入。")
    } finally {
      setIsSubmitting(false)
    }
  }, [navigate, password, to, username])

  const handleLegacyLogin = React.useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const ok = await verifyLegacy(legacyPassword)
      if (!ok) throw new Error("LEGACY_LOGIN_FAILED")
      localStorage.setItem("ztmy_admin_pwd", legacyPassword)
      toast.success("登入成功")
      navigate(to, { replace: true })
    } catch (e) {
      setError("存取碼驗證失敗。")
    } finally {
      setIsSubmitting(false)
    }
  }, [legacyPassword, navigate, to])

  const handlePasskeyLogin = React.useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const resp = await adminFetch(`${getAuthApiBase()}/generate-auth-options`)
      const options = await resp.json().catch(() => null)
      if (!resp.ok || !options || (options as any).error) {
        throw new Error(String((options as any)?.error || "PASSKEY_OPTIONS_FAILED"))
      }

      const asseResp = await startAuthentication({ optionsJSON: options as any })
      const verifyResp = await adminFetch(`${getAuthApiBase()}/verify-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asseResp),
      })
      const verifyResult = await verifyResp.json().catch(() => null)
      if (!verifyResp.ok || !verifyResult?.success) {
        throw new Error(String((verifyResult as any)?.error || "PASSKEY_VERIFY_FAILED"))
      }
      try {
        localStorage.removeItem("ztmy_admin_pwd")
      } catch {
      }
      toast.success("Passkey 登入成功")
      navigate(to, { replace: true })
    } catch (e: any) {
      setError(`Passkey 登入失敗：${String(e?.message || e)}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, navigate, to])

  if (isInitializing) {
    return <div className="p-6 font-mono">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
      <div className="w-full max-w-sm bg-card border-4 border-black shadow-neo flex flex-col z-10 relative">
        <div className="h-10 bg-black text-white flex items-center justify-between px-4 border-b-4 border-black">
          <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
            <i className="hn hn-exclamation-triangle text-base" />
            <span className="flex flex-col leading-tight">
              <span className="tracking-normal opacity-90">管理員驗證</span>
              <span className="text-[10px] font-mono opacity-60 normal-case">ADMIN_AUTH</span>
            </span>
          </span>
          <div className="flex gap-2">
            <div className="size-3 rounded-full bg-main" />
            <div className="size-3 rounded-full bg-ztmy-green" />
            <div className="size-3 rounded-full bg-red-500" />
          </div>
        </div>
        <div className="p-8 flex flex-col gap-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>登入失敗</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
              <span className="tracking-normal opacity-70">帳號</span>
              <span className="text-[10px] font-mono opacity-40 normal-case">USERNAME</span>
            </div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
              <span className="tracking-normal opacity-70">密碼</span>
              <span className="text-[10px] font-mono opacity-40 normal-case">PASSWORD</span>
            </div>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
            />
          </div>
          <Button
            type="button"
            variant="default"
            className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
            onClick={() => void handleLogin()}
            disabled={isSubmitting || !username.trim() || !password}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="tracking-normal">{isSubmitting ? "驗證中..." : "登入"}</span>
              <span className="text-[10px] font-mono opacity-60 normal-case">{isSubmitting ? "VERIFYING..." : "LOGIN_"}</span>
            </span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-black/20"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-black/50 font-bold flex flex-col items-center leading-tight">
                <span className="tracking-normal">或</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">OR</span>
              </span>
            </div>
          </div>

          {allowLegacy ? (
            <>
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
                  <span className="tracking-normal opacity-70">存取碼</span>
                  <span className="text-[10px] font-mono opacity-40 normal-case">ACCESS_CODE</span>
                </div>
                <Input
                  value={legacyPassword}
                  onChange={(e) => setLegacyPassword(e.target.value)}
                  placeholder="admin password"
                  type="password"
                  className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
                />
              </div>
              <Button
                type="button"
                variant="neutral"
                className="w-full h-12 font-black tracking-widest flex items-center justify-center gap-2 border-2 border-black rounded-none"
                onClick={() => void handleLegacyLogin()}
                disabled={isSubmitting || !legacyPassword}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span className="tracking-normal">Legacy 登入</span>
                  <span className="text-[10px] font-mono opacity-60 normal-case">LEGACY LOGIN</span>
                </span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-black/20"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-black/50 font-bold flex flex-col items-center leading-tight">
                    <span className="tracking-normal">或</span>
                    <span className="text-[10px] font-mono opacity-60 normal-case">OR</span>
                  </span>
                </div>
              </div>
            </>
          ) : null}

          <Button
            type="button"
            variant="neutral"
            className="w-full h-12 font-black tracking-widest flex items-center justify-center gap-2 border-2 border-black rounded-none"
            onClick={() => void handlePasskeyLogin()}
            disabled={isSubmitting}
          >
            <i className="hn hn-user text-xl" />
            <span className="flex flex-col items-center leading-tight">
              <span className="tracking-normal">使用 Passkey 登入</span>
              <span className="text-[10px] font-mono opacity-60 normal-case">PASSKEY LOGIN</span>
            </span>
          </Button>
        </div>
        <div className="bg-secondary-background border-t-4 border-black p-3 flex justify-between items-center text-[10px] opacity-70">
          <span>SYS.AUTH.v{VERSION_CONFIG.app}</span>
          <Link to="/" className="hover:underline hover:text-main transition-colors uppercase">
            <span className="flex flex-col items-end leading-tight">
              <span className="tracking-normal">{'<'} 返回首頁</span>
              <span className="text-[10px] font-mono opacity-60 normal-case">Return_Home</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
