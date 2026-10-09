import { NextResponse } from 'next/server';
import { Env } from '@/lib/config/env';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${Env.TICK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Fast tick logic (e.g. process queued consequences)
  
  return NextResponse.json({ ok: true, type: 'fast' });
}
