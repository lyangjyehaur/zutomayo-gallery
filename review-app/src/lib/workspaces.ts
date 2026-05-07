export type WorkspaceKey =
  | 'home'
  | 'staging'
  | 'submissions'
  | 'fanart'
  | 'repair'
  | 'settings'

export interface WorkspaceDefinition {
  key: WorkspaceKey
  title: string
  shortTitle: string
  path: string
  viewId: string
  iconIos: string
  iconMd: string
  description: string
}

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    key: 'home',
    title: '總覽',
    shortTitle: '首頁',
    path: '/home/',
    viewId: 'view-home',
    iconIos: 'f7:house_fill',
    iconMd: 'material:home',
    description: '檢視待辦、同步狀態與最近工作區',
  },
  {
    key: 'staging',
    title: '暫存區',
    shortTitle: '暫存',
    path: '/staging/',
    viewId: 'view-staging',
    iconIos: 'f7:tray_full_fill',
    iconMd: 'material:inbox',
    description: '處理 crawler 暫存資料與初步審核',
  },
  {
    key: 'fanart',
    title: 'FanArt 整理',
    shortTitle: '整理',
    path: '/fanart/',
    viewId: 'view-fanart',
    iconIos: 'f7:photo_fill_on_rectangle_fill',
    iconMd: 'material:collections',
    description: '整理審核後資料與規劃接管邊界',
  },
  {
    key: 'submissions',
    title: '投稿',
    shortTitle: '投稿',
    path: '/submissions/',
    viewId: 'view-submissions',
    iconIos: 'f7:square_stack_3d_up_fill',
    iconMd: 'material:palette',
    description: '處理使用者投稿、通過與退回',
  },
  {
    key: 'repair',
    title: 'Group 修復',
    shortTitle: '修復',
    path: '/repair/',
    viewId: 'view-repair',
    iconIos: 'f7:wrench_fill',
    iconMd: 'material:build',
    description: '盤點待修復 group 與 reparse 入口',
  },
  {
    key: 'settings',
    title: '設定',
    shortTitle: '設定',
    path: '/settings/',
    viewId: 'view-settings',
    iconIos: 'f7:gear_alt_fill',
    iconMd: 'material:settings',
    description: '通知偏好、帳號資訊與接管矩陣',
  },
]

export const WORKSPACE_MAP = Object.fromEntries(
  WORKSPACES.map((workspace) => [workspace.key, workspace]),
) as Record<WorkspaceKey, WorkspaceDefinition>
