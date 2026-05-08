import type { CookieOptions } from 'express-session';

export const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'ztmy.sid';

export const getSessionMaxAgeMs = (): number => {
  const days = Number(process.env.SESSION_MAX_AGE_DAYS || 7);
  if (Number.isFinite(days) && days > 0) {
    return days * 24 * 60 * 60 * 1000;
  }
  return 7 * 24 * 60 * 60 * 1000;
};

export const getSessionCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = getSessionMaxAgeMs();
  const domain = process.env.SESSION_COOKIE_DOMAIN;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge,
    ...(domain ? { domain } : {}),
  };
};

