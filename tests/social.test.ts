import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommandPipeline } from '../lib/commands/pipeline';
import { Commands, Command } from '../lib/types/command-types';
import { CommandExecutionContext } from '../lib/commands/types';
import { SocialService } from '../domains/social/service';
import {
  FormRelationshipCommand,
  UpdateRelationshipCommand,
  DissolveRelationshipCommand,
  GreetCharacterCommand,
  EndorseCharacterCommand,
} from '../lib/commands/definitions/social';

describe('Foundational Social System & Multi-Dimensional Reputation', () => {
  let mockDb: Record<string, any>;
  let mockRelationships: Map<string, any>;
  let mockReputations: Map<string, any>;
  let mockCharacters: Map<string, any>;
  let mockEvents: any[];
  let mockEffects: any[];

  beforeEach(() => {
    mockRelationships = new Map();
    mockReputations = new Map();
    mockCharacters = new Map();
    mockEvents = [];
    mockEffects = [];

    // Seed test characters
    mockCharacters.set('char-femi-01', { id: 'char-femi-01', name: 'Femi Ade' });
    mockCharacters.set('char-bola-02', { id: 'char-bola-02', name: 'Bola Tinubu' });
    mockCharacters.set('char-amaka-03', { id: 'char-amaka-03', name: 'Amaka Okafor' });

    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'soc_relationship') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: any) => ({
                eq: vi.fn((col2: string, val2: any) => ({
                  eq: vi.fn((col3: string, val3: any) => ({
                    maybeSingle: vi.fn().mockImplementation(async () => {
                      for (const rel of mockRelationships.values()) {
                        if (rel[col1] === val1 && rel[col2] === val2 && rel[col3] === val3) {
                          return { data: rel, error: null };
                        }
                      }
                      return { data: null, error: null };
                    }),
                  })),
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    for (const rel of mockRelationships.values()) {
                      if (rel[col1] === val1 && rel[col2] === val2) {
                        return { data: rel, error: null };
                      }
                    }
                    return { data: null, error: null };
                  }),
                })),
                maybeSingle: vi.fn().mockImplementation(async () => {
                  for (const rel of mockRelationships.values()) {
                    if (rel[col1] === val1) {
                      return { data: rel, error: null };
                    }
                  }
                  return { data: null, error: null };
                }),
                then: (resolve: any) => {
                  const filtered = Array.from(mockRelationships.values()).filter((r) => r[col1] === val1);
                  resolve({ data: filtered, error: null });
                },
              })),
              then: (resolve: any) => resolve({ data: Array.from(mockRelationships.values()), error: null }),
            })),
            upsert: vi.fn((record: any) => {
              const key = `${record.actor_id}:${record.target_id}:${record.type}`;
              const existing = mockRelationships.get(key);
              const id = existing?.id ?? `rel-${mockRelationships.size + 1}`;
              const merged = { id, ...record };
              mockRelationships.set(key, merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                for (const [key, rel] of mockRelationships.entries()) {
                  if (rel.id === val) {
                    mockRelationships.set(key, { ...rel, ...updates });
                  }
                }
                return { error: null };
              }),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => {
                for (const [key, rel] of mockRelationships.entries()) {
                  if (rel.id === val) {
                    mockRelationships.delete(key);
                  }
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'soc_reputation') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: any) => ({
                eq: vi.fn((col2: string, val2: any) => ({
                  eq: vi.fn((col3: string, val3: any) => ({
                    eq: vi.fn((col4: string, val4: any) => ({
                      maybeSingle: vi.fn().mockImplementation(async () => {
                        for (const rep of mockReputations.values()) {
                          if (
                            rep[col1] === val1 &&
                            rep[col2] === val2 &&
                            rep[col3] === val3 &&
                            rep[col4] === val4
                          ) {
                            return { data: rep, error: null };
                          }
                        }
                        return { data: null, error: null };
                      }),
                    })),
                    is: vi.fn((colNull: string, valNull: any) => ({
                      maybeSingle: vi.fn().mockImplementation(async () => {
                        for (const rep of mockReputations.values()) {
                          if (
                            rep[col1] === val1 &&
                            rep[col2] === val2 &&
                            rep[col3] === val3 &&
                            rep[colNull] === null
                          ) {
                            return { data: rep, error: null };
                          }
                        }
                        return { data: null, error: null };
                      }),
                    })),
                  })),
                })),
                then: (resolve: any) => {
                  const filtered = Array.from(mockReputations.values()).filter((r) => r[col1] === val1);
                  resolve({ data: filtered, error: null });
                },
              })),
            })),
            upsert: vi.fn((record: any) => {
              const scopePart = record.scope_id ?? 'global';
              const key = `${record.character_id}:${record.scope_type}:${scopePart}:${record.dimension}`;
              const existing = mockReputations.get(key);
              const id = existing?.id ?? `rep-${mockReputations.size + 1}`;
              const merged = { id, ...record };
              mockReputations.set(key, merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
          };
        }

        if (table === 'chr_character') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  return { data: mockCharacters.get(val) ?? null, error: null };
                }),
              })),
            })),
          };
        }

        if (table === 'acct_active_character') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    character_id: 'char-femi-01',
                    acct_account: { user_id: 'user-auth-femi', status: 'active' },
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        if (table === 'evt_event') {
          return {
            insert: vi.fn((record: any) => {
              mockEvents.push(record);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: `evt-${mockEvents.length}` },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }

        if (table === 'evt_effect') {
          return {
            insert: vi.fn((records: any) => {
              const rows = Array.isArray(records) ? records : [records];
              mockEffects.push(...rows);
              return { error: null };
            }),
          };
        }

        if (table === 'cmd_idempotency') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'obs_command_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
  });

  const getCtx = (charId = 'char-femi-01'): CommandExecutionContext => ({
    db: mockDb as any,
    actorId: 'user-auth-femi',
    characterId: charId,
    gameTime: new Date('2026-10-11T10:00:00Z'),
  });

  describe('Directional, Typed Relationships', () => {
    it('proves directionality: character A views B as friend, while B views A as rival', async () => {
      // 1. Femi considers Bola a friend (+50)
      const femiCmd: Command<any> = {
        type: Commands.FORM_RELATIONSHIP,
        payload: {
          targetCharacterId: 'char-bola-02',
          type: 'friend',
          initialStrength: 50,
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441001',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const femiRes = await executeCommandPipeline(femiCmd, FormRelationshipCommand, getCtx('char-femi-01'));
      expect(femiRes.ok).toBe(true);
      expect(femiRes.state!.type).toBe('friend');
      expect(femiRes.state!.strength).toBe(50);
      expect(femiRes.state!.actorId).toBe('char-femi-01');
      expect(femiRes.state!.targetId).toBe('char-bola-02');

      // 2. Bola considers Femi a rival (-30)
      const bolaCmd: Command<any> = {
        type: Commands.FORM_RELATIONSHIP,
        payload: {
          targetCharacterId: 'char-femi-01',
          type: 'rival',
          initialStrength: -30,
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441002',
        character_id: 'char-bola-02',
        issued_at: new Date().toISOString(),
      };

      const bolaCtx: CommandExecutionContext = {
        db: mockDb as any,
        actorId: 'user-auth-bola',
        characterId: 'char-bola-02',
        skipAuth: true,
      };

      const bolaRes = await executeCommandPipeline(bolaCmd, FormRelationshipCommand, bolaCtx);
      expect(bolaRes.ok).toBe(true);
      expect(bolaRes.state!.type).toBe('rival');
      expect(bolaRes.state!.strength).toBe(-30);
      expect(bolaRes.state!.actorId).toBe('char-bola-02');
      expect(bolaRes.state!.targetId).toBe('char-femi-01');

      // Verify that both directional perspectives exist independently in the social graph
      const femiView = await SocialService.getRelationship('char-femi-01', 'char-bola-02', 'friend', mockDb);
      const bolaView = await SocialService.getRelationship('char-bola-02', 'char-femi-01', 'rival', mockDb);

      expect(femiView).toBeDefined();
      expect(femiView!.strength).toBe(50);

      expect(bolaView).toBeDefined();
      expect(bolaView!.strength).toBe(-30);
    });

    it('supports multiple simultaneous relationship types between the same two characters', async () => {
      // Femi and Amaka are both colleagues AND allies
      await SocialService.formRelationship(
        { actorId: 'char-femi-01', targetId: 'char-amaka-03', type: 'colleague', initialStrength: 20 },
        mockDb
      );
      await SocialService.formRelationship(
        { actorId: 'char-femi-01', targetId: 'char-amaka-03', type: 'ally', initialStrength: 60 },
        mockDb
      );

      const colleagueRel = await SocialService.getRelationship('char-femi-01', 'char-amaka-03', 'colleague', mockDb);
      const allyRel = await SocialService.getRelationship('char-femi-01', 'char-amaka-03', 'ally', mockDb);

      expect(colleagueRel).toBeDefined();
      expect(colleagueRel!.strength).toBe(20);

      expect(allyRel).toBeDefined();
      expect(allyRel!.strength).toBe(60);
    });

    it('updates relationship strength, state, and handles dissolution', async () => {
      // 1. Form friendship
      await SocialService.formRelationship(
        { actorId: 'char-femi-01', targetId: 'char-amaka-03', type: 'friend', initialStrength: 30 },
        mockDb
      );

      // 2. Conflict occurs: update relationship to strained with negative strength delta
      const updateCmd: Command<any> = {
        type: Commands.UPDATE_RELATIONSHIP,
        payload: {
          targetCharacterId: 'char-amaka-03',
          type: 'friend',
          deltaStrength: -50,
          newState: 'strained',
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441003',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const updateRes = await executeCommandPipeline(updateCmd, UpdateRelationshipCommand, getCtx());
      expect(updateRes.ok).toBe(true);
      expect(updateRes.state!.strength).toBe(-20); // 30 - 50 = -20
      expect(updateRes.state!.state).toBe('strained');

      // 3. Dissolve relationship
      const dissolveCmd: Command<any> = {
        type: Commands.DISSOLVE_RELATIONSHIP,
        payload: {
          targetCharacterId: 'char-amaka-03',
          type: 'friend',
          reason: 'Irreconcilable falling out',
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441004',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const dissolveRes = await executeCommandPipeline(dissolveCmd, DissolveRelationshipCommand, getCtx());
      expect(dissolveRes.ok).toBe(true);
      expect(dissolveRes.state!.dissolved).toBe(true);

      const afterDissolution = await SocialService.getRelationship('char-femi-01', 'char-amaka-03', 'friend', mockDb);
      expect(afterDissolution).toBeNull();
    });

    it('rejects relationship formation with oneself', async () => {
      const selfCmd: Command<any> = {
        type: Commands.FORM_RELATIONSHIP,
        payload: {
          targetCharacterId: 'char-femi-01',
          type: 'friend',
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441005',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(selfCmd, FormRelationshipCommand, getCtx());
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Cannot form a relationship with yourself');
    });
  });

  describe('Multi-Dimensional & Scoped Reputation', () => {
    it('proves reputation is multi-dimensional rather than a single number', async () => {
      const charId = 'char-femi-01';

      // Character can have high competence, low honesty, high notoriety, and moderate popularity
      await SocialService.adjustReputation(charId, 'competence', 85, 'national', null, mockDb);
      await SocialService.adjustReputation(charId, 'honesty', -40, 'national', null, mockDb);
      await SocialService.adjustReputation(charId, 'notoriety', 75, 'national', null, mockDb);
      await SocialService.adjustReputation(charId, 'popularity', 20, 'national', null, mockDb);

      const profile = await SocialService.getReputationProfile(charId, mockDb);
      const nationalScores = profile.scores['national:global'];

      expect(nationalScores.competence).toBe(85);
      expect(nationalScores.honesty).toBe(-40);
      expect(nationalScores.notoriety).toBe(75);
      expect(nationalScores.popularity).toBe(20);
    });

    it('proves reputation is scoped geographically (e.g. loved in Surulere, unknown or disfavored nationally)', async () => {
      const charId = 'char-femi-01';
      const surulereId = 'loc-surulere-uuid';
      const kanoId = 'loc-kano-uuid';

      // 1. High popularity in local neighbourhood (Surulere)
      await SocialService.adjustReputation(charId, 'popularity', 90, 'neighbourhood', surulereId, mockDb);

      // 2. Low/negative popularity in distant city (Kano)
      await SocialService.adjustReputation(charId, 'popularity', -25, 'city', kanoId, mockDb);

      // 3. Neutral baseline nationally
      await SocialService.adjustReputation(charId, 'popularity', 5, 'national', null, mockDb);

      const surulereScore = await SocialService.getReputation(charId, 'popularity', 'neighbourhood', surulereId, mockDb);
      const kanoScore = await SocialService.getReputation(charId, 'popularity', 'city', kanoId, mockDb);
      const nationalScore = await SocialService.getReputation(charId, 'popularity', 'national', null, mockDb);

      expect(surulereScore).toBe(90);
      expect(kanoScore).toBe(-25);
      expect(nationalScore).toBe(5);
    });
  });

  describe('Social Interactions Driving Social Graph & Reputation', () => {
    it('executes GREET_CHARACTER: increases friendship strength and local neighbourhood popularity', async () => {
      const greetCmd: Command<any> = {
        type: Commands.GREET_CHARACTER,
        payload: {
          targetCharacterId: 'char-bola-02',
          locationId: 'loc-surulere-uuid',
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441006',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(greetCmd, GreetCharacterCommand, getCtx());
      expect(result.ok).toBe(true);
      expect(result.state!.relationshipStrength).toBe(5); // Initial greeting: +5
      expect(result.state!.actorPopularity).toBe(2); // Local popularity: +2

      // Check event emitted
      expect(result.events).toBeDefined();
      expect(result.events![0].type).toBe('CHARACTER_GREETED');
    });

    it('executes ENDORSE_CHARACTER: authoritatively boosts target trust, influence, and alliance strength', async () => {
      const endorseCmd: Command<any> = {
        type: Commands.ENDORSE_CHARACTER,
        payload: {
          targetCharacterId: 'char-amaka-03',
          dimension: 'trust',
          scopeType: 'neighbourhood',
          scopeId: 'loc-surulere-uuid',
          endorsementNote: 'She handled our market committee finances with total integrity.',
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441007',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(endorseCmd, EndorseCharacterCommand, getCtx());
      expect(result.ok).toBe(true);
      expect(result.state!.dimension).toBe('trust');
      expect(result.state!.targetNewScore).toBe(10); // Target trust increased by +10

      // Target trust and influence are updated
      const amakaTrust = await SocialService.getReputation(
        'char-amaka-03',
        'trust',
        'neighbourhood',
        'loc-surulere-uuid',
        mockDb
      );
      const amakaInfluence = await SocialService.getReputation(
        'char-amaka-03',
        'influence',
        'neighbourhood',
        'loc-surulere-uuid',
        mockDb
      );
      expect(amakaTrust).toBe(10);
      expect(amakaInfluence).toBe(5);

      // Mutual alliance relationship was formed / strengthened (+15)
      const alliance = await SocialService.getRelationship('char-femi-01', 'char-amaka-03', 'ally', mockDb);
      expect(alliance).toBeDefined();
      expect(alliance!.strength).toBe(15);

      // Durable domain event was recorded
      expect(result.events).toBeDefined();
      expect(result.events![0].type).toBe('CHARACTER_ENDORSED');
      expect(result.events![0].significance).toBe('significant');
    });

    it('rejects client attempts to directly specify reputation scores', async () => {
      const forgedCmd: Command<any> = {
        type: Commands.ENDORSE_CHARACTER,
        payload: {
          targetCharacterId: 'char-amaka-03',
          reputation: 100, // Protected authoritative field!
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655441008',
        character_id: 'char-femi-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(forgedCmd, EndorseCharacterCommand, getCtx());
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.reason).toContain('Direct state mutation rejected');
      expect(result.reason).toContain('reputation');
    });
  });
});
