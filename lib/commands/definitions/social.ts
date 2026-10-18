import { Commands, DomainEventInput, RealtimeBroadcastInput } from '@/lib/types/command-types';
import { defineCommand, registerCommand } from '../registry';
import {
  FormRelationshipPayload,
  UpdateRelationshipPayload,
  DissolveRelationshipPayload,
  GreetCharacterPayload,
  EndorseCharacterPayload,
  Relationship,
  ReputationRecord,
} from '@/domains/social/types';
import { SocialService } from '@/domains/social/service';
import { EventService } from '@/domains/events';

// ============================================================================
// 1. FORM_RELATIONSHIP Command
// ============================================================================
export const FormRelationshipCommand = registerCommand<FormRelationshipPayload, Relationship>(
  defineCommand<FormRelationshipPayload, Relationship>({
    type: Commands.FORM_RELATIONSHIP,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, type } = cmd.payload;

      if (!targetCharacterId) return 'Target character ID is required';
      if (targetCharacterId === charId) return 'Cannot form a relationship with yourself';
      if (!type || type.trim().length === 0) return 'Relationship type is required';

      // Verify target character exists
      const { data: targetChar, error } = await ctx.db
        .from('chr_character')
        .select('id')
        .eq('id', targetCharacterId)
        .maybeSingle();

      if (error || !targetChar) return 'Target character does not exist';

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, type, initialStrength = 10, metadata = {} } = cmd.payload;

      const relationship = await SocialService.formRelationship(
        {
          actorId: charId,
          targetId: targetCharacterId,
          type,
          initialStrength,
          metadata,
        },
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'RELATIONSHIP_FORMED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          payload: {
            target_character_id: targetCharacterId,
            relationship_type: type,
            strength: relationship.strength,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: `relationship.${type}.${targetCharacterId}`,
              delta: { strength: relationship.strength, type },
            },
          ],
        },
      ];

      return {
        state: relationship,
        events,
      };
    },
  })
);

// ============================================================================
// 2. UPDATE_RELATIONSHIP Command
// ============================================================================
export const UpdateRelationshipCommand = registerCommand<UpdateRelationshipPayload, Relationship>(
  defineCommand<UpdateRelationshipPayload, Relationship>({
    type: Commands.UPDATE_RELATIONSHIP,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, type } = cmd.payload;

      if (!targetCharacterId) return 'Target character ID is required';
      if (!type) return 'Relationship type is required';

      const existing = await SocialService.getRelationship(charId, targetCharacterId, type, ctx.db);
      if (!existing) return `No existing ${type} relationship with target character to update`;

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, type, deltaStrength, newState, metadata } = cmd.payload;

      const updated = await SocialService.updateRelationship(
        {
          actorId: charId,
          targetId: targetCharacterId,
          type,
          deltaStrength,
          newState,
          metadata,
        },
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'RELATIONSHIP_UPDATED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          payload: {
            target_character_id: targetCharacterId,
            relationship_type: type,
            new_strength: updated.strength,
            new_state: updated.state,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: `relationship.${type}.${targetCharacterId}`,
              delta: { strength: updated.strength, state: updated.state },
            },
          ],
        },
      ];

      return {
        state: updated,
        events,
      };
    },
  })
);

// ============================================================================
// 3. DISSOLVE_RELATIONSHIP Command
// ============================================================================
export interface DissolveRelationshipOutcome {
  actorId: string;
  targetId: string;
  type: string;
  dissolved: boolean;
}

export const DissolveRelationshipCommand = registerCommand<DissolveRelationshipPayload, DissolveRelationshipOutcome>(
  defineCommand<DissolveRelationshipPayload, DissolveRelationshipOutcome>({
    type: Commands.DISSOLVE_RELATIONSHIP,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, type } = cmd.payload;

      if (!targetCharacterId) return 'Target character ID is required';
      if (!type) return 'Relationship type is required';

      const existing = await SocialService.getRelationship(charId, targetCharacterId, type, ctx.db);
      if (!existing) return `No active relationship found to dissolve`;

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, type, reason } = cmd.payload;

      const dissolved = await SocialService.dissolveRelationship(charId, targetCharacterId, type, ctx.db);

      const events: DomainEventInput[] = [
        {
          type: 'RELATIONSHIP_DISSOLVED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          payload: {
            target_character_id: targetCharacterId,
            relationship_type: type,
            reason: reason ?? 'Player initiated dissolution',
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: `relationship.${type}.${targetCharacterId}`,
              delta: { status: 'dissolved' },
            },
          ],
        },
      ];

      return {
        state: {
          actorId: charId,
          targetId: targetCharacterId,
          type,
          dissolved,
        },
        events,
      };
    },
  })
);

// ============================================================================
// 4. GREET_CHARACTER Command (Meaningful MVP Social Interaction)
// ============================================================================
export interface GreetCharacterOutcome {
  actorId: string;
  targetId: string;
  relationshipStrength: number;
  actorPopularity: number;
}

export const GreetCharacterCommand = registerCommand<GreetCharacterPayload, GreetCharacterOutcome>(
  defineCommand<GreetCharacterPayload, GreetCharacterOutcome>({
    type: Commands.GREET_CHARACTER,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId } = cmd.payload;

      if (!targetCharacterId) return 'Target character ID is required';
      if (targetCharacterId === charId) return 'Cannot greet yourself';

      const { data: targetChar } = await ctx.db
        .from('chr_character')
        .select('id')
        .eq('id', targetCharacterId)
        .maybeSingle();

      if (!targetChar) return 'Target character does not exist';

      // Cooldown guard: cannot spam greet the same character within 30 seconds
      try {
        const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
        const { data: recentGreet } = await ctx.db
          .from('evt_event')
          .select('id')
          .eq('type', 'CHARACTER_GREETED')
          .eq('actor_id', charId)
          .gte('created_at', thirtySecondsAgo)
          .contains('payload', { target_character_id: targetCharacterId })
          .maybeSingle();

        if (recentGreet) {
          return 'Greeting cooldown active: you have already greeted this citizen recently';
        }
      } catch {
        // Proceed if table or query check not supported in mock
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, venueId, locationId } = cmd.payload;

      // 1. Warm up relationship: +5 strength
      const rel = await SocialService.updateRelationship(
        {
          actorId: charId,
          targetId: targetCharacterId,
          type: 'friend',
          deltaStrength: 5,
        },
        ctx.db
      );

      // 2. Build local neighbourhood popularity: +2 in scope
      const repAdj = await SocialService.adjustReputation(
        charId,
        'popularity',
        2,
        'neighbourhood',
        locationId ?? null,
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'CHARACTER_GREETED',
          category: 'action',
          significance: 'trivial',
          actor_id: charId,
          location_id: locationId ?? null,
          venue_id: venueId ?? null,
          payload: {
            target_character_id: targetCharacterId,
            relationship_strength: rel.strength,
            popularity_score: repAdj.newScore,
          },
        },
      ];

      const realtimeBroadcasts: RealtimeBroadcastInput[] = [
        {
          channel: `character:${targetCharacterId}`,
          event: 'greeted_by_character',
          payload: {
            actor_id: charId,
            relationship_strength: rel.strength,
          },
        },
      ];

      return {
        state: {
          actorId: charId,
          targetId: targetCharacterId,
          relationshipStrength: rel.strength,
          actorPopularity: repAdj.newScore,
        },
        events,
        realtimeBroadcasts,
      };
    },
  })
);

// ============================================================================
// 5. ENDORSE_CHARACTER Command (Public Endorsement Affecting Scoped Reputation)
// ============================================================================
export interface EndorseCharacterOutcome {
  endorserId: string;
  targetId: string;
  dimension: string;
  scopeType: string;
  scopeId: string | null;
  targetNewScore: number;
}

export const EndorseCharacterCommand = registerCommand<EndorseCharacterPayload, EndorseCharacterOutcome>(
  defineCommand<EndorseCharacterPayload, EndorseCharacterOutcome>({
    type: Commands.ENDORSE_CHARACTER,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId } = cmd.payload;

      if (!targetCharacterId) return 'Target character ID is required';
      if (targetCharacterId === charId) return 'Cannot endorse yourself';

      const { data: targetChar } = await ctx.db
        .from('chr_character')
        .select('id')
        .eq('id', targetCharacterId)
        .maybeSingle();

      if (!targetChar) return 'Target character does not exist';

      // Cooldown guard: cannot endorse the same character within 10 minutes
      try {
        const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
        const { data: recentEndorse } = await ctx.db
          .from('evt_event')
          .select('id')
          .eq('type', 'CHARACTER_ENDORSED')
          .eq('actor_id', charId)
          .gte('created_at', tenMinutesAgo)
          .contains('payload', { target_character_id: targetCharacterId })
          .maybeSingle();

        if (recentEndorse) {
          return 'Endorsement cooldown active: you have already endorsed this citizen recently';
        }
      } catch {
        // Proceed if table or query check not supported in mock
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const {
        targetCharacterId,
        dimension = 'trust',
        scopeType = 'neighbourhood',
        scopeId,
        endorsementNote,
      } = cmd.payload;

      // 1. Boost target's reputation in chosen dimension and scope (+10)
      const repResult = await SocialService.adjustReputation(
        targetCharacterId,
        dimension,
        10,
        scopeType,
        scopeId ?? null,
        ctx.db
      );

      // 2. Also boost target's influence slightly (+5)
      await SocialService.adjustReputation(
        targetCharacterId,
        'influence',
        5,
        scopeType,
        scopeId ?? null,
        ctx.db
      );

      // 3. Strengthen mutual alliance relationship (+15)
      await SocialService.updateRelationship(
        {
          actorId: charId,
          targetId: targetCharacterId,
          type: 'ally',
          deltaStrength: 15,
        },
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'CHARACTER_ENDORSED',
          category: 'action',
          significance: 'significant',
          actor_id: charId,
          payload: {
            target_character_id: targetCharacterId,
            dimension,
            scope_type: scopeType,
            scope_id: scopeId ?? null,
            target_new_score: repResult.newScore,
            note: endorsementNote ?? 'Public endorsement',
          },
          effects: [
            {
              target_type: 'character',
              target_id: targetCharacterId,
              attribute: `reputation.${dimension}.${scopeType}`,
              delta: { score_increase: 10, current_score: repResult.newScore },
            },
          ],
        },
      ];

      return {
        state: {
          endorserId: charId,
          targetId: targetCharacterId,
          dimension,
          scopeType,
          scopeId: scopeId ?? null,
          targetNewScore: repResult.newScore,
        },
        events,
      };
    },
  })
);
