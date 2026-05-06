const TWITTER_SOURCE_HOSTS = [
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
];

const TWITTER_MEDIA_HOSTS = [
  'pbs.twimg.com',
  'video.twimg.com',
];

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'i.ytimg.com',
  'img.youtube.com',
];

const parseHost = (value: string): string | null => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  try {
    const url = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const isTwitterSourceUrl = (value?: string | null): boolean => {
  const host = parseHost(String(value || ''));
  if (!host) return false;
  if (!TWITTER_SOURCE_HOSTS.includes(host)) return false;
  return /\/status\/\d+/.test(String(value || ''));
};

export const isTwitterMediaUrl = (value?: string | null): boolean => {
  const text = String(value || '').toLowerCase();
  if (!text) return false;
  return TWITTER_MEDIA_HOSTS.some((host) => text.includes(host));
};

export const isYoutubeMediaUrl = (value?: string | null): boolean => {
  const text = String(value || '').toLowerCase();
  if (!text) return false;
  return YOUTUBE_HOSTS.some((host) => text.includes(host));
};

export const isTweetSourceMedia = (media: { url?: string | null; original_url?: string | null } | null | undefined): boolean => {
  const url = String(media?.original_url || media?.url || '');
  return isTwitterMediaUrl(url) && !isYoutubeMediaUrl(url);
};

export const isTweetSourceGroup = (
  group: { source_url?: string | null; images?: Array<{ url?: string | null; original_url?: string | null }> } | null | undefined,
): boolean => {
  if (!group) return false;
  if (isTwitterSourceUrl(group.source_url || undefined)) return true;
  if (Array.isArray(group.images)) {
    return group.images.some((media) => isTweetSourceMedia(media));
  }
  return false;
};

