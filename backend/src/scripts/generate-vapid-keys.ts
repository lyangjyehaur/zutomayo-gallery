import webpush from 'web-push';

function generateVapidKeys() {
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('\n🔑 VAPID Keys Generated Successfully!\n');
  console.log('Add these to your .env file:\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:admin@ztmr.club`);
  console.log('\n⚠️  Keep VAPID_PRIVATE_KEY secret! Never commit it to version control.\n');
}

generateVapidKeys();
