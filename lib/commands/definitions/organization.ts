import { Commands, DomainEventInput } from '@/lib/types/command-types';
import { defineCommand, registerCommand } from '../registry';
import {
  OrganizationType,
  OrganizationRecord,
  OrganizationMemberRecord,
} from '@/domains/organizations/types';
import { OrganizationService } from '@/domains/organizations/service';
import { EconomyService } from '@/domains/economy/service';
import { EventService } from '@/domains/events';
import { toSafeUuid } from '@/lib/utils/uuid';

// ============================================================================
// 1. CREATE_ORGANIZATION Command
// ============================================================================
export interface CreateOrganizationPayload {
  name: string;
  slug?: string;
  type: OrganizationType;
  description?: string;
  locationId?: string;
  venueId?: string;
  initialDeposit?: number;
}

export const CreateOrganizationCommand = registerCommand<
  CreateOrganizationPayload,
  OrganizationRecord
>(
  defineCommand({
    type: Commands.CREATE_ORGANIZATION,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const { name, type, initialDeposit } = cmd.payload;
      if (!name || name.trim().length < 3) {
        return 'Organization name must be at least 3 characters long';
      }

      const validTypes: OrganizationType[] = [
        'business',
        'trade_union',
        'civic_association',
        'cultural_group',
        'political_party',
        'religious_society',
      ];
      if (!validTypes.includes(type)) {
        return `Invalid organization type '${type}'`;
      }

      if (initialDeposit !== undefined) {
        if (!Number.isFinite(initialDeposit) || initialDeposit < 0) {
          return 'Initial deposit must be a non-negative number';
        }
        if (initialDeposit > 0) {
          const wallet = await EconomyService.getWallet(ctx.characterId!, ctx.db);
          if (wallet.balance < initialDeposit) {
            return `Insufficient funds for initial deposit. Balance: ₦${wallet.balance}, required: ₦${initialDeposit}`;
          }
        }
      }

      // Check unique name
      const { data: existing } = await ctx.db
        .from('org_organization')
        .select('id')
        .eq('name', name.trim())
        .maybeSingle();

      if (existing) {
        return `An organization named '${name.trim()}' already exists in Port Harcourt`;
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { name, slug, type, description, locationId, venueId, initialDeposit = 0 } = cmd.payload;
      const gameTimestamp = ctx.gameTime ? ctx.gameTime.toISOString() : await EventService.resolveGameTime(ctx.db);

      const org = await OrganizationService.createOrganization(
        {
          name: name.trim(),
          slug,
          type,
          description,
          founderId: charId,
          locationId: locationId || '10000000-0000-0000-0000-000000000004',
          venueId: venueId || undefined,
          initialDeposit: 0,
        },
        ctx.db
      );

      // If initial deposit supplied, transfer from founder wallet to organization treasury
      if (initialDeposit > 0) {
        await EconomyService.transferFunds(
          {
            fromId: charId,
            toId: org.id,
            fromType: 'character',
            toType: type === 'business' ? 'business' : 'organization',
            amount: initialDeposit,
            sourceType: 'transfer',
            reason: `Capitalization / initial deposit for ${org.name}`,
            idempotencyKey: toSafeUuid(cmd.idempotency_key ?? `init-org-${org.id}`) ?? undefined,
            gameTimestamp,
          },
          ctx.db
        );
      }

      const events: DomainEventInput[] = [
        {
          type: 'ORGANIZATION_FOUNDED',
          category: 'action',
          significance: 'significant',
          actor_id: charId,
          venue_id: venueId ?? null,
          location_id: locationId ?? null,
          payload: {
            org_id: org.id,
            name: org.name,
            type: org.type,
            initial_deposit: initialDeposit,
          },
          effects: [
            {
              target_type: 'organization',
              target_id: org.id,
              attribute: 'status',
              delta: { status: 'active', founder_id: charId },
            },
          ],
        },
      ];

      return {
        state: org,
        events,
      };
    },
  })
);

// ============================================================================
// 2. JOIN_ORGANIZATION Command
// ============================================================================
export interface JoinOrganizationPayload {
  orgId: string;
}

export const JoinOrganizationCommand = registerCommand<
  JoinOrganizationPayload,
  OrganizationMemberRecord
>(
  defineCommand({
    type: Commands.JOIN_ORGANIZATION,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId } = cmd.payload;
      if (!orgId) return 'Organization ID is required';

      const org = await OrganizationService.getOrganization(orgId, ctx.db);
      if (!org || org.status !== 'active') {
        return 'Organization not found or inactive';
      }

      // Check not already member
      const { data: existingMember } = await ctx.db
        .from('org_member')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('character_id', charId)
        .maybeSingle();

      if (existingMember && existingMember.status === 'active') {
        return 'Character is already an active member of this organization';
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId } = cmd.payload;

      const member = await OrganizationService.joinOrganization(
        { orgId, characterId: charId },
        ctx.db
      );

      const org = await OrganizationService.getOrganization(orgId, ctx.db);

      const events: DomainEventInput[] = [
        {
          type: 'ORGANIZATION_MEMBER_ENROLLED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          venue_id: org?.venueId ?? null,
          location_id: org?.locationId ?? null,
          payload: {
            org_id: orgId,
            org_name: org?.name,
            role_name: member.roleName,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'organizations.membership',
              delta: { org_id: orgId, role_name: member.roleName },
            },
          ],
        },
      ];

      return {
        state: member,
        events,
      };
    },
  })
);

// ============================================================================
// 3. LEAVE_ORGANIZATION Command
// ============================================================================
export interface LeaveOrganizationPayload {
  orgId: string;
}

export const LeaveOrganizationCommand = registerCommand<
  LeaveOrganizationPayload,
  { success: boolean; orgId: string }
>(
  defineCommand<LeaveOrganizationPayload, { success: boolean; orgId: string }>({
    type: Commands.LEAVE_ORGANIZATION,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId } = cmd.payload;
      if (!orgId) return 'Organization ID is required';

      const { data: member } = await ctx.db
        .from('org_member')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('character_id', charId)
        .maybeSingle();

      if (!member) {
        return 'Character is not a member of this organization';
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId } = cmd.payload;

      await OrganizationService.leaveOrganization(
        { orgId, characterId: charId },
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'ORGANIZATION_MEMBER_DEPARTED',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          payload: { org_id: orgId },
        },
      ];

      return {
        state: { success: true, orgId },
        events,
      };
    },
  })
);

// ============================================================================
// 4. PAY_ORG_DUES Command
// ============================================================================
export interface PayOrgDuesPayload {
  orgId: string;
  amount: number;
}

export interface PayOrgDuesOutcome {
  transactionId: string;
  newBalance: number;
  newOrgTreasury: number;
  duesPaidUntil: string;
}

export const PayOrgDuesCommand = registerCommand<PayOrgDuesPayload, PayOrgDuesOutcome>(
  defineCommand({
    type: Commands.PAY_ORG_DUES,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId, amount } = cmd.payload;
      if (!orgId) return 'Organization ID is required';
      if (!Number.isFinite(amount) || amount <= 0) return 'Dues amount must be greater than 0';

      const { data: member } = await ctx.db
        .from('org_member')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('character_id', charId)
        .maybeSingle();

      if (!member || member.status !== 'active') {
        return 'Character is not an active member of this organization';
      }

      const wallet = await EconomyService.getWallet(charId, ctx.db);
      if (wallet.balance < amount) {
        return `Insufficient funds to pay dues. Balance: ₦${wallet.balance}, required: ₦${amount}`;
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId, amount } = cmd.payload;

      const res = await OrganizationService.payDues(
        {
          orgId,
          characterId: charId,
          amount,
          idempotencyKey: cmd.idempotency_key,
        },
        ctx.db
      );

      const org = await OrganizationService.getOrganization(orgId, ctx.db);
      const nextValidity = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const events: DomainEventInput[] = [
        {
          type: 'ORGANIZATION_DUES_PAID',
          category: 'action',
          significance: 'minor',
          actor_id: charId,
          venue_id: org?.venueId ?? null,
          payload: {
            org_id: orgId,
            org_name: org?.name,
            amount,
            transaction_id: res.transactionId,
            new_treasury_balance: res.newOrgTreasury,
          },
          effects: [
            {
              target_type: 'character',
              target_id: charId,
              attribute: 'wallet.balance',
              delta: { deducted: amount, new_balance: res.newBalance },
            },
            {
              target_type: 'organization',
              target_id: orgId,
              attribute: 'wallet.balance',
              delta: { credited: amount, new_balance: res.newOrgTreasury },
            },
          ],
        },
      ];

      return {
        state: {
          transactionId: res.transactionId,
          newBalance: res.newBalance,
          newOrgTreasury: res.newOrgTreasury,
          duesPaidUntil: nextValidity,
        },
        events,
      };
    },
  })
);

// ============================================================================
// 5. ASSIGN_ORG_ROLE Command
// ============================================================================
export interface AssignOrgRolePayload {
  orgId: string;
  targetCharacterId: string;
  roleId: string;
}

export const AssignOrgRoleCommand = registerCommand<
  AssignOrgRolePayload,
  OrganizationMemberRecord
>(
  defineCommand({
    type: Commands.ASSIGN_ORG_ROLE,
    requiresAuth: true,
    requiresActiveCharacter: true,
    authorize: async (cmd, ctx) => {
      if (!ctx.characterId) return 'Character identity could not be verified';
      return true;
    },
    validate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId, targetCharacterId, roleId } = cmd.payload;
      if (!orgId) return 'Organization ID is required';
      if (!targetCharacterId) return 'Target character ID is required';
      if (!roleId) return 'Role ID is required';

      // Assigner membership
      const { data: assignerMember } = await ctx.db
        .from('org_member')
        .select('*, org_role(rank, permissions)')
        .eq('org_id', orgId)
        .eq('character_id', charId)
        .eq('status', 'active')
        .maybeSingle();

      if (!assignerMember) {
        return 'You are not an active member of this organization';
      }

      const assignerRole = Array.isArray(assignerMember.org_role)
        ? assignerMember.org_role[0]
        : assignerMember.org_role;

      const hasHire = assignerRole?.permissions?.can_hire === true;

      // Target role check
      const { data: targetRole } = await ctx.db
        .from('org_role')
        .select('*')
        .eq('id', roleId)
        .eq('org_id', orgId)
        .maybeSingle();

      if (!targetRole) {
        return 'Target role not found in this organization';
      }

      if (!hasHire && Number(assignerRole?.rank ?? 0) <= Number(targetRole.rank)) {
        return 'Insufficient rank to assign this position';
      }

      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const { orgId, targetCharacterId, roleId } = cmd.payload;

      const member = await OrganizationService.assignRole(
        {
          orgId,
          assignerCharacterId: charId,
          targetCharacterId,
          roleId,
        },
        ctx.db
      );

      const events: DomainEventInput[] = [
        {
          type: 'ORGANIZATION_ROLE_ASSIGNED',
          category: 'action',
          significance: 'significant',
          actor_id: charId,
          payload: {
            org_id: orgId,
            target_character_id: targetCharacterId,
            role_id: roleId,
            role_name: member.roleName,
            role_rank: member.roleRank,
          },
          effects: [
            {
              target_type: 'character',
              target_id: targetCharacterId,
              attribute: 'organizations.role',
              delta: { org_id: orgId, role_name: member.roleName, rank: member.roleRank },
            },
          ],
        },
      ];

      return {
        state: member,
        events,
      };
    },
  })
);
