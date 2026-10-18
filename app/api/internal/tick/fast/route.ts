import { NextResponse } from 'next/server';
import { Env } from '@/lib/config/env';
import { createAdminClient } from '@/lib/db/server';
import { NpcService } from '@/domains/npc/service';
import { EventService } from '@/domains/events';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!Env.TICK_SECRET || Env.TICK_SECRET.trim().length === 0 || authHeader !== `Bearer ${Env.TICK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = createAdminClient();
    const gameTimeIso = await EventService.resolveGameTime(adminDb);
    const gameTime = new Date(gameTimeIso);

    const tickResult = await NpcService.simulateTick(
      { gameTime, realNow: new Date() },
      adminDb as any
    );

    return NextResponse.json({
      ok: true,
      type: 'fast',
      gameTime: tickResult.gameTime.toISOString(),
      gameHour: tickResult.gameHour,
      processedNpcCount: tickResult.processedNpcCount,
      actionsExecutedCount: tickResult.actionsExecuted.length,
      actions: tickResult.actionsExecuted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Tick simulation failed' },
      { status: 500 }
    );
  }
}

