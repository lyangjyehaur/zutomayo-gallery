import { createContext } from 'react'
import type { WorkspaceKey } from '../lib/workspaces'

export type StagingStatus = 'pending' | 'approved' | 'rejected'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type FanartView = 'unorganized' | 'deleted' | 'legacy' | 'organized' | 'parse'
export type FanartFocusKind = 'tag' | 'mv'

export interface WorkspaceFilters {
  staging: { status: StagingStatus; query: string }
  submissions: { status: SubmissionStatus; query: string }
  fanart: { view: FanartView; query: string; focus: string; focusKind: FanartFocusKind }
  repair: { onlyInferable: boolean; query: string; showAll: boolean }
}

export interface PaginationState {
  infiniteLoading: boolean
  currentPage: number
}

export interface WorkspaceState {
  activeWorkspace: WorkspaceKey
  recentWorkspaces: WorkspaceKey[]
  filters: WorkspaceFilters
  pagination: PaginationState
}

export interface WorkspaceContextValue extends WorkspaceState {
  visitWorkspace: (workspace: WorkspaceKey) => void
  setStagingFilter: (filter: Partial<WorkspaceFilters['staging']>) => void
  setSubmissionFilter: (filter: Partial<WorkspaceFilters['submissions']>) => void
  setFanartFilter: (filter: Partial<WorkspaceFilters['fanart']>) => void
  setRepairFilter: (filter: Partial<WorkspaceFilters['repair']>) => void
  setPagination: (state: Partial<PaginationState>) => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
