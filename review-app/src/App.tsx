import { useEffect, useRef } from 'react'
import { App as F7App, View, Views, Toolbar, ToolbarPane, Link, Page, f7ready } from 'framework7-react'
import type Framework7 from 'framework7'
import routes from './routes'
import { AuthProvider } from './contexts/AuthProvider'
import { WorkspaceProvider } from './contexts/WorkspaceContext.tsx'
import { useAuth } from './hooks/useAuth'
import { useWorkspace } from './hooks/useWorkspace'
import { WORKSPACES } from './lib/workspaces'
import LoginPage from './pages/LoginPage'

function AppShell() {
  const { user, loading } = useAuth()
  const { visitWorkspace } = useWorkspace()
  const preloaderDialogRef = useRef<Framework7['dialog']['preloader'] extends (...args: any[]) => infer R ? R | null : null>(null)

  useEffect(() => {
    let cancelled = false

    f7ready((app) => {
      if (cancelled) return

      if (loading) {
        if (!preloaderDialogRef.current) {
          preloaderDialogRef.current = app.dialog.preloader('正在準備審核工作台...')
        }
        return
      }

      if (preloaderDialogRef.current) {
        preloaderDialogRef.current.close(false)
        preloaderDialogRef.current.destroy()
        preloaderDialogRef.current = null
      }
    })

    return () => {
      cancelled = true
    }
  }, [loading])

  useEffect(() => {
    return () => {
      if (preloaderDialogRef.current) {
        preloaderDialogRef.current.close(false)
        preloaderDialogRef.current.destroy()
        preloaderDialogRef.current = null
      }
    }
  }, [])

  return (
    <F7App
      name="ZTMR Review"
      theme="auto"
      darkMode="auto"
      routes={routes}
      touch={{
        touchHighlightElements: '.navbar-left, .navbar-right, .popover, .actions-group, .searchbar input, .searchbar-disable-button, .subnavbar, .searchbar-input-wrap .autocomplete-dropdown, .messagebar-area, .notification, .toast',
      }}
    >
      {loading ? (
        <View main>
          <Page />
        </View>
      ) : !user ? (
        <View main>
          <LoginPage />
        </View>
      ) : (
        <Views tabs>
          <Toolbar bottom tabbar icons>
            <ToolbarPane>
              {WORKSPACES.map((workspace, index) => (
                <Link
                  key={workspace.key}
                  tabLink={`#${workspace.viewId}`}
                  tabLinkActive={index === 0}
                  iconIos={workspace.iconIos}
                  iconMd={workspace.iconMd}
                  text={workspace.shortTitle}
                  onClick={() => visitWorkspace(workspace.key)}
                />
              ))}
            </ToolbarPane>
          </Toolbar>
          <View id="view-home" main tab tabActive url="/home/" />
          <View id="view-staging" tab url="/staging/" />
          <View id="view-submissions" tab url="/submissions/" />
          <View id="view-fanart" tab url="/fanart/" />
          <View id="view-repair" tab url="/repair/" />
          <View id="view-settings" tab url="/settings/" />
        </Views>
      )}
    </F7App>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </AuthProvider>
  )
}
