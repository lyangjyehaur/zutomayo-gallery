import { useEffect, useState } from 'react'
import { Page, LoginScreenTitle, List, ListInput, Button, Block, BlockFooter, Link, f7 } from 'framework7-react'
import { login, loginWithPasskey, checkAuth } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { BUILD_INFO } from '../build-info'
import ReviewStateBlock from '../components/ReviewStateBlock'

type LoginMode = 'passkey' | 'password'

export default function LoginPage() {
  const { login: authLogin } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [mode, setMode] = useState<LoginMode>('passkey')

  useEffect(() => {
    checkAuth().then((user) => {
      if (user) {
        authLogin(user)
      }
    }).finally(() => {
      setCheckingSession(false)
    })
  }, [authLogin])

  const handlePasskeyLogin = async () => {
    if (!username) {
      f7.dialog.alert('請輸入帳號')
      return
    }
    setLoading(true)
    try {
      const result = await loginWithPasskey(username)
      if (result.success) {
        const currentUser = result.data || await checkAuth()
        if (currentUser) {
          authLogin(currentUser)
        }
        f7.toast.create({ text: '登入成功', closeTimeout: 1500, position: 'center' }).open()
      } else {
        f7.dialog.alert(result.error || 'Passkey 登入失敗')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Passkey 登入失敗'
      if (msg.includes('not supported') || msg.includes('No credentials')) {
        f7.dialog.alert('此裝置未註冊 Passkey，請使用密碼登入')
      } else {
        f7.dialog.alert(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async () => {
    if (!username || !password) {
      f7.dialog.alert('請輸入帳號和密碼')
      return
    }
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result.success) {
        authLogin(result.data)
        f7.toast.create({ text: '登入成功', closeTimeout: 1500, position: 'center' }).open()
      } else {
        f7.dialog.alert(result.error || '登入失敗')
      }
    } catch {
      f7.dialog.alert('網路錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page noToolbar noNavbar noSwipeback loginScreen className="review-login-page">
      <div className="review-login-wrap">
        <div className="review-login-card">
          <div className="review-login-eyebrow">ZTMR Review</div>
          <LoginScreenTitle className="review-login-title">行動審核工作台</LoginScreenTitle>
          <div className="review-login-copy">
            以同一組 admin session 直接進入暫存、投稿、FanArt 整理、Group 修復與通知設定。
          </div>
          <div className="review-meta-row" style={{ marginTop: 14 }}>
            <div className="review-chip">Passkey Ready</div>
            <div className="review-chip review-chip-soft">Shared Session</div>
          </div>
        </div>

        {checkingSession ? (
          <ReviewStateBlock
            title="檢查既有登入狀態"
            description="若瀏覽器內已有有效的 admin session，會自動帶你回到工作台。"
            tone="info"
            loading
          />
        ) : (
          <div className="review-login-card">
            <List form className="review-list">
              <ListInput
                label="帳號"
                type="text"
                value={username}
                onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
                placeholder="請輸入帳號"
              />
              {mode === 'password' && (
                <ListInput
                  label="密碼"
                  type="password"
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  placeholder="請輸入密碼"
                />
              )}
            </List>
            <Block style={{ marginTop: 16, marginBottom: 0, paddingLeft: 0, paddingRight: 0 }}>
              {mode === 'passkey' ? (
                <Button fill large preloader loading={loading} onClick={handlePasskeyLogin} iconF7="lock_shield_fill">
                  Passkey 登入
                </Button>
              ) : (
                <Button fill large preloader loading={loading} onClick={handlePasswordLogin}>
                  密碼登入
                </Button>
              )}
            </Block>
            <Block style={{ textAlign: 'center', marginBottom: 0 }}>
              {mode === 'passkey' ? (
                <Link onClick={() => { setMode('password'); setPassword('') }}>使用密碼登入</Link>
              ) : (
                <Link onClick={() => { setMode('passkey'); setPassword('') }}>使用 Passkey 登入</Link>
              )}
            </Block>
            <BlockFooter>
              {mode === 'passkey'
                ? 'Passkey 會直接調用裝置憑證，適合手機快速審核。'
                : '若裝置尚未註冊 Passkey，可先以密碼登入再回主站完成設定。'}
            </BlockFooter>
          </div>
        )}

        <div className="review-login-version">
          v{BUILD_INFO.version} ({BUILD_INFO.buildNumber}) · {new Date(BUILD_INFO.buildTime).toLocaleString()}
        </div>
      </div>
    </Page>
  )
}
