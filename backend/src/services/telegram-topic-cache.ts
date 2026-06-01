export interface ArtistTopicEntry {
  name: string;
  thread_id: number;
}

export type ArtistTopicIds = Record<string, ArtistTopicEntry>;

export function deserializeArtistTopicIds(rawArtistTopics: unknown): Map<string, ArtistTopicEntry> {
  const topics = new Map<string, ArtistTopicEntry>();
  if (!rawArtistTopics || typeof rawArtistTopics !== 'object') {
    return topics;
  }

  for (const [artistId, value] of Object.entries(rawArtistTopics as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const entry = value as Partial<ArtistTopicEntry>;
    if (typeof entry.thread_id !== 'number') {
      continue;
    }

    topics.set(artistId, {
      name: String(entry.name || ''),
      thread_id: entry.thread_id,
    });
  }

  return topics;
}

export function serializeArtistTopicIds(topics: Map<string, ArtistTopicEntry>): ArtistTopicIds {
  return Object.fromEntries(topics);
}
