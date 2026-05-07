import { useCallback, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Link,
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
    visitWorkspace,
    setFanartFilter,
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

      <Block strong inset style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>Daily Overview</div>
            <div style={{ marginTop: 2, opacity: 0.75, fontSize: 13 }}>今天的審核工作台</div>
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
              {loading ? '正在同步總覽資料...' : `最後更新：${state.refreshedAt ? new Date(state.refreshedAt).toLocaleString() : '剛剛'}`}
            </div>
          </div>
          <Button small fill tonal onClick={() => void loadDashboard()} loading={loading}>刷新總覽</Button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Badge color="orange">pending {state.stagingPending}</Badge>
          <Badge color="blue">submissions {state.pendingSubmissions}</Badge>
          <Badge color="red">repair {state.repairTotal}</Badge>
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
      <Block strong inset style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>同步狀態：{state.syncStatus || 'idle'}</div>
            <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
              {loading ? '載入中...' : `目前進度 ${state.syncProcessed} / ${state.syncTotal || '?'}，累計抓取 ${state.totalCrawled}`}
            </div>
          </div>
          <Badge color={pendingRatio > 0.5 ? 'orange' : 'green'}>
            待審比 {loading ? '...' : `${Math.round(pendingRatio * 100)}%`}
          </Badge>
        </div>
        <div style={{ marginTop: 10 }}>
          <Progressbar progress={syncProgress} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Badge color="blue">本輪 {state.syncProcessed} / {state.syncTotal || '?'}</Badge>
          <Badge color="gray">累計抓取 {state.totalCrawled}</Badge>
        </div>
      </Block>

      <BlockTitle>工作區總覽</BlockTitle>
      <Block strong inset>
        <div style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(127, 127, 127, 0.08)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>暫存區</div>
              <div style={{ marginTop: 2, opacity: 0.75, fontSize: 13 }}>
                待審 / 已通過 {state.stagingApproved} / 已拒絕 {state.stagingRejected}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge color="orange">{loading ? '...' : state.stagingPending}</Badge>
              <Button small fill onClick={() => handleOpenWorkspace('staging', () => setStagingFilter({ status: 'pending' }))}>前往</Button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(127, 127, 127, 0.08)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>投稿審核</div>
              <div style={{ marginTop: 2, opacity: 0.75, fontSize: 13 }}>待審投稿數量</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge color="orange">{loading ? '...' : state.pendingSubmissions}</Badge>
              <Button small fill onClick={() => handleOpenWorkspace('submissions', () => setSubmissionFilter({ status: 'pending' }))}>前往</Button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(127, 127, 127, 0.08)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>FanArt 整理</div>
              <div style={{ marginTop: 2, opacity: 0.75, fontSize: 13 }}>
                未整理 {state.fanartUnorganizedGroups} / {state.fanartUnorganizedMedia}，舊資料 {state.fanartLegacyMedia}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge color="blue">{loading ? '...' : state.fanartUnorganizedGroups}</Badge>
              <Button small fill onClick={() => handleOpenWorkspace('fanart', () => setFanartFilter({ view: 'unorganized' }))}>前往</Button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(127, 127, 127, 0.08)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>Group 修復</div>
              <div style={{ marginTop: 2, opacity: 0.75, fontSize: 13 }}>
                待修復 group，最近 20 筆中 {state.repairInferable} 筆可推斷來源
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge color="red">{loading ? '...' : state.repairTotal}</Badge>
              <Button small fill onClick={() => handleOpenWorkspace('repair')}>前往</Button>
            </div>
          </div>
        </div>
      </Block>

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
