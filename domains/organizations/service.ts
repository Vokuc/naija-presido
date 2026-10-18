import {
  OrganizationRecord,
  OrganizationRoleRecord,
  OrganizationMemberRecord,
  OrganizationType,
  CreateOrganizationInput,
  JoinOrganizationInput,
  PayDuesInput,
  AssignOrgRoleInput,
  LeaveOrganizationInput,
} from './types';
import { EconomyService } from '@/domains/economy/service';
import { toSafeUuid } from '@/lib/utils/uuid';

export class OrganizationService {
  /**
   * Retrieves an organization by ID.
   */
  public static async getOrganization(orgId: string, db: any): Promise<OrganizationRecord | null> {
    const { data, error } = await db
      .from('org_organization')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      type: data.type as OrganizationType,
      description: data.description,
      founderId: data.founder_id,
      locationId: data.location_id,
      venueId: data.venue_id,
      status: data.status,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Lists organizations, optionally filtered by type or location.
   */
  public static async listOrganizations(
    db: any,
    filter?: { type?: OrganizationType; locationId?: string }
  ): Promise<OrganizationRecord[]> {
    let query = db.from('org_organization').select('*').eq('status', 'active');

    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    if (filter?.locationId) {
      query = query.eq('location_id', filter.locationId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      type: d.type as OrganizationType,
      description: d.description,
      founderId: d.founder_id,
      locationId: d.location_id,
      venueId: d.venue_id,
      status: d.status,
      metadata: d.metadata || {},
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }

  /**
   * Retrieves an organization's treasury wallet.
   */
  public static async getTreasury(orgId: string, db: any) {
    return EconomyService.getWallet(orgId, db);
  }

  /**
   * Retrieves member records for an organization.
   */
  public static async getMembers(orgId: string, db: any): Promise<OrganizationMemberRecord[]> {
    const { data, error } = await db
      .from('org_member')
      .select('*, org_role(name, rank, permissions)')
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (error || !data) return [];

    return data.map((m: any) => {
      const roleData = Array.isArray(m.org_role) ? m.org_role[0] : m.org_role;
      return {
        id: m.id,
        orgId: m.org_id,
        characterId: m.character_id,
        roleId: m.role_id,
        status: m.status,
        duesPaidUntil: m.dues_paid_until,
        reputationInOrg: Number(m.reputation_in_org || 10),
        joinedAt: m.joined_at,
        roleName: roleData?.name ?? 'Member',
        roleRank: Number(roleData?.rank ?? 1),
        permissions: roleData?.permissions ?? {},
      };
    });
  }

  /**
   * Retrieves all organizations a character belongs to.
   */
  public static async getCharacterMemberships(characterId: string, db: any): Promise<any[]> {
    const { data, error } = await db
      .from('org_member')
      .select('*, org_organization(*), org_role(*)')
      .eq('character_id', characterId)
      .eq('status', 'active');

    if (error || !data) return [];
    return data;
  }

  /**
   * Creates a new organization/enterprise with default roles and provisioned treasury wallet.
   */
  public static async createOrganization(
    input: CreateOrganizationInput,
    db: any
  ): Promise<OrganizationRecord> {
    const orgId = crypto.randomUUID();
    const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const orgRecord = {
      id: orgId,
      name: input.name,
      slug,
      type: input.type,
      description: input.description || null,
      founder_id: input.founderId || null,
      location_id: input.locationId || null,
      venue_id: input.venueId || null,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    await db.from('org_organization').insert(orgRecord);

    // Provision organizational treasury wallet
    await db.from('eco_wallet').upsert({
      character_id: orgId,
      owner_type: input.type === 'business' ? 'business' : 'organization',
      balance: input.initialDeposit || 0,
      currency: 'NGN',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'character_id' });

    // Seed default leadership and member roles
    const leaderRoleId = crypto.randomUUID();
    const memberRoleId = crypto.randomUUID();

    await db.from('org_role').insert([
      {
        id: leaderRoleId,
        org_id: orgId,
        name: input.type === 'business' ? 'Managing Director' : input.type === 'trade_union' ? 'Chairman' : 'President',
        rank: 100,
        permissions: {
          can_hire: true,
          can_expel: true,
          can_withdraw: true,
          can_set_dues: true,
          can_speak_publicly: true,
        },
        base_salary: 0,
      },
      {
        id: memberRoleId,
        org_id: orgId,
        name: input.type === 'business' ? 'Associate / Staff' : 'Member',
        rank: 10,
        permissions: {
          can_hire: false,
          can_expel: false,
          can_withdraw: false,
          can_set_dues: false,
          can_speak_publicly: false,
        },
        base_salary: 0,
      },
    ]);

    // If founder specified, assign them as leader
    if (input.founderId) {
      await db.from('org_member').insert({
        org_id: orgId,
        character_id: input.founderId,
        role_id: leaderRoleId,
        status: 'active',
        reputation_in_org: 100,
      });
    }

    return {
      id: orgId,
      name: input.name,
      slug,
      type: input.type,
      description: input.description || null,
      founderId: input.founderId || null,
      locationId: input.locationId || null,
      venueId: input.venueId || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enrolls a character as a member of an organization.
   */
  public static async joinOrganization(
    input: JoinOrganizationInput,
    db: any
  ): Promise<OrganizationMemberRecord> {
    // Find baseline member role for this org
    const { data: defaultRole } = await db
      .from('org_role')
      .select('id, name, rank, permissions')
      .eq('org_id', input.orgId)
      .order('rank', { ascending: true })
      .limit(1)
      .maybeSingle();

    const memberInsert = {
      org_id: input.orgId,
      character_id: input.characterId,
      role_id: defaultRole?.id || null,
      status: 'active',
      reputation_in_org: 10,
      joined_at: new Date().toISOString(),
    };

    let memberId: string = crypto.randomUUID();
    const res = await db.from('org_member').insert(memberInsert);
    if (res?.data?.id) memberId = res.data.id;

    return {
      id: memberId,
      orgId: input.orgId,
      characterId: input.characterId,
      roleId: defaultRole?.id || null,
      status: 'active',
      duesPaidUntil: null,
      reputationInOrg: 10,
      joinedAt: memberInsert.joined_at,
      roleName: defaultRole?.name || 'Member',
      roleRank: defaultRole?.rank || 1,
      permissions: defaultRole?.permissions || {},
    };
  }

  /**
   * Pays union or organizational dues from citizen wallet to org treasury.
   */
  public static async payDues(
    input: PayDuesInput,
    db: any
  ): Promise<{ transactionId: string; newBalance: number; newOrgTreasury: number }> {
    const org = await this.getOrganization(input.orgId, db);
    if (!org) throw new Error('Organization not found');

    const transferRes = await EconomyService.transferFunds(
      {
        fromId: input.characterId,
        toId: input.orgId,
        fromType: 'character',
        toType: org.type === 'business' ? 'business' : 'organization',
        amount: input.amount,
        sourceType: 'transfer',
        reason: `Dues & check-off levy for ${org.name}`,
        idempotencyKey: toSafeUuid(input.idempotencyKey ?? `dues-${input.characterId}-${input.orgId}-${Date.now()}`),
        gameTimestamp: new Date().toISOString(),
      },
      db
    );

    // Extend dues validity by 30 days
    const nextValidity = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db
      .from('org_member')
      .update({ dues_paid_until: nextValidity })
      .eq('org_id', input.orgId)
      .eq('character_id', input.characterId);

    const userWallet = await EconomyService.getWallet(input.characterId, db);
    const orgWallet = await EconomyService.getWallet(input.orgId, db);

    return {
      transactionId: transferRes.transactionId,
      newBalance: userWallet.balance,
      newOrgTreasury: orgWallet.balance,
    };
  }

  /**
   * Promotes, demotes, or assigns a role to an organization member.
   * Requires assigner to possess can_hire permission or have a strictly higher rank.
   */
  public static async assignRole(
    input: AssignOrgRoleInput,
    db: any
  ): Promise<OrganizationMemberRecord> {
    // 1. Verify assigner has permission
    const { data: assignerMember } = await db
      .from('org_member')
      .select('*, org_role(name, rank, permissions)')
      .eq('org_id', input.orgId)
      .eq('character_id', input.assignerCharacterId)
      .eq('status', 'active')
      .maybeSingle();

    if (!assignerMember) {
      throw new Error('Assigner is not an active member of this organization');
    }

    const assignerRole = Array.isArray(assignerMember.org_role)
      ? assignerMember.org_role[0]
      : assignerMember.org_role;

    const hasHirePerm = assignerRole?.permissions?.can_hire === true;

    // 2. Fetch target role
    const { data: targetRole } = await db
      .from('org_role')
      .select('*')
      .eq('id', input.roleId)
      .eq('org_id', input.orgId)
      .maybeSingle();

    if (!targetRole) {
      throw new Error('Target role not found in this organization');
    }

    const assignerRank = Number(assignerRole?.rank ?? 0);
    const targetRank = Number(targetRole.rank);

    if (!hasHirePerm && assignerRank <= targetRank) {
      throw new Error('Insufficient organizational rank or permissions to assign this role');
    }

    // 3. Update target member role
    await db
      .from('org_member')
      .update({ role_id: input.roleId })
      .eq('org_id', input.orgId)
      .eq('character_id', input.targetCharacterId);

    const { data: updatedMember } = await db
      .from('org_member')
      .select('*')
      .eq('org_id', input.orgId)
      .eq('character_id', input.targetCharacterId)
      .single();

    return {
      id: updatedMember.id,
      orgId: updatedMember.org_id,
      characterId: updatedMember.character_id,
      roleId: updatedMember.role_id,
      status: updatedMember.status,
      duesPaidUntil: updatedMember.dues_paid_until,
      reputationInOrg: Number(updatedMember.reputation_in_org || 10),
      joinedAt: updatedMember.joined_at,
      roleName: targetRole.name,
      roleRank: targetRole.rank,
      permissions: targetRole.permissions || {},
    };
  }

  /**
   * Character departs or resigns from an organization.
   */
  public static async leaveOrganization(
    input: LeaveOrganizationInput,
    db: any
  ): Promise<boolean> {
    const { error } = await db
      .from('org_member')
      .delete()
      .eq('org_id', input.orgId)
      .eq('character_id', input.characterId);

    return !error;
  }
}
