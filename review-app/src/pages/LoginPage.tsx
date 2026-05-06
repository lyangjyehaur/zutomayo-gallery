import { useEffect, useState } from 'react'
import { Page, Navbar, List, ListInput, Button, Block, f7 } from 'framework7-react'
import { login, checkAuth } from '../lib/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth().then((user) => {
      if (user && f7.views.main) {
        f7.views.main.router.navigate('/')
      }
    })
  }, [])

  const handleLogin = async () => {
    if (!username || !password) {
      f7.dialog.alert('Please enter username and password')
      return
    }
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result.success) {
        f7.views.main.router.navigate('/')
      } else {
        f7.dialog.alert(result.message || 'Login failed')
      }
    } catch {
      f7.dialog.alert('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page>
      <Navbar title="ZTMR Review" />
      <Block>
        <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <h1 style={{ color: '#6C5CE7', margin: 0, fontSize: '28px' }}>ZTMR</h1>
          <p style={{ color: 'rgba(232,230,240,0.5)', margin: '8px 0 0' }}>Review Dashboard</p>
        </div>
      </Block>
      <List>
        <ListInput
          label="Username"
          type="text"
          value={username}
          onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
          placeholder="Enter username"
        />
        <ListInput
          label="Password"
          type="password"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          placeholder="Enter password"
        />
      </List>
      <Block>
        <Button fill large preloader loading={loading} onClick={handleLogin} style={{ background: '#00F5D4', color: '#0a0a12' }}>
          Sign In
        </Button>
      </Block>
    </Page>
  )
}
