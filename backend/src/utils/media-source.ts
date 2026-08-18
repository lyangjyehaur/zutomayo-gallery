export const parseConfiguredHost = (value: string): string | null => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  try {
    const url = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
};

const configuredHosts = (...values: Array<string | undefined>): string[] => [...new Set(
  values
    .flatMap((value) => String(value || '').split(','))
    .map((value) => parseConfiguredHost(value))
    .filter((host): host is string => Boolean(host)),
)];

const requireConfiguredHosts = (name: string, ...values: Array<string | undefined>): string[] => {
  const hosts = configuredHosts(...values);
  if (hosts.length === 0) throw new Error(`${name} is required`);
  return hosts;
};

export const getTwitterSourceHosts = (): string[] => requireConfiguredHosts(
  'TWITTER_WEB_ORIGIN or TWITTER_LEGACY_ORIGINS',
  process.env.TWITTER_WEB_ORIGIN,
  process.env.TWITTER_LEGACY_ORIGINS,
);

export const getTwitterMediaHosts = (): string[] => requireConfiguredHosts(
  'TWITTER_IMAGE_ORIGIN or TWITTER_VIDEO_ORIGIN',
  process.env.TWITTER_IMAGE_ORIGIN,
  process.env.TWITTER_VIDEO_ORIGIN,
);

export const getTwitterVideoHosts = (): string[] => requireConfiguredHosts(
  'TWITTER_VIDEO_ORIGIN',
  process.env.TWITTER_VIDEO_ORIGIN,
);

export const getYoutubeHosts = (): string[] => requireConfiguredHosts(
  'YOUTUBE_SOURCE_HOSTS',
  process.env.YOUTUBE_SOURCE_HOSTS,
);

export const toSqlHostPatterns = (hosts: string[]): string[] => hosts.map((host) => `%${host}%`);

export const isUrlFromHosts = (value: string | null | undefined, hosts: string[]): boolean => {
  const host = parseConfiguredHost(String(value || ''));
  return Boolean(host && hosts.includes(host));
};

export const isTwitterImageUrl = (value?: string | null): boolean => isUrlFromHosts(
  value,
  requireConfiguredHosts('TWITTER_IMAGE_ORIGIN', process.env.TWITTER_IMAGE_ORIGIN),
);

export const isTwitterVideoUrl = (value?: string | null): boolean => isUrlFromHosts(
  value,
  getTwitterVideoHosts(),
);

export const isTwitterSourceUrl = (value?: string | null): boolean => {
  const host = parseConfiguredHost(String(value || ''));
  if (!host) return false;
  if (!getTwitterSourceHosts().includes(host)) return false;
  return /\/status\/\d+/.test(String(value || ''));
};

export const isTwitterMediaUrl = (value?: string | null): boolean => {
  return isUrlFromHosts(value, getTwitterMediaHosts());
};

export const isYoutubeMediaUrl = (value?: string | null): boolean => {
  return isUrlFromHosts(value, getYoutubeHosts());
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
