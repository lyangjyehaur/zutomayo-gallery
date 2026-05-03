import useSWR from 'swr';

export type PublicUser = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  social_links?: Record<string, string>;
  public_profile_enabled?: boolean;
  public_profile_fields?: { display_name?: boolean; socials?: boolean; email_masked?: boolean };
};

const baseApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/mvs$/, '');

const fetchJson = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, { credentials: 'include', ...init });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
  }
  return json.data;
};

export const registerPublicUser = async (payload: { email: string; password: string; display_name?: string; redirectUrl: string }) => {
  return fetchJson(`${baseApiUrl}/public-auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const loginPublicUser = async (payload: { email: string; password: string }) => {
  return fetchJson(`${baseApiUrl}/public-auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const verifyEmail = async (token: string) => {
  return fetchJson(`${baseApiUrl}/public-auth/verify-email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
};

export const requestPasswordReset = async (payload: { email: string; redirectUrl: string }) => {
  return fetchJson(`${baseApiUrl}/public-auth/forgot-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const resetPassword = async (payload: { token: string; password: string }) => {
  return fetchJson(`${baseApiUrl}/public-auth/reset-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const requestMagicLink = async (email: string, redirectUrl: string) => {
  return fetchJson(`${baseApiUrl}/public-auth/request-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, redirectUrl }),
  });
};

export const verifyMagicLink = async (token: string) => {
  return fetchJson(`${baseApiUrl}/public-auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
};

export const logoutPublicUser = async () => {
  return fetchJson(`${baseApiUrl}/public-auth/logout`, { method: 'POST' });
};

export const updatePublicMe = async (payload: Partial<PublicUser>) => {
  return fetchJson(`${baseApiUrl}/public-auth/me`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const usePublicMe = () => {
  return useSWR<PublicUser | null>(`${baseApiUrl}/public-auth/me`, (url) => fetchJson(url), {
    revalidateOnFocus: false,
  });
};
