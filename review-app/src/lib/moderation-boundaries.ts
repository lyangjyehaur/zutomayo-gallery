import type { WorkspaceKey } from './workspaces'

export interface ModerationBoundary {
  workspace: WorkspaceKey
  sourcePage: string
  sourceRoute: string
  apiScopes: string[]
  ownership: 'review-app 直接接管' | 'review-app 先接入口' | '保留桌面 admin 兼容'
  directCoverage: string[]
  desktopFallbacks: string[]
  knownLimitations: string[]
  notes: string
}

export const MODERATION_BOUNDARIES: ModerationBoundary[] = [
  {
    workspace: 'staging',
    sourcePage: 'AdminStagingFanartPage',
    sourceRoute: '/admin/staging-fanarts',
    apiScopes: [
      'GET /staging-fanarts',
      'GET /staging-fanarts/progress',
      'POST /staging-fanarts/:id/approve',
      'POST /staging-fanarts/:id/reject',
      'POST /staging-fanarts/:id/restore',
      'GET /mvs',
    ],
    ownership: 'review-app 直接接管',
    directCoverage: [
      'pending / approved / rejected 視圖切換與搜尋',
      '單筆 approve / reject / restore 與詳情 push view',
      '批次核准、批次拒絕、批次還原與 MV / Tag 關聯',
      'crawler trigger、同步進度與列表刷新',
    ],
    desktopFallbacks: [],
    knownLimitations: [
      '列表以行動端卡片與單欄瀏覽為主，不以桌面型高密度表格呈現。',
      '需要同時展開多筆詳情做並排比對時，桌面 admin 仍較適合。',
    ],
    notes: '核心暫存審核鏈路已完整可在 review-app 完成，目前沒有明確功能缺口，差異主要在桌面資訊密度。',
  },
  {
    workspace: 'submissions',
    sourcePage: 'AdminSubmissionsPage',
    sourceRoute: '/admin/submissions',
    apiScopes: [
      'GET /admin/submissions',
      'POST /admin/submissions/:id/approve',
      'POST /admin/submissions/:id/reject',
    ],
    ownership: 'review-app 直接接管',
    directCoverage: [
      'pending / approved / rejected 視圖切換、搜尋與統計',
      '投稿詳情 Popup，含媒體預覽、作者資訊、MV / Tag / 留言',
      '通過操作與需填原因的退回 Sheet',
    ],
    desktopFallbacks: [],
    knownLimitations: [
      '退回原因改以 Sheet 集中編輯，而非桌面版逐列 inline 輸入。',
      '若要長時間比對多筆投稿內容與附件，桌面 admin 仍較適合。',
    ],
    notes: '投稿審核核心 API 與流程已由 review-app 直接承接，差異主要是互動形式改為較適合手機的 Sheet / Popup。',
  },
  {
    workspace: 'fanart',
    sourcePage: 'AdminFanArtPage',
    sourceRoute: '/admin/fanart',
    apiScopes: [
      'GET /fanarts/unorganized',
      'GET /fanarts/deleted',
      'GET /fanarts/legacy',
      'GET /fanarts/tag-summary',
      'GET /fanarts/gallery',
      'POST /fanarts/media/:id/assign',
      'POST /fanarts/media/:id/sync',
      'POST /fanarts/:id/status',
      'POST /mvs/twitter-resolve',
    ],
    ownership: 'review-app 直接接管',
    directCoverage: [
      '未整理、已丟棄、舊資料、已組織、手動解析五種主視圖',
      'assign、sync、discard、restore 與 parse-save 流程',
      '依特殊 Tag / MV 切入已組織資料並更新關聯',
    ],
    desktopFallbacks: [],
    knownLimitations: [
      '清單優先最佳化單筆操作與觸控瀏覽，不追求桌面版一次顯示大量縮圖的密集盤點節奏。',
      '手動解析與已組織關聯調整都可完成，但長時間大批量整理仍較建議搭配桌面 admin。',
    ],
    notes: 'FanArt 整理主流程已完整接管，未再停留在「只接入口」階段；保留桌面 admin 主要是因為大量視覺比對時的效率差異。',
  },
  {
    workspace: 'repair',
    sourcePage: 'AdminMediaGroupRepairPage',
    sourceRoute: '/admin/system/group-repair',
    apiScopes: [
      'GET /system/media/groups/repair',
      'PUT /system/media/groups/:id',
      'POST /system/media/groups/:id/merge',
      'POST /system/media/groups/:id/unassign',
      'POST /system/media/groups/reparse-twitter/preview',
      'POST /system/media/groups/reparse-twitter/apply',
    ],
    ownership: 'review-app 直接接管',
    directCoverage: [
      'repair 清單搜尋、分頁、來源推斷與 only inferable 過濾',
      '補 source_url、edit、merge、unassign',
      '單筆 / 批次 reparse preview 與 apply',
    ],
    desktopFallbacks: [],
    knownLimitations: [
      'target group 搜尋、merge 與 edit 改為行動端 Sheet / Popup 流程，鍵盤密集操作效率不如桌面。',
      '大量結果交叉比對、長時間修復與多視窗排查時，桌面 admin 仍較適合。',
    ],
    notes: 'Group 修復核心流程已由 review-app 承接，桌面 admin 主要保留作為高密度排查與鍵盤密集作業的備援入口。',
  },
]
