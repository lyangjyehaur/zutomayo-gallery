import 'dotenv/config';
import { sendAuthLinkEmail } from '../services/mail.service.js';

type Purpose = 'login' | 'verify_email' | 'reset_password';

const to = String(process.argv[2] || '').trim();
const purpose = (String(process.argv[3] || 'verify_email').trim() || 'verify_email') as Purpose;
const link = String(process.argv[4] || 'https://ztmy.art').trim() || 'https://ztmy.art';

const isPurpose = (p: string): p is Purpose => p === 'login' || p === 'verify_email' || p === 'reset_password';

async function run() {
  if (!to || !to.includes('@')) {
    console.error('Usage: pnpm -C backend mail:test <toEmail> [login|verify_email|reset_password] [link]');
    process.exit(1);
  }
  if (!isPurpose(purpose)) {
    console.error('Invalid purpose. Use: login | verify_email | reset_password');
    process.exit(1);
  }

  const ok = await sendAuthLinkEmail(to, { purpose, link });
  if (!ok) {
    console.error('Mail not configured or send returned false');
    process.exit(2);
  }
  console.log('OK');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

