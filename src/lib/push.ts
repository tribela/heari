import webpush from 'web-push';
import { getAllPushSubscriptions, removePushSubscription } from './db';

function ensureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }
}

export { ensureVapid };

export async function sendPushToAll(payload: string): Promise<void> {
  ensureVapid();
  const subs = await getAllPushSubscriptions();
  if (subs.length === 0) return;
  
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  );

  const toRemove: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        toRemove.push(subs[i].endpoint);
      }
    }
  });

  if (toRemove.length > 0) {
    await Promise.all(toRemove.map((ep) => removePushSubscription(ep)));
  }
}
