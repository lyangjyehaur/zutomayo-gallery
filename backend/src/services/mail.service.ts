import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM;

export const isMailConfigured = () => Boolean(host && from);

export const sendMagicLinkEmail = async (to: string, link: string) => {
  if (!isMailConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    subject: 'ZTMY Gallery 投稿登入連結',
    text: `請使用以下連結登入（有效時間短，請勿轉發）：\n\n${link}\n\n如果不是你本人操作，請忽略此郵件。`,
  });

  return true;
};

