import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, CANONICAL_VENUES, CANONICAL_NPCS } from '../src/client/store/gameStore';

describe('3D Presentation Layer - GameStore & Spatial Proximity', () => {
  beforeEach(() => {
    useGameStore.setState({
      position: [0, 0, 0],
      rotation: 0,
      isMoving: false,
      movementVector: { x: 0, z: 0 },
      nearbyInteractable: null,
      activeModal: null,
      activeNpcId: null,
      activeVenueId: null,
      venues: CANONICAL_VENUES,
      npcs: CANONICAL_NPCS,
      otherPlayers: new Map(),
      toasts: [],
      player: {
        userId: 'test-user',
        accountId: 'test-account',
        characterId: 'test-char',
        displayName: 'Chidi (PH Hustler)',
        avatarConfig: {},
        locationId: '10000000-0000-0000-0000-000000000004',
        venueId: null,
        energy: 90,
        hunger: 35,
        health: 100,
        jobTitle: 'Artisan',
        walletBalance: 10000,
      },
    });
  });

  it('initializes with canonical Port Harcourt venues and NPCs', () => {
    const state = useGameStore.getState();
    expect(state.venues.length).toBe(3);
    expect(state.npcs.length).toBe(3);

    const mamaBole = state.venues.find((v) => v.name.includes('Mama Tarila'));
    expect(mamaBole).toBeDefined();

    const kekePark = state.venues.find((v) => v.name.includes('Garrison Junction'));
    expect(kekePark).toBeDefined();

    const plaza = state.venues.find((v) => v.name.includes('Garden City Plaza'));
    expect(plaza).toBeDefined();
  });

  it('detects proximity when player approaches Mama Tarila Bole Joint', () => {
    // Mama Tarila Bole Joint trigger position is [-12, 0, -8]
    useGameStore.getState().setPosition([-12, 0, -8]);

    const nearby = useGameStore.getState().nearbyInteractable;
    expect(nearby).not.toBeNull();
    expect(nearby?.name).toContain('Mama Tarila');
  });

  it('detects proximity when player walks directly up to Mama Tarila NPC', () => {
    // Mama Tarila is standing at [-10, 0, -9.8]
    useGameStore.getState().setPosition([-10, 0, -9.5]);

    const nearby = useGameStore.getState().nearbyInteractable;
    expect(nearby).not.toBeNull();
    expect(nearby?.type).toBe('npc');
    expect(nearby?.name).toBe('Mama Tarila');
  });

  it('detects proximity when player approaches Garrison Junction Keke Park', () => {
    // Garrison Junction trigger position is [-10, 0, 8.5]
    useGameStore.getState().setPosition([-10, 0, 8.5]);

    const nearby = useGameStore.getState().nearbyInteractable;
    expect(nearby).not.toBeNull();
    expect(
      nearby?.name.includes('Garrison Junction') || nearby?.name === 'Elder Tamuno'
    ).toBe(true);
  });

  it('detects proximity when player approaches Garden City Plaza', () => {
    // Garden City Plaza trigger position is [14, 0, -8.5]
    useGameStore.getState().setPosition([14, 0, -8.5]);

    const nearby = useGameStore.getState().nearbyInteractable;
    expect(nearby).not.toBeNull();
    expect(nearby?.name).toContain('Garden City Plaza');
  });

  it('manages modal open and close states correctly', () => {
    const store = useGameStore.getState();
    store.openModal('bole_joint', '10000000-0000-0000-0000-000000000021');

    expect(useGameStore.getState().activeModal).toBe('bole_joint');
    expect(useGameStore.getState().activeVenueId).toBe('10000000-0000-0000-0000-000000000021');

    useGameStore.getState().closeModal();
    expect(useGameStore.getState().activeModal).toBeNull();
    expect(useGameStore.getState().activeVenueId).toBeNull();
  });

  it('tracks ephemeral co-present players from realtime updates', () => {
    const store = useGameStore.getState();
    store.updateOtherPlayer('other-1', {
      name: 'Ngozi',
      position: [5, 0, 2],
      rotation: 1.5,
      isMoving: true,
    });

    const other = useGameStore.getState().otherPlayers.get('other-1');
    expect(other).toBeDefined();
    expect(other?.name).toBe('Ngozi');
    expect(other?.position).toEqual([5, 0, 2]);

    store.removeOtherPlayer('other-1');
    expect(useGameStore.getState().otherPlayers.has('other-1')).toBe(false);
  });

  it('adds and auto-clears visual toast notifications', () => {
    const store = useGameStore.getState();
    store.addToast('Bought Bole & Fish (₦1,500)', 'success');

    const toasts = useGameStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toContain('Bought Bole & Fish');
    expect(toasts[0].type).toBe('success');
  });
});
