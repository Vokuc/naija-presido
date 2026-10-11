import { Commands, DomainEventInput, RealtimeBroadcastInput } from '@/lib/types/command-types';
import { defineCommand, registerCommand } from '../registry';
import { ChangeLocationPayload } from '@/domains/geography/types';
import { EnterVenuePayload, LeaveVenuePayload } from '@/domains/physical-world/types';

export interface MoveCharacterOutcome {
  characterId: string;
  fromLocationId: string | null;
  toLocationId: string;
}

export const MoveCharacterCommand = registerCommand<ChangeLocationPayload, MoveCharacterOutcome>(
  defineCommand({
    type: Commands.MOVE_CHARACTER,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const { targetLocationId } = cmd.payload;
      if (!targetLocationId) return 'Target location ID is required';

      const { data: loc, error } = await ctx.db
        .from('geo_location')
        .select('id')
        .eq('id', targetLocationId)
        .maybeSingle();

      if (error || !loc) return 'Target location does not exist';
      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const targetLocationId = cmd.payload.targetLocationId;

      // Read current location for event payload
      const { data: currentState } = await ctx.db
        .from('chr_character_state')
        .select('location_id')
        .eq('character_id', charId)
        .maybeSingle();

      const fromLocationId = currentState?.location_id ?? null;

      const events: DomainEventInput[] = [
        {
          type: 'CHARACTER_MOVED',
          category: 'action',
          significance: 'trivial',
          actor_id: charId,
          location_id: targetLocationId,
          payload: {
            from_location_id: fromLocationId,
            to_location_id: targetLocationId,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'location_id',
              delta: { previous: fromLocationId, current: targetLocationId },
            },
          ],
        },
      ];

      const realtimeBroadcasts: RealtimeBroadcastInput[] = [
        {
          channel: `presence:location:${targetLocationId}`,
          event: 'character_entered',
          payload: { character_id: charId },
        },
      ];

      return {
        state: {
          characterId: charId,
          fromLocationId,
          toLocationId: targetLocationId,
        },
        events,
        realtimeBroadcasts,
        stateMutations: async (c) => {
          const { error } = await c.db
            .from('chr_character_state')
            .upsert(
              {
                character_id: charId,
                location_id: targetLocationId,
                venue_id: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'character_id' }
            );

          if (error) throw new Error(`Failed to change location: ${error.message}`);
        },
      };
    },
  })
);

export interface EnterVenueOutcome {
  characterId: string;
  venueId: string;
  zoneId: string;
}

export const EnterVenueCommand = registerCommand<EnterVenuePayload, EnterVenueOutcome>(
  defineCommand({
    type: Commands.ENTER_VENUE,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const { venueId } = cmd.payload;
      if (!venueId) return 'Venue ID is required';

      const { data: venue, error: venueErr } = await ctx.db
        .from('phys_venue')
        .select('id, zone_id, capacity')
        .eq('id', venueId)
        .maybeSingle();

      if (venueErr || !venue) return 'Venue does not exist';

      const { data: charState } = await ctx.db
        .from('chr_character_state')
        .select('location_id, venue_id')
        .eq('character_id', ctx.characterId!)
        .maybeSingle();

      if (!charState) return 'Character state not initialized';
      if (charState.venue_id === venueId) return 'Already in this venue';

      (cmd.payload as unknown as Record<string, unknown>)._zoneId = venue.zone_id;
      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const venueId = cmd.payload.venueId;
      const zoneId = (cmd.payload as unknown as Record<string, unknown>)._zoneId as string;

      const events: DomainEventInput[] = [
        {
          type: 'VENUE_ENTERED',
          category: 'action',
          significance: 'trivial',
          actor_id: charId,
          venue_id: venueId,
          location_id: zoneId,
          payload: { venue_id: venueId },
        },
      ];

      return {
        state: {
          characterId: charId,
          venueId,
          zoneId,
        },
        events,
        stateMutations: async (c) => {
          const { error } = await c.db
            .from('chr_character_state')
            .upsert(
              {
                character_id: charId,
                location_id: zoneId,
                venue_id: venueId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'character_id' }
            );

          if (error) throw new Error(`Failed to enter venue: ${error.message}`);
        },
      };
    },
  })
);

export interface LeaveVenueOutcome {
  characterId: string;
}

export const LeaveVenueCommand = registerCommand<LeaveVenuePayload, LeaveVenueOutcome>(
  defineCommand({
    type: Commands.LEAVE_VENUE,
    requiresAuth: true,
    requiresActiveCharacter: true,
    validate: async (cmd, ctx) => {
      const { data: charState } = await ctx.db
        .from('chr_character_state')
        .select('venue_id')
        .eq('character_id', ctx.characterId!)
        .maybeSingle();

      if (!charState || !charState.venue_id) return 'Not currently in a venue';
      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;

      const events: DomainEventInput[] = [
        {
          type: 'VENUE_LEFT',
          category: 'action',
          significance: 'trivial',
          actor_id: charId,
          payload: {},
        },
      ];

      return {
        state: { characterId: charId },
        events,
        stateMutations: async (c) => {
          const { error } = await c.db
            .from('chr_character_state')
            .update({
              venue_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('character_id', charId);

          if (error) throw new Error(`Failed to leave venue: ${error.message}`);
        },
      };
    },
  })
);
