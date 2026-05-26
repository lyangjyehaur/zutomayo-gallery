import { useState, useEffect, useCallback } from 'react'
import {
  Page,
  List,
  ListInput,
  ListButton,
  Block,
  BlockTitle,
  Badge,
  Button,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import MvSheet from '../components/MvSheet'
import {
  shortcutParseTweet,
  shortcutSubmit,
  shortcutFetchMVs,
  shortcutFetchArtists,
  type ShortcutParseResult,
  type ShortcutSubmitPayload,
} from '../lib/api'

type ContentType = 'fanart' | 'official' | 'cosplay' | 'collaboration'
type MvMode = 'same' | 'per-image' | 'none'

interface MediaAssignment {
  url: string
  type: 'image' | 'video'
  thumbnail: string | null
  mvId: string | null
  skip: boolean
}

export default function ParsePage() {
  // URL input — check sessionStorage first (set by AppShell on share target redirect)
  const [{ url: initialUrl, fromShare: initialFromShare }] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('url') || params.get('text')
    const fromStorage = sessionStorage.getItem('ztmr_shared_url')
    sessionStorage.removeItem('ztmr_shared_url')
    console.log('[ShareTarget] ParsePage init:', { fromQuery, fromStorage, href: window.location.href })
    return { url: fromQuery || fromStorage || '', fromShare: !!(fromQuery || fromStorage) }
  })
  const [url, setUrl] = useState(initialUrl)
  const [isFromShare] = useState(initialFromShare)
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null)

  // Parse state
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ShortcutParseResult | null>(null)

  // Selection state
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [mvMode, setMvMode] = useState<MvMode | null>(null)
  const [selectedMvId, setSelectedMvId] = useState<string | null>(null)
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<MediaAssignment[]>([])

  // Data
  const [mvs, setMvs] = useState<Array<{ id: string; title: string }>>([])
  const [artists, setArtists] = useState<Array<{ id: string; name: string; twitter: string | null }>>([])

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [mvSheetOpened, setMvSheetOpened] = useState(false)
  const [perImageIndex, setPerImageIndex] = useState<number | null>(null)

  const getToken = useCallback(() => localStorage.getItem('ztmr_api_token') || '', [])

  // On mount: check URL params, sessionStorage (from AppShell), or clipboard
  useEffect(() => {
    // 1. Check query param (direct navigation or share target)
    const params = new URLSearchParams(window.location.search)
    const urlParam = params.get('url')
    if (urlParam) {
      setUrl(urlParam)
      sessionStorage.removeItem('ztmr_shared_url')
      return
    }
    // 2. Check sessionStorage (set by AppShell when share target redirects to /parse/)
    const sharedUrl = sessionStorage.getItem('ztmr_shared_url')
    if (sharedUrl) {
      setUrl(sharedUrl)
      sessionStorage.removeItem('ztmr_shared_url')
      return
    }
    // 3. Try clipboard
    if (navigator.clipboard?.readText) {
      navigator.clipboard.readText().then((text) => {
        if (text && (text.includes('x.com/') || text.includes('twitter.com/'))) {
          setClipboardUrl(text)
        }
      }).catch(() => { /* clipboard permission denied */ })
    }
  }, [])

  // Auto-parse when URL is pre-filled from share target
  useEffect(() => {
    // Debug: show what we got
    if (isFromShare && url) {
      f7.toast.create({ text: `收到分享 URL: ${url.substring(0, 60)}...`, closeTimeout: 5000 }).open()
    }
    if (url && isFromShare && !parseResult && !parsing) {
      handleParse()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, isFromShare])

  // Parse tweet
  const handleParse = useCallback(async () => {
    const token = getToken()
    if (!token) {
      f7.dialog.alert('請先在設定頁面填入 API Token').open()
      return
    }
    if (!url.trim()) return

    setParsing(true)
    setParseResult(null)
    setContentType(null)
    setMvMode(null)
    setSelectedMvId(null)
    setSelectedArtistId(null)
    setAssignments([])

    try {
      const res = await shortcutParseTweet(url.trim(), token)
      if (res.success && res.data) {
        setParseResult(res.data)
        setAssignments(
          res.data.media.map((m) => ({
            url: m.url,
            type: m.type,
            thumbnail: m.thumbnail,
            mvId: null,
            skip: false,
          }))
        )
      } else {
        f7.dialog.alert(res.error || '解析失敗').open()
      }
    } catch (err: unknown) {
      f7.dialog.alert(`請求失敗：${err instanceof Error ? err.message : String(err)}`).open()
    } finally {
      setParsing(false)
    }
  }, [url, getToken])

  // Load MVs and Artists when content type is selected
  useEffect(() => {
    if (!contentType) return
    const token = getToken()
    if (!token) return

    if (contentType === 'official' || contentType === 'fanart' || contentType === 'cosplay') {
      shortcutFetchMVs(token).then((res) => {
        if (res.success) setMvs(res.data)
      })
    }
    if (contentType === 'collaboration') {
      shortcutFetchArtists(token).then((res) => {
        if (res.success) setArtists(res.data)
      })
    }
  }, [contentType, getToken])

  // Submit
  const handleSubmit = useCallback(async () => {
    const token = getToken()
    if (!token || !parseResult) return

    const payload: ShortcutSubmitPayload = {
      url: url.trim(),
      content_type: contentType!,
      assignments: assignments
        .filter((a) => !a.skip)
        .map((a) => ({
          media_url: a.url,
          mv_id: a.mvId || undefined,
        })),
    }

    if (payload.assignments.length === 0) {
      f7.dialog.alert('沒有可提交的媒體').open()
      return
    }

    setSubmitting(true)
    try {
      const res = await shortcutSubmit(payload, token)
      if (res.success) {
        f7.toast.create({ text: `✅ 提交成功！Group: ${res.data?.group_id}`, closeTimeout: 5000 }).open()
        // Reset
        setParseResult(null)
        setUrl('')
        setContentType(null)
        setMvMode(null)
      } else {
        f7.dialog.alert(res.error || '提交失敗').open()
      }
    } catch (err: unknown) {
      f7.dialog.alert(`請求失敗：${err instanceof Error ? err.message : String(err)}`).open()
    } finally {
      setSubmitting(false)
    }
  }, [url, contentType, assignments, parseResult, getToken])

  // Toggle skip for per-image mode
  const toggleSkip = (index: number) => {
    setAssignments((prev) => prev.map((a, i) => (i === index ? { ...a, skip: !a.skip } : a)))
  }

  // Set MV for per-image mode
  const handlePerImageMvSelect = (mvIds: string[]) => {
    if (perImageIndex !== null) {
      setAssignments((prev) =>
        prev.map((a, i) => (i === perImageIndex ? { ...a, mvId: mvIds[0] || null } : a))
      )
    }
    setMvSheetOpened(false)
    setPerImageIndex(null)
  }

  // Apply same MV to all
  const handleSameMvSelect = (mvIds: string[]) => {
    setSelectedMvId(mvIds[0] || null)
    setAssignments((prev) => prev.map((a) => ({ ...a, mvId: mvIds[0] || null })))
    setMvSheetOpened(false)
  }

  return (
    <Page>
      <AppNavbar title="解析推文" subtitle="孤兒推文保存" />

      {/* Debug info */}
      <Block inset style={{ background: 'var(--f7-card-bg-color)', fontSize: '12px', padding: '8px', borderRadius: '8px' }}>
        <div>url: {url || '(empty)'}</div>
        <div>isFromShare: {String(isFromShare)}</div>
        <div>pathname: {window.location.pathname}</div>
        <div>search: {window.location.search || '(empty)'}</div>
      </Block>

      {/* URL Input */}
      <BlockTitle>推文網址</BlockTitle>
      {clipboardUrl && !parseResult && (
        <Block inset>
          <p style={{ fontSize: '14px', color: 'var(--f7-text-color)' }}>
            剪貼板偵測到推文連結：
          </p>
          <p style={{ fontSize: '12px', color: 'var(--f7-text-color-secondary)', wordBreak: 'break-all' }}>
            {clipboardUrl}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <Button fill small onClick={() => { setUrl(clipboardUrl); setClipboardUrl(null) }}>
              使用此連結
            </Button>
            <Button small outline onClick={() => setClipboardUrl(null)}>
              忽略
            </Button>
          </div>
        </Block>
      )}
      <List inset>
        <ListInput
          label="推文 URL"
          type="url"
          placeholder="https://x.com/.../status/..."
          value={url}
          onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
          clearButton
        />
        <ListButton
          onClick={handleParse}
          className={!url.trim() || parsing ? 'disabled' : ''}
        >
          {parsing ? '解析中...' : '解析推文'}
        </ListButton>
      </List>

      {/* Parse Result */}
      {parseResult && (
        <>
          <BlockTitle>
            推文摘要
            <Badge color="blue" style={{ marginLeft: '8px' }}>
              {parseResult.media.length} 張媒體
            </Badge>
          </BlockTitle>
          <Block inset strong>
            <div style={{ marginBottom: '8px' }}>
              <strong>@{parseResult.author_handle}</strong>
              {parseResult.author_name && (
                <span style={{ color: 'var(--f7-text-color-secondary)', marginLeft: '8px' }}>
                  {parseResult.author_name}
                </span>
              )}
            </div>
            {parseResult.text && (
              <p style={{ fontSize: '14px', color: 'var(--f7-text-color-secondary)', marginBottom: '12px' }}>
                {parseResult.text.length > 200 ? parseResult.text.slice(0, 200) + '...' : parseResult.text}
              </p>
            )}
            {/* Media thumbnails */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {parseResult.media.map((m, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--f7-card-bg-color)',
                    opacity: assignments[i]?.skip ? 0.3 : 1,
                  }}
                >
                  <img
                    src={m.thumbnail || m.url}
                    alt={`media-${i}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </Block>

          {/* Content Type */}
          <BlockTitle>保存分類</BlockTitle>
          <List inset>
            {(['fanart', 'official', 'cosplay', 'collaboration'] as ContentType[]).map((ct) => (
              <ListButton
                key={ct}
                onClick={() => setContentType(ct)}
                color={contentType === ct ? 'blue' : undefined}
                style={contentType === ct ? { fontWeight: 'bold' } : undefined}
              >
                {ct === contentType ? `✓ ${ct}` : ct}
              </ListButton>
            ))}
          </List>

          {/* MV Allocation (fanart/cosplay) */}
          {contentType && (contentType === 'fanart' || contentType === 'cosplay') && (
            <>
              <BlockTitle>MV 掛載</BlockTitle>
              <List inset>
                <ListButton
                  onClick={() => { setMvMode('same'); setMvSheetOpened(true) }}
                  color={mvMode === 'same' ? 'blue' : undefined}
                >
                  {mvMode === 'same' && selectedMvId ? `✓ 全部掛：${mvs.find(m => m.id === selectedMvId)?.title || selectedMvId}` : '全部掛同一個 MV'}
                </ListButton>
                <ListButton
                  onClick={() => setMvMode('per-image')}
                  color={mvMode === 'per-image' ? 'blue' : undefined}
                >
                  {mvMode === 'per-image' ? '✓ 逐張選擇' : '逐張選擇'}
                </ListButton>
                <ListButton
                  onClick={() => { setMvMode('none'); setSelectedMvId(null); setAssignments(prev => prev.map(a => ({ ...a, mvId: null }))) }}
                  color={mvMode === 'none' ? 'blue' : undefined}
                >
                  {mvMode === 'none' ? '✓ 不掛 MV' : '不掛 MV'}
                </ListButton>
              </List>

              {/* Per-image selection */}
              {mvMode === 'per-image' && (
                <Block inset>
                  {assignments.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--f7-card-border-color)',
                        opacity: a.skip ? 0.4 : 1,
                      }}
                    >
                      <img
                        src={a.thumbnail || a.url}
                        alt={`media-${i}`}
                        style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, fontSize: '13px' }}>
                        {a.skip ? '已跳過' : a.mvId ? `MV: ${mvs.find(m => m.id === a.mvId)?.title || a.mvId}` : '未選 MV'}
                      </div>
                      <Button small outline onClick={() => { setPerImageIndex(i); setMvSheetOpened(true) }} disabled={a.skip}>
                        選 MV
                      </Button>
                      <Button small outline color={a.skip ? 'green' : 'red'} onClick={() => toggleSkip(i)}>
                        {a.skip ? '恢復' : '跳過'}
                      </Button>
                    </div>
                  ))}
                </Block>
              )}
            </>
          )}

          {/* MV for official */}
          {contentType === 'official' && (
            <>
              <BlockTitle>選擇 MV（必選）</BlockTitle>
              <List inset>
                <ListButton onClick={() => setMvSheetOpened(true)}>
                  {selectedMvId ? `✓ ${mvs.find(m => m.id === selectedMvId)?.title || selectedMvId}` : '選擇 MV'}
                </ListButton>
              </List>
            </>
          )}

          {/* Artist for collaboration */}
          {contentType === 'collaboration' && (
            <>
              <BlockTitle>選擇 Artist</BlockTitle>
              <List inset>
                {artists.map((a) => (
                  <ListButton
                    key={a.id}
                    onClick={() => setSelectedArtistId(a.id)}
                    color={selectedArtistId === a.id ? 'blue' : undefined}
                  >
                    {selectedArtistId === a.id ? `✓ ${a.name}` : a.name}
                    {a.twitter && <span style={{ color: 'var(--f7-text-color-secondary)', marginLeft: '8px' }}>@{a.twitter}</span>}
                  </ListButton>
                ))}
              </List>
            </>
          )}

          {/* Submit */}
          {contentType && (mvMode || contentType === 'official' || contentType === 'collaboration') && (
            <Block inset>
              <Button
                fill
                large
                onClick={handleSubmit}
                className={submitting || (contentType === 'official' && !selectedMvId) ? 'disabled' : ''}
              >
                {submitting ? '提交中...' : '提交到 Gallery'}
              </Button>
            </Block>
          )}
        </>
      )}

      {/* MV Sheet */}
      <MvSheet
        opened={mvSheetOpened}
        onClose={() => { setMvSheetOpened(false); setPerImageIndex(null) }}
        onConfirm={perImageIndex !== null ? handlePerImageMvSelect : handleSameMvSelect}
        mvs={mvs}
        title={perImageIndex !== null ? `為第 ${perImageIndex + 1} 張選 MV` : '選擇 MV'}
      />
    </Page>
  )
}
