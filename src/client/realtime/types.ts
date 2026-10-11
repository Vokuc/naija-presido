export interface MovementFrame {
  characterId: string;
  displayName: string;
  position: [number, number, number];
  rotation: number;
  velocity?: [number, number, number];
  isMoving: boolean;
  timestamp: number;
  sequenceNumber?: number;
}

export interface PresencePlayer {
  characterId: string;
  userId?: string;
  displayName: string;
  jobTitle?: string;
  avatarConfig?: Record<string, unknown>;
  joinedAt: string;
  zoneId: string;
  venueId?: string | null;
}

export interface RemotePlayerState {
  characterId: string;
  displayName: string;
  jobTitle?: string;
  avatarConfig?: Record<string, unknown>;
  position: [number, number, number];
  targetPosition: [number, number, number];
  rotation: number;
  targetRotation: number;
  isMoving: boolean;
  lastUpdated: number;
  activeSpeechBubble?: {
    text: string;
    expiresAt: number;
  };
}

export interface ChatMessage {
  id: string;
  characterId: string;
  displayName: string;
  text: string;
  zoneId: string;
  venueId?: string | null;
  timestamp: number;
}

export interface OutgoingChatMessage {
  text: string;
}

export interface StateBroadcastEvent {
  type: 'ITEM_PURCHASED' | 'WORK_COMPLETED' | 'VENUE_ENTERED' | 'VENUE_LEFT' | 'GREETING';
  actorId: string;
  actorName: string;
  description: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface RealtimeTransport {
  joinZone(zoneId: string, presence: PresencePlayer): Promise<void>;
  leaveZone(): Promise<void>;
  sendMovement(frame: MovementFrame): void;
  sendChat(message: OutgoingChatMessage): void;
  sendStateEvent(event: StateBroadcastEvent): void;
  onPresenceSync(handler: (players: RemotePlayerState[]) => void): () => void;
  onPlayerMovement(handler: (frame: MovementFrame) => void): () => void;
  onChat(handler: (msg: ChatMessage) => void): () => void;
  onStateEvent(handler: (event: StateBroadcastEvent) => void): () => void;
  disconnect(): void;
}
