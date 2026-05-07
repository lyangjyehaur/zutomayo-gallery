import { useEffect } from 'react'
import { Block, BlockTitle, Card, CardContent, CardHeader, List, ListItem, Page, Toggle, f7 } from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import Button from '../components/Button'
import ReviewStateBlock from '../components/ReviewStateBlock'
import { useAuth } from '../hooks/useAuth'
import { usePushSubscription } from '../hooks/usePushSubscription'
import { useWorkspace } from '../hooks/useWorkspace'
import { updateNotificationPreferences, type NotificationPreferences } from '../lib/api'

const DEFAULT_PREFS: NotificationPreferences = {
  staging: true,
  submission: true,
  error: true,
  crawler: true,
}

export default function SettingsPage() {
  const { user, logout, setUser } = useAuth()
  const { visitWorkspace } = useWorkspace()
  const push = usePushSubscription()
  const prefs: NotificationPreferences = user?.notification_preferences || DEFAULT_PREFS

  useEffect(() => {
    visitWorkspace('settings')
  }, [visitWorkspace])

  const handlePushSubscribe = async () => {
    const ok = await push.subscribe()
    if (ok) {
      f7.toast.create({ text: '推播已啟用', closeTimeout: 1500 }).open()
    }
  }

  const handlePushUnsubscribe = async () => {
    const ok = await push.unsubscribe()
    if (ok) {
      f7.toast.create({ text: '推播已取消', closeTimeout: 1500 }).open()
    }
  }

  const handleTogglePref = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      const result = await updateNotificationPreferences({ [key]: value })
      if (result.success && result.data) {
        setUser(result.data)
        f7.toast.create({ text: '偏好已更新', closeTimeout: 1500 }).open()
      }
    } catch {
      f7.toast.create({ text: '更新偏好失敗', closeTimeout: 2000 }).open()
    }
  }

  const handleLogout = async () => {
    await logout()
    f7.toast.create({ text: '已登出', closeTimeout: 1500 }).open()
  }

  return (
    <Page>
      <AppNavbar title="設定" subtitle="通知偏好與接管邊界" />

      <Block>
        <Card>
          <CardHeader>帳號</CardHeader>
          <CardContent>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.username || '未登入'}</div>
            <div style={{ opacity: 0.75, marginBottom: 12 }}>角色：{user?.role || 'unknown'}</div>
            <Button fill color="red" onClick={handleLogout}>登出</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>推播</CardHeader>
          <CardContent>
            {push.isUnsupported ? (
              <ReviewStateBlock
                title="此瀏覽器不支援推播"
                description="可改用支援 Service Worker 與 Push API 的瀏覽器登入 review-app。"
                tone="warning"
                compact
              />
            ) : push.isDenied ? (
              <ReviewStateBlock
                title="通知權限已被拒絕"
                description="請先到瀏覽器設定重新開啟通知權限，再回來重新訂閱。"
                tone="danger"
                compact
              />
            ) : push.isSubscribed ? (
              <Button fill color="orange" onClick={handlePushUnsubscribe}>取消推播訂閱</Button>
            ) : (
              <Button fill onClick={handlePushSubscribe} loading={push.isSubscribing}>啟用推播通知</Button>
            )}
          </CardContent>
        </Card>
      </Block>

      <BlockTitle>通知偏好</BlockTitle>
      <List inset strong>
        <ListItem title="暫存區新項目">
          <Toggle slot="after" checked={prefs.staging} onToggleChange={(checked: boolean) => handleTogglePref('staging', checked)} />
        </ListItem>
        <ListItem title="投稿送審">
          <Toggle slot="after" checked={prefs.submission} onToggleChange={(checked: boolean) => handleTogglePref('submission', checked)} />
        </ListItem>
        <ListItem title="系統異常">
          <Toggle slot="after" checked={prefs.error} onToggleChange={(checked: boolean) => handleTogglePref('error', checked)} />
        </ListItem>
        <ListItem title="爬蟲完成">
          <Toggle slot="after" checked={prefs.crawler} onToggleChange={(checked: boolean) => handleTogglePref('crawler', checked)} />
        </ListItem>
      </List>

      <BlockTitle>接管邊界</BlockTitle>
      <List inset strong>
        <ListItem
          link="/settings/boundaries/"
          title="查看接管邊界"
          subtitle="集中查看各工作區的接管範圍、限制與對應 API"
          view="#view-settings"
        />
      </List>
    </Page>
  )
}
