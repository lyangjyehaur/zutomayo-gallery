import { useEffect, useState } from 'react'
import { Page, LoginScreenTitle, List, ListInput, ListButton, BlockFooter, Link, f7 } from 'framework7-react'
import { login, loginWithPasskey, checkAuth } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { BUILD_INFO } from '../build-info'

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
    if (loading) return
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
    if (loading) return
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
    <Page noToolbar noNavbar noSwipeback loginScreen>
      <LoginScreenTitle>ZTMR Review</LoginScreenTitle>

      <List form>
        <ListInput
          label="帳號"
          type="text"
          value={username}
          onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
          placeholder="請輸入帳號"
          disabled={checkingSession || loading}
        />
        {mode === 'password' && (
          <ListInput
            label="密碼"
            type="password"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            placeholder="請輸入密碼"
            disabled={checkingSession || loading}
          />
        )}
      </List>

      <List inset>
        <ListButton onClick={mode === 'passkey' ? handlePasskeyLogin : handlePasswordLogin}>
          {checkingSession
            ? '檢查登入狀態...'
            : loading
              ? (mode === 'passkey' ? 'Passkey 登入中...' : '密碼登入中...')
              : (mode === 'passkey' ? 'Passkey 登入' : '密碼登入')}
        </ListButton>
      </List>

      {!checkingSession && (
        <BlockFooter style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'passkey' ? (
            <Link onClick={() => { setMode('password'); setPassword('') }}>使用密碼登入</Link>
          ) : (
            <Link onClick={() => { setMode('passkey'); setPassword('') }}>使用 Passkey 登入</Link>
          )}
        </BlockFooter>
      )}

      <BlockFooter style={{ textAlign: 'center', marginTop: 24, marginBottom: 24, padding: '0 16px' }}>
        v{BUILD_INFO.version} ({BUILD_INFO.buildNumber}) · {new Date(BUILD_INFO.buildTime).toLocaleString()}
      </BlockFooter>
    </Page>
  )
}
