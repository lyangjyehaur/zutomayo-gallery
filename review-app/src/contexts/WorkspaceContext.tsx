import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { WorkspaceContext, type WorkspaceContextValue, type WorkspaceFilters, type WorkspaceState } from './WorkspaceContext'
import type { WorkspaceKey } from '../lib/workspaces'

const STORAGE_KEY = 'ztmr-review-workspace'

const DEFAULT_STATE: WorkspaceState = {
  activeWorkspace: 'home',
  recentWorkspaces: ['home'],
  filters: {
    staging: { status: 'pending', query: '' },
    submissions: { status: 'pending', query: '' },
    fanart: { view: 'unorganized', query: '', focus: '', focusKind: 'tag' },
    repair: { onlyInferable: false, query: '' },
  },
}

const readStoredState = (): WorkspaceState => {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE

    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    return {
      activeWorkspace: parsed.activeWorkspace || DEFAULT_STATE.activeWorkspace,
      recentWorkspaces:
        parsed.recentWorkspaces && parsed.recentWorkspaces.length > 0
          ? parsed.recentWorkspaces.slice(0, 6)
          : DEFAULT_STATE.recentWorkspaces,
      filters: {
        staging: {
          ...DEFAULT_STATE.filters.staging,
          ...parsed.filters?.staging,
        },
        submissions: {
          ...DEFAULT_STATE.filters.submissions,
          ...parsed.filters?.submissions,
        },
        fanart: {
          ...DEFAULT_STATE.filters.fanart,
          ...parsed.filters?.fanart,
        },
        repair: {
          ...DEFAULT_STATE.filters.repair,
          ...parsed.filters?.repair,
        },
      },
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(readStoredState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const visitWorkspace = useCallback((workspace: WorkspaceKey) => {
    setState((prev) => ({
      ...prev,
      activeWorkspace: workspace,
      recentWorkspaces: [workspace, ...prev.recentWorkspaces.filter((item) => item !== workspace)].slice(0, 6),
    }))
  }, [])

  const setStagingFilter = useCallback((filter: Partial<WorkspaceFilters['staging']>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        staging: {
          ...prev.filters.staging,
          ...filter,
        },
      },
    }))
  }, [])

  const setSubmissionFilter = useCallback((filter: Partial<WorkspaceFilters['submissions']>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        submissions: {
          ...prev.filters.submissions,
          ...filter,
        },
      },
    }))
  }, [])

  const setFanartFilter = useCallback((filter: Partial<WorkspaceFilters['fanart']>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        fanart: {
          ...prev.filters.fanart,
          ...filter,
        },
      },
    }))
  }, [])

  const setRepairFilter = useCallback((filter: Partial<WorkspaceFilters['repair']>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        repair: {
          ...prev.filters.repair,
          ...filter,
        },
      },
    }))
  }, [])

  const value = useMemo<WorkspaceContextValue>(() => ({
    ...state,
    visitWorkspace,
    setStagingFilter,
    setSubmissionFilter,
    setFanartFilter,
    setRepairFilter,
  }), [setFanartFilter, setRepairFilter, setStagingFilter, setSubmissionFilter, state, visitWorkspace])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
