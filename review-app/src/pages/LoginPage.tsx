import { useEffect, useState } from 'react'
import { Page, LoginScreenTitle, List, ListInput, Button, Block, BlockFooter, f7 } from 'framework7-react'
import { login, loginWithPasskey, checkAuth } from '../lib/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    checkAuth().then((user) => {
      if (user && f7.views.main) {
        f7.views.main.router.navigate('/', { reloadAll: true })
      }
    })
  }, [])

  const handlePasskeyLogin = async () => {
    if (!username) {
      f7.dialog.alert('請輸入帳號')
      return
    }
    setLoading(true)
    try {
      const result = await loginWithPasskey(username)
      if (result.success) {
        f7.views.main.router.navigate('/', { reloadAll: true })
      } else {
        f7.dialog.alert(result.error || 'Passkey 登入失敗')
      }
    } catch (err: any) {
      const msg = err?.message || 'Passkey 登入失敗'
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
        f7.views.main.router.navigate('/', { reloadAll: true })
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
      <LoginScreenTitle>ZTMR 審核</LoginScreenTitle>
      <List form>
        <ListInput
          label="帳號"
          type="text"
          value={username}
          onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
          placeholder="請輸入帳號"
        />
      </List>
      <Block>
        <Button fill large preloader loading={loading} onClick={handlePasskeyLogin} iconF7="lock_shield_fill">
          Passkey 登入
        </Button>
      </Block>
      <Block>
        <Button onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? '隱藏密碼登入' : '使用密碼登入'}
        </Button>
      </Block>
      {showPassword && (
        <List form>
          <ListInput
            label="密碼"
            type="password"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            placeholder="請輸入密碼"
          />
        </List>
      )}
      {showPassword && (
        <Block>
          <Button fill large preloader loading={loading} onClick={handlePasswordLogin}>
            密碼登入
          </Button>
        </Block>
      )}
      <BlockFooter>
        Passkey 登入更安全便捷，推薦優先使用
      </BlockFooter>
    </Page>
  )
}
