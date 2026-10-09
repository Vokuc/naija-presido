export const Commands = {
  // Movement & Presence
  MOVE_CHARACTER:      'MOVE_CHARACTER',
  ENTER_VENUE:         'ENTER_VENUE',
  LEAVE_VENUE:         'LEAVE_VENUE',

  // Work & Economy
  START_WORK:          'START_WORK',
  END_WORK:            'END_WORK',
  BUY_ITEM:            'BUY_ITEM',
  SELL_ITEM:           'SELL_ITEM',
  TRANSFER_MONEY:      'TRANSFER_MONEY',

  // Social
  SEND_MESSAGE:        'SEND_MESSAGE',
  GREET_CHARACTER:     'GREET_CHARACTER',
  FORM_RELATIONSHIP:   'FORM_RELATIONSHIP',
  DISSOLVE_RELATIONSHIP: 'DISSOLVE_RELATIONSHIP',

  // Organizations
  JOIN_ORGANIZATION:   'JOIN_ORGANIZATION',
  LEAVE_ORGANIZATION:  'LEAVE_ORGANIZATION',
  CREATE_ORGANIZATION: 'CREATE_ORGANIZATION',

  // Assets & Business
  TRANSFER_ASSET:      'TRANSFER_ASSET',
  CREATE_BUSINESS:     'CREATE_BUSINESS',
  OPEN_BUSINESS:       'OPEN_BUSINESS',
  CLOSE_BUSINESS:      'CLOSE_BUSINESS',

  // Politics (Phase 2+)
  RUN_FOR_OFFICE:      'RUN_FOR_OFFICE',
  VOTE:                'VOTE',
  PASS_POLICY:         'PASS_POLICY',
  REPEAL_POLICY:       'REPEAL_POLICY',
} as const;

export interface Command<T> {
  type: keyof typeof Commands;
  payload: T;
  idempotency_key: string;  // UUID, client-generated
  character_id: string;
  issued_at: string;        // ISO timestamp
}
