import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { EnterVenuePayload } from '@/domains/physical-world/types';

interface EnterVenueState {
  characterId: string;
  venueId: string;
  zoneId: string;
}

export const enterVenueHandler = createCommandHandler<EnterVenuePayload>(
  async (command, ctx) => {
    if (command.type !== Commands.ENTER_VENUE) return 'Invalid command type';
    const { venueId } = command.payload;
    if (!venueId) return 'Venue ID is required';
    if (!ctx.actorId) return 'Authentication required';

    // Verify active character
    const { data: activeChar, error: activeErr } = await ctx.db
      .from('acct_active_character')
      .select('character_id, acct_account!inner(user_id)')
      .eq('acct_account.user_id', ctx.actorId)
      .maybeSingle();

    if (activeErr || !activeChar) return 'No active character selected';

    // Verify venue exists and get its zone
    const { data: venue, error: venueErr } = await ctx.db
      .from('phys_venue')
      .select('id, zone_id, capacity')
      .eq('id', venueId)
      .maybeSingle();

    if (venueErr || !venue) return 'Venue does not exist';
    
    // Check if character is currently in the same zone as the venue
    const { data: charState } = await ctx.db
      .from('chr_character_state')
      .select('location_id, venue_id')
      .eq('character_id', activeChar.character_id)
      .maybeSingle();

    if (!charState) return 'Character state not initialized';
    if (charState.venue_id === venueId) return 'Already in this venue';
    
    // For MVP, we might allow them to enter a venue from a different zone (auto-travel), 
    // but typically they should be in the correct zone. We will let them teleport for now.

    (command.payload as Record<string, unknown>)._activeCharacterId = activeChar.character_id;
    (command.payload as Record<string, unknown>)._zoneId = venue.zone_id;
    return true;
  },
  async (command) => {
    return {
      characterId: (command.payload as Record<string, unknown>)._activeCharacterId as string,
      venueId: command.payload.venueId,
      zoneId: (command.payload as Record<string, unknown>)._zoneId as string
    } as EnterVenueState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as EnterVenueState;

    const { error } = await ctx.db
      .from('chr_character_state')
      .upsert({
        character_id: state.characterId,
        location_id: state.zoneId, // Update location to venue's zone
        venue_id: state.venueId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'character_id' });

    if (error) throw new Error(`Failed to enter venue: ${error.message}`);
  }
);
