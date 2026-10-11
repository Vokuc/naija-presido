import { useGameStore } from './gameStore';
import { getRealtimeTransport } from '../realtime/transport';
import { MovementFrame, ChatMessage, StateBroadcastEvent, RemotePlayerState } from '../realtime/types';

let broadcastThrottleTimer: NodeJS.Timeout | null = null;
let lastBroadcastPos = [0, 0, 0];
let unsubscribePresence: (() => void) | null = null;
let unsubscribeMovement: (() => void) | null = null;
let unsubscribeChat: (() => void) | null = null;
let unsubscribeStateEvent: (() => void) | null = null;

export async function initRealtimePresence(
  zoneId: string,
  player: { characterId: string; displayName: string; jobTitle?: string }
) {
  if (typeof window === 'undefined') return;

  const transport = getRealtimeTransport();

  // Clear previous listeners
  if (unsubscribePresence) unsubscribePresence();
  if (unsubscribeMovement) unsubscribeMovement();
  if (unsubscribeChat) unsubscribeChat();
  if (unsubscribeStateEvent) unsubscribeStateEvent();

  // 1. Listen to presence sync
  unsubscribePresence = transport.onPresenceSync((remotePlayers: RemotePlayerState[]) => {
    useGameStore.getState().syncRemotePlayers(remotePlayers);
  });

  // 2. Listen to remote movement frames
  unsubscribeMovement = transport.onPlayerMovement((frame: MovementFrame) => {
    useGameStore.getState().updateRemotePlayerMovement(frame);
  });

  // 3. Listen to proximity chat
  unsubscribeChat = transport.onChat((msg: ChatMessage) => {
    useGameStore.getState().addChatMessage(msg);
  });

  // 4. Listen to low-frequency state events (e.g. player bought bole, worked shift)
  unsubscribeStateEvent = transport.onStateEvent((event: StateBroadcastEvent) => {
    useGameStore.getState().addToast(`${event.actorName}: ${event.description}`, 'info');
  });

  // Join the zone channel
  await transport.joinZone(zoneId, {
    characterId: player.characterId,
    displayName: player.displayName,
    jobTitle: player.jobTitle || 'Resident',
    joinedAt: new Date().toISOString(),
    zoneId,
    venueId: useGameStore.getState().player?.venueId ?? null,
  });
}

export function broadcastMovement(
  player: { id: string; name: string },
  position: [number, number, number],
  rotation: number,
  isMoving: boolean
) {
  const dx = position[0] - lastBroadcastPos[0];
  const dz = position[2] - lastBroadcastPos[2];
  const distanceMoved = Math.hypot(dx, dz);

  // Throttle broadcast to ~15-20Hz unless moving significantly
  if (!broadcastThrottleTimer && (distanceMoved > 0.04 || !isMoving)) {
    lastBroadcastPos = [...position];
    broadcastThrottleTimer = setTimeout(() => {
      broadcastThrottleTimer = null;
    }, 55);

    const transport = getRealtimeTransport();
    transport.sendMovement({
      characterId: player.id,
      displayName: player.name,
      position,
      rotation,
      isMoving,
      timestamp: Date.now(),
    });
  }
}

export function sendNeighbourhoodChat(text: string) {
  const transport = getRealtimeTransport();
  transport.sendChat({ text });
}

export function broadcastStateChange(
  type: StateBroadcastEvent['type'],
  description: string,
  payload?: Record<string, unknown>
) {
  const player = useGameStore.getState().player;
  if (!player) return;

  const transport = getRealtimeTransport();
  transport.sendStateEvent({
    type,
    actorId: player.characterId,
    actorName: player.displayName,
    description,
    payload,
    timestamp: Date.now(),
  });
}

export async function cleanupRealtimePresence(_playerId?: string) {
  if (unsubscribePresence) unsubscribePresence();
  if (unsubscribeMovement) unsubscribeMovement();
  if (unsubscribeChat) unsubscribeChat();
  if (unsubscribeStateEvent) unsubscribeStateEvent();

  const transport = getRealtimeTransport();
  await transport.leaveZone();
}
