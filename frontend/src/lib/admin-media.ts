export type SelectOption = {
  label: string
  value: string
}

export type MediaGroupPayload = {
  id?: string
  title?: string
  source_url?: string
  source_text?: string
  author_name?: string
  author_handle?: string
  post_date?: string
  status?: string
}

export const FANART_TAG_OPTIONS: SelectOption[] = [
  { label: "綜合合繪", value: "tag:collab" },
  { label: "ACAね", value: "tag:acane" },
  { label: "實物", value: "tag:real" },
  { label: "海膽栗子/生薑", value: "tag:uniguri" },
  { label: "其他", value: "tag:other" },
]

export const normalizeTagId = (tag: any) => {
  if (!tag) return ""
  const str = String(tag)
  if (!str) return ""
  if (str.startsWith("tag:")) return str
  return `tag:${str}`
}

export const normalizeTags = (tags: any) => {
  const list = Array.isArray(tags) ? tags : []
  return list.map(normalizeTagId).filter(Boolean)
}

export const isTagId = (value: string) => value.startsWith("tag:")

export const splitMvAndTags = (selected: string[]) => {
  const mvIds: string[] = []
  const tagIds: string[] = []
  selected.forEach((v) => {
    if (!v) return
    if (isTagId(v)) tagIds.push(normalizeTagId(v))
    else mvIds.push(v)
  })
  return { mvIds, tagIds }
}

export const buildMvTagOptions = (mvData: Array<{ id: string; title?: string }>) => {
  const mvOptions: SelectOption[] = (Array.isArray(mvData) ? mvData : []).map((mv) => ({
    label: mv.title || mv.id,
    value: mv.id,
  }))
  return [...FANART_TAG_OPTIONS, ...mvOptions]
}

export const buildGroupFromLegacy = (legacy: {
  groupId?: any
  tweetUrl?: any
  tweetText?: any
  tweetAuthor?: any
  tweetHandle?: any
  tweetDate?: any
}) => {
  const sourceUrl = legacy.tweetUrl ? String(legacy.tweetUrl) : undefined
  const sourceText = legacy.tweetText ? String(legacy.tweetText) : undefined
  const authorName = legacy.tweetAuthor ? String(legacy.tweetAuthor) : undefined
  const authorHandle = legacy.tweetHandle ? String(legacy.tweetHandle) : undefined
  const postDate = legacy.tweetDate ? String(legacy.tweetDate) : undefined

  if (!sourceUrl && !sourceText && !authorName && !authorHandle && !postDate) return undefined

  const next: MediaGroupPayload = {}
  if (sourceUrl) next.source_url = sourceUrl
  if (sourceText) next.source_text = sourceText
  if (authorName) next.author_name = authorName
  if (authorHandle) next.author_handle = authorHandle
  if (postDate) next.post_date = postDate
  return next
}

export const hydrateLegacyTweetFields = <T extends { group?: MediaGroupPayload; [k: string]: any }>(
  img: T,
) => {
  const group = img?.group
  if (!group) return img
  const next: any = { ...img }
  if (group.source_url && !next.groupId) next.groupId = group.source_url
  if (!next.groupId && group.id) next.groupId = group.id
  if (group.source_url && !next.tweetUrl) next.tweetUrl = group.source_url
  if (group.source_text && !next.tweetText) next.tweetText = group.source_text
  if (group.author_name && !next.tweetAuthor) next.tweetAuthor = group.author_name
  if (group.author_handle && !next.tweetHandle) next.tweetHandle = group.author_handle
  if (group.post_date && !next.tweetDate) next.tweetDate = group.post_date
  return next as T
}

export const materializeGroupAndStripLegacy = <T extends { group?: MediaGroupPayload; [k: string]: any }>(
  img: T,
) => {
  const legacyGroup = buildGroupFromLegacy({
    groupId: (img as any).groupId,
    tweetUrl: (img as any).tweetUrl,
    tweetText: (img as any).tweetText,
    tweetAuthor: (img as any).tweetAuthor,
    tweetHandle: (img as any).tweetHandle,
    tweetDate: (img as any).tweetDate,
  })

  const group = img.group || legacyGroup
  if (!group) {
    const { groupId, tweetUrl, tweetText, tweetAuthor, tweetHandle, tweetDate, ...rest } = img as any
    return rest as T
  }

  const nextGroup: MediaGroupPayload = { ...group }
  if (!nextGroup.id && legacyGroup?.id) nextGroup.id = legacyGroup.id
  if (!nextGroup.source_url && legacyGroup?.source_url) nextGroup.source_url = legacyGroup.source_url
  if (!nextGroup.source_text && legacyGroup?.source_text) nextGroup.source_text = legacyGroup.source_text
  if (!nextGroup.author_name && legacyGroup?.author_name) nextGroup.author_name = legacyGroup.author_name
  if (!nextGroup.author_handle && legacyGroup?.author_handle) nextGroup.author_handle = legacyGroup.author_handle
  if (!nextGroup.post_date && legacyGroup?.post_date) nextGroup.post_date = legacyGroup.post_date

  const { groupId, tweetUrl, tweetText, tweetAuthor, tweetHandle, tweetDate, ...rest } = img as any
  return { ...rest, group: nextGroup } as T
}
