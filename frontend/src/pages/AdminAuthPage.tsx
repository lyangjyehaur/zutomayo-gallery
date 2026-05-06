import React from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { startAuthentication } from "@simplewebauthn/browser"
import { VERSION_CONFIG } from "@/config/version"
import { adminFetch, getAuthApiBase } from "@/lib/admin-api"
import { clearAdminMeCache, fetchAdminMe } from "@/lib/admin-session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AuthCard } from "@/components/auth/AuthCard"
import { useTranslation } from "react-i18next"
import { shouldShowSecondaryLang } from "@/i18n"

const getTo = (raw: string | null) => {
  const v = typeof raw === "string" ? raw : ""
  if (!v) return "/admin"
  if (!v.startsWith("/admin")) return "/admin"
  return v
}

export function AdminAuthPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const normalizedUsername = username.trim()

  const formatPasskeyError = React.useCallback((raw: unknown) => {
    const message = String((raw as any)?.message || raw || "")
    if (message.includes("該用戶沒有註冊任何 Passkey")) {
      return "這個帳號尚未註冊 Passkey，請先用密碼登入後到帳戶設定註冊。"
    }
    if (message.includes("無法生成認證選項")) {
      return "這個帳號目前不能使用 Passkey 登入，請確認帳號是否正確，或先用密碼登入後註冊 Passkey。"
    }
    return `Passkey 登入失敗：${message || "UNKNOWN_ERROR"}`
  }, [])

  const to = React.useMemo(() => getTo(params.get("to")), [params])

  React.useEffect(() => {
    const run = async () => {
      try {
        const me = await fetchAdminMe()
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

  React.useEffect(() => {
    if (normalizedUsername && error === "請先輸入帳號，再使用 Passkey 登入。") {
      setError(null)
    }
  }, [error, normalizedUsername])

  const handleLogin = React.useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await adminFetch(`${getAuthApiBase()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string; message?: string } | null
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "LOGIN_FAILED"))
      clearAdminMeCache()
      toast.success("登入成功")
      navigate(to, { replace: true })
    } catch (e) {
      setError("帳號或密碼錯誤，或伺服器拒絕登入。")
    } finally {
      setIsSubmitting(false)
    }
  }, [navigate, password, to, username])

  const handlePasskeyLogin = React.useCallback(async () => {
    if (isSubmitting) return
    if (!normalizedUsername) {
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const resp = await adminFetch(`${getAuthApiBase()}/generate-auth-options?username=${encodeURIComponent(normalizedUsername)}`)
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
      clearAdminMeCache()
      toast.success("Passkey 登入成功")
      navigate(to, { replace: true })
    } catch (e: any) {
      setError(formatPasskeyError(e))
    } finally {
      setIsSubmitting(false)
    }
  }, [formatPasskeyError, isSubmitting, navigate, normalizedUsername, to, username])

  if (isInitializing) {
    return <div className="p-6 font-mono">Loading...</div>
  }

  return (
    <AuthCard
      title="管理員驗證"
      code="ADMIN_AUTH"
      headerTone="admin"
      iconClassName="hn hn-exclamation-triangle"
      bodyClassName="flex flex-col gap-6"
      footer={
        <div className="bg-secondary-background border-t-4 border-black p-3 flex justify-between items-center text-[10px] opacity-70">
          <span>SYS.AUTH.v{VERSION_CONFIG.app}</span>
          <Link to="/" className="hover:underline hover:text-main transition-colors uppercase">
            <span className="flex flex-col items-end leading-tight">
              <span className="tracking-normal">{'<'} 返回首頁</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-60 normal-case">Return_Home</span>
              )}
            </span>
          </Link>
        </div>
      }
    >
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>登入失敗</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
              <span className="tracking-normal opacity-70">帳號</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-40 normal-case">USERNAME</span>
              )}
            </div>
            <Input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (error) setError(null)
              }}
              placeholder="username"
              className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
              <span className="tracking-normal opacity-70">密碼</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-40 normal-case">PASSWORD</span>
              )}
            </div>
            <Input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
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
            disabled={isSubmitting || !normalizedUsername || !password}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="tracking-normal">{isSubmitting ? "驗證中..." : "登入"}</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-60 normal-case">{isSubmitting ? "VERIFYING..." : "LOGIN_"}</span>
              )}
            </span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-black/20"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-black/50 font-bold flex flex-col items-center leading-tight">
                <span className="tracking-normal">或</span>
                {shouldShowSecondaryLang(i18n.language) && (
                <span className="text-[10px] font-mono opacity-60 normal-case">OR</span>
                )}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="neutral"
            className="w-full h-12 font-black tracking-widest flex items-center justify-center gap-2 border-2 border-black rounded-none"
            onClick={() => void handlePasskeyLogin()}
            disabled={isSubmitting || !normalizedUsername}
          >
            <i className="hn hn-user text-xl" />
            <span className="flex flex-col items-center leading-tight">
              <span className="tracking-normal">使用 Passkey 登入</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-60 normal-case">PASSKEY LOGIN</span>
              )}
            </span>
          </Button>
          <div className="text-[10px] font-mono opacity-50 leading-tight -mt-2">
            若尚未註冊 Passkey，請先用密碼登入後，到帳戶設定完成註冊。
          </div>
    </AuthCard>
  )
}
