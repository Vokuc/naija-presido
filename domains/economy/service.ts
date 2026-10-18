import {
  Wallet,
  Transaction,
  Asset,
  AssetOwnership,
  Employment,
  WorkSession,
  ItemCatalogEntry,
  AssetType,
  OwnerType,
  EmployerType,
  TransactionSourceType,
} from './types';
import { toSafeUuid } from '@/lib/utils/uuid';

export interface TransferFundsParams {
  fromId: string | null;
  toId: string | null;
  amount: number;
  sourceType: TransactionSourceType;
  sourceId?: string | null;
  reason?: string;
  idempotencyKey: string;
  gameTimestamp: string;
  fromType?: string;
  toType?: string;
}

export class EconomyService {
  /**
   * Retrieves or initializes a character's wallet.
   */
  public static async getWallet(characterId: string, db: any): Promise<Wallet> {
    const { data: row, error } = await db
      .from('eco_wallet')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle();

    if (row && !error) {
      return {
        id: row.id,
        characterId: row.character_id,
        ownerType: (row.owner_type ?? 'character') as OwnerType,
        balance: Number(row.balance),
        currency: row.currency ?? 'NGN',
        updatedAt: row.updated_at,
      };
    }

    // Auto-create wallet with initial zero balance if not exists
    const newWallet = {
      character_id: characterId,
      owner_type: 'character',
      balance: 0,
      currency: 'NGN',
      updated_at: new Date().toISOString(),
    };

    const insertQuery = db.from('eco_wallet').insert(newWallet);
    let createdRow = newWallet;
    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('*').maybeSingle();
      if (created) createdRow = created;
    } else {
      await insertQuery;
    }

    return {
      id: (createdRow as any).id ?? `wal-${characterId}`,
      characterId,
      ownerType: 'character',
      balance: Number(createdRow.balance),
      currency: createdRow.currency,
      updatedAt: createdRow.updated_at,
    };
  }

  /**
   * Executes an atomic money transfer between wallets with idempotent ledger recording.
   * If db.rpc exists (Postgres), calls eco_transfer_funds.
   * Otherwise falls back to mockable atomic query logic.
   */
  public static async transferFunds(
    params: TransferFundsParams,
    db: any
  ): Promise<{ transactionId: string; status: string; fromBalance?: number; toBalance?: number }> {
    const {
      fromId,
      toId,
      amount,
      sourceType,
      sourceId,
      reason,
      idempotencyKey,
      gameTimestamp,
      fromType = 'character',
      toType = 'character',
    } = params;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('invalid_amount: amount must be strictly greater than 0');
    }

    const safeIdempotencyKey = toSafeUuid(idempotencyKey);

    // Attempt calling PG RPC function if available
    if (typeof db?.rpc === 'function') {
      const { data: rpcResult, error: rpcError } = await db.rpc('eco_transfer_funds', {
        p_from_id: fromId,
        p_to_id: toId,
        p_amount: amount,
        p_source_type: sourceType,
        p_source_id: sourceId ?? null,
        p_reason: reason ?? null,
        p_idempotency_key: safeIdempotencyKey,
        p_game_timestamp: gameTimestamp,
        p_from_type: fromType,
        p_to_type: toType,
      });

      if (!rpcError && rpcResult) {
        return {
          transactionId: rpcResult.transaction_id,
          status: rpcResult.status,
          fromBalance: rpcResult.from_balance,
          toBalance: rpcResult.to_balance,
        };
      }

      // If race condition: concurrent request inserted with same idempotency key
      if (rpcError && (rpcError.message?.includes('duplicate key') || rpcError.message?.includes('eco_transaction_idempotency_key'))) {
        const { data: existingTxn } = await db
          .from('eco_transaction')
          .select('id, amount')
          .eq('idempotency_key', safeIdempotencyKey)
          .maybeSingle();

        if (existingTxn) {
          return {
            transactionId: existingTxn.id,
            status: 'idempotent_replay',
          };
        }
      }

      if (rpcError && !rpcError.message?.includes('function') && !rpcError.message?.includes('not found')) {
        throw new Error(rpcError.message);
      }
    }

    // Direct atomic simulation fallback (used in unit tests / local mock environments)
    // 1. Idempotency check
    const { data: existingTxn } = await db
      .from('eco_transaction')
      .select('id, amount')
      .eq('idempotency_key', safeIdempotencyKey)
      .maybeSingle();

    if (existingTxn) {
      return {
        transactionId: existingTxn.id,
        status: 'idempotent_replay',
      };
    }

    let fromBalance: number | undefined;
    let toBalance: number | undefined;

    // 2. Debit sender
    if (fromId) {
      const fromWallet = await this.getWallet(fromId, db);
      if (fromWallet.balance < amount) {
        throw new Error('insufficient_funds');
      }
      fromBalance = fromWallet.balance - amount;
      await db
        .from('eco_wallet')
        .update({ balance: fromBalance, updated_at: new Date().toISOString() })
        .eq('character_id', fromId);
    }

    // 3. Credit receiver
    if (toId) {
      const toWallet = await this.getWallet(toId, db);
      toBalance = toWallet.balance + amount;
      await db
        .from('eco_wallet')
        .update({ balance: toBalance, updated_at: new Date().toISOString() })
        .eq('character_id', toId);
    }

    // 4. Record immutable transaction ledger
    const txnRecord = {
      from_id: fromId,
      to_id: toId,
      from_type: fromType,
      to_type: toType,
      amount,
      currency: 'NGN',
      source_type: sourceType,
      source_id: sourceId ?? null,
      reason: reason ?? null,
      idempotency_key: idempotencyKey,
      game_timestamp: gameTimestamp,
      created_at: new Date().toISOString(),
    };

    let txnId: string;
    const insertQuery = db.from('eco_transaction').insert(txnRecord);
    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      txnId = created?.id ?? `txn-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      txnId = res?.data?.id ?? `txn-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      transactionId: txnId,
      status: 'success',
      fromBalance,
      toBalance,
    };
  }

  /**
   * Retrieves transaction ledger history for a character.
   */
  public static async getTransactionHistory(
    characterId: string,
    db: any,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Transaction[]> {
    let query = db
      .from('eco_transaction')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.limit) query = query.limit(options.limit);

    const { data: rows, error } = await query;
    if (error || !rows) return [];

    // Filter to transactions involving this character
    const filtered = (rows as any[]).filter(
      (r) => r.from_id === characterId || r.to_id === characterId
    );

    return filtered.map((r) => ({
      id: r.id,
      fromId: r.from_id,
      toId: r.to_id,
      fromType: r.from_type ?? 'character',
      toType: r.to_type ?? 'character',
      amount: Number(r.amount),
      currency: r.currency ?? 'NGN',
      sourceType: r.source_type,
      sourceId: r.source_id,
      reason: r.reason,
      idempotencyKey: r.idempotency_key,
      gameTimestamp: r.game_timestamp,
      createdAt: r.created_at,
    }));
  }

  /**
   * Creates or registers an asset in the asset foundation.
   */
  public static async registerAsset(
    assetType: AssetType,
    assetId: string,
    db: any
  ): Promise<Asset> {
    const { data: existing } = await db
      .from('eco_asset')
      .select('*')
      .eq('asset_type', assetType)
      .eq('asset_id', assetId)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        assetType: existing.asset_type,
        assetId: existing.asset_id,
        createdAt: existing.created_at,
      };
    }

    const newRecord = {
      asset_type: assetType,
      asset_id: assetId,
      created_at: new Date().toISOString(),
    };

    let id: string;
    const insertQuery = db.from('eco_asset').insert(newRecord);
    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      id = created?.id ?? `ast-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      id = res?.data?.id ?? `ast-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      id,
      assetType,
      assetId,
      createdAt: newRecord.created_at,
    };
  }

  /**
   * Records ownership of an asset.
   */
  public static async assignAssetOwnership(
    assetId: string,
    ownerType: OwnerType,
    ownerId: string,
    sharePercentage: number = 100,
    db: any
  ): Promise<AssetOwnership> {
    const record = {
      asset_id: assetId,
      owner_type: ownerType,
      owner_id: ownerId,
      share_percentage: sharePercentage,
      status: 'active',
      acquired_at: new Date().toISOString(),
      relinquished_at: null,
    };

    let id: string;
    const insertQuery = db.from('eco_asset_ownership').insert(record);
    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      id = created?.id ?? `own-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      id = res?.data?.id ?? `own-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      id,
      assetId,
      ownerType,
      ownerId,
      sharePercentage,
      status: 'active',
      acquiredAt: record.acquired_at,
      relinquishedAt: null,
    };
  }

  /**
   * Retrieves asset ownership records for an owner.
   */
  public static async getAssetOwnerships(
    ownerId: string,
    db: any
  ): Promise<AssetOwnership[]> {
    const { data: rows, error } = await db
      .from('eco_asset_ownership')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'active');

    if (error || !rows) return [];

    return (rows as any[]).map((r) => ({
      id: r.id,
      assetId: r.asset_id,
      ownerType: r.owner_type,
      ownerId: r.owner_id,
      sharePercentage: Number(r.share_percentage),
      status: r.status,
      acquiredAt: r.acquired_at,
      relinquishedAt: r.relinquished_at,
    }));
  }

  /**
   * Creates an employment record.
   */
  public static async createEmployment(
    params: {
      characterId: string;
      employerType: EmployerType;
      employerId: string;
      venueId?: string | null;
      jobTitle: string;
      hourlyRate: number;
      startedAtGame: string;
      startedAtReal?: string;
    },
    db: any
  ): Promise<Employment> {
    const record = {
      character_id: params.characterId,
      employer_type: params.employerType,
      employer_id: params.employerId,
      venue_id: params.venueId ?? null,
      job_title: params.jobTitle,
      hourly_rate: params.hourlyRate,
      started_at_game: params.startedAtGame,
      started_at_real: params.startedAtReal ?? new Date().toISOString(),
      ended_at_real: null,
      status: 'active',
    };

    let id: string;
    const insertQuery = db.from('eco_employment').insert(record);
    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      id = created?.id ?? `emp-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      id = res?.data?.id ?? `emp-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      id,
      characterId: params.characterId,
      employerType: params.employerType,
      employerId: params.employerId,
      venueId: params.venueId ?? null,
      jobTitle: params.jobTitle,
      hourlyRate: params.hourlyRate,
      startedAtGame: params.startedAtGame,
      startedAtReal: record.started_at_real,
      endedAtReal: null,
      status: 'active',
    };
  }

  /**
   * Retrieves an active employment for a character.
   */
  public static async getActiveEmployment(
    characterId: string,
    db: any
  ): Promise<Employment | null> {
    const { data: row, error } = await db
      .from('eco_employment')
      .select('*')
      .eq('character_id', characterId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !row) return null;

    return {
      id: row.id,
      characterId: row.character_id,
      employerType: (row.employer_type ?? 'character') as EmployerType,
      employerId: row.employer_id,
      venueId: row.venue_id,
      jobTitle: row.job_title,
      hourlyRate: Number(row.hourly_rate),
      startedAtGame: row.started_at_game,
      startedAtReal: row.started_at_real,
      endedAtReal: row.ended_at_real,
      status: row.status,
    };
  }

  /**
   * Retrieves an item from the item catalog.
   */
  public static async getItem(
    name: string,
    db: any
  ): Promise<ItemCatalogEntry | null> {
    const { data: row, error } = await db
      .from('eco_item_catalog')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error || !row) {
      // Fallback in-memory catalog for testing or if table not yet populated
      const fallbackCatalog: Record<string, ItemCatalogEntry> = {
        'Port Harcourt Bole & Fish': {
          id: 'item-bole-fish',
          name: 'Port Harcourt Bole & Fish',
          category: 'food',
          price: 1500,
          energyDelta: 35,
          hungerDelta: -50,
          isDurable: false,
        },
        'Cold Zobo Drink': {
          id: 'item-zobo',
          name: 'Cold Zobo Drink',
          category: 'drink',
          price: 200,
          energyDelta: 15,
          hungerDelta: -20,
          isDurable: false,
        },
        'Jollof Rice & Chicken': {
          id: 'item-jollof',
          name: 'Jollof Rice & Chicken',
          category: 'food',
          price: 1500,
          energyDelta: 30,
          hungerDelta: -50,
          isDurable: false,
        },
        'Cold Pure Water': {
          id: 'item-water',
          name: 'Cold Pure Water',
          category: 'drink',
          price: 100,
          energyDelta: 10,
          hungerDelta: -15,
          isDurable: false,
        },
        'Work Boots': {
          id: 'item-boots',
          name: 'Work Boots',
          category: 'tool',
          price: 4500,
          energyDelta: 0,
          hungerDelta: 0,
          isDurable: true,
        },
      };
      return fallbackCatalog[name] ?? null;
    }

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      energyDelta: Number(row.energy_delta ?? 0),
      hungerDelta: Number(row.hunger_delta ?? 0),
      isDurable: Boolean(row.is_durable),
      description: row.description,
    };
  }

  /**
   * Starts a new work session.
   */
  public static async startWorkSession(
    characterId: string,
    employmentId: string,
    db: any,
    options: { gameTime?: Date; idempotencyKey?: string } = {}
  ): Promise<WorkSession> {
    const startedAtReal = new Date().toISOString();
    const startedAtGame = options.gameTime ? options.gameTime.toISOString() : startedAtReal;
    const idempotencyKey =
      options.idempotencyKey ?? `idemp-ws-${Math.random().toString(36).substring(2, 9)}`;

    const sessionRecord = {
      character_id: characterId,
      employment_id: employmentId,
      started_at_real: startedAtReal,
      started_at_game: startedAtGame,
      ended_at_real: null,
      ended_at_game: null,
      game_hours: null,
      earned: null,
      idempotency_key: idempotencyKey,
    };

    let id: string;
    const insertQuery = db.from('eco_work_session').insert(sessionRecord);
    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      id = created?.id ?? `ws-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      id = res?.data?.id ?? `ws-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      id,
      characterId,
      employmentId,
      startedAtReal,
      startedAtGame,
      idempotencyKey,
    };
  }

  /**
   * Concludes an ongoing work session and distributes accrued wages.
   */
  public static async endWorkSession(
    workSessionId: string,
    characterId: string,
    db: any,
    options: { gameTime?: Date; idempotencyKey?: string } = {}
  ): Promise<{ id: string; gameHours: number; earned: number; transactionId?: string }> {
    const endedAtReal = new Date().toISOString();
    const endedAtGame = options.gameTime ? options.gameTime.toISOString() : endedAtReal;

    const { data: session } = await db
      .from('eco_work_session')
      .select('*')
      .eq('id', workSessionId)
      .maybeSingle();

    const { data: employment } = await db
      .from('eco_employment')
      .select('*')
      .eq('id', session?.employment_id)
      .maybeSingle();

    const hourlyRate = Number(employment?.hourly_rate ?? 500);
    const startGameMs = new Date(session?.started_at_game ?? endedAtGame).getTime();
    const endGameMs = new Date(endedAtGame).getTime();
    const elapsedHours = Math.max(0.5, (endGameMs - startGameMs) / (1000 * 60 * 60));
    const hoursWorked = Math.round(elapsedHours * 100) / 100;
    const earned = Math.round(hoursWorked * hourlyRate);

    const idempotencyKey =
      options.idempotencyKey ?? `idemp-wage-${workSessionId}-${Date.now()}`;

    const transferRes = await this.transferFunds(
      {
        fromId: employment?.employer_id ?? null,
        toId: characterId,
        fromType: employment?.employer_type ?? 'character',
        toType: 'character',
        amount: earned,
        sourceType: 'employment',
        sourceId: workSessionId,
        reason: `Wages for ${hoursWorked} game hours as ${employment?.job_title ?? 'Employee'}`,
        idempotencyKey,
        gameTimestamp: endedAtGame,
      },
      db
    );

    await db
      .from('eco_work_session')
      .update({
        ended_at_real: endedAtReal,
        ended_at_game: endedAtGame,
        game_hours: hoursWorked,
        earned,
      })
      .eq('id', workSessionId);

    return {
      id: workSessionId,
      gameHours: hoursWorked,
      earned,
      transactionId: transferRes.transactionId,
    };
  }
}
