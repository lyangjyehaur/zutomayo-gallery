import webpush from 'web-push';

function generateVapidKeys() {
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('\n🔑 VAPID Keys Generated Successfully!\n');
  console.log('Add these to your .env file:\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=${process.env.VAPID_SUBJECT || 'mailto:admin@example.com'}`);
  console.log('\n⚠️  Keep VAPID_PRIVATE_KEY secret! Never commit it to version control.\n');
}

generateVapidKeys();
