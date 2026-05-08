import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Checkbox,
  Chip,
  Link,
  List,
  ListInput,
  ListItem,
  Page,
  Searchbar,
  Sheet,
  SwipeoutActions,
  SwipeoutButton,
  Toolbar,
  ToolbarPane,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import Button from '../components/Button'
import MvSheet from '../components/MvSheet'
import ReviewStateBlock from '../components/ReviewStateBlock'
import ReviewSummaryPanel from '../components/ReviewSummaryPanel'
import Segmented from '../components/Segmented'
import ReviewToolbarCard from '../components/ReviewToolbarCard'
import { useWorkspace } from '../hooks/useWorkspace'
import { preferTwimgUrl } from '../lib/media'
import {
  assignFanartMedia,
  fetchDeletedFanarts,
  fetchFanartGallery,
  fetchFanartOverview,
  fetchLegacyFanarts,
  fetchMvs,
  fetchUnorganizedFanarts,
  resolveTwitterMedia,
  syncFanartMedia,
  updateFanartGroupStatus,
  updateMvsPartial,
  type FanartGroup,
  type FanartMedia,
  type MV,
  type ResolvedTwitterMedia,
} from '../lib/api'

const TAG_LABELS: Record<string, string> = {
  'tag:collab': '綜合合繪',
  'tag:acane': 'ACAね',
  'tag:real': '實物',
  'tag:uniguri': '海膽栗子/生薑',
  'tag:other': '其他',
}

interface FanartOverviewState {
  unorganizedGroups: number
  unorganizedMedia: number
  deletedGroups: number
  legacyMedia: number
  tagBuckets: number
  tagSummary: Record<string, number>
}

interface ParsedFanartItem {
  id: string
  url: string
  thumbnail: string | null
  tweetUrl: string
  tweetText: string
  tweetAuthor: string
  tweetHandle: string
  tweetDate: string
  hashtags: string[]
  type: string
}

interface FanartRouter {
  navigate: (url: string, options?: { props?: Record<string, unknown> }) => void
  back: () => void
}

interface FanartPageProps {
  f7router?: FanartRouter
}

const EMPTY_STATE: FanartOverviewState = {
  unorganizedGroups: 0,
  unorganizedMedia: 0,
  deletedGroups: 0,
  legacyMedia: 0,
  tagBuckets: 0,
  tagSummary: {},
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '未提供'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const formatCompactDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const formatTagLabel = (tag: string) => TAG_LABELS[tag] || tag.replace(/^tag:/, '')

const getMediaPreview = (media?: FanartMedia | null) => {
  if (!media) return ''
  if (media.media_type === 'video') {
    return preferTwimgUrl(media.thumbnail_url, media.original_url, media.url)
  }
  return preferTwimgUrl(media.original_url, media.url, media.thumbnail_url)
}

const buildMediaSearchText = (media: FanartMedia) => {
  return [
    media.id,
    media.url,
    media.original_url,
    media.thumbnail_url,
    media.group?.source_url,
    media.group?.source_text,
    media.group?.author_name,
    media.group?.author_handle,
    (media.tags || []).join(' '),
    (media.mvs || []).map((mv) => mv.title).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const buildGroupSearchText = (group: FanartGroup) => {
  const mediaText = Array.isArray(group.media)
    ? group.media
      .flatMap((media) => [media.id, media.url, media.original_url, media.thumbnail_url, (media.tags || []).join(' ')])
      .filter(Boolean)
      .join(' ')
    : ''

  return [
    group.id,
    group.source_url,
    group.source_text,
    group.author_name,
    group.author_handle,
    mediaText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const flattenUnorganizedMedia = (groups: FanartGroup[]) => {
  return groups.flatMap((group) =>
    (Array.isArray(group.media) ? group.media : []).map((media) => ({
      ...media,
      group: {
        id: group.id,
        source_url: group.source_url,
        source_text: group.source_text,
        author_name: group.author_name,
        author_handle: group.author_handle,
        post_date: group.post_date,
        status: group.status,
        like_count: group.like_count,
        retweet_count: group.retweet_count,
        view_count: group.view_count,
        hashtags: group.hashtags,
      },
    })),
  )
}

const countMvFanarts = (mv: MV) => {
  return (mv.images || []).filter((image) => image.type === 'fanart' && image.usage !== 'cover').length
}

const transformResolvedMedia = (url: string, item: ResolvedTwitterMedia, index: number): ParsedFanartItem => ({
  id: `${url}-${index}-${item.url}`,
  url: item.url,
  thumbnail: item.thumbnail || item.thumbnail_url || null,
  tweetUrl: url,
  tweetText: item.text || '',
  tweetAuthor: item.user_name || '',
  tweetHandle: item.user_screen_name || '',
  tweetDate: item.date || '',
  hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
  type: item.type || 'image',
})

export default function FanartPage({ f7router }: FanartPageProps) {
  const { filters, setFanartFilter, visitWorkspace } = useWorkspace()
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [overview, setOverview] = useState<FanartOverviewState>(EMPTY_STATE)
  const [mvs, setMvs] = useState<MV[]>([])
  const [unorganizedGroups, setUnorganizedGroups] = useState<FanartGroup[]>([])
  const [deletedGroups, setDeletedGroups] = useState<FanartGroup[]>([])
  const [legacyMedia, setLegacyMedia] = useState<FanartMedia[]>([])
  const [organizedMedia, setOrganizedMedia] = useState<FanartMedia[]>([])
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const [mvSheetMode, setMvSheetMode] = useState<'assign' | 'batch-assign' | 'update' | 'parse' | null>(null)
  const [mvSheetTarget, setMvSheetTarget] = useState<FanartMedia | null>(null)
  const [mvSheetBatchTargets, setMvSheetBatchTargets] = useState<FanartMedia[]>([])
  const [mvSheetBusy, setMvSheetBusy] = useState(false)
  const [focusSheetOpen, setFocusSheetOpen] = useState(false)
  const [focusSearch, setFocusSearch] = useState('')
  const [parseInput, setParseInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState<{ total: number; current: number; failedUrls: string[] } | null>(null)
  const [parsedItems, setParsedItems] = useState<ParsedFanartItem[]>([])

  const { view, query, focus, focusKind } = filters.fanart

  const setBusyForKeys = useCallback((keys: string[], busy: boolean) => {
    setBusyKeys((prev) => {
      const next = new Set(prev)
      keys.forEach((key) => {
        if (busy) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }, [])

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const [overviewData, mvResponse] = await Promise.all([fetchFanartOverview(), fetchMvs()])
      setOverview(overviewData)
      setMvs(Array.isArray(mvResponse.data) ? mvResponse.data : [])
    } catch {
      f7.toast.create({ text: 'FanArt 統計載入失敗', closeTimeout: 2200 }).open()
    } finally {
      setLoadingOverview(false)
    }
  }, [])

  const loadCurrentList = useCallback(async () => {
    if (view === 'parse') return
    setLoadingList(true)
    setListError('')
    try {
      if (view === 'unorganized') {
        setUnorganizedGroups(await fetchUnorganizedFanarts())
        return
      }
      if (view === 'deleted') {
        setDeletedGroups(await fetchDeletedFanarts())
        return
      }
      if (view === 'legacy') {
        setLegacyMedia(await fetchLegacyFanarts())
        return
      }
      if (!focus) {
        setOrganizedMedia([])
        return
      }
      const response = await fetchFanartGallery(
        focusKind === 'tag'
          ? { tags: [focus], all: true }
          : { mvIds: [focus], all: true },
      )
      setOrganizedMedia(Array.isArray(response.data) ? response.data : [])
    } catch {
      setListError('FanArt 清單暫時無法載入，請重新整理或切換其他視圖。')
      f7.toast.create({ text: 'FanArt 清單載入失敗', closeTimeout: 2200 }).open()
    } finally {
      setLoadingList(false)
    }
  }, [focus, focusKind, view])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadCurrentList()])
  }, [loadCurrentList, loadOverview])

  useEffect(() => {
    visitWorkspace('fanart')
  }, [visitWorkspace])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOverview])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurrentList()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadCurrentList])

  const tagOptions = useMemo(() => {
    return Object.entries(overview.tagSummary).sort((a, b) => b[1] - a[1])
  }, [overview.tagSummary])

  useEffect(() => {
    if (view !== 'organized' || focus) return
    const firstTag = tagOptions.find(([, count]) => count > 0)?.[0]
    if (firstTag) {
      setFanartFilter({ focus: firstTag, focusKind: 'tag' })
      return
    }
    if (mvs[0]) {
      setFanartFilter({ focus: mvs[0].id, focusKind: 'mv' })
    }
  }, [focus, mvs, setFanartFilter, tagOptions, view])

  const unorganizedMedia = useMemo(() => flattenUnorganizedMedia(unorganizedGroups), [unorganizedGroups])

  const filteredUnorganizedMedia = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return unorganizedMedia
    return unorganizedMedia.filter((item) => buildMediaSearchText(item).includes(keyword))
  }, [query, unorganizedMedia])

  const filteredDeletedGroups = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return deletedGroups
    return deletedGroups.filter((group) => buildGroupSearchText(group).includes(keyword))
  }, [deletedGroups, query])

  const filteredLegacyMedia = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return legacyMedia
    return legacyMedia.filter((media) => buildMediaSearchText(media).includes(keyword))
  }, [legacyMedia, query])

  const filteredOrganizedMedia = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return organizedMedia
    return organizedMedia.filter((media) => buildMediaSearchText(media).includes(keyword))
  }, [organizedMedia, query])

  const selectedUnorganizedIds = useMemo(() => {
    const validIds = new Set(unorganizedMedia.map((item) => item.id))
    return new Set(Array.from(selection).filter((id) => validIds.has(id)))
  }, [selection, unorganizedMedia])
  const visibleUnorganizedIds = useMemo(() => filteredUnorganizedMedia.map((item) => item.id), [filteredUnorganizedMedia])
  const selectedUnorganizedMedia = useMemo(
    () => unorganizedMedia.filter((item) => selectedUnorganizedIds.has(item.id)),
    [selectedUnorganizedIds, unorganizedMedia],
  )
  const selectedCount = selectedUnorganizedIds.size
  const selectedVisibleCount = useMemo(
    () => visibleUnorganizedIds.filter((id) => selectedUnorganizedIds.has(id)).length,
    [selectedUnorganizedIds, visibleUnorganizedIds],
  )
  const allVisibleSelected = visibleUnorganizedIds.length > 0 && visibleUnorganizedIds.every((id) => selectedUnorganizedIds.has(id))

  const currentFocusLabel = useMemo(() => {
    if (!focus) return '未選擇'
    if (focusKind === 'tag') return formatTagLabel(focus)
    return mvs.find((mv) => mv.id === focus)?.title || focus
  }, [focus, focusKind, mvs])

  const mvFocusOptions = useMemo(() => {
    return mvs
      .map((mv) => ({ ...mv, fanartCount: countMvFanarts(mv) }))
      .filter((mv) => mv.fanartCount > 0)
  }, [mvs])

  const filteredMvFocusOptions = useMemo(() => {
    const keyword = focusSearch.trim().toLowerCase()
    if (!keyword) return mvFocusOptions
    return mvFocusOptions.filter((mv) => mv.title.toLowerCase().includes(keyword))
  }, [focusSearch, mvFocusOptions])

  const mvSheetInitialMvIds = mvSheetMode === 'update' && mvSheetTarget?.mvs
    ? mvSheetTarget.mvs.map((mv) => mv.id)
    : []
  const mvSheetInitialTags = mvSheetMode === 'update' ? (mvSheetTarget?.tags || []) : []
  const closeMvSheet = () => {
    if (mvSheetBusy) return
    setMvSheetMode(null)
    setMvSheetTarget(null)
    setMvSheetBatchTargets([])
  }

  const openAssignSheet = useCallback((media: FanartMedia) => {
    setMvSheetTarget(media)
    setMvSheetBatchTargets([])
    setMvSheetMode('assign')
  }, [])

  const openBatchAssignSheet = useCallback((items: FanartMedia[]) => {
    if (items.length === 0) return
    setMvSheetTarget(null)
    setMvSheetBatchTargets(items)
    setMvSheetMode('batch-assign')
  }, [])

  const openUpdateSheet = useCallback((media: FanartMedia) => {
    setMvSheetTarget(media)
    setMvSheetBatchTargets([])
    setMvSheetMode('update')
  }, [])

  const openParseSheet = useCallback(() => {
    setMvSheetTarget(null)
    setMvSheetBatchTargets([])
    setMvSheetMode('parse')
  }, [])

  const handleQueryInput = (value: string) => {
    setFanartFilter({ query: value })
  }

  const handleViewChange = (nextView: typeof view) => {
    if (view === nextView) return
    if (view === 'unorganized') {
      setSelection(new Set())
    }
    if (nextView === 'organized' && !focus) {
      const firstTag = tagOptions.find(([, count]) => count > 0)?.[0]
      setFanartFilter({ view: nextView, focusKind: 'tag', focus: firstTag || '' })
      return
    }
    setFanartFilter({ view: nextView })
  }

  const handleRefresh = (done: () => void) => {
    refreshAll().finally(done)
  }

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toggleSelectAllVisible = useCallback((checked: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev)
      visibleUnorganizedIds.forEach((id) => {
        if (checked) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }, [visibleUnorganizedIds])

  const requestDiscardGroup = useCallback((groupId: string, afterSuccess?: () => void) => {
    f7.dialog.confirm('確定要將此推文捨棄到已丟棄佇列嗎？', '捨棄 FanArt', () => {
      void (async () => {
        const key = `group:${groupId}`
        setBusyForKeys([key], true)
        try {
          const result = await updateFanartGroupStatus(groupId, 'deleted')
          if (!result.success) throw new Error('DISCARD_FAILED')
          await refreshAll()
          afterSuccess?.()
          f7.toast.create({ text: '已移至已丟棄', closeTimeout: 1800 }).open()
        } catch {
          f7.toast.create({ text: '捨棄失敗', closeTimeout: 2200 }).open()
        } finally {
          setBusyForKeys([key], false)
        }
      })()
    })
  }, [refreshAll, setBusyForKeys])

  const handleRestoreGroup = useCallback(async (groupId: string, afterSuccess?: () => void) => {
    const key = `group:${groupId}`
    setBusyForKeys([key], true)
    try {
      const result = await updateFanartGroupStatus(groupId, 'unorganized')
      if (!result.success) throw new Error('RESTORE_FAILED')
      await refreshAll()
      afterSuccess?.()
      f7.toast.create({ text: '已還原回未整理', closeTimeout: 1800 }).open()
    } catch {
      f7.toast.create({ text: '還原失敗', closeTimeout: 2200 }).open()
    } finally {
      setBusyForKeys([key], false)
    }
  }, [refreshAll, setBusyForKeys])

  const buildMediaDetailRouteProps = useCallback((media: FanartMedia) => {
    const currentRouter = f7router || (f7.views.get('#view-fanart')?.router as FanartRouter | undefined)
    const mediaKey = `media:${media.id}`
    const groupId = media.group?.id
    const groupKey = `group:${groupId || media.group_id || ''}`
    return {
      media,
      view,
      onAssign: view === 'unorganized' ? () => openAssignSheet(media) : undefined,
      onUpdate: view === 'organized' ? () => openUpdateSheet(media) : undefined,
      onDiscard: groupId && currentRouter ? () => requestDiscardGroup(groupId, () => currentRouter.back()) : undefined,
      mediaBusy: busyKeys.has(mediaKey),
      groupBusy: busyKeys.has(groupKey),
    }
  }, [busyKeys, f7router, openAssignSheet, openUpdateSheet, requestDiscardGroup, view])

  const buildGroupDetailRouteProps = useCallback((group: FanartGroup) => {
    const currentRouter = f7router || (f7.views.get('#view-fanart')?.router as FanartRouter | undefined)
    const groupKey = `group:${group.id}`
    return {
      group,
      onRestore: currentRouter ? () => void handleRestoreGroup(group.id, () => currentRouter.back()) : undefined,
      groupBusy: busyKeys.has(groupKey),
    }
  }, [busyKeys, f7router, handleRestoreGroup])

  const handleMvSheetConfirm = async (mvIds: string[], tags: string[]) => {
    const payload = [...mvIds, ...tags]

    if (mvSheetMode === 'assign') {
      if (!mvSheetTarget?.id || !mvSheetTarget.group?.id) return
      if (payload.length === 0) {
        f7.dialog.alert('請至少選擇一個 MV 或標籤')
        return
      }
      const mediaKey = `media:${mvSheetTarget.id}`
      f7.dialog.preloader('正在保存關聯...')
      setMvSheetBusy(true)
      setBusyForKeys([mediaKey], true)
      try {
        const result = await assignFanartMedia(mvSheetTarget.id, payload, mvSheetTarget.group.id)
        if (!result.success) throw new Error('ASSIGN_FAILED')
        closeMvSheet()
        await refreshAll()
        f7.toast.create({ text: 'MV 關聯已保存', closeTimeout: 1800 }).open()
      } catch {
        f7.toast.create({ text: '保存關聯失敗，請確認網路連線後重試', closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
        setBusyForKeys([mediaKey], false)
        f7.dialog.close()
      }
      return
    }

    if (mvSheetMode === 'batch-assign') {
      if (mvSheetBatchTargets.length === 0) return
      if (payload.length === 0) {
        f7.dialog.alert('請至少選擇一個 MV 或標籤')
        return
      }

      const mediaKeys = mvSheetBatchTargets.map((item) => `media:${item.id}`)
      const successfulIds: string[] = []
      let failCount = 0

      f7.dialog.preloader('正在批次保存關聯...')
      setMvSheetBusy(true)
      setBusyForKeys(mediaKeys, true)
      try {
        for (const item of mvSheetBatchTargets) {
          if (!item.id || !item.group?.id) {
            failCount += 1
            continue
          }
          try {
            const result = await assignFanartMedia(item.id, payload, item.group.id)
            if (!result.success) throw new Error('ASSIGN_FAILED')
            successfulIds.push(item.id)
          } catch {
            failCount += 1
          }
        }

        closeMvSheet()
        if (successfulIds.length > 0) {
          setSelection((prev) => {
            const next = new Set(prev)
            successfulIds.forEach((id) => next.delete(id))
            return next
          })
          await refreshAll()
        }

        if (failCount === 0) {
          f7.toast.create({ text: `已批次保存 ${successfulIds.length} 筆 MV 關聯`, closeTimeout: 1800 }).open()
          return
        }
        if (successfulIds.length === 0) {
          f7.toast.create({ text: '批次保存關聯失敗，請確認網路連線後重試', closeTimeout: 2200 }).open()
          return
        }
        f7.toast.create({ text: `完成 ${successfulIds.length} 筆，失敗 ${failCount} 筆`, closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
        setBusyForKeys(mediaKeys, false)
        f7.dialog.close()
      }
      return
    }

    if (mvSheetMode === 'update') {
      if (!mvSheetTarget?.id) return
      if (payload.length === 0) {
        f7.dialog.alert('請至少保留一個 MV 或標籤')
        return
      }
      const mediaKey = `media:${mvSheetTarget.id}`
      f7.dialog.preloader('正在更新關聯...')
      setMvSheetBusy(true)
      setBusyForKeys([mediaKey], true)
      try {
        const result = await syncFanartMedia(mvSheetTarget.id, payload, mvSheetTarget.group_id || mvSheetTarget.group?.id || undefined)
        if (!result.success) throw new Error('SYNC_FAILED')
        closeMvSheet()
        await refreshAll()
        f7.toast.create({ text: 'MV 關聯已更新', closeTimeout: 1800 }).open()
      } catch {
        f7.toast.create({ text: '更新關聯失敗，請確認網路連線後重試', closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
        setBusyForKeys([mediaKey], false)
        f7.dialog.close()
      }
      return
    }

    if (mvSheetMode === 'parse') {
      if (parsedItems.length === 0) {
        f7.dialog.alert('沒有待保存的解析結果')
        return
      }
      if (mvIds.length === 0) {
        f7.dialog.alert('手動解析保存時至少需要選擇一個 MV')
        return
      }

      f7.dialog.preloader('正在保存解析結果...')
      setMvSheetBusy(true)
      try {
        const imagesToSave = parsedItems.map((item) => ({
          url: item.url,
          thumbnail: item.thumbnail || '',
          tweetUrl: item.tweetUrl,
          tweetText: item.tweetText,
          tweetAuthor: item.tweetAuthor,
          tweetHandle: item.tweetHandle,
          tweetDate: item.tweetDate,
          type: 'fanart',
          width: 0,
          height: 0,
          caption: '',
          alt: '',
          tags,
        }))
        const updatedMvs = mvs
          .filter((mv) => mvIds.includes(mv.id))
          .map((mv) => ({
            ...mv,
            images: [...(mv.images || []), ...imagesToSave],
          }))
        const result = await updateMvsPartial(updatedMvs)
        if (!result.success) throw new Error('SAVE_PARSED_FAILED')
        closeMvSheet()
        setParsedItems([])
        setParseInput('')
        await loadOverview()
        if (view === 'organized' && focusKind === 'mv' && mvIds.includes(focus)) {
          await loadCurrentList()
        }
        f7.toast.create({ text: '解析結果已保存', closeTimeout: 1800 }).open()
      } catch {
        f7.toast.create({ text: '保存解析結果失敗，請確認輸入內容後重試', closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
        f7.dialog.close()
      }
    }
  }

  const handleParseTweets = async () => {
    const urls = parseInput
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    if (urls.length === 0) {
      f7.dialog.alert('請先輸入至少一個 Twitter/X 網址')
      return
    }

    setParsing(true)
    setParseProgress({ total: urls.length, current: 0, failedUrls: [] })

    const failedUrls: string[] = []
    const nextItems: ParsedFanartItem[] = []

    try {
      for (const url of urls) {
        try {
          const response = await resolveTwitterMedia(url)
          const items = Array.isArray(response.data) ? response.data : []
          if (response.success && items.length > 0) {
            items.forEach((item, index) => {
              nextItems.push(transformResolvedMedia(url, item, index))
            })
          } else {
            failedUrls.push(url)
          }
        } catch {
          failedUrls.push(url)
        } finally {
          setParseProgress((prev) => {
            if (!prev) return prev
            return {
              total: prev.total,
              current: prev.current + 1,
              failedUrls: [...failedUrls],
            }
          })
        }
      }

      if (nextItems.length > 0) {
        setParsedItems((prev) => [...prev, ...nextItems])
      }

      if (failedUrls.length === 0) {
        f7.toast.create({ text: `解析完成，共取得 ${nextItems.length} 個媒體`, closeTimeout: 1800 }).open()
      } else {
        f7.toast.create({ text: `完成，但有 ${failedUrls.length} 個連結解析失敗`, closeTimeout: 2200 }).open()
      }
    } finally {
      setParsing(false)
    }
  }

  const handlePageBeforeIn = () => {
    visitWorkspace('fanart')
    if (loadingOverview && mvs.length === 0) {
      void loadOverview()
    }
    if (!loadingList && view !== 'parse') {
      void loadCurrentList()
    }
  }

  const renderMediaList = (items: FanartMedia[], emptyText: string) => {
    if (listError && !loadingList && items.length === 0) {
      return (
        <ReviewStateBlock
          title="FanArt 清單載入失敗"
          description={listError}
          tone="danger"
          actionText="重新載入"
          onAction={() => void loadCurrentList()}
        />
      )
    }

    if (loadingList && items.length === 0) {
      return (
        <ReviewStateBlock
          title="正在同步 FanArt 清單"
          description="依照目前視圖、焦點與搜尋條件整理資料中。"
          tone="info"
          loading
        />
      )
    }

    return (
      <>
        <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
          {items.map((item) => {
            const preview = getMediaPreview(item)
            const isVideo = item.media_type === 'video' || preview.includes('.mp4')
            const displayName = item.group?.author_name || item.group?.author_handle || item.id
            const handleLabel = item.group?.author_handle ? `@${item.group.author_handle}` : ''
            const subtitle = formatCompactDateTime(item.group?.post_date)
            const mediaKey = `media:${item.id}`
            const groupKey = `group:${item.group?.id || item.group_id || ''}`
            const hasExistingLinks = (item.mvs?.length || 0) > 0 || (item.tags?.length || 0) > 0
            const isSelected = selectedUnorganizedIds.has(item.id)
            const footer = [
              item.group?.source_url,
              (item.tags || []).map((tag) => formatTagLabel(tag)).join(' / '),
            ].filter(Boolean).join(' · ')

            return (
              <ListItem
                key={item.id}
                checkbox={view === 'unorganized'}
                checked={view === 'unorganized' ? isSelected : false}
                onChange={view === 'unorganized'
                  ? (event) => toggleSelection(item.id, event.target.checked)
                  : undefined}
                swipeout={view === 'unorganized'}
              >
                <div
                  slot="title"
                  style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}
                >
                  <span>{displayName}</span>
                  {handleLabel && (
                    <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 500 }}>
                      {handleLabel}
                    </span>
                  )}
                </div>
                <div
                  slot="subtitle"
                  style={{ fontSize: 12, opacity: 0.65 }}
                >
                  {subtitle || item.id}
                </div>
                {preview && (
                  isVideo ? (
                    <video
                      slot="media"
                      src={preview}
                      muted
                      playsInline
                      style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      slot="media"
                      src={preview}
                      alt={item.group?.author_name || item.id}
                      style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                    />
                  )
                )}
                <div slot="text">
                  <div>{item.group?.source_text || '（無內文）'}</div>
                </div>
                {item.mvs && item.mvs.length > 0 && <Badge slot="after-start" color="green">{item.mvs.length}</Badge>}
                <Button
                  slot="after"
                  small
                  tonal
                  view="#view-fanart"
                  href={`/fanart/media/${encodeURIComponent(item.id)}/`}
                  routeProps={buildMediaDetailRouteProps(item)}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                >
                  詳情
                </Button>
                <div
                  slot="footer"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  {item.mvs && item.mvs.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {item.mvs.map((mv) => (
                        <Chip key={mv.id} text={mv.title} color="green" />
                      ))}
                    </div>
                  )}
                  <div>{footer || item.id}</div>
                </div>
                {view === 'unorganized' && (
                  <>
                    <SwipeoutActions left>
                      <SwipeoutButton
                        overswipe
                        color="green"
                        close
                        onClick={() => {
                          if (busyKeys.has(mediaKey)) return
                          if (hasExistingLinks) {
                            openUpdateSheet(item)
                            return
                          }
                          openAssignSheet(item)
                        }}
                      >
                        {hasExistingLinks ? '更新關聯' : '關聯'}
                      </SwipeoutButton>
                    </SwipeoutActions>
                    <SwipeoutActions right>
                      <SwipeoutButton
                        overswipe
                        color="red"
                        close
                        onClick={() => {
                          if (!item.group?.id || busyKeys.has(groupKey)) return
                          requestDiscardGroup(item.group.id)
                        }}
                      >
                        丟棄
                      </SwipeoutButton>
                    </SwipeoutActions>
                  </>
                )}
              </ListItem>
            )
          })}
        </List>
        {!loadingList && items.length === 0 && (
          <ReviewStateBlock
            title="目前沒有資料"
            description={emptyText}
            tone="neutral"
          />
        )}
      </>
    )
  }

  const renderDeletedGroups = () => {
    if (listError && !loadingList && filteredDeletedGroups.length === 0) {
      return (
        <ReviewStateBlock
          title="已丟棄清單載入失敗"
          description={listError}
          tone="danger"
          actionText="重新載入"
          onAction={() => void loadCurrentList()}
        />
      )
    }

    if (loadingList && filteredDeletedGroups.length === 0) {
      return (
        <ReviewStateBlock
          title="正在同步已丟棄清單"
          description="會保留目前搜尋條件，並重新整理已丟棄 group。"
          tone="info"
          loading
        />
      )
    }

    return (
      <>
        <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
          {filteredDeletedGroups.map((group) => {
            const cover = Array.isArray(group.media) ? group.media[0] : undefined
            const preview = getMediaPreview(cover)
            const isVideo = cover?.media_type === 'video' || preview.includes('.mp4')
            const groupKey = `group:${group.id}`
            return (
              <ListItem
                key={group.id}
                swipeout
                title={group.author_name || group.author_handle || group.id}
                subtitle={formatDateTime(group.post_date)}
                text={group.source_text || '（無推文內容）'}
              >
                {preview && (
                  isVideo ? (
                    <video
                      slot="media"
                      src={preview}
                      muted
                      playsInline
                      style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      slot="media"
                      src={preview}
                      alt={group.author_name || group.id}
                      style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                    />
                  )
                )}
                <Badge slot="after-start" color="red">{Array.isArray(group.media) ? group.media.length : 0}</Badge>
                <Button
                  slot="after"
                  small
                  tonal
                  view="#view-fanart"
                  href={`/fanart/group/${encodeURIComponent(group.id)}/`}
                  routeProps={buildGroupDetailRouteProps(group)}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                >
                  詳情
                </Button>
                <div
                  slot="footer"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  {group.source_url || group.id}
                </div>
                <SwipeoutActions left>
                  <SwipeoutButton
                    overswipe
                    color="green"
                    close
                    onClick={() => {
                      if (busyKeys.has(groupKey)) return
                      void handleRestoreGroup(group.id)
                    }}
                  >
                    還原
                  </SwipeoutButton>
                </SwipeoutActions>
              </ListItem>
            )
          })}
        </List>
        {!loadingList && filteredDeletedGroups.length > 0 && (
          <div style={{ margin: '8px 16px 12px', opacity: 0.75, fontSize: 13 }}>
            已顯示 {filteredDeletedGroups.length} 個已丟棄 group，可點進詳情直接還原。
          </div>
        )}
        {!loadingList && filteredDeletedGroups.length === 0 && (
          <ReviewStateBlock
            title="沒有符合搜尋條件的已丟棄項目"
            description="可清除搜尋字詞，或切換回未整理 / 已組織視圖。"
            tone="neutral"
            compact
          />
        )}
      </>
    )
  }

  return (
    <Page ptr onPtrRefresh={handleRefresh} onPageBeforeIn={handlePageBeforeIn}>
      <AppNavbar title="FanArt 整理" subtitle="搜尋 / 詳情 / assign / update / restore / parse" />

      <ReviewSummaryPanel
        title="FanArt 工作概況"
        description={loadingOverview ? '正在同步概況資料...' : '整理、還原、補舊資料與標籤聚焦都從這裡切入。'}
        metrics={[
          {
            label: '未整理',
            value: loadingOverview ? '...' : overview.unorganizedGroups,
            color: 'orange',
            detail: view === 'unorganized'
              ? `media ${loadingOverview ? '...' : overview.unorganizedMedia} / 已勾選 ${selectedCount}`
              : `media ${loadingOverview ? '...' : overview.unorganizedMedia}`,
          },
          {
            label: '已丟棄',
            value: loadingOverview ? '...' : overview.deletedGroups,
            color: 'red',
            detail: '可從詳情直接還原',
          },
          {
            label: '舊資料',
            value: loadingOverview ? '...' : overview.legacyMedia,
            color: 'blue',
            detail: '缺 group 或缺來源',
          },
          {
            label: '特殊標籤',
            value: loadingOverview ? '...' : overview.tagBuckets,
            color: 'green',
            detail: '可切入 organized 視圖',
          },
        ]}
      />

      <Block>
        <Segmented strong>
          <Button active={view === 'unorganized'} onClick={() => handleViewChange('unorganized')}>未整理</Button>
          <Button active={view === 'deleted'} onClick={() => handleViewChange('deleted')}>已丟棄</Button>
          <Button active={view === 'legacy'} onClick={() => handleViewChange('legacy')}>舊資料</Button>
          <Button active={view === 'organized'} onClick={() => handleViewChange('organized')}>已組織</Button>
          <Button active={view === 'parse'} onClick={() => handleViewChange('parse')}>手動解析</Button>
        </Segmented>
      </Block>

      {view !== 'parse' && (
        <ReviewToolbarCard
         
          search={(
            <Searchbar
              disableButton={!query}
              placeholder={view === 'organized' ? '搜尋來源、作者、MV、Tag 或 URL' : '搜尋作者、來源網址、推文文字或 media URL'}
              value={query}
              onInput={(event) => handleQueryInput((event.target as HTMLInputElement).value || '')}
            />
          )}
          summary={(
            <>
              {view === 'organized'
                ? `目前聚焦：${currentFocusLabel}`
                : '搜尋為目前清單的即時前端篩選。'}
              <div style={{ marginTop: 10 }}>
                <div>視圖 {view}</div>
                {view === 'organized' && <div>{focusKind === 'tag' ? '依標籤' : '依 MV'}</div>}
              </div>
            </>
          )}
          actions={query ? <Link onClick={() => handleQueryInput('')}>清除搜尋</Link> : undefined}
        />
      )}

      {view === 'unorganized' && (
        <ReviewToolbarCard
          summary={(
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <Checkbox
                checked={allVisibleSelected}
                onChange={(event: ChangeEvent<HTMLInputElement>) => toggleSelectAllVisible(event.target.checked)}
              />
              全選目前篩選結果 ({selectedVisibleCount})
            </label>
          )}
          actions={(
            <>
              <Button
                small
                fill
                disabled={selectedCount === 0 || mvSheetBusy}
                onClick={() => openBatchAssignSheet(selectedUnorganizedMedia)}
              >
                關聯後批次通過
              </Button>
              <Button small outline disabled={selectedCount === 0} onClick={() => setSelection(new Set())}>
                清空勾選
              </Button>
            </>
          )}
          footer="批次工具只作用於未整理清單，會沿用目前的關聯 MV / 標籤流程。"
        />
      )}

      {view === 'organized' && (
        <ReviewToolbarCard
         
          summary={(
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button small fill={focusKind === 'tag'} tonal={focusKind !== 'tag'} onClick={() => setFanartFilter({ focusKind: 'tag', focus: tagOptions[0]?.[0] || '' })}>特殊標籤</Button>
              <Button small fill={focusKind === 'mv'} tonal={focusKind !== 'mv'} onClick={() => setFanartFilter({ focusKind: 'mv', focus: mvFocusOptions[0]?.id || '' })}>MV</Button>
              {focusKind === 'mv' && (
                <Button small outline onClick={() => setFocusSheetOpen(true)}>切換 MV</Button>
              )}
            </div>
          )}
          footer={focusKind === 'tag'
            ? undefined
            : `目前 MV：${currentFocusLabel}`}
          actions={focusKind === 'tag' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tagOptions.map(([tag, count]) => (
                <Button
                  key={tag}
                  small
                  fill={focus === tag}
                  tonal={focus !== tag}
                  onClick={() => setFanartFilter({ focus: tag, focusKind: 'tag' })}
                >
                  {formatTagLabel(tag)} {count}
                </Button>
              ))}
            </div>
          ) : undefined}
        />
      )}

      {view === 'unorganized' && renderMediaList(filteredUnorganizedMedia, '沒有符合條件的未整理項目。')}

      {view === 'deleted' && renderDeletedGroups()}

      {view === 'legacy' && renderMediaList(filteredLegacyMedia, '沒有符合條件的舊資料。')}

      {view === 'organized' && (
        focus ? renderMediaList(filteredOrganizedMedia, '目前焦點下沒有符合條件的已組織 FanArt。') : (
          <ReviewStateBlock
            title="尚未選擇焦點"
            description="先切到特殊標籤或 MV，再載入對應的已組織 FanArt 清單。"
            tone="neutral"
            compact
          />
        )
      )}

      {view === 'parse' && (
        <>
          <List form inset>
            <ListInput
              label="Twitter / X 網址"
              type="textarea"
              resizable
              value={parseInput}
              onInput={(event) => setParseInput((event.target as HTMLTextAreaElement).value)}
              placeholder="每行一個網址，支援多筆解析。"
            />
          </List>
          <Block strong inset>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <Button fill onClick={() => void handleParseTweets()} loading={parsing}>開始解析</Button>
              <Button outline onClick={openParseSheet} disabled={parsedItems.length === 0}>保存解析結果</Button>
              {parsedItems.length > 0 && <Badge color="green">待保存 {parsedItems.length}</Badge>}
            </div>
            {parseProgress && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700 }}>{parseProgress.current} / {parseProgress.total}</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>失敗 {parseProgress.failedUrls.length} 筆</div>
                <div style={{ marginTop: 10 }}>
                  <div
                   
                    style={{ width: `${parseProgress.total > 0 ? (parseProgress.current / parseProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </Block>

          <BlockTitle>解析預覽</BlockTitle>
          <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
            {parsedItems.map((item) => {
              const preview = item.thumbnail || item.url
              const isVideo = item.type === 'video' || item.url.includes('.mp4')
              return (
                <ListItem
                  key={item.id}
                  title={item.tweetAuthor || item.tweetHandle || '未命名來源'}
                  subtitle={formatDateTime(item.tweetDate)}
                  text={item.tweetText || '（無推文內容）'}
                >
                  {preview && (
                    isVideo ? (
                      <video
                        slot="media"
                        src={preview}
                        muted
                        playsInline
                        style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                      />
                    ) : (
                      <img
                        slot="media"
                        src={preview}
                        alt={item.tweetAuthor || item.id}
                        style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                      />
                    )
                  )}
                  <Link
                    slot="after"
                    onClick={() => setParsedItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                  >
                    移除
                  </Link>
                  <div
                    slot="footer"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    {item.tweetUrl}
                  </div>
                </ListItem>
              )
            })}
          </List>
          {!parsing && parsedItems.length === 0 && (
            <ReviewStateBlock
              title="尚未有解析結果"
              description="貼上 Twitter / X 網址後開始解析，再決定是否保存到指定 MV。"
              tone="neutral"
            />
          )}
        </>
      )}

      <MvSheet
        opened={Boolean(mvSheetMode)}
        busy={mvSheetBusy}
        mvs={mvs}
        initialMvIds={mvSheetInitialMvIds}
        initialTags={mvSheetInitialTags}
        title={mvSheetMode === 'assign'
          ? '指派 MV / 標籤'
          : mvSheetMode === 'batch-assign'
            ? `為 ${mvSheetBatchTargets.length} 筆 FanArt 選擇關聯`
          : mvSheetMode === 'update'
            ? '更新關聯 MV / 標籤'
            : '保存手動解析結果'}
        description={mvSheetMode === 'parse'
          ? '手動解析保存時至少需要選擇一個 MV；Tag 會一起附加到保存的 FanArt。'
          : mvSheetMode === 'batch-assign'
            ? '先選好要關聯的 MV / 標籤，再一次批次完成目前勾選的未整理 FanArt。'
          : '選擇後會立即更新對應 FanArt 的關聯。'}
        confirmText={mvSheetMode === 'parse'
          ? '保存解析結果'
          : mvSheetMode === 'update'
            ? '更新關聯'
            : mvSheetMode === 'batch-assign'
              ? '保存關聯並批次通過'
              : '保存關聯'}
        onClose={closeMvSheet}
        onConfirm={handleMvSheetConfirm}
      />

      <Sheet opened={focusSheetOpen} onSheetClosed={() => setFocusSheetOpen(false)} backdrop swipeToClose style={{ height: '70vh' }}>
        <Toolbar>
          <ToolbarPane>
            <div style={{ fontWeight: 700 }}>切換 MV 視圖</div>
            <Link sheetClose>關閉</Link>
          </ToolbarPane>
        </Toolbar>
        <Block strong inset>
          <Searchbar
            disableButton={!focusSearch}
            placeholder="搜尋 MV 標題"
            value={focusSearch}
            onInput={(event) => setFocusSearch((event.target as HTMLInputElement).value || '')}
          />
        </Block>
        <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
          {filteredMvFocusOptions.map((mv) => (
            <ListItem
              key={mv.id}
              link
              title={mv.title}
              after={String(mv.fanartCount)}
              onClick={() => {
                setFanartFilter({ focusKind: 'mv', focus: mv.id })
                setFocusSheetOpen(false)
              }}
            />
          ))}
        </List>
      </Sheet>
    </Page>
  )
}
