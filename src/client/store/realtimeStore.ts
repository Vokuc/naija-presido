import { createClient } from '@/lib/db/client';
import { useGameStore } from './gameStore';

let realtimeChannel: any = null;
let broadcastThrottleTimer: NodeJS.Timeout | null = null;
let lastBroadcastPos = [0, 0, 0];

export function initRealtimePresence(zoneId: string, player: { id: string; name: string }) {
  if (typeof window === 'undefined') return;
  if (realtimeChannel) return;

  try {
    const supabase = createClient();
    const channelName = `zone:${zoneId}:movement`;

    realtimeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    realtimeChannel
      .on('broadcast', { event: 'player_moved' }, ({ payload }: any) => {
        if (!payload || payload.id === player.id) return;
        useGameStore.getState().updateOtherPlayer(payload.id, {
          name: payload.name || 'Citizen',
          position: payload.position,
          rotation: payload.rotation || 0,
          isMoving: !!payload.isMoving,
        });
      })
      .on('broadcast', { event: 'player_left' }, ({ payload }: any) => {
        if (!payload) return;
        useGameStore.getState().removeOtherPlayer(payload.id);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence
          realtimeChannel?.send({
            type: 'broadcast',
            event: 'player_moved',
            payload: {
              id: player.id,
              name: player.name,
              position: useGameStore.getState().position,
              rotation: useGameStore.getState().rotation,
              isMoving: false,
            },
          });
        }
      });
  } catch (err) {
    console.warn('Realtime channel initialization bypassed:', err);
  }
}

export function broadcastMovement(
  player: { id: string; name: string },
  position: [number, number, number],
  rotation: number,
  isMoving: boolean
) {
  if (!realtimeChannel) return;

  const dx = position[0] - lastBroadcastPos[0];
  const dz = position[2] - lastBroadcastPos[2];
  const distanceMoved = Math.hypot(dx, dz);

  // Throttle broadcast to ~15hz or significant displacement
  if (!broadcastThrottleTimer && (distanceMoved > 0.05 || !isMoving)) {
    lastBroadcastPos = [...position];
    broadcastThrottleTimer = setTimeout(() => {
      broadcastThrottleTimer = null;
    }, 66);

    try {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'player_moved',
        payload: {
          id: player.id,
          name: player.name,
          position,
          rotation,
          isMoving,
        },
      });
    } catch {
      // Ephemeral broadcast silently ignores network drops
    }
  }
}

export function cleanupRealtimePresence(playerId: string) {
  if (realtimeChannel) {
    try {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'player_left',
        payload: { id: playerId },
      });
      realtimeChannel.unsubscribe();
    } catch {
      // Ignored
    }
    realtimeChannel = null;
  }
}
