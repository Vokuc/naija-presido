export const Commands = {
  // Identity
  CREATE_ACCOUNT:        'CREATE_ACCOUNT',
  CREATE_CHARACTER:      'CREATE_CHARACTER',
  SELECT_CHARACTER:      'SELECT_CHARACTER',
  UPDATE_CHARACTER:      'UPDATE_CHARACTER',
  GET_CURRENT_CHARACTER: 'GET_CURRENT_CHARACTER',

  // Movement & Presence
  MOVE_CHARACTER:        'MOVE_CHARACTER',
  ENTER_VENUE:           'ENTER_VENUE',
  LEAVE_VENUE:           'LEAVE_VENUE',

  // Work & Economy
  START_WORK:            'START_WORK',
  END_WORK:              'END_WORK',
  BUY_ITEM:              'BUY_ITEM',
  SELL_ITEM:             'SELL_ITEM',
  TRANSFER_MONEY:        'TRANSFER_MONEY',

  // Social
  SEND_MESSAGE:          'SEND_MESSAGE',
  GREET_CHARACTER:       'GREET_CHARACTER',
  FORM_RELATIONSHIP:     'FORM_RELATIONSHIP',
  DISSOLVE_RELATIONSHIP: 'DISSOLVE_RELATIONSHIP',

  // Organizations
  JOIN_ORGANIZATION:     'JOIN_ORGANIZATION',
  LEAVE_ORGANIZATION:    'LEAVE_ORGANIZATION',
  CREATE_ORGANIZATION:   'CREATE_ORGANIZATION',

  // Assets & Business
  TRANSFER_ASSET:        'TRANSFER_ASSET',
  CREATE_BUSINESS:       'CREATE_BUSINESS',
  OPEN_BUSINESS:         'OPEN_BUSINESS',
  CLOSE_BUSINESS:        'CLOSE_BUSINESS',

  // Politics (Phase 2+)
  RUN_FOR_OFFICE:        'RUN_FOR_OFFICE',
  VOTE:                  'VOTE',
  PASS_POLICY:           'PASS_POLICY',
  REPEAL_POLICY:         'REPEAL_POLICY',
} as const;

export type CommandType = keyof typeof Commands;

export interface Command<T = Record<string, unknown>> {
  command_id?: string;     // Unique ID for this command invocation (UUID)
  type: CommandType;       // Authoritative command name
  payload: T;              // Player's attempted parameters
  idempotency_key?: string;// Client-generated UUID for retry safety
  character_id?: string;   // In-world actor character ID
  actor_id?: string;       // Auth account / user ID
  issued_at: string;       // ISO 8601 timestamp
}

export interface DomainEffectInput {
  target_type: 'character' | 'venue' | 'organization' | 'location';
  target_id: string;
  attribute: string;
  delta: Record<string, unknown>;
}

export interface DomainEventInput {
  type: string;
  category: 'action' | 'consequence' | 'world' | 'system';
  significance: 'trivial' | 'minor' | 'significant' | 'historic';
  actor_id?: string | null;
  actor_type?: 'character' | 'account' | 'system' | 'organization';
  location_id?: string | null;
  venue_id?: string | null;
  payload?: Record<string, unknown>;
  caused_by?: string | null;
  game_timestamp?: string;
  retention_tier?: 'ephemeral' | 'standard' | 'permanent';
  effects?: DomainEffectInput[];
}

export interface NotificationInput {
  character_id: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

export interface RealtimeBroadcastInput {
  channel: string;
  event: string;
  payload: Record<string, unknown>;
}

/**
 * Fields that clients must NEVER be allowed to directly provide in payloads
 * to prevent bypassing authoritative server simulation.
 */
export const AUTHORITATIVE_PROTECTED_FIELDS = [
  'balance',
  'money_balance',
  'new_balance',
  'wallet_balance',
  'reputation',
  'reputation_score',
  'dimension_score',
  'ownership',
  'ownership_id',
  'owner_id',
  'political_power',
  'power',
  'votes',
  'vote_count',
  'npc_outcome',
  'outcome',
  'simulation_result',
  'authoritative_state'
] as const;

/**
 * Commands that strictly mandate an idempotency key (economic, social, voting).
 */
export const IDEMPOTENT_MANDATORY_COMMANDS: ReadonlySet<CommandType> = new Set<CommandType>([
  Commands.START_WORK,
  Commands.END_WORK,
  Commands.BUY_ITEM,
  Commands.SELL_ITEM,
  Commands.TRANSFER_MONEY,
  Commands.FORM_RELATIONSHIP,
  Commands.DISSOLVE_RELATIONSHIP,
  Commands.JOIN_ORGANIZATION,
  Commands.LEAVE_ORGANIZATION,
  Commands.TRANSFER_ASSET,
  Commands.CREATE_BUSINESS,
  Commands.VOTE,
  Commands.PASS_POLICY,
  Commands.REPEAL_POLICY,
]);

export interface PipelineCommandResult<T = unknown> {
  ok: boolean;
  state?: T;
  events?: DomainEventInput[];
  reason?: string;
  status?: number; // HTTP status code equivalent
  idempotent_replay?: boolean;
}
