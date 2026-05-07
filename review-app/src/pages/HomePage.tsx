import { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Card,
  CardContent,
  CardHeader,
  Gauge,
  Link,
  List,
  ListItem,
  Page,
  Progressbar,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import Button from '../components/Button'
import ReviewStateBlock from '../components/ReviewStateBlock'
import { useAuth } from '../hooks/useAuth'
import { useWorkspace } from '../hooks/useWorkspace'
import { fetchFanartOverview, fetchRepairOverview, fetchStagingProgress, fetchSubmissions } from '../lib/api'
import { WORKSPACE_MAP, type WorkspaceKey } from '../lib/workspaces'

interface DashboardState {
  pendingSubmissions: number
  stagingPending: number
  stagingApproved: number
  stagingRejected: number
  syncStatus: string
  syncProcessed: number
  syncTotal: number
  totalCrawled: number
  fanartUnorganizedGroups: number
  fanartUnorganizedMedia: number
  fanartDeletedGroups: number
  fanartLegacyMedia: number
  repairTotal: number
  repairInferable: number
  refreshedAt: string
}

const EMPTY_STATE: DashboardState = {
  pendingSubmissions: 0,
  stagingPending: 0,
  stagingApproved: 0,
  stagingRejected: 0,
  syncStatus: 'idle',
  syncProcessed: 0,
  syncTotal: 0,
  totalCrawled: 0,
  fanartUnorganizedGroups: 0,
  fanartUnorganizedMedia: 0,
  fanartDeletedGroups: 0,
  fanartLegacyMedia: 0,
  repairTotal: 0,
  repairInferable: 0,
  refreshedAt: '',
}

export default function HomePage() {
  const { user } = useAuth()
  const {
    recentWorkspaces,
    visitWorkspace,
    setFanartFilter,
    setRepairFilter,
    setStagingFilter,
    setSubmissionFilter,
  } = useWorkspace()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [state, setState] = useState<DashboardState>(EMPTY_STATE)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [stagingData, submissionsData, fanartData, repairData] = await Promise.all([
        fetchStagingProgress(),
        fetchSubmissions('pending', 1, 1),
        fetchFanartOverview(),
        fetchRepairOverview(),
      ])

      const statusCounts = stagingData.data?.statusCounts
      const syncProgress = stagingData.data?.syncProgress

      setState({
        pendingSubmissions: submissionsData.meta?.total || 0,
        stagingPending: statusCounts?.pending || 0,
        stagingApproved: statusCounts?.approved || 0,
        stagingRejected: statusCounts?.rejected || 0,
        syncStatus: syncProgress?.status || 'idle',
        syncProcessed: syncProgress?.current_run_processed || 0,
        syncTotal: syncProgress?.current_run_total || 0,
        totalCrawled: syncProgress?.total_crawled || 0,
        fanartUnorganizedGroups: fanartData.unorganizedGroups,
        fanartUnorganizedMedia: fanartData.unorganizedMedia,
        fanartDeletedGroups: fanartData.deletedGroups,
        fanartLegacyMedia: fanartData.legacyMedia,
        repairTotal: repairData.total,
        repairInferable: repairData.inferableCount,
        refreshedAt: new Date().toISOString(),
      })
    } catch {
      setError('目前無法同步總覽資料，請確認 API 可連線後重新整理。')
      f7.toast.create({ text: '載入總覽失敗', closeTimeout: 2000 }).open()
    } finally {
      setLoading(false)
    }
  }, [])

  const totalStaging = state.stagingPending + state.stagingApproved + state.stagingRejected
  const pendingRatio = totalStaging > 0 ? state.stagingPending / totalStaging : 0
  const syncProgress = state.syncTotal > 0 ? (state.syncProcessed / state.syncTotal) * 100 : 0

  const quickActions = useMemo(() => ([
    {
      title: '處理待審暫存',
      description: `目前 ${state.stagingPending} 筆待處理`,
      workspace: 'staging' as WorkspaceKey,
      onBeforeOpen: () => setStagingFilter({ status: 'pending' }),
    },
    {
      title: '查看投稿待辦',
      description: `目前 ${state.pendingSubmissions} 筆待處理`,
      workspace: 'submissions' as WorkspaceKey,
      onBeforeOpen: () => setSubmissionFilter({ status: 'pending' }),
    },
    {
      title: '整理未歸檔 FanArt',
      description: `${state.fanartUnorganizedGroups} 個 group / ${state.fanartUnorganizedMedia} 筆 media`,
      workspace: 'fanart' as WorkspaceKey,
      onBeforeOpen: () => setFanartFilter({ view: 'unorganized' }),
    },
    {
      title: '盤點待修復 group',
      description: `${state.repairTotal} 筆待修復，${state.repairInferable} 筆可先推斷來源`,
      workspace: 'repair' as WorkspaceKey,
      onBeforeOpen: () => setRepairFilter({ onlyInferable: false }),
    },
  ]), [
    setFanartFilter,
    setRepairFilter,
    setStagingFilter,
    setSubmissionFilter,
    state.fanartUnorganizedGroups,
    state.fanartUnorganizedMedia,
    state.pendingSubmissions,
    state.repairInferable,
    state.repairTotal,
    state.stagingPending,
  ])

  const recentWorkspaceItems = recentWorkspaces
    .map((key) => WORKSPACE_MAP[key])
    .filter((workspace) => workspace.key !== 'home')

  const handleOpenWorkspace = (workspace: WorkspaceKey, beforeOpen?: () => void) => {
    beforeOpen?.()
    visitWorkspace(workspace)
    f7.tab.show(`#${WORKSPACE_MAP[workspace].viewId}`)
  }

  return (
    <Page
      ptr
      onPtrRefresh={(done) => { loadDashboard().finally(done) }}
      onPageBeforeIn={() => {
        visitWorkspace('home')
        if (loading && !state.refreshedAt) {
          void loadDashboard()
        }
      }}
    >
      <AppNavbar title="審核總覽" subtitle={user ? `Hi, ${user.username}` : '工作台首頁'} />

      <Block strong inset>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div>Daily Overview</div>
            <div>今天的審核工作台</div>
            <div style={{ marginTop: 8 }}>
              {loading ? '正在同步總覽資料...' : `最後更新：${state.refreshedAt ? new Date(state.refreshedAt).toLocaleString() : '剛剛'}`}
            </div>
          </div>
          <Button fill tonal onClick={() => void loadDashboard()} loading={loading}>刷新總覽</Button>
        </div>
        <div style={{ marginTop: 14 }}>
          <div>pending {state.stagingPending}</div>
          <div>submissions {state.pendingSubmissions}</div>
          <div>repair {state.repairTotal}</div>
        </div>
      </Block>

      {error && !loading && (
        <ReviewStateBlock
          title="總覽同步失敗"
          description={error}
          tone="danger"
          actionText="重新載入"
          onAction={() => void loadDashboard()}
        />
      )}

      <BlockTitle>同步與待辦</BlockTitle>
      <Block strong inset>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Gauge
              type="circle"
              value={pendingRatio}
              size={152}
              borderBgColor="#dfe4ea"
              borderColor="var(--f7-theme-color)"
              valueText={loading ? '...' : `${Math.round(pendingRatio * 100)}%`}
              valueTextColor="var(--f7-theme-color)"
              labelText="暫存待審比例"
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>同步狀態：{state.syncStatus || 'idle'}</div>
            <Progressbar progress={syncProgress} />
            <div style={{ marginTop: 8, opacity: 0.75 }}>
              {loading ? '載入中...' : `目前進度 ${state.syncProcessed} / ${state.syncTotal || '?'}，累計抓取 ${state.totalCrawled}`}
            </div>
          </div>
        </div>
      </Block>

      <BlockTitle>工作區總覽</BlockTitle>
      <Block>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div>
            <Card>
              <CardHeader>暫存區</CardHeader>
              <CardContent>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{loading ? '...' : state.stagingPending}</div>
                <div style={{ opacity: 0.75, marginBottom: 12 }}>待審 / 已通過 {state.stagingApproved} / 已拒絕 {state.stagingRejected}</div>
                <Button small fill onClick={() => handleOpenWorkspace('staging', () => setStagingFilter({ status: 'pending' }))}>前往暫存區</Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>投稿審核</CardHeader>
              <CardContent>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{loading ? '...' : state.pendingSubmissions}</div>
                <div style={{ opacity: 0.75, marginBottom: 12 }}>待審投稿數量</div>
                <Button small fill onClick={() => handleOpenWorkspace('submissions', () => setSubmissionFilter({ status: 'pending' }))}>前往投稿</Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>FanArt 整理</CardHeader>
              <CardContent>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : `${state.fanartUnorganizedGroups} / ${state.fanartUnorganizedMedia}`}</div>
                <div style={{ opacity: 0.75, marginBottom: 12 }}>未整理 group / media，另有 {state.fanartLegacyMedia} 筆舊資料</div>
                <Button small fill onClick={() => handleOpenWorkspace('fanart', () => setFanartFilter({ view: 'unorganized' }))}>前往整理</Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>Group 修復</CardHeader>
              <CardContent>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{loading ? '...' : state.repairTotal}</div>
                <div style={{ opacity: 0.75, marginBottom: 12 }}>待修復 group，最近 20 筆中 {state.repairInferable} 筆可推斷來源</div>
                <Button small fill onClick={() => handleOpenWorkspace('repair')}>前往修復</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Block>

      <BlockTitle>快捷入口</BlockTitle>
      <List inset strong>
        {quickActions.map((item) => (
          <ListItem
            key={item.title}
            title={item.title}
            text={item.description}
            after="前往"
            link
            onClick={() => handleOpenWorkspace(item.workspace, item.onBeforeOpen)}
          />
        ))}
      </List>

      <BlockTitle>最近工作區</BlockTitle>
      {recentWorkspaceItems.length > 0 ? (
        <List inset strong>
          {recentWorkspaceItems.map((workspace) => (
            <ListItem
              key={workspace.key}
              title={workspace.title}
              text={workspace.description}
              link
              onClick={() => handleOpenWorkspace(workspace.key)}
            >
              <Badge slot="after" color="blue">最近</Badge>
            </ListItem>
          ))}
        </List>
      ) : (
        <ReviewStateBlock
          title="尚未累積近期工作區"
          description="先從快捷入口或底部 tab 開始，系統會自動記住最近切換的工作區。"
          tone="neutral"
          compact
        />
      )}

      <BlockTitle>接管邊界摘要</BlockTitle>
      <Block strong inset>
        <p style={{ marginTop: 0 }}>
          `review-app` 現在提供一致的首頁摘要、暫存審核、投稿審核、FanArt 整理、Group 修復與設定入口，讓手機操作也能完整掌握工作流。
        </p>
        <Link onClick={() => handleOpenWorkspace('settings')}>查看完整頁面 / API 對照</Link>
      </Block>
    </Page>
  )
}
