import { create } from 'zustand';
import { RemotePlayerState, ChatMessage, MovementFrame } from '../realtime/types';
import { sendNeighbourhoodChat, broadcastStateChange, initRealtimePresence } from './realtimeStore';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  timestamp: number;
}

export interface VenueInfo {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  triggerPosition: [number, number, number];
  triggerRadius: number;
}

export interface NpcInfo {
  id: string;
  displayName: string;
  role: string;
  activity: string;
  position: [number, number, number];
  dialogue?: Record<string, string[]>;
  venueId?: string | null;
}

export interface PlayerStats {
  userId: string;
  accountId: string;
  characterId: string;
  displayName: string;
  bio?: string;
  avatarConfig: Record<string, unknown>;
  locationId: string;
  venueId: string | null;
  energy: number;
  hunger: number;
  health: number;
  jobTitle: string;
  walletBalance: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  energy_delta: number;
  hunger_delta: number;
  description: string;
}

export interface NearbyInteractable {
  type: 'venue' | 'npc';
  id: string;
  name: string;
  prompt: string;
  distance: number;
}

export interface GameStore {
  // Player
  player: PlayerStats | null;
  position: [number, number, number];
  rotation: number;
  isMoving: boolean;
  movementVector: { x: number; z: number };

  // World
  gameTime: string;
  gameHour: number;
  zoneName: string;
  zoneId: string;
  venues: VenueInfo[];
  npcs: NpcInfo[];
  catalog: CatalogItem[];

  // Ephemeral Realtime Presence & Remote Players
  remotePlayers: Map<string, RemotePlayerState>;
  otherPlayers: Map<string, { id: string; name: string; position: [number, number, number]; rotation: number; isMoving: boolean }>;

  // Ephemeral Neighbourhood Chat
  chatMessages: ChatMessage[];
  isChatOpen: boolean;

  // Account, Characters, Scoped Reputation & Ledger
  account: { id: string; userId: string; username: string; isGuest: boolean } | null;
  characters: Array<{ id: string; displayName: string; bio?: string; avatarConfig: Record<string, unknown>; isActive: boolean }>;
  reputation: Array<{ dimension: string; score: number; scope_type: string; scope_id?: string }>;
  employment: any | null;
  transactions: Array<{ id: string; amount: number; sourceType: string; reason?: string; createdAt: string; fromId?: string; toId?: string }>;
  events: Array<{ id: string; type: string; significance: string; gameTimestamp: string; payload?: any }>;

  // Interaction State
  nearbyInteractable: NearbyInteractable | null;
  activeModal: 'bole_joint' | 'keke_transit' | 'plaza' | 'npc_dialogue' | 'passport' | 'auth_characters' | null;
  activeNpcId: string | null;
  activeVenueId: string | null;
  dialogueMessage: string | null;

  // Status & Toasts
  isBootstrapped: boolean;
  isLoading: boolean;
  toasts: Toast[];

  // Actions
  bootstrap: () => Promise<void>;
  setPosition: (pos: [number, number, number], rot?: number) => void;
  setMovementVector: (vec: { x: number; z: number }) => void;
  setIsMoving: (isMoving: boolean) => void;
  checkProximity: () => void;
  openModal: (modal: 'bole_joint' | 'keke_transit' | 'plaza' | 'npc_dialogue' | 'passport' | 'auth_characters', targetId?: string, initialDialogue?: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;

  // Realtime Presence Actions
  syncRemotePlayers: (players: RemotePlayerState[]) => void;
  updateRemotePlayerMovement: (frame: MovementFrame) => void;
  removeRemotePlayer: (characterId: string) => void;

  // Legacy compat
  updateOtherPlayer: (id: string, data: { name: string; position: [number, number, number]; rotation: number; isMoving: boolean }) => void;
  removeOtherPlayer: (id: string) => void;

  // Realtime Chat Actions
  sendChatMessage: (text: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;

  // Authoritative Backend Commands & Meaningful State Synchronization
  enterVenue: (venueId: string) => Promise<boolean>;
  leaveVenue: () => Promise<boolean>;
  changeNeighbourhood: (newZoneId: string, newZoneName?: string) => Promise<boolean>;
  buyItem: (itemName: string, sellerId?: string, venueId?: string) => Promise<boolean>;
  greetCharacter: (targetId: string) => Promise<boolean>;
  performWorkShift: () => Promise<boolean>;
  takeKekeRide: (riderId: string) => Promise<boolean>;
  createCharacter: (displayName: string, bio: string, avatarConfig: Record<string, unknown>) => Promise<boolean>;
  selectCharacter: (characterId: string) => Promise<boolean>;
  registerAccount: (username: string) => Promise<boolean>;
}

// Canonical Port Harcourt Positions
export const CANONICAL_VENUES: VenueInfo[] = [
  {
    id: '10000000-0000-0000-0000-000000000021', // Mama Tarila Bole Joint
    name: 'Mama Tarila Bole Joint',
    type: 'restaurant',
    position: [-12, 0, -11],
    triggerPosition: [-12, 0, -8],
    triggerRadius: 4.5,
  },
  {
    id: '10000000-0000-0000-0000-000000000022', // Garrison Junction Keke Park
    name: 'Garrison Junction Keke Park',
    type: 'public_space',
    position: [-10, 0, 12],
    triggerPosition: [-10, 0, 8.5],
    triggerRadius: 4.5,
  },
  {
    id: '10000000-0000-0000-0000-000000000023', // Garden City Plaza
    name: 'Garden City Plaza',
    type: 'commercial',
    position: [14, 0, -14],
    triggerPosition: [14, 0, -8.5],
    triggerRadius: 5.0,
  },
];

export const CANONICAL_NPCS: NpcInfo[] = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    displayName: 'Mama Tarila',
    role: 'Bole & Fish Vendor',
    activity: 'Roasting plantain & fish',
    position: [-10, 0, -9.8],
    venueId: '10000000-0000-0000-0000-000000000021',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    displayName: 'Elder Tamuno',
    role: 'Keke Operator',
    activity: 'Waiting for passengers to Garrison',
    position: [-8, 0, 10],
    venueId: '10000000-0000-0000-0000-000000000022',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    displayName: 'Inspector Friday',
    role: 'Community Patrol',
    activity: 'Patrolling Olu Obasanjo Road',
    position: [2, 0, -5.5],
    venueId: null,
  },
];

export const useGameStore = create<GameStore>((set, get) => ({
  player: null,
  position: [0, 0, 0], // Center of Olu Obasanjo Road
  rotation: 0,
  isMoving: false,
  movementVector: { x: 0, z: 0 },

  gameTime: new Date().toISOString(),
  gameHour: 14,
  zoneName: 'Olu Obasanjo Road, D-Line, Port Harcourt',
  zoneId: '10000000-0000-0000-0000-000000000004',
  venues: CANONICAL_VENUES,
  npcs: CANONICAL_NPCS,
  catalog: [],

  remotePlayers: new Map(),
  otherPlayers: new Map(),

  chatMessages: [
    {
      id: 'welcome-chat-1',
      characterId: '00000000-0000-0000-0000-0000000000a1',
      displayName: 'Mama Tarila',
      text: 'Hot Port Harcourt Bole & Fish dey ready ontop grill o!',
      zoneId: '10000000-0000-0000-0000-000000000004',
      timestamp: Date.now() - 60000,
    },
    {
      id: 'welcome-chat-2',
      characterId: '00000000-0000-0000-0000-0000000000a2',
      displayName: 'Elder Tamuno',
      text: 'Waterlines straight! 200 naira per drop!',
      zoneId: '10000000-0000-0000-0000-000000000004',
      timestamp: Date.now() - 30000,
    },
  ],
  isChatOpen: false,

  nearbyInteractable: null,
  activeModal: null,
  activeNpcId: null,
  activeVenueId: null,
  dialogueMessage: null,

  // Account & Identity State
  account: null,
  characters: [],
  reputation: [],
  employment: null,
  transactions: [],
  events: [],

  isBootstrapped: false,
  isLoading: false,
  toasts: [],

  bootstrap: async () => {
    set({ isLoading: true });
    try {
      let guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : null;
      if (!guestId) {
        guestId = '00000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000);
        if (typeof window !== 'undefined') {
          localStorage.setItem('np_guest_user_id', guestId);
        }
      }

      const res = await fetch('/api/game/bootstrap', {
        headers: { 'x-guest-user-id': guestId },
      });

      if (!res.ok) throw new Error('Bootstrap request failed');
      const data = await res.json();

      if (data.ok) {
        const mappedNpcs = CANONICAL_NPCS.map((defaultNpc) => {
          const live = data.world.npcs?.find((n: any) => n.profile.characterId === defaultNpc.id);
          return {
            ...defaultNpc,
            activity: live?.profile?.currentActivity ?? defaultNpc.activity,
            dialogue: live?.profile?.dialogue ?? {},
          };
        });

        set({
          player: data.player,
          account: data.account ?? null,
          characters: data.characters ?? [],
          reputation: data.reputation ?? [],
          employment: data.employment ?? null,
          transactions: data.transactions ?? [],
          events: data.events ?? [],
          gameTime: data.world.gameTime,
          gameHour: data.world.gameHour ?? 14,
          zoneName: data.world.zoneName,
          zoneId: data.world.zoneId,
          npcs: mappedNpcs,
          catalog: data.world.catalog ?? [],
          isBootstrapped: true,
          isLoading: false,
        });

        get().addToast(`Welcome to Port Harcourt! You are on Olu Obasanjo Road.`, 'info');
      }
    } catch (err: any) {
      console.error('Bootstrap error:', err);
      // Fallback local player for offline resiliency
      set({
        player: {
          userId: 'guest-offline',
          accountId: 'acc-offline',
          characterId: 'char-offline',
          displayName: 'Chidi (PH Hustler)',
          bio: 'Port Harcourt local exploring D-Line',
          avatarConfig: {},
          locationId: '10000000-0000-0000-0000-000000000004',
          venueId: null,
          energy: 90,
          hunger: 30,
          health: 100,
          jobTitle: 'Artisan',
          walletBalance: 10000,
        },
        account: {
          id: 'acc-offline',
          userId: 'guest-offline',
          username: 'ph_citizen_offline',
          isGuest: true,
        },
        characters: [
          {
            id: 'char-offline',
            displayName: 'Chidi (PH Hustler)',
            bio: 'Port Harcourt local exploring D-Line',
            avatarConfig: {},
            isActive: true,
          },
        ],
        reputation: [
          { dimension: 'popularity', score: 10, scope_type: 'neighbourhood' },
          { dimension: 'trust', score: 10, scope_type: 'neighbourhood' },
          { dimension: 'competence', score: 5, scope_type: 'global' },
        ],
        employment: null,
        transactions: [],
        events: [],
        catalog: [
          {
            id: 'item-bole',
            name: 'Port Harcourt Bole & Fish',
            category: 'food',
            price: 1500,
            energy_delta: 35,
            hunger_delta: -50,
            description: 'Hot roasted plantain with spicy croaker fish & pepper sauce',
          },
          {
            id: 'item-zobo',
            name: 'Cold Zobo Drink',
            category: 'drink',
            price: 200,
            energy_delta: 15,
            hunger_delta: -20,
            description: 'Chilled spicy ginger zobo drink',
          },
        ],
        isBootstrapped: true,
        isLoading: false,
      });
      get().addToast(`Welcome to Port Harcourt (Offline Simulation Active)`, 'info');
    }
  },

  setPosition: (pos, rot) => {
    set((state) => ({
      position: pos,
      rotation: rot !== undefined ? rot : state.rotation,
    }));
    get().checkProximity();
  },

  setMovementVector: (vec) => set({ movementVector: vec }),
  setIsMoving: (isMoving) => set({ isMoving }),

  checkProximity: () => {
    const { position, venues, npcs } = get();
    const [px, , pz] = position;
    let closest: NearbyInteractable | null = null;
    let minDistance = Infinity;

    // Check NPCs
    for (const npc of npcs) {
      const [nx, , nz] = npc.position;
      const dist = Math.hypot(px - nx, pz - nz);
      if (dist < 3.2 && dist < minDistance) {
        minDistance = dist;
        closest = {
          type: 'npc',
          id: npc.id,
          name: npc.displayName,
          prompt: `Talk to ${npc.displayName}`,
          distance: dist,
        };
      }
    }

    // Check Venues
    if (!closest) {
      for (const venue of venues) {
        const [vx, , vz] = venue.triggerPosition;
        const dist = Math.hypot(px - vx, pz - vz);
        if (dist <= venue.triggerRadius && dist < minDistance) {
          minDistance = dist;
          closest = {
            type: 'venue',
            id: venue.id,
            name: venue.name,
            prompt: `Enter ${venue.name}`,
            distance: dist,
          };
        }
      }
    }

    set({ nearbyInteractable: closest });
  },

  openModal: (modal, targetId, initialDialogue) => {
    set({
      activeModal: modal,
      activeNpcId: modal === 'npc_dialogue' ? targetId || null : null,
      activeVenueId: modal !== 'npc_dialogue' ? targetId || null : null,
      dialogueMessage: initialDialogue || null,
    });
  },

  closeModal: () => {
    set({
      activeModal: null,
      activeNpcId: null,
      activeVenueId: null,
      dialogueMessage: null,
    });
  },

  addToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, message, type, timestamp: Date.now() }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Realtime Presence Sync Actions
  syncRemotePlayers: (players) => {
    set((state) => {
      const updated = new Map(state.remotePlayers);
      const otherMap = new Map(state.otherPlayers);

      // Track ids in sync payload
      const validIds = new Set(players.map((p) => p.characterId));

      // Remove players no longer in presence
      for (const id of updated.keys()) {
        if (!validIds.has(id)) {
          updated.delete(id);
          otherMap.delete(id);
        }
      }

      // Add or update active players
      for (const p of players) {
        if (!updated.has(p.characterId)) {
          updated.set(p.characterId, p);
          otherMap.set(p.characterId, {
            id: p.characterId,
            name: p.displayName,
            position: p.position,
            rotation: p.rotation,
            isMoving: p.isMoving,
          });
        }
      }

      return { remotePlayers: updated, otherPlayers: otherMap };
    });
  },

  updateRemotePlayerMovement: (frame: MovementFrame) => {
    set((state) => {
      const updated = new Map(state.remotePlayers);
      const otherMap = new Map(state.otherPlayers);

      const existing = updated.get(frame.characterId);
      if (existing) {
        existing.targetPosition = frame.position;
        existing.targetRotation = frame.rotation;
        existing.isMoving = frame.isMoving;
        existing.lastUpdated = frame.timestamp;
      } else {
        const newPlayer: RemotePlayerState = {
          characterId: frame.characterId,
          displayName: frame.displayName,
          position: frame.position,
          targetPosition: frame.position,
          rotation: frame.rotation,
          targetRotation: frame.rotation,
          isMoving: frame.isMoving,
          lastUpdated: frame.timestamp,
        };
        updated.set(frame.characterId, newPlayer);
      }

      otherMap.set(frame.characterId, {
        id: frame.characterId,
        name: frame.displayName,
        position: frame.position,
        rotation: frame.rotation,
        isMoving: frame.isMoving,
      });

      return { remotePlayers: updated, otherPlayers: otherMap };
    });
  },

  removeRemotePlayer: (characterId: string) => {
    set((state) => {
      const updated = new Map(state.remotePlayers);
      const otherMap = new Map(state.otherPlayers);
      updated.delete(characterId);
      otherMap.delete(characterId);
      return { remotePlayers: updated, otherPlayers: otherMap };
    });
  },

  updateOtherPlayer: (id, data) => {
    set((state) => {
      const otherMap = new Map(state.otherPlayers);
      otherMap.set(id, { id, ...data });
      return { otherPlayers: otherMap };
    });
  },

  removeOtherPlayer: (id) => {
    set((state) => {
      const otherMap = new Map(state.otherPlayers);
      otherMap.delete(id);
      return { otherPlayers: otherMap };
    });
  },

  // Realtime Chat
  sendChatMessage: (text: string) => {
    sendNeighbourhoodChat(text);
  },

  addChatMessage: (msg: ChatMessage) => {
    set((state) => {
      // Set active speech bubble for the character
      const updatedRemote = new Map(state.remotePlayers);
      const remote = updatedRemote.get(msg.characterId);
      if (remote) {
        remote.activeSpeechBubble = {
          text: msg.text,
          expiresAt: Date.now() + 5000,
        };
      }

      return {
        chatMessages: [...state.chatMessages.slice(-25), msg],
        remotePlayers: updatedRemote,
      };
    });
  },

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open: boolean) => set({ isChatOpen: open }),

  // Authoritative Backend Actions with Realtime Sync
  enterVenue: async (venueId: string) => {
    const player = get().player;
    if (!player) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'ENTER_VENUE',
          payload: { venueId },
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        set((state) => ({
          player: state.player ? { ...state.player, venueId } : null,
        }));
        const venue = get().venues.find((v) => v.id === venueId);
        get().addToast(`Entered ${venue?.name || 'Venue'}`, 'success');

        // Broadcast state change to observers
        broadcastStateChange('VENUE_ENTERED', `entered ${venue?.name || 'the venue'}`);
        return true;
      } else {
        get().addToast(`Failed to enter: ${data.error || 'Server error'}`, 'error');
        return false;
      }
    } catch {
      set((state) => ({
        player: state.player ? { ...state.player, venueId } : null,
      }));
      get().addToast(`Entered venue (Local)`, 'info');
      return true;
    }
  },

  leaveVenue: async () => {
    const player = get().player;
    if (!player || !player.venueId) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'LEAVE_VENUE',
          payload: {},
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        set((state) => ({
          player: state.player ? { ...state.player, venueId: null } : null,
        }));
        get().addToast(`Left venue back to Olu Obasanjo Road`, 'info');
        broadcastStateChange('VENUE_LEFT', 'stepped outside back to the street');
        get().closeModal();
        return true;
      }
    } catch {
      set((state) => ({
        player: state.player ? { ...state.player, venueId: null } : null,
      }));
      get().addToast(`Stepped out to the street`, 'info');
      get().closeModal();
      return true;
    }
    return false;
  },

  changeNeighbourhood: async (newZoneId: string, newZoneName?: string) => {
    const player = get().player;
    if (!player) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'MOVE_CHARACTER',
          payload: { targetLocationId: newZoneId },
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        set((state) => ({
          zoneId: newZoneId,
          zoneName: newZoneName || state.zoneName,
          player: state.player ? { ...state.player, locationId: newZoneId, venueId: null } : null,
        }));

        // Reconnect realtime transport to the new zone
        await initRealtimePresence(newZoneId, {
          characterId: player.characterId,
          displayName: player.displayName,
          jobTitle: player.jobTitle,
        });

        get().addToast(`Arrived in ${newZoneName || 'new neighbourhood'}`, 'success');
        return true;
      }
    } catch {
      set((state) => ({
        zoneId: newZoneId,
        zoneName: newZoneName || state.zoneName,
      }));
      return true;
    }
    return false;
  },

  buyItem: async (itemName: string, sellerId?: string, venueId?: string) => {
    const player = get().player;
    if (!player) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'BUY_ITEM',
          payload: { itemName, sellerId, venueId },
          idempotency_key: idempotencyKey,
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        const outcome = data.state;
        set((state) => ({
          player: state.player
            ? {
                ...state.player,
                walletBalance: outcome.newBalance,
                energy: Math.min(100, state.player.energy + (outcome.item?.energyDelta || 25)),
                hunger: Math.max(0, state.player.hunger + (outcome.item?.hungerDelta || -40)),
              }
            : null,
        }));
        get().addToast(`Purchased ${itemName}! Paid ₦${outcome.price?.toLocaleString()}`, 'success');

        // Synchronize low-frequency state event
        broadcastStateChange('ITEM_PURCHASED', `bought ${itemName}`, { itemName, price: outcome.price });
        return true;
      } else {
        get().addToast(data.error || 'Could not complete purchase', 'error');
        return false;
      }
    } catch (err: any) {
      get().addToast(`Transaction failed: ${err?.message}`, 'error');
      return false;
    }
  },

  greetCharacter: async (targetId: string) => {
    const player = get().player;
    if (!player) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'GREET_CHARACTER',
          payload: {
            targetCharacterId: targetId,
            locationId: player.locationId,
            venueId: player.venueId,
          },
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        get().addToast(`You greeted warmly! Neighbourhood popularity boosted.`, 'success');
        broadcastStateChange('GREETING', 'gave a warm Port Harcourt greeting');
        return true;
      }
    } catch {
      get().addToast(`You gave a warm Port Harcourt greeting!`, 'success');
      return true;
    }
    return false;
  },

  performWorkShift: async () => {
    const player = get().player;
    if (!player) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;

      // 1. Authoritatively accept / verify active employment
      const jobRes = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'ACCEPT_JOB',
          payload: {
            employerId: '10000000-0000-0000-0000-000000000023',
            employerType: 'business',
            jobTitle: 'Plaza Logistics Assistant',
            hourlyRate: 800,
            venueId: '10000000-0000-0000-0000-000000000023',
          },
          idempotency_key: crypto.randomUUID(),
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const jobData = await jobRes.json();
      const employmentId = jobData?.state?.id;

      if (!employmentId) {
        get().addToast(jobData?.error || 'Failed to verify employment status', 'error');
        return false;
      }

      // 2. Authoritatively start work session
      const startRes = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'START_WORK',
          payload: {
            employmentId,
          },
          idempotency_key: crypto.randomUUID(),
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const startData = await startRes.json();
      const sessionId = startData?.state?.id;

      if (!sessionId) {
        get().addToast(startData?.error || 'Could not start work shift', 'error');
        return false;
      }

      // 3. Authoritatively complete work session and credit wallet
      const endRes = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'END_WORK',
          payload: { workSessionId: sessionId },
          idempotency_key: crypto.randomUUID(),
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const endData = await endRes.json();
      if (endData.ok && endData.state) {
        const earned = endData.state.earned;
        const newBalance = endData.state.newBalance;

        // Authoritatively update wallet balance strictly from server response!
        set((state) => ({
          player: state.player
            ? {
                ...state.player,
                walletBalance: newBalance,
                energy: Math.max(10, state.player.energy - 20),
                jobTitle: 'Plaza Logistics Assistant',
              }
            : null,
        }));

        get().addToast(`Completed shift! Earned ₦${earned?.toLocaleString()} (Balance: ₦${newBalance?.toLocaleString()})`, 'success');
        broadcastStateChange('WORK_COMPLETED', `finished logistics shift at Garden City Plaza (+₦${earned})`, { earned, newBalance });
        return true;
      } else {
        get().addToast(endData?.error || 'Failed to complete work shift', 'error');
        return false;
      }
    } catch (err: any) {
      get().addToast(`Work session error: ${err?.message}`, 'error');
      return false;
    }
  },

  takeKekeRide: async (riderId: string) => {
    const player = get().player;
    if (!player) return false;

    const fare = 200;
    if (player.walletBalance < fare) {
      get().addToast(`No money for Keke! Fare is ₦200.`, 'error');
      return false;
    }

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const idempotencyKey = `keke-${player.characterId}-${Date.now()}`;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'TRANSFER_MONEY',
          payload: {
            targetCharacterId: riderId,
            amount: fare,
            reason: 'Keke Napep trip from Garrison Junction to Waterlines',
          },
          idempotency_key: idempotencyKey,
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        set((state) => ({
          player: state.player
            ? { ...state.player, walletBalance: data.state.newBalance }
            : null,
        }));
        get().addToast(`Boarded Elder Tamuno's Keke! ₦200 fare paid. Safe trip!`, 'success');
        broadcastStateChange('ITEM_PURCHASED', 'took a Keke Napep transit trip to Garrison');
        return true;
      }
    } catch {
      set((state) => ({
        player: state.player
          ? { ...state.player, walletBalance: state.player.walletBalance - fare }
          : null,
      }));
      get().addToast(`Boarded Keke Napep! ₦200 fare paid to Elder Tamuno.`, 'success');
      return true;
    }
    return false;
  },

  createCharacter: async (displayName: string, bio: string, avatarConfig: Record<string, unknown>) => {
    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const idempotencyKey = `create-char-${Date.now()}`;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'CREATE_CHARACTER',
          payload: {
            displayName,
            bio,
            avatarConfig,
            isNpc: false,
          },
          idempotency_key: idempotencyKey,
          issued_at: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        get().addToast(`Citizen '${displayName}' created successfully!`, 'success');
        // Refresh bootstrap data to activate new character
        await get().bootstrap();
        get().closeModal();
        return true;
      } else {
        get().addToast(data.error || 'Failed to create character', 'error');
        return false;
      }
    } catch (err: any) {
      get().addToast(`Creation failed: ${err?.message}`, 'error');
      return false;
    }
  },

  selectCharacter: async (characterId: string) => {
    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'SELECT_CHARACTER',
          payload: { characterId },
          issued_at: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        get().addToast(`Switched active character!`, 'success');
        await get().bootstrap();
        get().closeModal();
        return true;
      } else {
        get().addToast(data.error || 'Failed to switch character', 'error');
        return false;
      }
    } catch (err: any) {
      get().addToast(`Switch failed: ${err?.message}`, 'error');
      return false;
    }
  },

  registerAccount: async (username: string) => {
    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'CREATE_ACCOUNT',
          payload: { username },
          issued_at: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        get().addToast(`Account '${username}' registered!`, 'success');
        await get().bootstrap();
        return true;
      } else {
        get().addToast(data.error || 'Failed to register account', 'error');
        return false;
      }
    } catch (err: any) {
      get().addToast(`Registration error: ${err?.message}`, 'error');
      return false;
    }
  },
}));
