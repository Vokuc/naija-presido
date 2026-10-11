import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateMovementFrame,
  sanitizeChatMessage,
  validatePresencePlayer,
  MOVEMENT_BOUNDS,
  MAX_REASONABLE_SPEED,
} from '../src/client/realtime/validator';
import {
  RealtimeTransport,
  MovementFrame,
  PresencePlayer,
  ChatMessage,
  StateBroadcastEvent,
  RemotePlayerState,
} from '../src/client/realtime/types';
import { setRealtimeTransport } from '../src/client/realtime/transport';
import { useGameStore } from '../src/client/store/gameStore';

/**
 * In-memory Mock Realtime Transport simulating multiple interconnected game clients
 * in the same neighbourhood zone.
 */
class MockHubRealtimeTransport implements RealtimeTransport {
  // Shared static bus simulating the Supabase broadcast network
  private static buses = new Map<string, Set<MockHubRealtimeTransport>>();

  public currentZoneId: string | null = null;
  public presence: PresencePlayer | null = null;

  public presenceSyncHandlers = new Set<(players: RemotePlayerState[]) => void>();
  public movementHandlers = new Set<(frame: MovementFrame) => void>();
  public chatHandlers = new Set<(msg: ChatMessage) => void>();
  public stateEventHandlers = new Set<(event: StateBroadcastEvent) => void>();

  constructor(public clientId: string) {}

  public async joinZone(zoneId: string, presence: PresencePlayer): Promise<void> {
    if (this.currentZoneId) {
      await this.leaveZone();
    }
    this.currentZoneId = zoneId;
    this.presence = presence;

    if (!MockHubRealtimeTransport.buses.has(zoneId)) {
      MockHubRealtimeTransport.buses.set(zoneId, new Set());
    }
    MockHubRealtimeTransport.buses.get(zoneId)!.add(this);

    // Announce sync to all peers in the zone
    this.broadcastPresenceSync();
  }

  public async leaveZone(): Promise<void> {
    if (this.currentZoneId) {
      const bus = MockHubRealtimeTransport.buses.get(this.currentZoneId);
      if (bus) {
        bus.delete(this);
      }
      this.broadcastPresenceSync();
      this.currentZoneId = null;
      this.presence = null;
    }
  }

  public sendMovement(frame: MovementFrame): void {
    if (!this.currentZoneId) return;
    const bus = MockHubRealtimeTransport.buses.get(this.currentZoneId);
    if (!bus) return;

    for (const peer of bus) {
      if (peer !== this) {
        peer.movementHandlers.forEach((h) => h(frame));
      }
    }
  }

  public sendChat(outgoing: { text: string }): void {
    if (!this.currentZoneId || !this.presence) return;
    const bus = MockHubRealtimeTransport.buses.get(this.currentZoneId);
    if (!bus) return;

    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      characterId: this.presence.characterId,
      displayName: this.presence.displayName,
      text: outgoing.text,
      zoneId: this.currentZoneId,
      timestamp: Date.now(),
    };

    // Deliver to self & peers
    this.chatHandlers.forEach((h) => h(msg));
    for (const peer of bus) {
      if (peer !== this) {
        peer.chatHandlers.forEach((h) => h(msg));
      }
    }
  }

  public sendStateEvent(event: StateBroadcastEvent): void {
    if (!this.currentZoneId) return;
    const bus = MockHubRealtimeTransport.buses.get(this.currentZoneId);
    if (!bus) return;

    for (const peer of bus) {
      if (peer !== this) {
        peer.stateEventHandlers.forEach((h) => h(event));
      }
    }
  }

  private broadcastPresenceSync() {
    if (!this.currentZoneId) return;
    const bus = MockHubRealtimeTransport.buses.get(this.currentZoneId);
    if (!bus) return;

    for (const target of bus) {
      const roster: RemotePlayerState[] = [];
      for (const peer of bus) {
        if (peer !== target && peer.presence) {
          roster.push({
            characterId: peer.presence.characterId,
            displayName: peer.presence.displayName,
            jobTitle: peer.presence.jobTitle,
            position: [0, 0, 0],
            targetPosition: [0, 0, 0],
            rotation: 0,
            targetRotation: 0,
            isMoving: false,
            lastUpdated: Date.now(),
          });
        }
      }
      target.presenceSyncHandlers.forEach((h) => h(roster));
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

  public static clearAll() {
    MockHubRealtimeTransport.buses.clear();
  }
}

describe('Realtime Multiplayer Architecture - Ephemeral Presence & Validation', () => {
  beforeEach(() => {
    MockHubRealtimeTransport.clearAll();
  });

  describe('1. Anti-Cheat & Impossible State Protections', () => {
    it('accepts valid normal movement frames', () => {
      const result = validateMovementFrame({
        characterId: 'char-chidi',
        displayName: 'Chidi',
        position: [10.5, 0.0, -4.2],
        rotation: 1.57,
        isMoving: true,
        timestamp: 1000,
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitized?.position).toEqual([10.5, 0.0, -4.2]);
      expect(result.sanitized?.rotation).toBe(1.57);
    });

    it('rejects coordinates containing NaN or non-finite values', () => {
      const nanResult = validateMovementFrame({
        characterId: 'char-hacker',
        position: [NaN, 0, 0],
        timestamp: 1000,
      });
      expect(nanResult.isValid).toBe(false);
      expect(nanResult.reason).toContain('finite numbers');

      const infResult = validateMovementFrame({
        characterId: 'char-hacker',
        position: [0, Infinity, 0],
        timestamp: 1000,
      });
      expect(infResult.isValid).toBe(false);
      expect(infResult.reason).toContain('finite numbers');
    });

    it('rejects coordinates outside neighbourhood boundary limits', () => {
      const outX = validateMovementFrame({
        characterId: 'char-chidi',
        position: [MOVEMENT_BOUNDS.maxX + 10, 0, 0],
        timestamp: 1000,
      });
      expect(outX.isValid).toBe(false);
      expect(outX.reason).toContain('out of allowable neighbourhood bounds');

      const outZ = validateMovementFrame({
        characterId: 'char-chidi',
        position: [0, 0, MOVEMENT_BOUNDS.maxZ + 15],
        timestamp: 1000,
      });
      expect(outZ.isValid).toBe(false);
      expect(outZ.reason).toContain('out of allowable neighbourhood bounds');
    });

    it('rejects unrealistic speed-hack / teleportation claims', () => {
      const prevPos: [number, number, number] = [0, 0, 0];
      const prevTime = 1000;

      // Teleported 30 meters in 0.2 seconds = 150 m/s (way over MAX_REASONABLE_SPEED of 18 m/s)
      const teleportAttempt = validateMovementFrame(
        {
          characterId: 'char-speed-hacker',
          position: [30, 0, 0],
          timestamp: 1200,
        },
        prevPos,
        prevTime
      );

      expect(teleportAttempt.isValid).toBe(false);
      expect(teleportAttempt.reason).toContain('Impossible movement velocity');
    });
  });

  describe('2. Chat Sanitization & Validation', () => {
    it('accepts and trims valid text messages', () => {
      const res = sanitizeChatMessage('   Mama Tarila Bole dey sweet!   ');
      expect(res.isValid).toBe(true);
      expect(res.sanitizedText).toBe('Mama Tarila Bole dey sweet!');
    });

    it('rejects empty or whitespace-only messages', () => {
      expect(sanitizeChatMessage('').isValid).toBe(false);
      expect(sanitizeChatMessage('   ').isValid).toBe(false);
    });

    it('enforces 140 character limit', () => {
      const longMessage = 'A'.repeat(141);
      const res = sanitizeChatMessage(longMessage);
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('140 character limit');
    });

    it('strips malicious HTML script tags', () => {
      const res = sanitizeChatMessage('<script>alert("hacked")</script>How far my people!');
      expect(res.isValid).toBe(true);
      expect(res.sanitizedText).toBe('alert("hacked")How far my people!');
    });
  });

  describe('3. Presence Player Validation', () => {
    it('validates and truncates presence metadata properly', () => {
      const res = validatePresencePlayer({
        characterId: 'char-1',
        displayName: 'A'.repeat(50),
        zoneId: '10000000-0000-0000-0000-000000000004',
        jobTitle: 'Port Harcourt Transporter',
      });

      expect(res.isValid).toBe(true);
      expect(res.sanitized?.displayName.length).toBe(32);
      expect(res.sanitized?.zoneId).toBe('10000000-0000-0000-0000-000000000004');
    });
  });

  describe('4. Multi-Player Interaction in Same Neighbourhood', () => {
    it('tracks presence when multiple players join the same zone', async () => {
      const zone = 'zone-d-line-olu-obasanjo';

      const clientA = new MockHubRealtimeTransport('client-chidi');
      const clientB = new MockHubRealtimeTransport('client-ngozi');

      let clientAPeerCount = 0;
      let clientBPeerCount = 0;

      clientA.onPresenceSync((roster) => {
        clientAPeerCount = roster.length;
      });

      clientB.onPresenceSync((roster) => {
        clientBPeerCount = roster.length;
      });

      // Player A joins
      await clientA.joinZone(zone, {
        characterId: 'char-chidi',
        displayName: 'Chidi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      expect(clientAPeerCount).toBe(0);

      // Player B joins
      await clientB.joinZone(zone, {
        characterId: 'char-ngozi',
        displayName: 'Ngozi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      // Both players see each other
      expect(clientAPeerCount).toBe(1);
      expect(clientBPeerCount).toBe(1);

      // Player B leaves neighbourhood
      await clientB.leaveZone();

      // Player A sees roster update
      expect(clientAPeerCount).toBe(0);
    });

    it('broadcasts high-frequency movement frames between players', async () => {
      const zone = 'zone-d-line-olu-obasanjo';
      const clientA = new MockHubRealtimeTransport('client-chidi');
      const clientB = new MockHubRealtimeTransport('client-ngozi');

      await clientA.joinZone(zone, {
        characterId: 'char-chidi',
        displayName: 'Chidi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      await clientB.joinZone(zone, {
        characterId: 'char-ngozi',
        displayName: 'Ngozi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      let receivedPosition: [number, number, number] | null = null;
      clientB.onPlayerMovement((frame) => {
        receivedPosition = frame.position;
      });

      // Player A moves along the sidewalk
      clientA.sendMovement({
        characterId: 'char-chidi',
        displayName: 'Chidi',
        position: [-5.0, 0.0, -4.5],
        rotation: 3.14,
        isMoving: true,
        timestamp: Date.now(),
      });

      expect(receivedPosition).toEqual([-5.0, 0.0, -4.5]);
    });

    it('broadcasts neighbourhood chat messages with sender display name', async () => {
      const zone = 'zone-d-line-olu-obasanjo';
      const clientA = new MockHubRealtimeTransport('client-chidi');
      const clientB = new MockHubRealtimeTransport('client-ngozi');

      await clientA.joinZone(zone, {
        characterId: 'char-chidi',
        displayName: 'Chidi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      await clientB.joinZone(zone, {
        characterId: 'char-ngozi',
        displayName: 'Ngozi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      let receivedChat: ChatMessage | null = null;
      clientA.onChat((msg) => {
        receivedChat = msg;
      });

      clientB.sendChat({ text: 'Mama Tarila Bole dey hot! 🥘' });

      expect(receivedChat).not.toBeNull();
      const chat = receivedChat as unknown as ChatMessage;
      expect(chat.displayName).toBe('Ngozi');
      expect(chat.text).toBe('Mama Tarila Bole dey hot! 🥘');
    });

    it('synchronizes low-frequency state events across observing players', async () => {
      const zone = 'zone-d-line-olu-obasanjo';
      const clientA = new MockHubRealtimeTransport('client-chidi');
      const clientB = new MockHubRealtimeTransport('client-ngozi');

      await clientA.joinZone(zone, {
        characterId: 'char-chidi',
        displayName: 'Chidi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      await clientB.joinZone(zone, {
        characterId: 'char-ngozi',
        displayName: 'Ngozi',
        joinedAt: new Date().toISOString(),
        zoneId: zone,
      });

      let stateEvent: StateBroadcastEvent | null = null;
      clientB.onStateEvent((evt) => {
        stateEvent = evt;
      });

      // Player A performs an authoritative purchase
      clientA.sendStateEvent({
        type: 'ITEM_PURCHASED',
        actorId: 'char-chidi',
        actorName: 'Chidi',
        description: 'bought Port Harcourt Bole & Fish',
        payload: { price: 1500 },
        timestamp: Date.now(),
      });

      expect(stateEvent).not.toBeNull();
      const evt = stateEvent as unknown as StateBroadcastEvent;
      expect(evt.actorName).toBe('Chidi');
      expect(evt.description).toBe('bought Port Harcourt Bole & Fish');
    });
  });

  describe('5. Pluggable Transport Architecture', () => {
    it('allows hot-swapping the realtime transport implementation', () => {
      const customTransport = new MockHubRealtimeTransport('custom-1');
      setRealtimeTransport(customTransport);
      // Seamlessly sets without throwing
      expect(customTransport.clientId).toBe('custom-1');
    });
  });
});
