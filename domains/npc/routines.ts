import { NpcRole, ScheduleBlock, NpcProfile } from './types';

export const CANONICAL_NPC_IDS = {
  MAMA_NKECHI: '00000000-0000-0000-0000-0000000000a1',
  BABA_MUSBAU: '00000000-0000-0000-0000-0000000000a2',
  OFFICER_DANLADI: '00000000-0000-0000-0000-0000000000a3',
} as const;

export const DEFAULT_NPC_ROUTINES: Record<NpcRole, ScheduleBlock[]> = {
  food_vendor: [
    { startHour: 0, endHour: 6, activity: 'sleeping', actionHint: 'rest_at_home' },
    { startHour: 6, endHour: 8, activity: 'commuting', actionHint: 'prep_and_cook' },
    { startHour: 8, endHour: 13, activity: 'working', actionHint: 'cooking_and_serving' },
    { startHour: 13, endHour: 14, activity: 'eating', actionHint: 'lunch_break' },
    { startHour: 14, endHour: 18, activity: 'working', actionHint: 'afternoon_rush' },
    { startHour: 18, endHour: 21, activity: 'socializing', actionHint: 'market_banter' },
    { startHour: 21, endHour: 24, activity: 'sleeping', actionHint: 'night_rest' },
  ],
  transport_rider: [
    { startHour: 0, endHour: 6, activity: 'sleeping', actionHint: 'night_rest' },
    { startHour: 6, endHour: 7, activity: 'commuting', actionHint: 'engine_warmup' },
    { startHour: 7, endHour: 13, activity: 'working', actionHint: 'shuttling_passengers' },
    { startHour: 13, endHour: 14, activity: 'eating', actionHint: 'buy_lunch_at_bukka' },
    { startHour: 14, endHour: 18, activity: 'working', actionHint: 'afternoon_trips' },
    { startHour: 18, endHour: 21, activity: 'socializing', actionHint: 'junction_banter' },
    { startHour: 21, endHour: 24, activity: 'sleeping', actionHint: 'night_rest' },
  ],
  community_patrol: [
    { startHour: 0, endHour: 7, activity: 'sleeping', actionHint: 'night_rest' },
    { startHour: 7, endHour: 8, activity: 'commuting', actionHint: 'morning_walk' },
    { startHour: 8, endHour: 12, activity: 'patrolling', actionHint: 'junction_security' },
    { startHour: 12, endHour: 13, activity: 'patrolling', actionHint: 'market_round' },
    { startHour: 13, endHour: 14, activity: 'eating', actionHint: 'afternoon_rest' },
    { startHour: 14, endHour: 18, activity: 'patrolling', actionHint: 'plaza_patrol' },
    { startHour: 18, endHour: 20, activity: 'socializing', actionHint: 'evening_presence' },
    { startHour: 20, endHour: 24, activity: 'sleeping', actionHint: 'night_rest' },
  ],
  artisan: [
    { startHour: 0, endHour: 8, activity: 'sleeping' },
    { startHour: 8, endHour: 17, activity: 'working' },
    { startHour: 17, endHour: 21, activity: 'socializing' },
    { startHour: 21, endHour: 24, activity: 'sleeping' },
  ],
  trader: [
    { startHour: 0, endHour: 7, activity: 'sleeping' },
    { startHour: 7, endHour: 18, activity: 'working' },
    { startHour: 18, endHour: 21, activity: 'socializing' },
    { startHour: 21, endHour: 24, activity: 'sleeping' },
  ],
};

export const NPC_DIALOGUE_COLLECTIONS: Record<string, Record<string, string[]>> = {
  [CANONICAL_NPC_IDS.MAMA_NKECHI]: {
    greeting: [
      "Welcome, my customer! Hot jollof with fried dodo dey!",
      "Nne/Nna, enter inside make I give you correct food.",
      "How body? Today's stew sweet pass yesterday own o!",
    ],
    farewell: [
      "Thank you o! Greet your people for me!",
      "Safe journey! Come back tomorrow with your friends!",
    ],
    buy_food: [
      "Here is your hot jollof rice and chilled water! Enjoy am!",
    ],
    busy: [
      "Wait small, dodo still dey inside hot oil.",
    ],
  },
  [CANONICAL_NPC_IDS.BABA_MUSBAU]: {
    greeting: [
      "Otigba straight! Enter with your change o!",
      "Ikeja Along, Under Bridge! Bros, you dey enter?",
      "How work dey go, my brother?",
    ],
    farewell: [
      "Drop gently o, make you hold your bag well!",
      "Allah bless your hustle today!",
    ],
    request_ride: [
      "Sharp sharp, enter front seat make we zoom off!",
    ],
    busy: [
      "Keke don full! Wait for the next turn.",
    ],
  },
  [CANONICAL_NPC_IDS.OFFICER_DANLADI]: {
    greeting: [
      "Good day my brother. Everything calm for here.",
      "Peace and order must reign for Otigba street.",
      "Security na everybody business. How you dey?",
    ],
    farewell: [
      "Stay vigilant. Report any funny movement.",
      "Take care of yourself as you go.",
    ],
    busy: [
      "Routine patrol, continue your lawful business.",
    ],
  },
};

/**
 * Resolves which schedule block an NPC should be executing at a specific hour of the day (0-23).
 */
export function resolveScheduledBlockForHour(
  routine: ScheduleBlock[],
  hour: number
): ScheduleBlock {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;

  const found = routine.find(
    (block) => normalizedHour >= block.startHour && normalizedHour < block.endHour
  );

  if (found) return found;

  // Fallback to idle or first block if gaps exist
  return (
    routine[0] ?? {
      startHour: 0,
      endHour: 24,
      activity: 'idle',
      actionHint: 'unassigned',
    }
  );
}
