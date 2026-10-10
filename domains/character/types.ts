export interface Character {
  id: string;
  accountId: string | null;
  isNpc: boolean;
  displayName: string;
  avatarConfig: Record<string, unknown>;
  bio: string | null;
  bornAt: Date | null;
  status: 'alive' | 'deceased';
  createdAt: Date;
}

export interface CreateCharacterPayload {
  displayName: string;
  bio?: string;
  avatarConfig?: Record<string, unknown>;
  isNpc?: boolean;
}

export interface UpdateCharacterPayload {
  displayName?: string;
  bio?: string;
  avatarConfig?: Record<string, unknown>;
}

export interface SelectCharacterPayload {
  characterId: string;
}

export function validateCharacterName(name: string): string | null {
  if (!name || name.length < 2 || name.length > 40) {
    return 'Character name must be between 2 and 40 characters.';
  }
  return null;
}
