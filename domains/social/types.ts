export type RelationshipType =
  | 'friend'
  | 'rival'
  | 'colleague'
  | 'ally'
  | 'family'
  | 'enemy'
  | 'mentor'
  | 'business_partner'
  | (string & {});

export type RelationshipState =
  | 'active'
  | 'strained'
  | 'dormant'
  | 'broken';

export type ReputationDimension =
  | 'trust'
  | 'competence'
  | 'honesty'
  | 'popularity'
  | 'notoriety'
  | 'influence'
  | 'political_credibility'
  | 'business_reputation'
  | 'reliability'
  | (string & {});

export type ReputationScopeType =
  | 'neighbourhood'
  | 'city'
  | 'state'
  | 'national'
  | 'organization'
  | 'global'
  | (string & {});

export interface Relationship {
  id: string;
  actorId: string;       // Directional initiator (who feels or holds this attitude)
  targetId: string;      // Target of the relationship
  type: RelationshipType;
  strength: number;      // -100 (deep hatred/hostility) to 100 (unbreakable loyalty)
  state: RelationshipState;
  metadata: Record<string, unknown>;
  formedAt: string;
  updatedAt: string;
}

export interface ReputationRecord {
  id: string;
  characterId: string;
  scopeType: ReputationScopeType;
  scopeId?: string | null;  // UUID of the specific neighbourhood/city/org, or null for national/global
  dimension: ReputationDimension;
  score: number;            // -100 to 100
  updatedAt: string;
}

export interface ReputationProfile {
  characterId: string;
  scores: Record<string, Record<string, number>>; // scopeKey (e.g. "neighbourhood:surulere" or "national:global") -> dimension -> score
  records: ReputationRecord[];
}

// Command Payloads
export interface FormRelationshipPayload {
  targetCharacterId: string;
  type: RelationshipType;
  initialStrength?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateRelationshipPayload {
  targetCharacterId: string;
  type: RelationshipType;
  deltaStrength?: number;
  newState?: RelationshipState;
  metadata?: Record<string, unknown>;
}

export interface DissolveRelationshipPayload {
  targetCharacterId: string;
  type: RelationshipType;
  reason?: string;
}

export interface GreetCharacterPayload {
  targetCharacterId: string;
  venueId?: string;
  locationId?: string;
}

export interface EndorseCharacterPayload {
  targetCharacterId: string;
  dimension?: 'competence' | 'trust' | 'honesty' | 'political_credibility';
  scopeType?: ReputationScopeType;
  scopeId?: string;
  endorsementNote?: string;
}
