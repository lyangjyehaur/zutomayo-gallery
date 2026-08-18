const env = (import.meta as any).env || {};

export const getConfiguredUrl = (key: string): string => {
  const value = typeof env[key] === 'string' ? String(env[key]).trim() : '';
  return value.replace(/\/+$/, '');
};

export const requireConfiguredUrl = (key: string): string => {
  const value = getConfiguredUrl(key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const joinUrl = (base: string, path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/+$/, '')}${normalizedPath}`;
};

const parseHost = (value: string): string | null => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const getConfiguredHosts = (key: string): string[] => [...new Set(
  String(env[key] || '')
    .split(',')
    .map((value) => parseHost(value))
    .filter((host): host is string => Boolean(host)),
)];

export const isUrlFromConfiguredHosts = (value: string | null | undefined, ...keys: string[]): boolean => {
  const host = parseHost(String(value || ''));
  return Boolean(host && keys.some((key) => getConfiguredHosts(key).includes(host)));
};

export const isTwitterImageUrl = (value?: string | null): boolean => isUrlFromConfiguredHosts(
  value,
  'VITE_TWITTER_IMAGE_SOURCE_HOST',
);

export const isTwitterVideoUrl = (value?: string | null): boolean => isUrlFromConfiguredHosts(
  value,
  'VITE_TWITTER_VIDEO_SOURCE_HOST',
);

export const isTwitterMediaUrl = (value?: string | null): boolean => isUrlFromConfiguredHosts(
  value,
  'VITE_TWITTER_IMAGE_SOURCE_HOST',
  'VITE_TWITTER_VIDEO_SOURCE_HOST',
);

export const isYoutubeMediaUrl = (value?: string | null): boolean => isUrlFromConfiguredHosts(
  value,
  'VITE_YOUTUBE_SOURCE_HOSTS',
);

export const getConfiguredHostname = (key: string): string => parseHost(getConfiguredUrl(key)) || '';
