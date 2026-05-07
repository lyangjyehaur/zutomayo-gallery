import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Link,
  List,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
  Popup,
  Searchbar,
  Segmented,
  Sheet,
  Toolbar,
  View,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import MvSheet from '../components/MvSheet'
import ReviewStateBlock from '../components/ReviewStateBlock'
import ReviewToolbarCard from '../components/ReviewToolbarCard'
import { useWorkspace } from '../hooks/useWorkspace'
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

const formatTagLabel = (tag: string) => TAG_LABELS[tag] || tag.replace(/^tag:/, '')

const getMediaPreview = (media?: FanartMedia | null) => {
  if (!media) return ''
  if (media.media_type === 'video') {
    return media.thumbnail_url || media.url || media.original_url || ''
  }
  return media.url || media.thumbnail_url || media.original_url || ''
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

export default function FanartPage() {
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
  const [detailMedia, setDetailMedia] = useState<FanartMedia | null>(null)
  const [detailGroup, setDetailGroup] = useState<FanartGroup | null>(null)
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const [mvSheetMode, setMvSheetMode] = useState<'assign' | 'update' | 'parse' | null>(null)
  const [mvSheetTarget, setMvSheetTarget] = useState<FanartMedia | null>(null)
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

  const filteredUnorganizedMedia = useMemo(() => {
    const items = flattenUnorganizedMedia(unorganizedGroups)
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => buildMediaSearchText(item).includes(keyword))
  }, [query, unorganizedGroups])

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
  const mvSheetKey = `${mvSheetMode || 'closed'}-${mvSheetTarget?.id || 'none'}-${mvSheetInitialMvIds.join('|')}-${mvSheetInitialTags.join('|')}`

  const closeMvSheet = () => {
    if (mvSheetBusy) return
    setMvSheetMode(null)
    setMvSheetTarget(null)
  }

  const openAssignSheet = (media: FanartMedia) => {
    setMvSheetTarget(media)
    setMvSheetMode('assign')
  }

  const openUpdateSheet = (media: FanartMedia) => {
    setMvSheetTarget(media)
    setMvSheetMode('update')
  }

  const openParseSheet = () => {
    setMvSheetTarget(null)
    setMvSheetMode('parse')
  }

  const handleQueryInput = (value: string) => {
    setFanartFilter({ query: value })
  }

  const handleViewChange = (nextView: typeof view) => {
    if (view === nextView) return
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

  const requestDiscardGroup = (groupId: string) => {
    f7.dialog.confirm('確定要將此推文捨棄到已丟棄佇列嗎？', '捨棄 FanArt', () => {
      void (async () => {
        const key = `group:${groupId}`
        setBusyForKeys([key], true)
        try {
          const result = await updateFanartGroupStatus(groupId, 'deleted')
          if (!result.success) throw new Error('DISCARD_FAILED')
          setDetailMedia(null)
          setDetailGroup(null)
          await refreshAll()
          f7.toast.create({ text: '已移至已丟棄', closeTimeout: 1800 }).open()
        } catch {
          f7.toast.create({ text: '捨棄失敗', closeTimeout: 2200 }).open()
        } finally {
          setBusyForKeys([key], false)
        }
      })()
    })
  }

  const handleRestoreGroup = useCallback(async (groupId: string) => {
    const key = `group:${groupId}`
    setBusyForKeys([key], true)
    try {
      const result = await updateFanartGroupStatus(groupId, 'unorganized')
      if (!result.success) throw new Error('RESTORE_FAILED')
      setDetailMedia(null)
      setDetailGroup(null)
      await refreshAll()
      f7.toast.create({ text: '已還原回未整理', closeTimeout: 1800 }).open()
    } catch {
      f7.toast.create({ text: '還原失敗', closeTimeout: 2200 }).open()
    } finally {
      setBusyForKeys([key], false)
    }
  }, [refreshAll, setBusyForKeys])

  const handleMvSheetConfirm = async (mvIds: string[], tags: string[]) => {
    const payload = [...mvIds, ...tags]

    if (mvSheetMode === 'assign') {
      if (!mvSheetTarget?.id || !mvSheetTarget.group?.id) return
      if (payload.length === 0) {
        f7.dialog.alert('請至少選擇一個 MV 或標籤')
        return
      }
      const mediaKey = `media:${mvSheetTarget.id}`
      setMvSheetBusy(true)
      setBusyForKeys([mediaKey], true)
      try {
        const result = await assignFanartMedia(mvSheetTarget.id, payload, mvSheetTarget.group.id)
        if (!result.success) throw new Error('ASSIGN_FAILED')
        closeMvSheet()
        setDetailMedia(null)
        await refreshAll()
        f7.toast.create({ text: '已保存並完成關聯', closeTimeout: 1800 }).open()
      } catch {
        f7.toast.create({ text: '保存關聯失敗', closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
        setBusyForKeys([mediaKey], false)
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
      setMvSheetBusy(true)
      setBusyForKeys([mediaKey], true)
      try {
        const result = await syncFanartMedia(mvSheetTarget.id, payload, mvSheetTarget.group_id || mvSheetTarget.group?.id || undefined)
        if (!result.success) throw new Error('SYNC_FAILED')
        closeMvSheet()
        setDetailMedia(null)
        await refreshAll()
        f7.toast.create({ text: '已更新關聯', closeTimeout: 1800 }).open()
      } catch {
        f7.toast.create({ text: '更新關聯失敗', closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
        setBusyForKeys([mediaKey], false)
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
        f7.toast.create({ text: '手動解析結果已保存', closeTimeout: 1800 }).open()
      } catch {
        f7.toast.create({ text: '保存解析結果失敗', closeTimeout: 2200 }).open()
      } finally {
        setMvSheetBusy(false)
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

  const renderMediaList = (items: FanartMedia[], emptyText: string, onOpen: (item: FanartMedia) => void) => {
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
        <List mediaList className="review-list review-fade-up">
          {items.map((item) => {
            const preview = getMediaPreview(item)
            const isVideo = item.media_type === 'video' || preview.includes('.mp4')
            const subtitle = [
              item.group?.author_name || item.group?.author_handle,
              item.group?.post_date ? formatDateTime(item.group.post_date) : '',
              (item.mvs || []).map((mv) => mv.title).join(' / '),
            ].filter(Boolean).join(' · ')
            const footer = [
              item.group?.source_url,
              (item.tags || []).map((tag) => formatTagLabel(tag)).join(' / '),
            ].filter(Boolean).join(' · ')

            return (
              <ListItem
                key={item.id}
                link="#"
                title={item.group?.author_name || item.group?.author_handle || item.id}
                subtitle={subtitle || item.id}
                text={item.group?.source_text || '（無內文）'}
                footer={footer || item.id}
                onClick={() => onOpen(item)}
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
                      alt={item.group?.author_name || item.id}
                      style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                    />
                  )
                )}
                {item.mvs && item.mvs.length > 0 && <Badge slot="after" color="green">{item.mvs.length}</Badge>}
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
        <List mediaList className="review-list review-fade-up">
          {filteredDeletedGroups.map((group) => {
            const cover = Array.isArray(group.media) ? group.media[0] : undefined
            const preview = getMediaPreview(cover)
            const isVideo = cover?.media_type === 'video' || preview.includes('.mp4')
            return (
              <ListItem
                key={group.id}
                link="#"
                title={group.author_name || group.author_handle || group.id}
                subtitle={formatDateTime(group.post_date)}
                text={group.source_text || '（無推文內容）'}
                footer={group.source_url || group.id}
                onClick={() => {
                  setDetailMedia(null)
                  setDetailGroup(group)
                }}
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
                <Badge slot="after" color="red">{Array.isArray(group.media) ? group.media.length : 0}</Badge>
              </ListItem>
            )
          })}
        </List>
        {!loadingList && filteredDeletedGroups.length > 0 && (
          <Block strong inset className="review-list-foot">
            已顯示 {filteredDeletedGroups.length} 個已丟棄 group，可點進詳情直接還原。
          </Block>
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

      <Block className="review-grid review-grid-compact review-fade-up">
        <Card className="review-card">
          <CardHeader>未整理</CardHeader>
          <CardContent>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{loadingOverview ? '...' : overview.unorganizedGroups}</div>
            <div style={{ opacity: 0.75 }}>group / {loadingOverview ? '...' : overview.unorganizedMedia} 筆 media</div>
          </CardContent>
        </Card>
        <Card className="review-card">
          <CardHeader>已丟棄</CardHeader>
          <CardContent>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{loadingOverview ? '...' : overview.deletedGroups}</div>
            <div style={{ opacity: 0.75 }}>可從詳情直接還原</div>
          </CardContent>
        </Card>
        <Card className="review-card">
          <CardHeader>舊資料</CardHeader>
          <CardContent>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{loadingOverview ? '...' : overview.legacyMedia}</div>
            <div style={{ opacity: 0.75 }}>缺 group 或缺來源的歷史 media</div>
          </CardContent>
        </Card>
        <Card className="review-card">
          <CardHeader>特殊標籤</CardHeader>
          <CardContent>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{loadingOverview ? '...' : overview.tagBuckets}</div>
            <div style={{ opacity: 0.75 }}>可切入 organized 視圖更新關聯</div>
          </CardContent>
        </Card>
      </Block>

      <Block className="review-segment-wrap review-fade-up review-fade-up-delay-1">
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
          className="review-fade-up review-fade-up-delay-1"
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
              <div className="review-inline-kpis" style={{ marginTop: 10 }}>
                <div className="review-chip">視圖 {view}</div>
                {view === 'organized' && <div className="review-chip review-chip-soft">{focusKind === 'tag' ? '依標籤' : '依 MV'}</div>}
              </div>
            </>
          )}
          actions={query ? <Link onClick={() => handleQueryInput('')}>清除搜尋</Link> : undefined}
        />
      )}

      {view === 'organized' && (
        <ReviewToolbarCard
          className="review-fade-up review-fade-up-delay-2"
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

      {view === 'unorganized' && renderMediaList(filteredUnorganizedMedia, '沒有符合條件的未整理項目。', (item) => {
        setDetailGroup(null)
        setDetailMedia(item)
      })}

      {view === 'deleted' && renderDeletedGroups()}

      {view === 'legacy' && renderMediaList(filteredLegacyMedia, '沒有符合條件的舊資料。', (item) => {
        setDetailGroup(null)
        setDetailMedia(item)
      })}

      {view === 'organized' && (
        focus ? renderMediaList(filteredOrganizedMedia, '目前焦點下沒有符合條件的已組織 FanArt。', (item) => {
          setDetailGroup(null)
          setDetailMedia(item)
        }) : (
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
          <Block strong inset className="review-surface review-fade-up">
            <label className="review-form-label">
              <div className="review-form-label-title">Twitter / X 網址</div>
              <textarea
                value={parseInput}
                onChange={(event) => setParseInput(event.target.value)}
                placeholder="每行一個網址，支援多筆解析。"
                style={{ width: '100%', minHeight: 140, padding: '12px 14px', borderRadius: 12, resize: 'vertical' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <Button fill onClick={() => void handleParseTweets()} loading={parsing}>開始解析</Button>
              <Button outline onClick={openParseSheet} disabled={parsedItems.length === 0}>保存解析結果</Button>
              {parsedItems.length > 0 && <Badge color="green">待保存 {parsedItems.length}</Badge>}
            </div>
            {parseProgress && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700 }}>{parseProgress.current} / {parseProgress.total}</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>失敗 {parseProgress.failedUrls.length} 筆</div>
                <div className="review-progress-track" style={{ marginTop: 10 }}>
                  <div
                    className="review-progress-fill"
                    style={{ width: `${parseProgress.total > 0 ? (parseProgress.current / parseProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </Block>

          <BlockTitle>解析預覽</BlockTitle>
          <List mediaList className="review-list review-fade-up review-fade-up-delay-1">
            {parsedItems.map((item) => {
              const preview = item.thumbnail || item.url
              const isVideo = item.type === 'video' || item.url.includes('.mp4')
              return (
                <ListItem
                  key={item.id}
                  title={item.tweetAuthor || item.tweetHandle || '未命名來源'}
                  subtitle={formatDateTime(item.tweetDate)}
                  text={item.tweetText || '（無推文內容）'}
                  footer={item.tweetUrl}
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

      {detailMedia && (
        <Popup className="review-popup" opened onPopupClosed={() => setDetailMedia(null)}>
          <View>
            <Page>
              <Navbar>
                <NavLeft>
                  <Link popupClose>關閉</Link>
                </NavLeft>
                <NavTitle>FanArt 詳情</NavTitle>
                <NavRight>
                  {detailMedia.mvs && detailMedia.mvs.length > 0 && <Badge color="green">{detailMedia.mvs.length} MV</Badge>}
                </NavRight>
              </Navbar>

              <Block strong inset className="review-surface">
                <div className="review-media-frame">
                  {detailMedia.media_type === 'video' ? (
                    <video
                      src={detailMedia.url || detailMedia.original_url || undefined}
                      poster={detailMedia.thumbnail_url || undefined}
                      controls
                      playsInline
                      style={{ width: '100%', display: 'block', maxHeight: '56vh' }}
                    />
                  ) : (
                    <img
                      src={detailMedia.url || detailMedia.original_url || undefined}
                      alt={detailMedia.group?.author_name || detailMedia.id}
                      style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {detailMedia.group?.source_url && (
                    <a href={detailMedia.group.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>原始推文</a>
                  )}
                  {detailMedia.original_url && (
                    <a href={detailMedia.original_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>原始媒體</a>
                  )}
                  {detailMedia.url && detailMedia.url !== detailMedia.original_url && (
                    <a href={detailMedia.url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>R2 / 當前檔案</a>
                  )}
                </div>
              </Block>

              <BlockTitle>來源資訊</BlockTitle>
              <List inset strong>
                <ListItem title="Media ID" after={detailMedia.id} />
                <ListItem title="作者" text={detailMedia.group?.author_name || detailMedia.group?.author_handle || '未提供'} />
                <ListItem title="發文時間" text={formatDateTime(detailMedia.group?.post_date)} />
                <ListItem title="來源網址" text={detailMedia.group?.source_url || '未提供'} />
                <ListItem title="標籤" text={(detailMedia.tags || []).length > 0 ? (detailMedia.tags || []).map((tag) => formatTagLabel(tag)).join(' / ') : '（無）'} />
                <ListItem title="關聯 MV" text={detailMedia.mvs && detailMedia.mvs.length > 0 ? detailMedia.mvs.map((mv) => mv.title).join(' / ') : '（無）'} />
              </List>

              <BlockTitle>推文內容</BlockTitle>
              <Block strong inset className="review-surface">
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailMedia.group?.source_text || '（無推文文字）'}</div>
              </Block>

              <Block strong inset className="review-surface">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {view === 'unorganized' && (
                    <>
                      <Button fill onClick={() => openAssignSheet(detailMedia)} disabled={busyKeys.has(`media:${detailMedia.id}`)}>指派 MV / 標籤</Button>
                      {detailMedia.group?.id && (
                        <Button outline color="red" onClick={() => requestDiscardGroup(detailMedia.group!.id)} disabled={busyKeys.has(`group:${detailMedia.group.id}`)}>
                          捨棄推文
                        </Button>
                      )}
                    </>
                  )}
                  {view === 'organized' && (
                    <Button fill tonal onClick={() => openUpdateSheet(detailMedia)} disabled={busyKeys.has(`media:${detailMedia.id}`)}>
                      更新關聯
                    </Button>
                  )}
                </div>
              </Block>
            </Page>
          </View>
        </Popup>
      )}

      {detailGroup && (
        <Popup className="review-popup" opened onPopupClosed={() => setDetailGroup(null)}>
          <View>
            <Page>
              <Navbar>
                <NavLeft>
                  <Link popupClose>關閉</Link>
                </NavLeft>
                <NavTitle>已丟棄群組</NavTitle>
                <NavRight>
                  <Badge color="red">{Array.isArray(detailGroup.media) ? detailGroup.media.length : 0} 媒體</Badge>
                </NavRight>
              </Navbar>

              <Block strong inset className="review-surface">
                {detailGroup.media?.[0] && (
                  <div className="review-media-frame">
                    {detailGroup.media[0].media_type === 'video' ? (
                      <video
                        src={detailGroup.media[0].url || detailGroup.media[0].original_url || undefined}
                        poster={detailGroup.media[0].thumbnail_url || undefined}
                        controls
                        playsInline
                        style={{ width: '100%', display: 'block', maxHeight: '56vh' }}
                      />
                    ) : (
                      <img
                        src={detailGroup.media[0].url || detailGroup.media[0].original_url || undefined}
                        alt={detailGroup.author_name || detailGroup.id}
                        style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                )}
              </Block>

              <List inset strong>
                <ListItem title="Group ID" after={detailGroup.id} />
                <ListItem title="作者" text={detailGroup.author_name || detailGroup.author_handle || '未提供'} />
                <ListItem title="發文時間" text={formatDateTime(detailGroup.post_date)} />
                <ListItem title="來源網址" text={detailGroup.source_url || '未提供'} />
                <ListItem title="推文內容" text={detailGroup.source_text || '（無）'} />
              </List>

              <Block strong inset className="review-surface">
                <Button fill tonal color="orange" onClick={() => void handleRestoreGroup(detailGroup.id)} disabled={busyKeys.has(`group:${detailGroup.id}`)}>
                  還原回未整理
                </Button>
              </Block>
            </Page>
          </View>
        </Popup>
      )}

      <MvSheet
        key={mvSheetKey}
        opened={Boolean(mvSheetMode)}
        busy={mvSheetBusy}
        mvs={mvs}
        initialMvIds={mvSheetInitialMvIds}
        initialTags={mvSheetInitialTags}
        title={mvSheetMode === 'assign'
          ? '指派 MV / 標籤'
          : mvSheetMode === 'update'
            ? '更新關聯 MV / 標籤'
            : '保存手動解析結果'}
        description={mvSheetMode === 'parse'
          ? '手動解析保存時至少需要選擇一個 MV；Tag 會一起附加到保存的 FanArt。'
          : '選擇後會立即更新對應 FanArt 的關聯。'}
        confirmText={mvSheetMode === 'parse' ? '保存解析結果' : mvSheetMode === 'update' ? '更新關聯' : '保存關聯'}
        onClose={closeMvSheet}
        onConfirm={handleMvSheetConfirm}
      />

      <Sheet className="review-sheet" opened={focusSheetOpen} onSheetClosed={() => setFocusSheetOpen(false)} backdrop swipeToClose style={{ height: '70vh' }}>
        <Toolbar>
          <div className="left" style={{ paddingLeft: 16, fontWeight: 700 }}>切換 MV 視圖</div>
          <div className="right" style={{ paddingRight: 16 }}>
            <Link sheetClose>關閉</Link>
          </div>
        </Toolbar>
        <Block strong inset className="review-surface review-fade-up">
          <Searchbar
            disableButton={!focusSearch}
            placeholder="搜尋 MV 標題"
            value={focusSearch}
            onInput={(event) => setFocusSearch((event.target as HTMLInputElement).value || '')}
          />
        </Block>
        <List mediaList>
          {filteredMvFocusOptions.map((mv) => (
            <ListItem
              key={mv.id}
              link="#"
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
