import { Commands, DomainEventInput } from '@/lib/types/command-types';
import { defineCommand, registerCommand } from '../registry';
import {
  AcceptJobPayload,
  StartWorkPayload,
  EndWorkPayload,
  BuyItemPayload,
  TransferMoneyPayload,
  AcquireAssetPayload,
  Employment,
  WorkSession,
  ItemCatalogEntry,
} from '@/domains/economy/types';
import { EconomyService } from '@/domains/economy/service';
import { EventService } from '@/domains/events';

// ============================================================================
// 1. ACCEPT_JOB Command
// ============================================================================
export const AcceptJobCommand = registerCommand<AcceptJobPayload, Employment>(
  defineCommand({
    type: Commands.ACCEPT_JOB,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd) => {
      const { employerId, jobTitle, hourlyRate } = cmd.payload;
      if (!employerId) return 'Employer ID is required';
      if (!jobTitle || jobTitle.trim().length === 0) return 'Job title is required';
      if (typeof hourlyRate !== 'number' || hourlyRate < 0) return 'Hourly rate must be a non-negative number';
      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { employerId, employerType = 'character', jobTitle, hourlyRate, venueId } = cmd.payload;
      const gameTime = ctx.gameTime ? ctx.gameTime.toISOString() : await EventService.resolveGameTime(ctx.db);

      const employment = await EconomyService.createEmployment(
        {
          characterId: charId,
          employerType,
          employerId,
          venueId,
          jobTitle,
          hourlyRate,
          startedAtGame: gameTime,
        },
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'EMPLOYMENT_OBTAINED',
          category: 'action',
          significance: 'significant',
          actor_id: charId,
          venue_id: venueId ?? null,
          payload: {
            employment_id: employment.id,
            employer_id: employerId,
            employer_type: employerType,
            job_title: jobTitle,
            hourly_rate: hourlyRate,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'employment.job_title',
              delta: { job_title: jobTitle, employer_id: employerId },
            },
          ],
        },
      ];

      return {
        state: employment,
        events,
      };
    },
  })
);

// ============================================================================
// 2. START_WORK Command
// ============================================================================
export const StartWorkCommand = registerCommand<StartWorkPayload, WorkSession>(
  defineCommand({
    type: Commands.START_WORK,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { employmentId } = cmd.payload;
      if (!employmentId) return 'Employment ID is required';

      // Verify active employment exists for this character
      const { data: emp, error } = await ctx.db
        .from('eco_employment')
        .select('id, status, character_id')
        .eq('id', employmentId)
        .maybeSingle();

      if (error || !emp || emp.character_id !== charId || emp.status !== 'active') {
        return 'Active employment record not found for this character';
      }

      // Check if character already has an open work session
      const { data: activeSession } = await ctx.db
        .from('eco_work_session')
        .select('id')
        .eq('character_id', charId)
        .is('ended_at_real', null)
        .maybeSingle();

      if (activeSession) {
        return 'Character already has an ongoing work session in progress';
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { employmentId } = cmd.payload;
      const gameTimestamp = ctx.gameTime ? ctx.gameTime.toISOString() : await EventService.resolveGameTime(ctx.db);
      const realTimestamp = new Date().toISOString();

      const sessionRecord = {
        character_id: charId,
        employment_id: employmentId,
        started_at_real: realTimestamp,
        started_at_game: gameTimestamp,
        ended_at_real: null,
        ended_at_game: null,
        game_hours: null,
        earned: null,
        idempotency_key: cmd.idempotency_key ?? `idemp-${Math.random().toString(36).substring(2, 9)}`,
      };

      let sessionId: string;
      const insertQuery = ctx.db.from('eco_work_session').insert(sessionRecord);
      if (typeof insertQuery?.select === 'function') {
        const { data: created } = await insertQuery.select('id').maybeSingle();
        sessionId = created?.id ?? `ws-${Math.random().toString(36).substring(2, 9)}`;
      } else {
        const res = (await insertQuery) as any;
        sessionId = res?.data?.id ?? `ws-${Math.random().toString(36).substring(2, 9)}`;
      }

      const workSession: WorkSession = {
        id: sessionId,
        characterId: charId,
        employmentId,
        startedAtReal: realTimestamp,
        startedAtGame: gameTimestamp,
        idempotencyKey: sessionRecord.idempotency_key,
      };

      const events: DomainEventInput[] = [
        {
          type: 'WORK_SESSION_STARTED',
          category: 'action',
          significance: 'trivial',
          actor_id: charId,
          payload: {
            work_session_id: sessionId,
            employment_id: employmentId,
            started_at_game: gameTimestamp,
          },
        },
      ];

      return {
        state: workSession,
        events,
      };
    },
  })
);

// ============================================================================
// 3. END_WORK Command
// ============================================================================
export interface EndWorkOutcome {
  workSessionId: string;
  hoursWorked: number;
  earned: number;
  newBalance: number;
}

export const EndWorkCommand = registerCommand<EndWorkPayload, EndWorkOutcome>(
  defineCommand({
    type: Commands.END_WORK,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { workSessionId } = cmd.payload;
      if (!workSessionId) return 'Work session ID is required';

      const { data: session, error } = await ctx.db
        .from('eco_work_session')
        .select('id, character_id, ended_at_real')
        .eq('id', workSessionId)
        .maybeSingle();

      if (error || !session || session.character_id !== charId) {
        return 'Work session not found for this character';
      }

      if (session.ended_at_real) {
        return 'Work session has already been completed';
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { workSessionId } = cmd.payload;
      const endedAtReal = new Date().toISOString();
      const endedAtGame = ctx.gameTime ? ctx.gameTime.toISOString() : await EventService.resolveGameTime(ctx.db);

      // Fetch work session & employment details
      const { data: session } = await ctx.db
        .from('eco_work_session')
        .select('*')
        .eq('id', workSessionId)
        .maybeSingle();

      const { data: employment } = await ctx.db
        .from('eco_employment')
        .select('*')
        .eq('id', session?.employment_id)
        .maybeSingle();

      const hourlyRate = Number(employment?.hourly_rate ?? 500);

      // Calculate game hours worked
      const startGameMs = new Date(session?.started_at_game ?? endedAtGame).getTime();
      const endGameMs = new Date(endedAtGame).getTime();
      const elapsedHours = Math.max(0.25, (endGameMs - startGameMs) / (1000 * 60 * 60));
      const hoursWorked = Math.round(elapsedHours * 100) / 100;
      const earned = Math.round(hoursWorked * hourlyRate);

      // Execute atomic transfer from employer / system to character wallet
      const transferRes = await EconomyService.transferFunds(
        {
          fromId: employment?.employer_id ?? null,
          toId: charId,
          fromType: employment?.employer_type ?? 'character',
          toType: 'character',
          amount: earned,
          sourceType: 'employment',
          sourceId: workSessionId,
          reason: `Wages for ${hoursWorked} game hours of work as ${employment?.job_title ?? 'Employee'}`,
          idempotencyKey: cmd.idempotency_key ?? `idemp-wage-${workSessionId}`,
          gameTimestamp: endedAtGame,
        },
        ctx.db
      );

      // Update work session record
      await ctx.db
        .from('eco_work_session')
        .update({
          ended_at_real: endedAtReal,
          ended_at_game: endedAtGame,
          game_hours: hoursWorked,
          earned,
        })
        .eq('id', workSessionId);

      const wallet = await EconomyService.getWallet(charId, ctx.db);

      const events: DomainEventInput[] = [
        {
          type: 'WORK_SESSION_COMPLETED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          payload: {
            work_session_id: workSessionId,
            employment_id: session?.employment_id,
            hours_worked: hoursWorked,
            wage_earned: earned,
            transaction_id: transferRes.transactionId,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'wallet.balance',
              delta: { earned, new_balance: wallet.balance },
            },
          ],
        },
      ];

      return {
        state: {
          workSessionId,
          hoursWorked,
          earned,
          newBalance: wallet.balance,
        },
        events,
      };
    },
  })
);

// ============================================================================
// 4. BUY_ITEM Command (Purchase & Consumption Action)
// ============================================================================
export interface BuyItemOutcome {
  itemName: string;
  price: number;
  newBalance: number;
  item: ItemCatalogEntry;
  assetId?: string | undefined;
  transactionId: string;
}

export const BuyItemCommand = registerCommand<BuyItemPayload, BuyItemOutcome>(
  defineCommand<BuyItemPayload, BuyItemOutcome>({
    type: Commands.BUY_ITEM,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { itemName } = cmd.payload;
      if (!itemName) return 'Item name is required';

      const item = await EconomyService.getItem(itemName, ctx.db);
      if (!item) return `Item '${itemName}' not found in catalog`;

      const wallet = await EconomyService.getWallet(charId, ctx.db);
      if (wallet.balance < item.price) {
        return `Insufficient funds: balance is ${wallet.balance} NGN, item costs ${item.price} NGN`;
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { itemName, sellerId, venueId } = cmd.payload;
      const gameTimestamp = ctx.gameTime ? ctx.gameTime.toISOString() : await EventService.resolveGameTime(ctx.db);

      const item = (await EconomyService.getItem(itemName, ctx.db))!;
      const price = item.price;

      // Atomic payment deduction
      const transferRes = await EconomyService.transferFunds(
        {
          fromId: charId,
          toId: sellerId ?? null,
          fromType: 'character',
          toType: sellerId ? 'character' : 'system',
          amount: price,
          sourceType: 'purchase',
          sourceId: item.id,
          reason: `Purchased ${item.name}`,
          idempotencyKey: cmd.idempotency_key ?? `idemp-buy-${Math.random().toString(36).substring(2, 9)}`,
          gameTimestamp,
        },
        ctx.db
      );

      let assetId: string | undefined;

      // If item is durable, register asset and ownership
      if (item.isDurable) {
        const asset = await EconomyService.registerAsset('item', item.id, ctx.db);
        assetId = asset.id;
        await EconomyService.assignAssetOwnership(asset.id, 'character', charId, 100, ctx.db);
      }

      // If consumable (food/drink), apply status boost to character stats
      if (item.energyDelta !== 0 || item.hungerDelta !== 0) {
        try {
          const { data: stats } = await ctx.db
            .from('chr_character_stats')
            .select('energy, hunger')
            .eq('character_id', charId)
            .maybeSingle();

          if (stats) {
            const nextEnergy = Math.min(100, Math.max(0, Number(stats.energy) + item.energyDelta));
            const nextHunger = Math.max(0, Number(stats.hunger) + item.hungerDelta);
            await ctx.db
              .from('chr_character_stats')
              .update({ energy: nextEnergy, hunger: nextHunger, updated_at: new Date().toISOString() })
              .eq('character_id', charId);
          }
        } catch {
          // If stats table is optional or unseeded in mock, proceed
        }
      }

      const wallet = await EconomyService.getWallet(charId, ctx.db);

      const events: DomainEventInput[] = [
        {
          type: 'ITEM_PURCHASED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          venue_id: venueId ?? null,
          payload: {
            item_id: item.id,
            item_name: item.name,
            price,
            transaction_id: transferRes.transactionId,
            is_durable: item.isDurable,
            asset_id: assetId ?? null,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'wallet.balance',
              delta: { spent: -price, new_balance: wallet.balance },
            },
          ],
        },
      ];

      return {
        state: {
          itemName: item.name,
          price,
          newBalance: wallet.balance,
          item,
          assetId,
          transactionId: transferRes.transactionId,
        },
        events,
      };
    },
  })
);

// ============================================================================
// 5. TRANSFER_MONEY Command
// ============================================================================
export interface TransferMoneyOutcome {
  fromCharacterId: string;
  toCharacterId: string;
  amount: number;
  newBalance: number;
  transactionId: string;
}

export const TransferMoneyCommand = registerCommand<TransferMoneyPayload, TransferMoneyOutcome>(
  defineCommand({
    type: Commands.TRANSFER_MONEY,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, amount } = cmd.payload;
      if (!targetCharacterId) return 'Target character ID is required';
      if (targetCharacterId === charId) return 'Cannot transfer money to yourself';
      if (typeof amount !== 'number' || amount <= 0) return 'Transfer amount must be strictly greater than 0';

      const wallet = await EconomyService.getWallet(charId, ctx.db);
      if (wallet.balance < amount) {
        return `Insufficient funds: balance is ${wallet.balance} NGN, attempting to transfer ${amount} NGN`;
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { targetCharacterId, amount, reason } = cmd.payload;
      const gameTimestamp = ctx.gameTime ? ctx.gameTime.toISOString() : await EventService.resolveGameTime(ctx.db);

      const transferRes = await EconomyService.transferFunds(
        {
          fromId: charId,
          toId: targetCharacterId,
          amount,
          sourceType: 'transfer',
          reason: reason ?? 'Direct peer transfer',
          idempotencyKey: cmd.idempotency_key ?? `idemp-xfer-${Math.random().toString(36).substring(2, 9)}`,
          gameTimestamp,
        },
        ctx.db
      );

      const wallet = await EconomyService.getWallet(charId, ctx.db);

      const events: DomainEventInput[] = [
        {
          type: 'MONEY_TRANSFERRED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          payload: {
            recipient_id: targetCharacterId,
            amount,
            reason: reason ?? null,
            transaction_id: transferRes.transactionId,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'wallet.balance',
              delta: { transfer_out: -amount, new_balance: wallet.balance },
            },
            {
              target_type: 'character',
              target_id: targetCharacterId,
              attribute: 'wallet.balance',
              delta: { transfer_in: amount },
            },
          ],
        },
      ];

      return {
        state: {
          fromCharacterId: charId,
          toCharacterId: targetCharacterId,
          amount,
          newBalance: wallet.balance,
          transactionId: transferRes.transactionId,
        },
        events,
      };
    },
  })
);

// ============================================================================
// 6. ACQUIRE_ASSET Command
// ============================================================================
export interface AcquireAssetOutcome {
  assetId: string;
  ownershipId: string;
  sharePercentage: number;
}

export const AcquireAssetCommand = registerCommand<AcquireAssetPayload, AcquireAssetOutcome>(
  defineCommand({
    type: Commands.ACQUIRE_ASSET,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd) => {
      const { assetType, assetId } = cmd.payload;
      if (!assetType) return 'Asset type is required';
      if (!assetId) return 'Asset ID is required';
      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { assetType, assetId, sharePercentage = 100 } = cmd.payload;

      const asset = await EconomyService.registerAsset(assetType, assetId, ctx.db);
      const ownership = await EconomyService.assignAssetOwnership(
        asset.id,
        'character',
        charId,
        sharePercentage,
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'ASSET_ACQUIRED',
          category: 'action',
          significance: 'significant',
          actor_id: charId,
          payload: {
            asset_id: asset.id,
            asset_type: assetType,
            share_percentage: sharePercentage,
            ownership_id: ownership.id,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'asset_ownership',
              delta: { asset_id: asset.id, share_percentage: sharePercentage },
            },
          ],
        },
      ];

      return {
        state: {
          assetId: asset.id,
          ownershipId: ownership.id,
          sharePercentage,
        },
        events,
      };
    },
  })
);
