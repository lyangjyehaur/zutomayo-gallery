import crypto from 'crypto';

export const sha256Hex = (input: string | Buffer) => crypto.createHash('sha256').update(input).digest('hex');

export const generateToken = () => crypto.randomBytes(32).toString('hex');

export const maskEmail = (email: string) => {
  const trimmed = String(email || '').trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed;
  const user = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = user.slice(0, 1);
  const last = user.length > 1 ? user.slice(-1) : '';
  const maskedUser = `${first}${user.length > 2 ? '***' : '*'}${last}`;
  const domainParts = domain.split('.');
  const domainHead = domainParts[0] || '';
  const maskedDomainHead = domainHead.length <= 2 ? `${domainHead[0] || ''}*` : `${domainHead.slice(0, 1)}***${domainHead.slice(-1)}`;
  const rest = domainParts.slice(1).join('.');
  const maskedDomain = rest ? `${maskedDomainHead}.${rest}` : maskedDomainHead;
  return `${maskedUser}@${maskedDomain}`;
};

