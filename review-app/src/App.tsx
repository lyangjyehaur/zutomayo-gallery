import { App as F7App, Block, BlockFooter, Link, List, ListItem, Panel, Popup, Sheet, Toolbar, View, Views, f7 } from 'framework7-react'
import routes from './routes'
import { AuthProvider } from './contexts/AuthProvider'
import { WorkspaceProvider } from './contexts/WorkspaceContext.tsx'
import { useAuth } from './hooks/useAuth'
import { useWorkspace } from './hooks/useWorkspace'
import ReviewStateBlock from './components/ReviewStateBlock'
import { WORKSPACE_MAP, WORKSPACES, type WorkspaceKey } from './lib/workspaces'

function AppShell() {
  const { user, loading } = useAuth()
  const { activeWorkspace, recentWorkspaces, visitWorkspace } = useWorkspace()

  const openWorkspace = (workspace: WorkspaceKey) => {
    visitWorkspace(workspace)
    f7.sheet.close('.workspace-switcher-sheet')
    f7.panel.close()
    f7.tab.show(`#${WORKSPACE_MAP[workspace].viewId}`)
  }

  if (loading) {
    return (
      <F7App name="ZTMR Review" theme="auto" darkMode="auto" routes={routes}>
        <View main>
          <div style={{ padding: '24px 16px' }}>
            <ReviewStateBlock
              title="正在準備審核工作台"
              description="確認登入狀態、恢復最近工作區與同步必要設定。"
              tone="info"
              loading
            />
          </div>
        </View>
      </F7App>
    )
  }

  if (!user) {
    return (
      <F7App name="ZTMR Review" theme="auto" darkMode="auto" routes={routes}>
        <View main url="/login/" />
      </F7App>
    )
  }

  return (
    <F7App name="ZTMR Review" theme="auto" darkMode="auto" routes={routes}>
      <Panel left cover className="review-panel">
        <View>
          <List strong inset className="review-list">
            {WORKSPACES.map((workspace) => (
              <ListItem
                key={workspace.key}
                title={workspace.title}
                subtitle={workspace.description}
                link="#"
                selected={activeWorkspace === workspace.key}
                onClick={() => openWorkspace(workspace.key)}
              />
            ))}
          </List>
          <Block strong inset className="review-panel-block">
            <div className="review-meta-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>近期工作區</div>
              <div className="review-chip review-chip-soft">{WORKSPACE_MAP[activeWorkspace].shortTitle}</div>
            </div>
            {recentWorkspaces.map((workspaceKey) => (
              <div key={workspaceKey} style={{ marginBottom: 6 }}>
                <Link onClick={() => openWorkspace(workspaceKey)}>{WORKSPACE_MAP[workspaceKey].title}</Link>
              </div>
            ))}
          </Block>
          <BlockFooter style={{ textAlign: 'center', marginBottom: 24 }}>
            `review-app` 已統一總覽、暫存、投稿、整理、修復與設定的行動審核入口。
            <div style={{ marginTop: 8 }}>
              <Link popupOpen=".workspace-brief-popup">查看工作台說明</Link>
            </div>
          </BlockFooter>
        </View>
      </Panel>

      <Sheet className="workspace-switcher-sheet review-sheet" style={{ height: 'auto' }}>
        <Toolbar>
          <div className="toolbar-inner">
            <div>快速切換工作區</div>
            <Link sheetClose>關閉</Link>
          </div>
        </Toolbar>
        <List strong inset className="review-list" style={{ marginTop: 0 }}>
          {WORKSPACES.map((workspace) => (
            <ListItem
              key={workspace.key}
              title={workspace.title}
              subtitle={workspace.description}
              link="#"
              onClick={() => openWorkspace(workspace.key)}
            />
          ))}
        </List>
        <BlockFooter style={{ textAlign: 'center', marginBottom: 20 }}>
          <Link popupOpen=".workspace-brief-popup">查看接管摘要</Link>
        </BlockFooter>
      </Sheet>

      <Popup className="workspace-brief-popup review-popup">
        <View>
          <Toolbar>
            <div className="toolbar-inner">
              <div>工作台說明</div>
              <Link popupClose>關閉</Link>
            </div>
          </Toolbar>
          <Block strong inset className="review-panel-block">
            <p style={{ marginTop: 0 }}>
              review-app 現在以一致的卡片、列表、Sheet 與狀態區塊接手審核總覽、暫存、投稿、FanArt 整理、Group 修復與設定流程。
            </p>
            <p style={{ marginBottom: 0 }}>
              與桌面 admin 仍共享同一組 session 與 API，便於在手機審核與桌面維護之間切換。
            </p>
          </Block>
        </View>
      </Popup>

      <Views tabs>
        <Toolbar bottom tabbar icons className="review-tabbar">
          <div className="toolbar-inner">
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
          </div>
        </Toolbar>
        <View id="view-home" main tab tabActive url="/home/" />
        <View id="view-staging" tab url="/staging/" />
        <View id="view-submissions" tab url="/submissions/" />
        <View id="view-fanart" tab url="/fanart/" />
        <View id="view-repair" tab url="/repair/" />
        <View id="view-settings" tab url="/settings/" />
      </Views>
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
