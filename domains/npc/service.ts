import { SupabaseClient } from '@supabase/supabase-js';
import {
  NpcProfile,
  NpcState,
  NpcRole,
  NpcActivity,
  NpcSimulationTickResult,
  NpcActionRecord,
  NpcInteractionType,
  NpcInteractionOutcome,
} from './types';
import {
  CANONICAL_NPC_IDS,
  DEFAULT_NPC_ROUTINES,
  NPC_DIALOGUE_COLLECTIONS,
  resolveScheduledBlockForHour,
} from './routines';
import { EconomyService } from '@/domains/economy/service';
import { SocialService } from '@/domains/social/service';
import { EventService } from '@/domains/events';

export class NpcService {
  /**
   * Fetches all registered NPC profiles.
   */
  public static async getNpcProfiles(db: SupabaseClient): Promise<NpcProfile[]> {
    const { data, error } = await db
      .from('npc_profile')
      .select(`
        character_id,
        role,
        schedule_type,
        home_venue_id,
        work_venue_id,
        current_activity,
        routine,
        dialogue,
        metadata,
        created_at,
        updated_at
      `);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      characterId: row.character_id,
      role: row.role as NpcRole,
      scheduleType: row.schedule_type,
      homeVenueId: row.home_venue_id,
      workVenueId: row.work_venue_id,
      currentActivity: row.current_activity as NpcActivity,
      routine: Array.isArray(row.routine) && row.routine.length > 0
        ? row.routine
        : DEFAULT_NPC_ROUTINES[row.role as NpcRole] ?? [],
      dialogue: row.dialogue || {},
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Fetches complete state for a single NPC.
   */
  public static async getNpcState(
    characterId: string,
    db: SupabaseClient
  ): Promise<NpcState | null> {
    const { data: char, error: charErr } = await db
      .from('chr_character')
      .select('id, display_name, is_npc')
      .eq('id', characterId)
      .maybeSingle();

    if (charErr || !char || !char.is_npc) return null;

    const { data: profile } = await db
      .from('npc_profile')
      .select('role, current_activity')
      .eq('character_id', characterId)
      .maybeSingle();

    const { data: charState } = await db
      .from('chr_character_state')
      .select('location_id, venue_id')
      .eq('character_id', characterId)
      .maybeSingle();

    const { data: stats } = await db
      .from('chr_character_stats')
      .select('energy, hunger, health')
      .eq('character_id', characterId)
      .maybeSingle();

    const wallet = await EconomyService.getWallet(characterId, db);

    return {
      characterId,
      displayName: char.display_name,
      role: (profile?.role as NpcRole) ?? 'artisan',
      currentActivity: (profile?.current_activity as NpcActivity) ?? 'idle',
      locationId: charState?.location_id ?? null,
      venueId: charState?.venue_id ?? null,
      energy: Number(stats?.energy ?? 100),
      hunger: Number(stats?.hunger ?? 0),
      health: Number(stats?.health ?? 100),
      walletBalance: wallet.balance,
    };
  }

  /**
   * Deterministic simulation tick processing for all NPCs based on world time.
   */
  public static async simulateTick(
    options: {
      gameTime?: Date;
      realNow?: Date;
    } = {},
    db: SupabaseClient
  ): Promise<NpcSimulationTickResult> {
    const realNow = options.realNow ?? new Date();
    const gameTime = options.gameTime ?? new Date();
    const gameHour = gameTime.getUTCHours();
    const actionsExecuted: NpcActionRecord[] = [];

    const startTime = performance.now();
    const profiles = await this.getNpcProfiles(db);

    // Track tick start in obs_tick_log
    const tickLogId = `tick-${realNow.getTime()}-${Math.random().toString(36).substring(2, 7)}`;
    try {
      await db.from('obs_tick_log').insert({
        id: tickLogId,
        tick_type: 'npc_fast_tick',
        started_at: realNow.toISOString(),
      });
    } catch {
      // Optional logging table in mock environments
    }

    for (const profile of profiles) {
      const routine = profile.routine.length > 0
        ? profile.routine
        : DEFAULT_NPC_ROUTINES[profile.role] ?? [];

      const targetBlock = resolveScheduledBlockForHour(routine, gameHour);
      const targetActivity = targetBlock.activity;

      // 1. Fetch character details & current state
      const { data: char } = await db
        .from('chr_character')
        .select('display_name')
        .eq('id', profile.characterId)
        .maybeSingle();

      const npcName = char?.display_name ?? 'Otigba Resident';

      const { data: charState } = await db
        .from('chr_character_state')
        .select('location_id, venue_id')
        .eq('character_id', profile.characterId)
        .maybeSingle();

      const currentVenueId = charState?.venue_id ?? null;
      let targetVenueId = targetBlock.venueId ?? profile.workVenueId ?? currentVenueId;

      if (targetActivity === 'sleeping') {
        targetVenueId = profile.homeVenueId ?? targetVenueId;
      } else if (targetActivity === 'working' || targetActivity === 'patrolling') {
        targetVenueId = profile.workVenueId ?? targetVenueId;
      }

      // 2. Evaluate Location / Venue Movement
      if (targetVenueId && targetVenueId !== currentVenueId) {
        await db
          .from('chr_character_state')
          .update({
            venue_id: targetVenueId,
            updated_at: realNow.toISOString(),
          })
          .eq('character_id', profile.characterId);

        await EventService.recordEvent(
          {
            type: 'VENUE_ENTERED',
            category: 'action',
            significance: 'trivial',
            actorId: profile.characterId,
            venueId: targetVenueId,
            payload: {
              previous_venue_id: currentVenueId,
              target_venue_id: targetVenueId,
              activity: targetActivity,
              game_hour: gameHour,
            },
          },
          db
        );

        actionsExecuted.push({
          characterId: profile.characterId,
          npcName,
          role: profile.role,
          actionType: 'moved',
          details: {
            fromVenueId: currentVenueId,
            toVenueId: targetVenueId,
            scheduledActivity: targetActivity,
          },
        });
      }

      // 3. Activity State Lifecycle Transitions
      // A. Work Session Lifecycle
      if (targetActivity === 'working') {
        // Check for active open work session
        const { data: activeSession } = await db
          .from('eco_work_session')
          .select('id')
          .eq('character_id', profile.characterId)
          .is('ended_at_real', null)
          .maybeSingle();

        if (!activeSession) {
          // Find or create employment
          const { data: emp } = await db
            .from('eco_employment')
            .select('id, hourly_rate')
            .eq('character_id', profile.characterId)
            .eq('status', 'active')
            .maybeSingle();

          let employmentId = emp?.id;
          if (!employmentId) {
            const newEmp = await EconomyService.createEmployment(
              {
                characterId: profile.characterId,
                employerType: 'business',
                employerId: targetVenueId ?? 'biz-community-otigba',
                jobTitle: profile.role === 'food_vendor' ? 'Bukka Head Cook' : 'Transporter',
                hourlyRate: 600,
                venueId: targetVenueId ?? undefined,
                startedAtGame: gameTime.toISOString(),
              },
              db
            );
            employmentId = newEmp.id;
          }

          const session = await EconomyService.startWorkSession(
            profile.characterId,
            employmentId,
            db,
            { gameTime }
          );

          actionsExecuted.push({
            characterId: profile.characterId,
            npcName,
            role: profile.role,
            actionType: 'started_work',
            details: { workSessionId: session.id, employmentId },
          });
        }
      } else if (profile.currentActivity === 'working') {
        // Conclude existing work session
        const { data: activeSession } = await db
          .from('eco_work_session')
          .select('id')
          .eq('character_id', profile.characterId)
          .is('ended_at_real', null)
          .maybeSingle();

        if (activeSession) {
          const finishedSession = await EconomyService.endWorkSession(
            activeSession.id,
            profile.characterId,
            db,
            { gameTime, idempotencyKey: `idemp-npc-endwork-${profile.characterId}-${gameTime.getTime()}` }
          );

          actionsExecuted.push({
            characterId: profile.characterId,
            npcName,
            role: profile.role,
            actionType: 'ended_work',
            details: {
              workSessionId: finishedSession.id,
              earned: finishedSession.earned,
              hoursWorked: finishedSession.gameHours,
            },
          });
        }
      }

      // B. Autonomous Eating / Inter-NPC Commerce (e.g. Baba Musbau buying Jollof from Mama Nkechi)
      if (targetActivity === 'eating' && profile.role !== 'food_vendor') {
        const { data: stats } = await db
          .from('chr_character_stats')
          .select('hunger, energy')
          .eq('character_id', profile.characterId)
          .maybeSingle();

        const hunger = Number(stats?.hunger ?? 0);
        if (hunger >= 15) {
          const item =
            (await EconomyService.getItem('Port Harcourt Bole & Fish', db)) ??
            (await EconomyService.getItem('Jollof Rice & Chicken', db));
          const wallet = await EconomyService.getWallet(profile.characterId, db);

          if (item && wallet.balance >= item.price) {
            // Find Mama Tarila as the seller
            const vendorId = CANONICAL_NPC_IDS.MAMA_TARILA;

            await EconomyService.transferFunds(
              {
                fromId: profile.characterId,
                toId: vendorId,
                fromType: 'character',
                toType: 'character',
                amount: item.price,
                sourceType: 'purchase',
                sourceId: item.id,
                reason: `${npcName} bought ${item.name} for lunch`,
                idempotencyKey: `idemp-npc-lunch-${profile.characterId}-${gameTime.toISOString().slice(0, 13)}`,
                gameTimestamp: gameTime.toISOString(),
              },
              db
            );

            // Update buyer's hunger and energy
            const nextHunger = Math.max(0, hunger - 40);
            const nextEnergy = Math.min(100, Number(stats?.energy ?? 80) + 25);
            await db
              .from('chr_character_stats')
              .update({
                hunger: nextHunger,
                energy: nextEnergy,
                updated_at: realNow.toISOString(),
              })
              .eq('character_id', profile.characterId);

            // Record purchase domain event
            await EventService.recordEvent(
              {
                type: 'ITEM_PURCHASED',
                category: 'action',
                significance: 'trivial',
                actorId: profile.characterId,
                payload: {
                  item_name: item.name,
                  price: item.price,
                  seller_id: vendorId,
                  purpose: 'autonomous_npc_lunch',
                },
              },
              db
            );

            actionsExecuted.push({
              characterId: profile.characterId,
              npcName,
              role: profile.role,
              actionType: 'purchased_food',
              details: {
                item: item.name,
                price: item.price,
                vendorId,
                nextHunger,
              },
            });
          }
        }
      }

      // C. Autonomous Social Encounters (Greeting co-present characters)
      if (targetActivity === 'socializing' || targetActivity === 'patrolling') {
        // Find other characters co-present at the same venue
        const venueToCheck = targetVenueId ?? currentVenueId;
        if (venueToCheck) {
          const { data: coPresent } = await db
            .from('chr_character_state')
            .select('character_id')
            .eq('venue_id', venueToCheck)
            .neq('character_id', profile.characterId)
            .limit(3);

          if (coPresent && coPresent.length > 0) {
            const targetCharId = coPresent[0].character_id;

            // Warm up relationship & local neighbourhood popularity
            await SocialService.updateRelationship(
              {
                actorId: profile.characterId,
                targetId: targetCharId,
                type: 'acquaintance',
                deltaStrength: 3,
              },
              db
            );

            await SocialService.adjustReputation(
              profile.characterId,
              'popularity',
              1,
              'neighbourhood',
              charState?.location_id ?? null,
              db
            );

            await EventService.recordEvent(
              {
                type: 'CHARACTER_GREETED',
                category: 'action',
                significance: 'trivial',
                actorId: profile.characterId,
                payload: {
                  target_character_id: targetCharId,
                  context: `${profile.role} greeted co-present neighbour`,
                  venue_id: venueToCheck,
                },
              },
              db
            );

            actionsExecuted.push({
              characterId: profile.characterId,
              npcName,
              role: profile.role,
              actionType: 'greeted_character',
              details: { targetCharacterId: targetCharId, venueId: venueToCheck },
            });
          }
        }
      }

      // D. Rest / Sleep energy recovery
      if (targetActivity === 'sleeping') {
        const { data: stats } = await db
          .from('chr_character_stats')
          .select('energy')
          .eq('character_id', profile.characterId)
          .maybeSingle();

        const currentEnergy = Number(stats?.energy ?? 80);
        if (currentEnergy < 100) {
          const nextEnergy = Math.min(100, currentEnergy + 15);
          await db
            .from('chr_character_stats')
            .update({ energy: nextEnergy, updated_at: realNow.toISOString() })
            .eq('character_id', profile.characterId);

          actionsExecuted.push({
            characterId: profile.characterId,
            npcName,
            role: profile.role,
            actionType: 'rested',
            details: { restoredTo: nextEnergy },
          });
        }
      }

      // Update current activity in profile table
      await db
        .from('npc_profile')
        .update({
          current_activity: targetActivity,
          updated_at: realNow.toISOString(),
        })
        .eq('character_id', profile.characterId);
    }

    // Update tick completion log
    try {
      await db
        .from('obs_tick_log')
        .update({
          completed_at: new Date().toISOString(),
          entities_processed: profiles.length,
          errors: [],
        })
        .eq('id', tickLogId);
    } catch {
      // Ignore in mock
    }

    return {
      gameTime,
      gameHour,
      processedNpcCount: profiles.length,
      actionsExecuted,
      timestamp: realNow.toISOString(),
    };
  }

  /**
   * Player-to-NPC interactions (Talking, buying food, or asking for transport).
   */
  public static async interact(
    actorCharacterId: string,
    targetNpcId: string,
    interactionType: NpcInteractionType,
    db: SupabaseClient,
    options: { gameTime?: Date } = {}
  ): Promise<NpcInteractionOutcome> {
    const gameTime = options.gameTime ?? new Date();

    const { data: npcChar } = await db
      .from('chr_character')
      .select('display_name, is_npc')
      .eq('id', targetNpcId)
      .maybeSingle();

    if (!npcChar || !npcChar.is_npc) {
      throw new Error('Target character is not a valid NPC');
    }

    const { data: profile } = await db
      .from('npc_profile')
      .select('role, dialogue')
      .eq('character_id', targetNpcId)
      .maybeSingle();

    const dialogues = profile?.dialogue || NPC_DIALOGUE_COLLECTIONS[targetNpcId] || {};
    const dialogueList = dialogues[interactionType] ?? dialogues['greeting'] ?? [
      'Hello my friend! Welcome!',
    ];
    const dialogueText = dialogueList[Math.floor(Math.random() * dialogueList.length)];

    let transactionId: string | undefined;
    let relationshipStrength = 10;
    let reputationDelta = 2;

    if (interactionType === 'greet' || interactionType === 'inquire') {
      // Warm up relationship: +5
      const rel = await SocialService.updateRelationship(
        {
          actorId: actorCharacterId,
          targetId: targetNpcId,
          type: 'friend',
          deltaStrength: 5,
        },
        db
      );
      relationshipStrength = rel.strength;

      // Player gains local neighbourhood reputation
      await SocialService.adjustReputation(
        actorCharacterId,
        'popularity',
        2,
        'neighbourhood',
        null,
        db
      );

      await EventService.recordEvent(
        {
          type: 'CHARACTER_GREETED',
          category: 'action',
          significance: 'trivial',
          actorId: actorCharacterId,
          payload: { target_npc_id: targetNpcId, interaction: interactionType },
        },
        db
      );
    } else if (interactionType === 'buy_food') {
      // Player purchases meal from Mama Tarila (or local vendor)
      const item =
        (await EconomyService.getItem('Port Harcourt Bole & Fish', db)) ??
        (await EconomyService.getItem('Jollof Rice & Chicken', db));
      if (!item) throw new Error('Catalog item not found');

      const transfer = await EconomyService.transferFunds(
        {
          fromId: actorCharacterId,
          toId: targetNpcId,
          fromType: 'character',
          toType: 'character',
          amount: item.price,
          sourceType: 'purchase',
          sourceId: item.id,
          reason: `Purchased ${item.name} from ${npcChar.display_name}`,
          idempotencyKey: `idemp-player-buy-${actorCharacterId}-${Date.now()}`,
          gameTimestamp: gameTime.toISOString(),
        },
        db
      );

      transactionId = transfer.transactionId;

      // Apply food boost to player stats
      const { data: stats } = await db
        .from('chr_character_stats')
        .select('energy, hunger')
        .eq('character_id', actorCharacterId)
        .maybeSingle();

      if (stats) {
        await db
          .from('chr_character_stats')
          .update({
            energy: Math.min(100, Number(stats.energy) + item.energyDelta),
            hunger: Math.max(0, Number(stats.hunger) + item.hungerDelta),
            updated_at: new Date().toISOString(),
          })
          .eq('character_id', actorCharacterId);
      }

      // Boost vendor's business reputation
      await SocialService.adjustReputation(
        targetNpcId,
        'business_reputation',
        3,
        'market',
        null,
        db
      );

      await EventService.recordEvent(
        {
          type: 'ITEM_PURCHASED',
          category: 'action',
          significance: 'minor',
          actorId: actorCharacterId,
          payload: {
            item_name: item.name,
            price: item.price,
            seller_id: targetNpcId,
            transaction_id: transactionId,
          },
        },
        db
      );
    } else if (interactionType === 'request_ride') {
      // Player pays transport fare to Baba Musbau
      const fare = 300;
      const transfer = await EconomyService.transferFunds(
        {
          fromId: actorCharacterId,
          toId: targetNpcId,
          fromType: 'character',
          toType: 'character',
          amount: fare,
          sourceType: 'purchase',
          sourceId: null,
          reason: `Keke Napep fare along Olu Obasanjo Road to Garrison Junction`,
          idempotencyKey: `idemp-ride-${actorCharacterId}-${Date.now()}`,
          gameTimestamp: gameTime.toISOString(),
        },
        db
      );

      transactionId = transfer.transactionId;

      await EventService.recordEvent(
        {
          type: 'TRANSIT_TRIP_TAKEN',
          category: 'action',
          significance: 'trivial',
          actorId: actorCharacterId,
          payload: { rider_id: targetNpcId, fare, destination: 'Garrison Junction Keke Park' },
        },
        db
      );
    }

    return {
      npcId: targetNpcId,
      npcName: npcChar.display_name,
      interactionType,
      dialogueText,
      relationshipStrength,
      reputationDelta,
      transactionId,
    };
  }
}
