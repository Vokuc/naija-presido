export type OrganizationType =
  | 'business'
  | 'trade_union'
  | 'civic_association'
  | 'cultural_group'
  | 'political_party'
  | 'religious_society';

export type OrganizationStatus = 'active' | 'suspended' | 'dissolved';

export type MemberStatus = 'active' | 'probation' | 'suspended' | 'expelled';

export interface OrganizationRolePermissions {
  can_hire?: boolean;
  can_expel?: boolean;
  can_withdraw?: boolean;
  can_set_dues?: boolean;
  can_speak_publicly?: boolean;
  [key: string]: boolean | undefined;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  description: string | null;
  founderId: string | null;
  locationId: string | null;
  venueId: string | null;
  status: OrganizationStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRoleRecord {
  id: string;
  orgId: string;
  name: string;
  rank: number;
  permissions: OrganizationRolePermissions;
  baseSalary: number;
  createdAt: string;
}

export interface OrganizationMemberRecord {
  id: string;
  orgId: string;
  characterId: string;
  roleId: string | null;
  status: MemberStatus;
  duesPaidUntil: string | null;
  reputationInOrg: number;
  joinedAt: string;
  roleName?: string;
  roleRank?: number;
  permissions?: OrganizationRolePermissions;
}

export interface OrganizationDuesRecord {
  id: string;
  orgId: string;
  name: string;
  amount: number;
  intervalType: 'daily' | 'weekly' | 'monthly' | 'per_trip' | 'one_off';
  isMandatory: boolean;
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  type: OrganizationType;
  description?: string;
  founderId?: string;
  locationId?: string;
  venueId?: string;
  initialDeposit?: number;
}

export interface JoinOrganizationInput {
  orgId: string;
  characterId: string;
}

export interface PayDuesInput {
  orgId: string;
  characterId: string;
  amount: number;
  idempotencyKey?: string;
}

export interface AssignOrgRoleInput {
  orgId: string;
  assignerCharacterId: string;
  targetCharacterId: string;
  roleId: string;
}

export interface LeaveOrganizationInput {
  orgId: string;
  characterId: string;
}
