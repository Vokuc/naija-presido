import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/db/server';
import { EventService } from '@/domains/events';
import { NpcService } from '@/domains/npc/service';
import { EconomyService } from '@/domains/economy/service';
import { OrganizationService } from '@/domains/organizations/service';
import { CANONICAL_NPC_IDS } from '@/domains/npc/routines';

export async function GET(request: Request) {
  try {
    let user = null;
    try {
      const supabase = await createClient();
      const authRes = await supabase.auth.getUser();
      user = authRes.data?.user ?? null;
    } catch {
      // Prerender or guest mode
    }

    const adminDb = createAdminClient();

    // 1. Resolve Auth user or Guest fallback
    let effectiveUserId = user?.id;
    let isGuest = false;

    const guestHeaderId = request.headers.get('x-guest-user-id');
    if (!effectiveUserId && guestHeaderId) {
      effectiveUserId = guestHeaderId;
      isGuest = true;
    }

    if (!effectiveUserId) {
      effectiveUserId = '00000000-0000-0000-0000-000000000099';
      isGuest = true;
    }

    // 2. Ensure account exists for effective user (guest or authenticated)
    let { data: account } = await adminDb
      .from('acct_account')
      .select('id, username')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (!account) {
      const guestUsername = isGuest
        ? `ph_citizen_${effectiveUserId.slice(-4)}`
        : `user_${effectiveUserId.slice(0, 8)}`;

      const { data: createdAcc } = await adminDb
        .from('acct_account')
        .insert({
          user_id: effectiveUserId,
          username: guestUsername,
          status: 'active',
        })
        .select('id, username')
        .single();

      account = createdAcc;
    }

    // 3. Ensure active character exists
    let { data: activeCharRecord } = await adminDb
      .from('acct_active_character')
      .select('character_id')
      .eq('account_id', account!.id)
      .maybeSingle();

    let characterId = activeCharRecord?.character_id;

    if (!characterId) {
      // Find or create default Port Harcourt player character
      const { data: existingChar } = await adminDb
        .from('chr_character')
        .select('id')
        .eq('account_id', account!.id)
        .maybeSingle();

      if (existingChar) {
        characterId = existingChar.id;
      } else {
        const { data: newChar } = await adminDb
          .from('chr_character')
          .insert({
            account_id: account!.id,
            is_npc: false,
            display_name: 'Chidi (PH Hustler)',
            bio: 'Ambitious Port Harcourt citizen navigating D-Line and Olu Obasanjo Road.',
            avatar_config: { shirt: '#008751', trousers: '#2c3e50', skin: '#634439' },
          })
          .select('id')
          .single();

        characterId = newChar!.id;

        // Initialize state, stats, and starting wallet
        await adminDb.from('chr_character_state').upsert({
          character_id: characterId,
          location_id: '10000000-0000-0000-0000-000000000004', // Olu Obasanjo Road
          venue_id: null,
          status: 'active',
        });

        await adminDb.from('chr_character_stats').upsert({
          character_id: characterId,
          energy: 90,
          hunger: 35,
          health: 100,
          job_title: 'Freelance Artisan',
        });

        // Initialize wallet with 10,000 NGN starting funds
        await EconomyService.getWallet(characterId, adminDb);
        await EconomyService.transferFunds(
          {
            fromId: null,
            toId: characterId,
            fromType: 'system',
            toType: 'character',
            amount: 10000,
            sourceType: 'system_grant',
            reason: 'Starting Port Harcourt Citizen Allowance',
            idempotencyKey: `init-grant-${characterId}`,
            gameTimestamp: new Date().toISOString(),
          },
          adminDb
        );
      }

      await adminDb.from('acct_active_character').upsert({
        account_id: account!.id,
        character_id: characterId,
        switched_at: new Date().toISOString(),
      });
    }

    // 4. Fetch Complete Player Info
    const { data: charData } = await adminDb
      .from('chr_character')
      .select('id, display_name, bio, avatar_config')
      .eq('id', characterId)
      .single();

    const { data: charState } = await adminDb
      .from('chr_character_state')
      .select('location_id, venue_id, status')
      .eq('character_id', characterId)
      .maybeSingle();

    const { data: charStats } = await adminDb
      .from('chr_character_stats')
      .select('energy, hunger, health, job_title')
      .eq('character_id', characterId)
      .maybeSingle();

    const wallet = await EconomyService.getWallet(characterId, adminDb);

    // 5. Fetch World Time & Hour
    const gameTimeIso = await EventService.resolveGameTime(adminDb);
    const gameTime = new Date(gameTimeIso);
    const gameHour = gameTime.getUTCHours();

    // 6. Fetch NPCs & Activities
    const npcProfiles = await NpcService.getNpcProfiles(adminDb);
    const npcStates = await Promise.all(
      npcProfiles.map(async (p) => {
        const state = await NpcService.getNpcState(p.characterId, adminDb);
        return {
          profile: p,
          state,
        };
      })
    );

    // 7. Fetch Port Harcourt Venues
    const { data: venues } = await adminDb
      .from('phys_venue')
      .select('id, name, type, capacity, zone_id')
      .in('id', [
        '10000000-0000-0000-0000-000000000021', // Mama Tarila Bole Joint
        '10000000-0000-0000-0000-000000000022', // Garrison Junction Keke Park
        '10000000-0000-0000-0000-000000000023', // Garden City Tech & Gadgets / Plaza
      ]);

    // 8. Fetch Item Catalog
    const { data: catalog } = await adminDb
      .from('eco_item_catalog')
      .select('*')
      .order('price', { ascending: true });

    // 9. Fetch Account Characters
    const { data: allCharacters } = await adminDb
      .from('chr_character')
      .select('id, display_name, bio, avatar_config, is_npc, created_at')
      .eq('account_id', account!.id)
      .eq('is_npc', false)
      .order('created_at', { ascending: false });

    // 10. Fetch Active Employment
    const activeEmployment = await EconomyService.getActiveEmployment(characterId, adminDb);

    // 11. Fetch Scoped Reputation Profile
    const { data: repRows } = await adminDb
      .from('soc_reputation')
      .select('dimension, score, scope_type, scope_id')
      .eq('character_id', characterId);

    // 12. Fetch Recent Ledger Transactions
    const recentTransactions = await EconomyService.getTransactionHistory(characterId, adminDb, { limit: 10 });

    // 13. Fetch Recent Chronicle Timeline Events
    const recentEvents = await EventService.getCharacterTimeline(characterId, { limit: 10 }, adminDb);

    // 14. Ensure Garden City Plaza has business liquidity for wages
    try {
      const plazaWallet = await EconomyService.getWallet('10000000-0000-0000-0000-000000000023', adminDb);
      if (plazaWallet.balance < 500000) {
        await adminDb
          .from('eco_wallet')
          .update({ balance: 2500000, updated_at: new Date().toISOString() })
          .eq('character_id', '10000000-0000-0000-0000-000000000023');
      }
    } catch {
      // Non-fatal liquidity init
    }

    // 15. Fetch Active Organizations & Character Affiliations
    let organizations: any[] = [];
    let memberships: any[] = [];
    try {
      organizations = await OrganizationService.listOrganizations(adminDb);
      memberships = await OrganizationService.getCharacterMemberships(characterId, adminDb);
    } catch {
      // Non-fatal fallback
    }

    return NextResponse.json({
      ok: true,
      account: {
        id: account!.id,
        userId: effectiveUserId,
        username: account!.username,
        isGuest,
      },
      player: {
        userId: effectiveUserId,
        accountId: account!.id,
        characterId,
        displayName: charData?.display_name ?? 'Chidi',
        bio: charData?.bio,
        avatarConfig: charData?.avatar_config || {},
        locationId: charState?.location_id ?? '10000000-0000-0000-0000-000000000004',
        venueId: charState?.venue_id ?? null,
        energy: Number(charStats?.energy ?? 100),
        hunger: Number(charStats?.hunger ?? 0),
        health: Number(charStats?.health ?? 100),
        jobTitle: activeEmployment?.jobTitle ?? charStats?.job_title ?? 'Resident',
        walletBalance: wallet.balance,
      },
      characters: (allCharacters || []).map((c) => ({
        id: c.id,
        displayName: c.display_name,
        bio: c.bio,
        avatarConfig: c.avatar_config || {},
        isActive: c.id === characterId,
      })),
      reputation: (repRows && repRows.length > 0)
        ? repRows
        : [
            { dimension: 'popularity', score: 10, scope_type: 'neighbourhood' },
            { dimension: 'trust', score: 10, scope_type: 'neighbourhood' },
            { dimension: 'competence', score: 5, scope_type: 'global' },
          ],
      employment: activeEmployment,
      transactions: recentTransactions,
      events: recentEvents,
      organizations,
      memberships,
      world: {
        gameTime: gameTime.toISOString(),
        gameHour,
        zoneName: 'Olu Obasanjo Road, D-Line, Port Harcourt',
        zoneId: '10000000-0000-0000-0000-000000000004',
        venues: venues || [],
        npcs: npcStates,
        catalog: catalog || [],
      },
    });
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED' || error?.message?.includes('bail out of prerendering')) {
      throw error;
    }
    console.error('Failed to bootstrap game:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Bootstrap failed' },
      { status: 500 }
    );
  }
}
