import crypto from 'crypto';
import fetch from 'node-fetch';

type AuthMailPurpose = 'login' | 'verify_email' | 'reset_password';

const tcSecretId = process.env.TENCENT_SECRET_ID;
const tcSecretKey = process.env.TENCENT_SECRET_KEY;
const tcRegion = process.env.TENCENT_SES_REGION || 'ap-guangzhou';
const tcEndpoint = process.env.TENCENT_SES_ENDPOINT || 'ses.tencentcloudapi.com';

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
  const fromAny = Boolean(
    process.env.TENCENT_SES_FROM_EMAIL ||
      process.env.TENCENT_SES_FROM_LOGIN_EMAIL ||
      process.env.TENCENT_SES_FROM_VERIFY_EMAIL ||
      process.env.TENCENT_SES_FROM_RESET_EMAIL,
  );
  const templateOk = Boolean(process.env.TENCENT_SES_TEMPLATE_VERIFY_ID && process.env.TENCENT_SES_TEMPLATE_RESET_ID);
  return Boolean(tcSecretId && tcSecretKey && tcRegion && fromAny && templateOk);
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
  if (!isMailConfigured()) return false;
  const from = getFromByPurpose(args.purpose);
  if (!from) return false;

  const mail = buildAuthMail(args.purpose, args.link);

  const templateIdEnv =
    args.purpose === 'verify_email'
      ? process.env.TENCENT_SES_TEMPLATE_VERIFY_ID
      : args.purpose === 'reset_password'
        ? process.env.TENCENT_SES_TEMPLATE_RESET_ID
        : process.env.TENCENT_SES_TEMPLATE_LOGIN_ID;
  const templateId = templateIdEnv ? Number(templateIdEnv) : null;
  if (!templateId) {
    throw new Error('TENCENT_SES_TEMPLATE_ID_MISSING');
  }

  await sendTencentSesEmail({
    to,
    from,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    template: { id: templateId, data: { link: args.link } },
  });

  return true;
};

export const sendMagicLinkEmail = async (to: string, link: string) => {
  return sendAuthLinkEmail(to, { purpose: 'login', link });
};
