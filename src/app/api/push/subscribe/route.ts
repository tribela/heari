import { NextRequest, NextResponse } from 'next/server';
import { addPushSubscription, removePushSubscription } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { endpoint, p256dh, auth } = await req.json();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 });
    }
    await addPushSubscription(endpoint, p256dh, auth);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}