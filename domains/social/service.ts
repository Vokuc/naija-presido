import {
  Relationship,
  ReputationRecord,
  ReputationProfile,
  RelationshipType,
  RelationshipState,
  ReputationDimension,
  ReputationScopeType,
} from './types';

export class SocialService {
  /**
   * Retrieves a specific directional typed relationship between two characters.
   */
  public static async getRelationship(
    actorId: string,
    targetId: string,
    type: RelationshipType,
    db: any
  ): Promise<Relationship | null> {
    const { data: row, error } = await db
      .from('soc_relationship')
      .select('*')
      .eq('actor_id', actorId)
      .eq('target_id', targetId)
      .eq('type', type)
      .maybeSingle();

    if (error || !row) return null;
    return this.mapRowToRelationship(row);
  }

  /**
   * Retrieves relationships for a character (outgoing attitudes, incoming attitudes, or both).
   */
  public static async getRelationshipsForCharacter(
    characterId: string,
    db: any,
    options: {
      directional?: 'outgoing' | 'incoming' | 'both';
      type?: RelationshipType;
    } = {}
  ): Promise<Relationship[]> {
    const directional = options.directional ?? 'both';
    let query = db.from('soc_relationship').select('*');

    if (directional === 'outgoing') {
      query = query.eq('actor_id', characterId);
    } else if (directional === 'incoming') {
      query = query.eq('target_id', characterId);
    }

    if (options.type) {
      query = query.eq('type', options.type);
    }

    const { data: rows, error } = await query;
    if (error || !rows) return [];

    let list: any[] = rows;
    if (directional === 'both') {
      list = list.filter((r) => r.actor_id === characterId || r.target_id === characterId);
    }

    return list.map((r) => this.mapRowToRelationship(r));
  }

  /**
   * Forms or establishes a directional relationship.
   */
  public static async formRelationship(
    params: {
      actorId: string;
      targetId: string;
      type: RelationshipType;
      initialStrength?: number;
      metadata?: Record<string, unknown>;
    },
    db: any
  ): Promise<Relationship> {
    if (params.actorId === params.targetId) {
      throw new Error('Cannot form a relationship with oneself');
    }

    const strength = Math.min(100, Math.max(-100, params.initialStrength ?? 0));
    const now = new Date().toISOString();

    const record = {
      actor_id: params.actorId,
      target_id: params.targetId,
      type: params.type,
      strength,
      state: 'active',
      metadata: params.metadata ?? {},
      formed_at: now,
      updated_at: now,
    };

    let id: string;
    const insertQuery = db
      .from('soc_relationship')
      .upsert(record, { onConflict: 'actor_id,target_id,type' });

    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      id = created?.id ?? `rel-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      id = res?.data?.id ?? `rel-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      id,
      actorId: params.actorId,
      targetId: params.targetId,
      type: params.type,
      strength,
      state: 'active',
      metadata: record.metadata,
      formedAt: record.formed_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Updates an existing directional relationship strength or state.
   */
  public static async updateRelationship(
    params: {
      actorId: string;
      targetId: string;
      type: RelationshipType;
      deltaStrength?: number;
      newState?: RelationshipState;
      metadata?: Record<string, unknown>;
    },
    db: any
  ): Promise<Relationship> {
    const existing = await this.getRelationship(params.actorId, params.targetId, params.type, db);
    if (!existing) {
      // Auto-form relationship with initial delta
      return this.formRelationship(
        {
          actorId: params.actorId,
          targetId: params.targetId,
          type: params.type,
          initialStrength: params.deltaStrength ?? 0,
          metadata: params.metadata,
        },
        db
      );
    }

    const newStrength = Math.min(
      100,
      Math.max(-100, existing.strength + (params.deltaStrength ?? 0))
    );
    const newState = params.newState ?? existing.state;
    const newMetadata = { ...existing.metadata, ...(params.metadata ?? {}) };
    const now = new Date().toISOString();

    await db
      .from('soc_relationship')
      .update({
        strength: newStrength,
        state: newState,
        metadata: newMetadata,
        updated_at: now,
      })
      .eq('id', existing.id);

    return {
      ...existing,
      strength: newStrength,
      state: newState,
      metadata: newMetadata,
      updatedAt: now,
    };
  }

  /**
   * Dissolves or breaks a relationship.
   */
  public static async dissolveRelationship(
    actorId: string,
    targetId: string,
    type: RelationshipType,
    db: any
  ): Promise<boolean> {
    const existing = await this.getRelationship(actorId, targetId, type, db);
    if (!existing) return false;

    if (typeof db.from('soc_relationship').delete === 'function') {
      await db.from('soc_relationship').delete().eq('id', existing.id);
    } else {
      await db
        .from('soc_relationship')
        .update({ state: 'broken', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }

    return true;
  }

  /**
   * Retrieves a character's score in a specific dimension and scope.
   */
  public static async getReputation(
    characterId: string,
    dimension: ReputationDimension,
    scopeType: ReputationScopeType,
    scopeId: string | null | undefined,
    db: any
  ): Promise<number> {
    let query = db
      .from('soc_reputation')
      .select('score')
      .eq('character_id', characterId)
      .eq('dimension', dimension)
      .eq('scope_type', scopeType);

    if (scopeId) {
      query = query.eq('scope_id', scopeId);
    } else {
      query = query.is('scope_id', null);
    }

    const { data: row, error } = await query.maybeSingle();
    if (error || !row) return 0;
    return Number(row.score ?? 0);
  }

  /**
   * Retrieves a character's comprehensive multi-dimensional, scoped reputation profile.
   */
  public static async getReputationProfile(
    characterId: string,
    db: any
  ): Promise<ReputationProfile> {
    const { data: rows, error } = await db
      .from('soc_reputation')
      .select('*')
      .eq('character_id', characterId);

    if (error || !rows) {
      return { characterId, scores: {}, records: [] };
    }

    const records: ReputationRecord[] = (rows as any[]).map((r) => ({
      id: r.id,
      characterId: r.character_id,
      scopeType: r.scope_type as ReputationScopeType,
      scopeId: r.scope_id ?? null,
      dimension: r.dimension as ReputationDimension,
      score: Number(r.score),
      updatedAt: r.updated_at,
    }));

    const scores: Record<string, Record<string, number>> = {};
    for (const rec of records) {
      const scopeKey = rec.scopeId ? `${rec.scopeType}:${rec.scopeId}` : `${rec.scopeType}:global`;
      if (!scores[scopeKey]) scores[scopeKey] = {};
      scores[scopeKey][rec.dimension] = rec.score;
    }

    return { characterId, scores, records };
  }

  /**
   * Authoritatively adjusts a character's reputation score in a specific dimension and scope.
   */
  public static async adjustReputation(
    characterId: string,
    dimension: ReputationDimension,
    delta: number,
    scopeType: ReputationScopeType,
    scopeId: string | null | undefined,
    db: any
  ): Promise<{ newScore: number; record: ReputationRecord }> {
    const currentScore = await this.getReputation(characterId, dimension, scopeType, scopeId, db);
    const newScore = Math.min(100, Math.max(-100, currentScore + delta));
    const now = new Date().toISOString();

    const upsertData = {
      character_id: characterId,
      dimension,
      scope_type: scopeType,
      scope_id: scopeId ?? null,
      score: newScore,
      updated_at: now,
    };

    let id: string;
    const insertQuery = db
      .from('soc_reputation')
      .upsert(upsertData, { onConflict: 'character_id,scope_type,scope_id,dimension' });

    if (typeof insertQuery?.select === 'function') {
      const { data: created } = await insertQuery.select('id').maybeSingle();
      id = created?.id ?? `rep-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      const res = (await insertQuery) as any;
      id = res?.data?.id ?? `rep-${Math.random().toString(36).substring(2, 9)}`;
    }

    return {
      newScore,
      record: {
        id,
        characterId,
        dimension,
        scopeType,
        scopeId: scopeId ?? null,
        score: newScore,
        updatedAt: now,
      },
    };
  }

  private static mapRowToRelationship(row: any): Relationship {
    return {
      id: row.id,
      actorId: row.actor_id,
      targetId: row.target_id,
      type: row.type as RelationshipType,
      strength: Number(row.strength ?? 0),
      state: (row.state ?? 'active') as RelationshipState,
      metadata: row.metadata ?? {},
      formedAt: row.formed_at,
      updatedAt: row.updated_at,
    };
  }
}
