export interface Account {
  id: string;
  userId: string;
  username: string;
  createdAt: Date;
  status: 'active' | 'suspended' | 'banned';
}

export interface CreateAccountPayload {
  username: string;
}

export function validateUsername(username: string): string | null {
  if (!username || username.length < 3 || username.length > 20) {
    return 'Username must be between 3 and 20 characters.';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain alphanumeric characters and underscores.';
  }
  return null;
}
