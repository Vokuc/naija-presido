export type TransactionSourceType =
  | 'employment'
  | 'purchase'
  | 'transfer'
  | 'system_grant'
  | 'tax';

export type AssetType =
  | 'venue'
  | 'business'
  | 'vehicle'
  | 'real_estate'
  | 'item';

export type OwnerType =
  | 'character'
  | 'organization'
  | 'business'
  | 'government';

export type EmployerType =
  | 'character'
  | 'business'
  | 'organization'
  | 'government';

export type EmploymentStatus =
  | 'active'
  | 'terminated'
  | 'resigned'
  | 'suspended';

export interface Wallet {
  id: string;
  characterId: string;
  ownerType: OwnerType;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  fromId: string | null;
  toId: string | null;
  fromType?: string;
  toType?: string;
  amount: number;
  currency: string;
  sourceType: TransactionSourceType;
  sourceId: string | null;
  reason: string | null;
  idempotencyKey: string;
  gameTimestamp: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  assetType: AssetType;
  assetId: string;
  createdAt: string;
}

export interface AssetOwnership {
  id: string;
  assetId: string;
  ownerType: OwnerType;
  ownerId: string;
  sharePercentage: number;
  status: 'active' | 'transferred' | 'seized' | 'bankrupt';
  acquiredAt: string;
  relinquishedAt?: string | null;
}

export interface Employment {
  id: string;
  characterId: string;
  employerType: EmployerType;
  employerId: string;
  venueId?: string | null;
  jobTitle: string;
  hourlyRate: number;
  startedAtGame: string;
  startedAtReal: string;
  endedAtReal?: string | null;
  status: EmploymentStatus;
}

export interface WorkSession {
  id: string;
  characterId: string;
  employmentId: string;
  startedAtReal: string;
  startedAtGame: string;
  endedAtReal?: string | null;
  endedAtGame?: string | null;
  gameHours?: number | null;
  earned?: number | null;
  idempotencyKey: string;
}

export interface ItemCatalogEntry {
  id: string;
  name: string;
  category: 'food' | 'drink' | 'transport' | 'tool' | 'general';
  price: number;
  energyDelta: number;
  hungerDelta: number;
  isDurable: boolean;
  description?: string;
}

// Command Payloads
export interface AcceptJobPayload {
  employerId: string;
  employerType?: EmployerType;
  jobTitle: string;
  hourlyRate: number;
  venueId?: string;
}

export interface StartWorkPayload {
  employmentId: string;
}

export interface EndWorkPayload {
  workSessionId: string;
}

export interface BuyItemPayload {
  itemName: string;
  venueId?: string;
  sellerId?: string;
}

export interface TransferMoneyPayload {
  targetCharacterId: string;
  amount: number;
  reason?: string;
}

export interface AcquireAssetPayload {
  assetType: AssetType;
  assetId: string;
  sharePercentage?: number;
}
