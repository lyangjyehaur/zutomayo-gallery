import { useState, useEffect, useCallback } from 'react'
import { Page, Navbar, NavRight, Toolbar, ToolbarPane, Link, Tabs, Tab, Block, Button, Card, CardHeader, CardContent, List, ListItem, Toggle, f7 } from 'framework7-react'
import { useAuth } from '../hooks/useAuth'
import { usePushSubscription } from '../hooks/usePushSubscription'
import { fetchStagingProgress, fetchSubmissions, updateNotificationPreferences, type NotificationPreferences } from '../lib/api'

const DEFAULT_PREFS: NotificationPreferences = {
  staging: true,
  submission: true,
  error: true,
  crawler: true,
}

export default function HomePage() {
  const { user, logout, setUser } = useAuth()
  const push = usePushSubscription()
  const [pendingStaging, setPendingStaging] = useState(0)
  const [pendingSubmissions, setPendingSubmissions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    user?.notification_preferences || DEFAULT_PREFS
  )

  useEffect(() => {
    if (user?.notification_preferences) {
      setPrefs(user.notification_preferences)
    }
  }, [user?.notification_preferences])

  const loadData = useCallback(async () => {
    try {
      const [stagingData, submissionsData] = await Promise.all([
        fetchStagingProgress(),
        fetchSubmissions('pending', 1, 1),
      ])
      setPendingStaging(stagingData.pending || 0)
      setPendingSubmissions(submissionsData.total || 0)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleLogout = async () => {
    await logout()
    f7.views.main.router.navigate('/login/', { reloadAll: true })
  }

  const handleTogglePref = async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      const result = await updateNotificationPreferences({ [key]: value })
      if (result.success && result.data) {
        setUser(result.data)
      }
    } catch {}
  }

  return (
    <Page pageContent={false}>
      <Navbar title="ZTMR 審核">
        <NavRight>
          {user && <Link onClick={handleLogout}>{user.username}</Link>}
        </NavRight>
      </Navbar>
      <Toolbar tabbar icons position="bottom">
        <ToolbarPane>
          <Link tabLink="#tab-home" tabLinkActive text="首頁" iconIos="f7:house_fill" iconMd="material:home" />
          <Link tabLink="#tab-staging" text="暫存區" iconIos="f7:tray_full_fill" iconMd="material:inbox" />
          <Link tabLink="#tab-submissions" text="投稿" iconIos="f7:paintbrush_fill" iconMd="material:palette" />
        </ToolbarPane>
      </Toolbar>
      <Tabs>
        <Tab id="tab-home" className="page-content" tabActive>
          <Block>
            <Card>
              <CardHeader>待審暫存</CardHeader>
              <CardContent style={{ fontSize: '32px', fontWeight: 700 }}>
                {loading ? '...' : pendingStaging}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>待審投稿</CardHeader>
              <CardContent style={{ fontSize: '32px', fontWeight: 700 }}>
                {loading ? '...' : pendingSubmissions}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>推播通知</CardHeader>
              <CardContent>
                {push.isUnsupported ? (
                  <p style={{ margin: 0, opacity: 0.5 }}>此瀏覽器不支援推播</p>
                ) : push.isDenied ? (
                  <p style={{ margin: 0, color: 'var(--f7-theme-color)' }}>通知權限已被拒絕，請在瀏覽器設定中啟用</p>
                ) : push.isSubscribed ? (
                  <Button fill color="red" onClick={push.unsubscribe}>
                    取消推播訂閱
                  </Button>
                ) : (
                  <Button fill onClick={push.subscribe} loading={push.isSubscribing}>
                    啟用推播通知
                  </Button>
                )}
                {push.error && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--f7-theme-color)' }}>{push.error}</p>
                )}
              </CardContent>
            </Card>
            {push.isSubscribed && (
              <Card>
                <CardHeader>通知類型</CardHeader>
                <CardContent style={{ padding: 0 }}>
                  <List style={{ margin: 0 }}>
                    <ListItem title="暫存區新項目">
                      <Toggle slot="after" checked={prefs.staging} onToggleChange={(e: any) => handleTogglePref('staging', e)} />
                    </ListItem>
                    <ListItem title="投稿送審">
                      <Toggle slot="after" checked={prefs.submission} onToggleChange={(e: any) => handleTogglePref('submission', e)} />
                    </ListItem>
                    <ListItem title="系統異常">
                      <Toggle slot="after" checked={prefs.error} onToggleChange={(e: any) => handleTogglePref('error', e)} />
                    </ListItem>
                    <ListItem title="爬蟲完成">
                      <Toggle slot="after" checked={prefs.crawler} onToggleChange={(e: any) => handleTogglePref('crawler', e)} />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            )}
          </Block>
        </Tab>
        <Tab id="tab-staging" className="page-content">
          <Block>
            <Button fill onClick={() => f7.views.main.router.navigate('/staging/')}>
              開啟暫存審核
            </Button>
          </Block>
        </Tab>
        <Tab id="tab-submissions" className="page-content">
          <Block>
            <Button fill onClick={() => f7.views.main.router.navigate('/submissions/')}>
              開啟投稿審核
            </Button>
          </Block>
        </Tab>
      </Tabs>
    </Page>
  )
}
