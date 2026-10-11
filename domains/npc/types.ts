export type NpcRole =
  | 'food_vendor'
  | 'transport_rider'
  | 'community_patrol'
  | 'artisan'
  | 'trader';

export type NpcActivity =
  | 'sleeping'
  | 'commuting'
  | 'working'
  | 'eating'
  | 'socializing'
  | 'patrolling'
  | 'idle';

export interface ScheduleBlock {
  startHour: number; // 0-23
  endHour: number;   // 0-23
  activity: NpcActivity;
  venueName?: string;
  venueId?: string;
  locationId?: string;
  actionHint?: string;
}

export interface NpcProfile {
  characterId: string;
  displayName?: string;
  role: NpcRole;
  scheduleType: string;
  homeVenueId?: string | null;
  workVenueId?: string | null;
  currentActivity: NpcActivity;
  routine: ScheduleBlock[];
  dialogue: Record<string, string[]>;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface NpcState {
  characterId: string;
  displayName: string;
  role: NpcRole;
  currentActivity: NpcActivity;
  locationId: string | null;
  venueId: string | null;
  energy: number;
  hunger: number;
  health: number;
  walletBalance: number;
}

export interface NpcActionRecord {
  characterId: string;
  npcName: string;
  role: NpcRole;
  actionType:
    | 'moved'
    | 'started_work'
    | 'ended_work'
    | 'purchased_food'
    | 'greeted_character'
    | 'patrolled'
    | 'rested';
  details: Record<string, unknown>;
  eventId?: string;
}

export interface NpcSimulationTickResult {
  gameTime: Date;
  gameHour: number;
  processedNpcCount: number;
  actionsExecuted: NpcActionRecord[];
  timestamp: string;
}

export type NpcInteractionType = 'greet' | 'inquire' | 'buy_food' | 'request_ride';

export interface NpcInteractionOutcome {
  npcId: string;
  npcName: string;
  interactionType: NpcInteractionType;
  dialogueText: string;
  relationshipStrength?: number;
  reputationDelta?: number;
  transactionId?: string;
  details?: Record<string, unknown>;
}
