import crypto from 'crypto';
import fetch from 'node-fetch';

type AuthMailPurpose = 'login' | 'verify_email' | 'reset_password';
type MailLocale = 'zh-TW' | 'zh-CN' | 'zh-HK' | 'en' | 'ja';
type MailProvider = 'tencent_ses' | 'brevo';

const tcSecretId = process.env.TENCENT_SECRET_ID;
const tcSecretKey = process.env.TENCENT_SECRET_KEY;
const tcRegion = process.env.TENCENT_SES_REGION || 'ap-guangzhou';
const tcEndpoint = process.env.TENCENT_SES_ENDPOINT || 'ses.tencentcloudapi.com';
const defaultLocale = (process.env.TENCENT_SES_DEFAULT_LANG || 'zh-TW') as MailLocale;

const supportedLocales: MailLocale[] = ['zh-TW', 'zh-CN', 'zh-HK', 'en', 'ja'];

const brevoApiKey = process.env.BREVO_API_KEY;

const normalizeLocale = (v: string | null | undefined): MailLocale | null => {
  const s = String(v || '').trim();
  if (!s) return null;
  const hit = supportedLocales.find((x) => x.toLowerCase() === s.toLowerCase());
  return hit || null;
};

const getEmailDomain = (email: string) => {
  const at = String(email || '').lastIndexOf('@');
  if (at <= 0) return '';
  return String(email.slice(at + 1)).trim().toLowerCase();
};

const parseCsv = (v: string | undefined) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const mainlandDomains = new Set<string>([
  ...parseCsv(process.env.MAIL_MAINLAND_DOMAINS),
  'qq.com',
  'foxmail.com',
  '163.com',
  '126.com',
  'yeah.net',
  'vip.163.com',
  'vip.126.com',
  'sina.com',
  'vip.sina.com',
  'sina.cn',
  'sohu.com',
  '139.com',
  '189.cn',
  '21cn.com',
  'aliyun.com',
  'aliyun.cn',
]);

const isMainlandMailbox = (to: string) => {
  const domain = getEmailDomain(to);
  if (!domain) return false;
  if (mainlandDomains.has(domain)) return true;
  if (domain.endsWith('.cn')) return true;
  const extraSuffixes = parseCsv(process.env.MAIL_MAINLAND_SUFFIXES);
  if (extraSuffixes.some((s) => s && domain.endsWith(s))) return true;
  return false;
};

const resolveProvider = (to: string): MailProvider => (isMainlandMailbox(to) ? 'tencent_ses' : 'brevo');

const inferLocaleFromLink = (link: string): MailLocale | null => {
  try {
    const u = new URL(link);
    const redirect = u.searchParams.get('redirect');
    if (!redirect) return null;
    const decoded = decodeURIComponent(redirect);
    const maybeUrl = decoded.startsWith('http://') || decoded.startsWith('https://') ? new URL(decoded) : null;
    const path = maybeUrl ? maybeUrl.pathname : decoded;
    const m = String(path || '').match(/^\/(zh-TW|zh-CN|zh-HK|en|ja)(\/|$)/);
    return normalizeLocale(m?.[1]);
  } catch {
    return null;
  }
};

const envTemplateId = (purpose: AuthMailPurpose, locale: MailLocale): number | null => {
  const base = purpose === 'verify_email' ? 'VERIFY' : purpose === 'reset_password' ? 'RESET' : 'LOGIN';
  const suffix = `_${locale.replace('-', '_').toUpperCase()}`;
  const key = `TENCENT_SES_TEMPLATE_${base}_ID${suffix}`;
  const value = (process.env as any)[key] as string | undefined;
  if (value && String(value).trim()) return Number(value);

  if (locale === 'zh-HK') {
    const fallback = `TENCENT_SES_TEMPLATE_${base}_ID_ZH_TW`;
    const fallbackValue = (process.env as any)[fallback] as string | undefined;
    if (fallbackValue && String(fallbackValue).trim()) return Number(fallbackValue);
  }
  if (locale === 'zh-TW') {
    const fallback = `TENCENT_SES_TEMPLATE_${base}_ID_ZH_HK`;
    const fallbackValue = (process.env as any)[fallback] as string | undefined;
    if (fallbackValue && String(fallbackValue).trim()) return Number(fallbackValue);
  }

  const defaultKey = `TENCENT_SES_TEMPLATE_${base}_ID`;
  const defaultValue = (process.env as any)[defaultKey] as string | undefined;
  if (defaultValue && String(defaultValue).trim()) return Number(defaultValue);
  return null;
};

const subjectByPurpose = (purpose: AuthMailPurpose, locale: MailLocale) => {
  if (purpose === 'verify_email') {
    if (locale === 'en') return 'ZTMY Gallery Email Verification';
    if (locale === 'ja') return 'ZTMY Gallery メール認証';
    if (locale === 'zh-CN') return 'ZTMY Gallery 注册验证';
    return 'ZTMY Gallery 註冊驗證';
  }
  if (purpose === 'reset_password') {
    if (locale === 'en') return 'ZTMY Gallery Password Reset';
    if (locale === 'ja') return 'ZTMY Gallery パスワード再設定';
    if (locale === 'zh-CN') return 'ZTMY Gallery 重置密码';
    return 'ZTMY Gallery 重設密碼';
  }
  if (locale === 'en') return 'ZTMY Gallery Login Link';
  if (locale === 'ja') return 'ZTMY Gallery ログインリンク';
  if (locale === 'zh-CN') return 'ZTMY Gallery 登录链接';
  return 'ZTMY Gallery 登入連結';
};

const htmlByPurpose = (purpose: AuthMailPurpose, locale: MailLocale) => {
  if (purpose === 'verify_email') {
    if (locale === 'en') {
      return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">Email Verification</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;">You are signing up for ZTMY Gallery. Click the button below to verify your email (link expires soon).</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Verify Email</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#555555;">If the button doesn't work, copy and paste this link into your browser:<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">If you didn't request this, you can ignore this email.</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
    }
    if (locale === 'ja') {
      return `<!doctype html><html lang="ja"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">メール認証</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:14px;line-height:1.7;color:#111111;">ZTMY Gallery への登録を行っています。下のボタンをクリックしてメールアドレスを認証してください（リンクは期限付きです）。</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">認証する</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:12px;line-height:1.6;color:#555555;">ボタンが動作しない場合は、次のリンクをブラウザに貼り付けてください：<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">心当たりがない場合は、このメールを無視してください。</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
    }
    if (locale === 'zh-CN') {
      return `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">注册验证</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;line-height:1.7;color:#111111;">你正在注册 ZTMY Gallery。请点击下方按钮完成 Email 验证（有效时间有限，请勿转发）。</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">完成验证</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#555555;">若按钮无法点击，请复制此链接到浏览器：<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">若非你本人操作，请忽略此邮件。</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
    }
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">註冊驗證</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;line-height:1.7;color:#111111;">你正在註冊 ZTMY Gallery。請點擊下方按鈕完成 Email 驗證（有效時間有限，請勿轉發）。</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">完成驗證</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#555555;">若按鈕無法點擊，請複製此連結到瀏覽器：<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">若非你本人操作，請忽略此郵件。</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
  }

  if (purpose === 'reset_password') {
    if (locale === 'en') {
      return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">Password Reset</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;">You requested a password reset for ZTMY Gallery. Click the button below to set a new password (link expires soon).</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Reset Password</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#555555;">If the button doesn't work, copy and paste this link into your browser:<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">If you didn't request this, you can ignore this email.</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
    }
    if (locale === 'ja') {
      return `<!doctype html><html lang="ja"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">パスワード再設定</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:14px;line-height:1.7;color:#111111;">ZTMY Gallery のパスワード再設定を行っています。下のボタンをクリックして新しいパスワードを設定してください（リンクは期限付きです）。</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">再設定する</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:12px;line-height:1.6;color:#555555;">ボタンが動作しない場合は、次のリンクをブラウザに貼り付けてください：<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">心当たりがない場合は、このメールを無視してください。</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
    }
    if (locale === 'zh-CN') {
      return `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">重置密码</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;line-height:1.7;color:#111111;">你正在重置 ZTMY Gallery 的密码。请点击下方按钮设置新密码（有效时间有限，请勿转发）。</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">重置密码</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#555555;">若按钮无法点击，请复制此链接到浏览器：<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">若非你本人操作，请忽略此邮件。</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
    }
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#f7f7f7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f7f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#ffffff;border:2px solid #000000;"><tr><td style="background:#000000;padding:16px 18px;color:#ffffff;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">ZUTOMAYO GALLERY</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:22px;line-height:1.2;font-weight:800;margin-top:6px;">重設密碼</div></td></tr><tr><td style="padding:18px 18px 0;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;line-height:1.7;color:#111111;">你正在重設 ZTMY Gallery 的密碼。請點擊下方按鈕設定新密碼（有效時間有限，請勿轉發）。</div></td></tr><tr><td style="padding:18px;"><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td bgcolor="#000000" style="border:2px solid #000000;"><a href="{{link}}" style="display:inline-block;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">重設密碼</a></td></tr></table></td></tr><tr><td style="padding:0 18px 18px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#555555;">若按鈕無法點擊，請複製此連結到瀏覽器：<br /><span style="word-break:break-all;color:#000000;">{{link}}</span></div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif;font-size:12px;line-height:1.6;color:#777777;margin-top:10px;">若非你本人操作，請忽略此郵件。</div></td></tr><tr><td style="border-top:2px solid #000000;background:#f5f5f5;padding:12px 18px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.6;color:#333333;">SECURITY NOTICE · DO NOT FORWARD</div></td></tr></table></td></tr></table></body></html>`;
  }

  return '';
};

const isTencentConfigured = () => {
  const fromAny = Boolean(
    process.env.TENCENT_SES_FROM_EMAIL ||
      process.env.TENCENT_SES_FROM_LOGIN_EMAIL ||
      process.env.TENCENT_SES_FROM_VERIFY_EMAIL ||
      process.env.TENCENT_SES_FROM_RESET_EMAIL,
  );
  const hasAny = (keys: string[]) =>
    keys.some((k) => Boolean((process.env as any)[k] && String((process.env as any)[k]).trim()));
  const verifyKeys = [
    'TENCENT_SES_TEMPLATE_VERIFY_ID',
    'TENCENT_SES_TEMPLATE_VERIFY_ID_ZH_TW',
    'TENCENT_SES_TEMPLATE_VERIFY_ID_ZH_CN',
    'TENCENT_SES_TEMPLATE_VERIFY_ID_ZH_HK',
    'TENCENT_SES_TEMPLATE_VERIFY_ID_EN',
    'TENCENT_SES_TEMPLATE_VERIFY_ID_JA',
  ];
  const resetKeys = [
    'TENCENT_SES_TEMPLATE_RESET_ID',
    'TENCENT_SES_TEMPLATE_RESET_ID_ZH_TW',
    'TENCENT_SES_TEMPLATE_RESET_ID_ZH_CN',
    'TENCENT_SES_TEMPLATE_RESET_ID_ZH_HK',
    'TENCENT_SES_TEMPLATE_RESET_ID_EN',
    'TENCENT_SES_TEMPLATE_RESET_ID_JA',
  ];
  const templateOk = hasAny(verifyKeys) && hasAny(resetKeys);
  return Boolean(tcSecretId && tcSecretKey && tcRegion && fromAny && templateOk);
};

const getBrevoSenderByPurpose = (purpose: AuthMailPurpose) => {
  const commonEmail = process.env.BREVO_FROM_EMAIL;
  const commonName = process.env.BREVO_FROM_NAME;
  const map = {
    login: {
      email: process.env.BREVO_FROM_LOGIN_EMAIL || commonEmail,
      name: process.env.BREVO_FROM_LOGIN_NAME || commonName,
    },
    verify_email: {
      email: process.env.BREVO_FROM_VERIFY_EMAIL || commonEmail,
      name: process.env.BREVO_FROM_VERIFY_NAME || commonName,
    },
    reset_password: {
      email: process.env.BREVO_FROM_RESET_EMAIL || commonEmail,
      name: process.env.BREVO_FROM_RESET_NAME || commonName,
    },
  }[purpose];
  if (!map?.email) return null;
  return { email: String(map.email).trim(), name: map.name ? String(map.name).trim() : undefined };
};

const isBrevoConfigured = () => Boolean(brevoApiKey && (process.env.BREVO_FROM_EMAIL || process.env.BREVO_FROM_VERIFY_EMAIL || process.env.BREVO_FROM_RESET_EMAIL));

const callBrevo = async (payload: any) => {
  if (!brevoApiKey) throw new Error('BREVO_API_KEY_MISSING');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify(payload || {}),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP_${res.status}`;
    throw new Error(`BREVO_SEND_FAILED:${msg}`);
  }
  return json;
};

const sendBrevoEmail = async (args: { to: string; sender: { email: string; name?: string }; subject: string; html: string }) => {
  await callBrevo({
    sender: { email: args.sender.email, name: args.sender.name || undefined },
    to: [{ email: args.to }],
    subject: args.subject,
    htmlContent: args.html,
  });
  return true;
};

const getFromByPurpose = (purpose: AuthMailPurpose) => {
  const commonEmail = process.env.TENCENT_SES_FROM_EMAIL;
  const commonName = process.env.TENCENT_SES_FROM_NAME;

  const map = {
    login: {
      email: process.env.TENCENT_SES_FROM_LOGIN_EMAIL || commonEmail,
      name: process.env.TENCENT_SES_FROM_LOGIN_NAME || commonName,
    },
    verify_email: {
      email: process.env.TENCENT_SES_FROM_VERIFY_EMAIL || commonEmail,
      name: process.env.TENCENT_SES_FROM_VERIFY_NAME || commonName,
    },
    reset_password: {
      email: process.env.TENCENT_SES_FROM_RESET_EMAIL || commonEmail,
      name: process.env.TENCENT_SES_FROM_RESET_NAME || commonName,
    },
  }[purpose];

  if (!map?.email) return undefined;
  if (map.name && map.name.trim()) return `${map.name.trim()} <${map.email.trim()}>`;
  return map.email.trim();
};

export const isMailConfigured = () => {
  return isTencentConfigured() || isBrevoConfigured();
};

export const isMailConfiguredFor = (to: string) => {
  const provider = resolveProvider(to);
  if (provider === 'tencent_ses') return isTencentConfigured();
  return isBrevoConfigured();
};

const base64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

const sha256Hex = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (key: Buffer | string, s: string) => crypto.createHmac('sha256', key).update(s).digest();

const callTencentSes = async (action: string, payload: any) => {
  if (!tcSecretId || !tcSecretKey) {
    throw new Error('TENCENT_CREDENTIALS_MISSING');
  }

  const service = 'ses';
  const host = tcEndpoint;
  const contentType = 'application/json; charset=utf-8';
  const version = '2020-10-02';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const signedHeaders = 'content-type;host';

  const body = JSON.stringify(payload || {});
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(body)}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
  const secretDate = hmac(`TC3${tcSecretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
  const authorization = `TC3-HMAC-SHA256 Credential=${tcSecretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      Host: host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Region': tcRegion,
      'X-TC-Timestamp': String(timestamp),
    },
    body,
  });

  const json: any = await res.json().catch(() => null);
  const err = json?.Response?.Error;
  if (!res.ok || err) {
    const code = err?.Code || 'TENCENT_SES_REQUEST_FAILED';
    const message = err?.Message || `HTTP_${res.status}`;
    throw new Error(`${code}:${message}`);
  }
  return json?.Response;
};

const sendTencentSesEmail = async (args: { to: string; from: string; subject: string; text: string; html?: string; template?: { id: number; data: any } }) => {
  const payload: any = {
    FromEmailAddress: args.from,
    Destination: [args.to],
    Subject: args.subject,
  };

  if (args.template) {
    payload.Template = {
      TemplateID: args.template.id,
      TemplateData: JSON.stringify(args.template.data || {}),
    };
  } else {
    payload.Simple = {
      Text: base64(args.text),
      Html: args.html ? base64(args.html) : undefined,
    };
  }

  await callTencentSes('SendEmail', payload);
  return true;
};

const buildAuthMail = (purpose: AuthMailPurpose, link: string) => {
  if (purpose === 'verify_email') {
    return {
      subject: 'ZTMY Gallery 註冊驗證',
      text: `請使用以下連結完成註冊驗證（有效時間有限，請勿轉發）：\n\n${link}\n\n如果不是你本人操作，請忽略此郵件。`,
      html: `<div style="font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; line-height:1.6;">
  <h2 style="margin:0 0 12px;">ZTMY Gallery 註冊驗證</h2>
  <p>請點擊下方按鈕完成註冊驗證（有效時間有限，請勿轉發）：</p>
  <p style="margin:18px 0;">
    <a href="${link}" style="display:inline-block;background:#000;color:#fff;padding:10px 14px;text-decoration:none;border:2px solid #000;font-weight:700;">完成驗證</a>
  </p>
  <p style="font-size:12px;color:#666;">若按鈕無法點擊，請複製此連結到瀏覽器：<br/><span style="word-break:break-all;">${link}</span></p>
  <p style="font-size:12px;color:#666;">如果不是你本人操作，請忽略此郵件。</p>
</div>`,
    };
  }

  if (purpose === 'reset_password') {
    return {
      subject: 'ZTMY Gallery 重設密碼',
      text: `請使用以下連結重設密碼（有效時間有限，請勿轉發）：\n\n${link}\n\n如果不是你本人操作，請忽略此郵件。`,
      html: `<div style="font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; line-height:1.6;">
  <h2 style="margin:0 0 12px;">ZTMY Gallery 重設密碼</h2>
  <p>請點擊下方按鈕重設密碼（有效時間有限，請勿轉發）：</p>
  <p style="margin:18px 0;">
    <a href="${link}" style="display:inline-block;background:#000;color:#fff;padding:10px 14px;text-decoration:none;border:2px solid #000;font-weight:700;">重設密碼</a>
  </p>
  <p style="font-size:12px;color:#666;">若按鈕無法點擊，請複製此連結到瀏覽器：<br/><span style="word-break:break-all;">${link}</span></p>
  <p style="font-size:12px;color:#666;">如果不是你本人操作，請忽略此郵件。</p>
</div>`,
    };
  }

  return {
    subject: 'ZTMY Gallery 登入連結',
    text: `請使用以下連結登入（有效時間短，請勿轉發）：\n\n${link}\n\n如果不是你本人操作，請忽略此郵件。`,
    html: `<div style="font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; line-height:1.6;">
  <h2 style="margin:0 0 12px;">ZTMY Gallery 登入</h2>
  <p>請點擊下方按鈕登入（有效時間有限，請勿轉發）：</p>
  <p style="margin:18px 0;">
    <a href="${link}" style="display:inline-block;background:#000;color:#fff;padding:10px 14px;text-decoration:none;border:2px solid #000;font-weight:700;">登入</a>
  </p>
  <p style="font-size:12px;color:#666;">若按鈕無法點擊，請複製此連結到瀏覽器：<br/><span style="word-break:break-all;">${link}</span></p>
  <p style="font-size:12px;color:#666;">如果不是你本人操作，請忽略此郵件。</p>
</div>`,
  };
};

export const sendAuthLinkEmail = async (to: string, args: { purpose: AuthMailPurpose; link: string }) => {
  const provider = resolveProvider(to);
  const normalizedLink = String(args.link || '').trim().replaceAll('`', '');
  const inferredLocale = inferLocaleFromLink(normalizedLink) || defaultLocale;

  if (provider === 'tencent_ses') {
    if (!isTencentConfigured()) return false;
    const from = getFromByPurpose(args.purpose);
    if (!from) return false;
    const templateId = envTemplateId(args.purpose, inferredLocale);
    if (!templateId) {
      throw new Error(`TENCENT_SES_TEMPLATE_ID_MISSING:${args.purpose}:${inferredLocale}`);
    }
    await sendTencentSesEmail({
      to,
      from,
      subject: subjectByPurpose(args.purpose, inferredLocale),
      text: '',
      template: { id: templateId, data: { link: normalizedLink } },
    });
    return true;
  }

  if (!isBrevoConfigured()) return false;
  const sender = getBrevoSenderByPurpose(args.purpose);
  if (!sender) return false;
  const html = htmlByPurpose(args.purpose, inferredLocale).replaceAll('{{link}}', normalizedLink);
  await sendBrevoEmail({
    to,
    sender,
    subject: subjectByPurpose(args.purpose, inferredLocale),
    html,
  });
  return true;
};

export const sendMagicLinkEmail = async (to: string, link: string) => {
  return sendAuthLinkEmail(to, { purpose: 'login', link });
};
