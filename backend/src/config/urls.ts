const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const getConfiguredUrl = (name: string): string => {
  const value = String(process.env[name] || '').trim();
  return value ? trimTrailingSlash(value) : '';
};

export const requireConfiguredUrl = (name: string): string => {
  const value = getConfiguredUrl(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

export const joinConfiguredUrl = (base: string, path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimTrailingSlash(base)}${normalizedPath}`;
};
