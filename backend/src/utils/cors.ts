const allowedOrigins: string[] = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://mv.ztmr.club',
];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

export const getAllowedOrigins = () => allowedOrigins;

export const resolveCorsOrigin = (requestOrigin: string | undefined): string | undefined => {
  if (!requestOrigin) return '*';
  if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
    return requestOrigin;
  }
  return undefined;
};
