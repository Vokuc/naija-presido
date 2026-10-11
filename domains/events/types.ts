export type EventCategory = 'action' | 'consequence' | 'world' | 'system';

export type EventSignificance = 'trivial' | 'minor' | 'significant' | 'historic';

export type RetentionTier = 'ephemeral' | 'standard' | 'permanent';

export type EventActorType = 'character' | 'account' | 'system' | 'organization';

export type EventTargetType = 'character' | 'venue' | 'organization' | 'location' | 'account' | 'system';

export interface DomainEffect {
  id?: string;
  eventId?: string;
  targetType: EventTargetType;
  targetId: string;
  attribute: string;
  delta: Record<string, unknown>;
  appliedAt?: string;
}

export interface DomainEventRecord {
  id: string;
  type: string;
  category: EventCategory;
  significance: EventSignificance;
  retentionTier: RetentionTier;
  actorId?: string | null;
  actorType?: EventActorType;
  locationId?: string | null;
  venueId?: string | null;
  payload: Record<string, unknown>;
  causedBy?: string | null;
  gameTimestamp: string;
  createdAt: string;
  effects?: DomainEffect[];
}

export interface CreateDomainEventInput {
  type: string;
  category: EventCategory;
  significance: EventSignificance;
  retentionTier?: RetentionTier;
  actorId?: string | null;
  actorType?: EventActorType;
  locationId?: string | null;
  venueId?: string | null;
  payload?: Record<string, unknown>;
  causedBy?: string | null;
  gameTimestamp?: string;
  effects?: Array<{
    targetType: EventTargetType;
    targetId: string;
    attribute: string;
    delta: Record<string, unknown>;
  }>;
}

export const SIGNIFICANCE_LEVELS: Record<EventSignificance, number> = {
  trivial: 0,
  minor: 1,
  significant: 2,
  historic: 3,
};

/**
 * Derives default retention tier from event significance.
 * - trivial: ephemeral (cleanup permitted after gameplay relevance passes)
 * - minor: standard (retained for standard active timeline duration)
 * - significant / historic: permanent (permanent historical memory/storytelling)
 */
export function deriveRetentionTier(significance: EventSignificance): RetentionTier {
  switch (significance) {
    case 'trivial':
      return 'ephemeral';
    case 'minor':
      return 'standard';
    case 'significant':
    case 'historic':
      return 'permanent';
    default:
      return 'standard';
  }
}

export interface CharacterTimelineOptions {
  limit?: number;
  offset?: number;
  sinceGameTime?: string;
  untilGameTime?: string;
  minSignificance?: EventSignificance;
  categories?: EventCategory[];
  types?: string[];
}

export interface LocationTimelineOptions {
  limit?: number;
  offset?: number;
  sinceGameTime?: string;
  untilGameTime?: string;
  minSignificance?: EventSignificance;
  types?: string[];
  includeVenues?: boolean;
}

export interface WorldChronicleOptions {
  limit?: number;
  offset?: number;
  sinceGameTime?: string;
  untilGameTime?: string;
  minSignificance?: EventSignificance;
  category?: EventCategory;
  types?: string[];
}

export interface CausalTraceResult {
  target: DomainEventRecord;
  ancestors: DomainEventRecord[]; // From oldest root ancestor down to parent
  consequences: DomainEventRecord[]; // Direct children triggered by this event
}
