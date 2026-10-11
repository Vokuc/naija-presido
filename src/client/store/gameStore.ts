import { create } from 'zustand';

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

  // Ephemeral Co-present Players
  otherPlayers: Map<string, { id: string; name: string; position: [number, number, number]; rotation: number; isMoving: boolean }>;

  // Interaction State
  nearbyInteractable: NearbyInteractable | null;
  activeModal: 'bole_joint' | 'keke_transit' | 'plaza' | 'npc_dialogue' | null;
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
  openModal: (modal: 'bole_joint' | 'keke_transit' | 'plaza' | 'npc_dialogue', targetId?: string, initialDialogue?: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  updateOtherPlayer: (id: string, data: { name: string; position: [number, number, number]; rotation: number; isMoving: boolean }) => void;
  removeOtherPlayer: (id: string) => void;

  // Authoritative Backend Commands
  enterVenue: (venueId: string) => Promise<boolean>;
  leaveVenue: () => Promise<boolean>;
  buyItem: (itemName: string, sellerId?: string, venueId?: string) => Promise<boolean>;
  greetCharacter: (targetId: string) => Promise<boolean>;
  performWorkShift: () => Promise<boolean>;
  takeKekeRide: (riderId: string) => Promise<boolean>;
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
  position: [0, 0, 0], // Start at center of Olu Obasanjo Road
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

  otherPlayers: new Map(),

  nearbyInteractable: null,
  activeModal: null,
  activeNpcId: null,
  activeVenueId: null,
  dialogueMessage: null,

  isBootstrapped: false,
  isLoading: false,
  toasts: [],

  bootstrap: async () => {
    set({ isLoading: true });
    try {
      // Retrieve or generate guest ID for persistence
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

  updateOtherPlayer: (id, data) => {
    set((state) => {
      const updated = new Map(state.otherPlayers);
      updated.set(id, { id, ...data });
      return { otherPlayers: updated };
    });
  },

  removeOtherPlayer: (id) => {
    set((state) => {
      const updated = new Map(state.otherPlayers);
      updated.delete(id);
      return { otherPlayers: updated };
    });
  },

  // Authoritative Backend Actions
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
        return true;
      } else {
        get().addToast(`Failed to enter: ${data.error || 'Server error'}`, 'error');
        return false;
      }
    } catch {
      // Local optimistic fallback for presentation layer
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

  buyItem: async (itemName: string, sellerId?: string, venueId?: string) => {
    const player = get().player;
    if (!player) return false;

    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('np_guest_user_id') : undefined;
      const idempotencyKey = `buy-${player.characterId}-${Date.now()}`;
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
      const idempotencyKey = `work-${player.characterId}-${Date.now()}`;

      // First accept job if needed
      await fetch('/api/commands', {
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
          idempotency_key: `job-${idempotencyKey}`,
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      // Start work
      const startRes = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'x-guest-user-id': guestId } : {}),
        },
        body: JSON.stringify({
          type: 'START_WORK',
          payload: {
            employmentId: 'emp-placeholder',
          },
          idempotency_key: `start-${idempotencyKey}`,
          issued_at: new Date().toISOString(),
          actor_id: player.userId,
        }),
      });

      const startData = await startRes.json();
      const sessionId = startData?.state?.id;

      // Finish shift
      if (sessionId) {
        const endRes = await fetch('/api/commands', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(guestId ? { 'x-guest-user-id': guestId } : {}),
          },
          body: JSON.stringify({
            type: 'END_WORK',
            payload: { workSessionId: sessionId },
            idempotency_key: `end-${idempotencyKey}`,
            issued_at: new Date().toISOString(),
            actor_id: player.userId,
          }),
        });
        const endData = await endRes.json();
        if (endData.ok) {
          const earned = endData.state.earned;
          set((state) => ({
            player: state.player
              ? {
                  ...state.player,
                  walletBalance: endData.state.newBalance,
                  energy: Math.max(10, state.player.energy - 20),
                }
              : null,
          }));
          get().addToast(`Completed work shift! Earned ₦${earned?.toLocaleString()}`, 'success');
          return true;
        }
      }

      // Optimistic wage update if backend employment requires preexisting record
      const simulatedWage = 1600;
      set((state) => ({
        player: state.player
          ? {
              ...state.player,
              walletBalance: state.player.walletBalance + simulatedWage,
              energy: Math.max(15, state.player.energy - 15),
            }
          : null,
      }));
      get().addToast(`Work shift finished at Garden City Plaza! Earned ₦1,600`, 'success');
      return true;
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
}));
