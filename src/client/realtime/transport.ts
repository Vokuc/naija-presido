import { createClient } from '@/lib/db/client';
import {
  RealtimeTransport,
  PresencePlayer,
  MovementFrame,
  OutgoingChatMessage,
  ChatMessage,
  StateBroadcastEvent,
  RemotePlayerState,
} from './types';
import {
  validateMovementFrame,
  sanitizeChatMessage,
  validatePresencePlayer,
} from './validator';

export class SupabaseRealtimeTransport implements RealtimeTransport {
  private channel: any = null;
  private currentZoneId: string | null = null;
  private currentPresence: PresencePlayer | null = null;

  private presenceSyncHandlers = new Set<(players: RemotePlayerState[]) => void>();
  private movementHandlers = new Set<(frame: MovementFrame) => void>();
  private chatHandlers = new Set<(msg: ChatMessage) => void>();
  private stateEventHandlers = new Set<(event: StateBroadcastEvent) => void>();

  // Tracking previous known positions per remote character for velocity sanity checks
  private previousPlayerPositions = new Map<string, { pos: [number, number, number]; time: number }>();

  public async joinZone(zoneId: string, presence: PresencePlayer): Promise<void> {
    const validated = validatePresencePlayer(presence);
    if (!validated.isValid || !validated.sanitized) {
      console.warn('Rejected invalid presence data:', validated.reason);
      return;
    }

    // Leave previous channel if active
    if (this.channel) {
      await this.leaveZone();
    }

    this.currentZoneId = zoneId;
    this.currentPresence = validated.sanitized;

    if (typeof window === 'undefined') return;

    try {
      const supabase = createClient();
      const channelName = `zone:${zoneId}:presence`;

      this.channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: presence.characterId },
        },
      });

      // 1. Presence Sync & Tracking
      this.channel
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel.presenceState();
          const remotePlayers: RemotePlayerState[] = [];

          for (const key of Object.keys(state)) {
            const presences = state[key];
            if (Array.isArray(presences) && presences.length > 0) {
              const p = presences[0] as PresencePlayer;
              if (p.characterId !== this.currentPresence?.characterId) {
                remotePlayers.push({
                  characterId: p.characterId,
                  displayName: p.displayName || 'Citizen',
                  jobTitle: p.jobTitle || 'Resident',
                  avatarConfig: p.avatarConfig || {},
                  position: [0, 0, 0],
                  targetPosition: [0, 0, 0],
                  rotation: 0,
                  targetRotation: 0,
                  isMoving: false,
                  lastUpdated: Date.now(),
                });
              }
            }
          }

          this.presenceSyncHandlers.forEach((handler) => handler(remotePlayers));
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          if (Array.isArray(leftPresences)) {
            leftPresences.forEach((lp: any) => {
              if (lp.characterId) {
                this.previousPlayerPositions.delete(lp.characterId);
              }
            });
          }
        });

      // 2. High-Frequency Movement Broadcast Listener with Anti-Cheat Validation
      this.channel.on('broadcast', { event: 'player_movement' }, ({ payload }: any) => {
        if (!payload || payload.characterId === this.currentPresence?.characterId) return;

        const prev = this.previousPlayerPositions.get(payload.characterId);
        const validatedFrame = validateMovementFrame(
          payload,
          prev?.pos,
          prev?.time
        );

        if (!validatedFrame.isValid || !validatedFrame.sanitized) {
          // Reject impossible state claim silently or log warning
          return;
        }

        const valid = validatedFrame.sanitized;
        this.previousPlayerPositions.set(valid.characterId, {
          pos: valid.position,
          time: valid.timestamp,
        });

        this.movementHandlers.forEach((handler) => handler(valid));
      });

      // 3. Neighbourhood Proximity Chat Listener
      this.channel.on('broadcast', { event: 'neighbourhood_chat' }, ({ payload }: any) => {
        if (!payload || typeof payload !== 'object') return;

        const sanitized = sanitizeChatMessage(payload.text);
        if (!sanitized.isValid) return;

        const msg: ChatMessage = {
          id: payload.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          characterId: payload.characterId || 'unknown',
          displayName: payload.displayName || 'Citizen',
          text: sanitized.sanitizedText,
          zoneId: this.currentZoneId || '',
          venueId: payload.venueId || null,
          timestamp: payload.timestamp || Date.now(),
        };

        this.chatHandlers.forEach((handler) => handler(msg));
      });

      // 4. Low-Frequency State Event Synchronization Listener
      this.channel.on('broadcast', { event: 'state_event' }, ({ payload }: any) => {
        if (!payload || typeof payload !== 'object') return;
        this.stateEventHandlers.forEach((handler) => handler(payload as StateBroadcastEvent));
      });

      // Subscribe and Track Presence
      this.channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track(this.currentPresence);
        }
      });
    } catch (err) {
      console.warn('Supabase Realtime transport initialization bypassed:', err);
    }
  }

  public async leaveZone(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.untrack();
        await this.channel.unsubscribe();
      } catch {
        // Ignored
      }
      this.channel = null;
    }
    this.currentZoneId = null;
    this.currentPresence = null;
    this.previousPlayerPositions.clear();
  }

  public sendMovement(frame: MovementFrame): void {
    if (!this.channel) return;
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'player_movement',
        payload: frame,
      });
    } catch {
      // Ephemeral broadcast silently drops on transient network lag
    }
  }

  public sendChat(message: OutgoingChatMessage): void {
    if (!this.channel || !this.currentPresence) return;

    const validated = sanitizeChatMessage(message.text);
    if (!validated.isValid) return;

    const chatPayload: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      characterId: this.currentPresence.characterId,
      displayName: this.currentPresence.displayName,
      text: validated.sanitizedText,
      zoneId: this.currentZoneId || '',
      venueId: this.currentPresence.venueId,
      timestamp: Date.now(),
    };

    // Notify local chat immediately
    this.chatHandlers.forEach((handler) => handler(chatPayload));

    try {
      this.channel.send({
        type: 'broadcast',
        event: 'neighbourhood_chat',
        payload: chatPayload,
      });
    } catch {
      // Ignored
    }
  }

  public sendStateEvent(event: StateBroadcastEvent): void {
    if (!this.channel) return;
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'state_event',
        payload: event,
      });
    } catch {
      // Ignored
    }
  }

  public onPresenceSync(handler: (players: RemotePlayerState[]) => void): () => void {
    this.presenceSyncHandlers.add(handler);
    return () => this.presenceSyncHandlers.delete(handler);
  }

  public onPlayerMovement(handler: (frame: MovementFrame) => void): () => void {
    this.movementHandlers.add(handler);
    return () => this.movementHandlers.delete(handler);
  }

  public onChat(handler: (msg: ChatMessage) => void): () => void {
    this.chatHandlers.add(handler);
    return () => this.chatHandlers.delete(handler);
  }

  public onStateEvent(handler: (event: StateBroadcastEvent) => void): () => void {
    this.stateEventHandlers.add(handler);
    return () => this.stateEventHandlers.delete(handler);
  }

  public disconnect(): void {
    this.leaveZone();
    this.presenceSyncHandlers.clear();
    this.movementHandlers.clear();
    this.chatHandlers.clear();
    this.stateEventHandlers.clear();
  }
}

// Global transport singleton instance
let transportInstance: RealtimeTransport | null = null;

export function getRealtimeTransport(): RealtimeTransport {
  if (!transportInstance) {
    transportInstance = new SupabaseRealtimeTransport();
  }
  return transportInstance;
}

export function setRealtimeTransport(customTransport: RealtimeTransport): void {
  if (transportInstance) {
    transportInstance.disconnect();
  }
  transportInstance = customTransport;
}
