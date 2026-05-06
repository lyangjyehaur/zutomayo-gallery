import { useState, useEffect, useCallback } from 'react'
import { Page, Navbar, NavRight, Toolbar, Link, Tabs, Tab, Block, Button, f7 } from 'framework7-react'
import { useAuth } from '../hooks/useAuth'
import { fetchStagingProgress, fetchSubmissions } from '../lib/api'

export default function HomePage() {
  const { user, loading: authLoading, isLoggedIn, logout } = useAuth()
  const [pendingStaging, setPendingStaging] = useState(0)
  const [pendingSubmissions, setPendingSubmissions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      f7.views.main.router.navigate('/login/')
    }
  }, [authLoading, isLoggedIn])

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
    if (isLoggedIn) {
      loadData()
    }
  }, [isLoggedIn, loadData])

  const handleRefresh = (done: () => void) => {
    loadData().then(() => done())
  }

  const handleLogout = async () => {
    await logout()
    f7.views.main.router.navigate('/login/')
  }

  if (authLoading) return null

  return (
    <Page ptr onPtrRefresh={handleRefresh}>
      <Navbar title="ZTMR Review">
        <NavRight>
          {user && <Link onClick={handleLogout}>{user.username}</Link>}
        </NavRight>
      </Navbar>
      <Toolbar tabbar bottom>
        <Link tabLink="#tab-home" tabLinkActive>Home</Link>
        <Link tabLink="#tab-staging">Staging</Link>
        <Link tabLink="#tab-submissions">Submissions</Link>
      </Toolbar>
      <Tabs>
        <Tab id="tab-home" tabActive>
          <Block>
            <div className="row">
              <div className="col">
                <div className="stat-card">
                  <div className="stat-number">{loading ? '...' : pendingStaging}</div>
                  <div className="stat-label">Pending Staging</div>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <div className="stat-card">
                  <div className="stat-number">{loading ? '...' : pendingSubmissions}</div>
                  <div className="stat-label">Pending Submissions</div>
                </div>
              </div>
            </div>
          </Block>
        </Tab>
        <Tab id="tab-staging">
          <Block>
            <Button fill onClick={() => f7.views.main.router.navigate('/staging/')}>
              Open Staging Review
            </Button>
          </Block>
        </Tab>
        <Tab id="tab-submissions">
          <Block>
            <Button fill onClick={() => f7.views.main.router.navigate('/submissions/')}>
              Open Submissions Review
            </Button>
          </Block>
        </Tab>
      </Tabs>
    </Page>
  )
}
