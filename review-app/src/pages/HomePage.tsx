import { useState, useEffect, useCallback } from 'react'
import { Page, Navbar, NavRight, Toolbar, ToolbarPane, Link, Tabs, Tab, Block, Button, Card, CardHeader, CardContent, f7 } from 'framework7-react'
import { useAuth } from '../hooks/useAuth'
import { fetchStagingProgress, fetchSubmissions } from '../lib/api'

export default function HomePage() {
  const { user, logout } = useAuth()
  const [pendingStaging, setPendingStaging] = useState(0)
  const [pendingSubmissions, setPendingSubmissions] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [stagingData, submissionsData] = await Promise.all([
        fetchStagingProgress(),
        fetchSubmissions('pending', 1, 1),
      ])
      setPendingStaging(stagingData.pending || 0)
      setPendingSubmissions(submissionsData.total || 0)
    } catch {
      // silently fail
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
