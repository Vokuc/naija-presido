import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/db/server';
import { Command } from '@/lib/types/command-types';
import { executeCommand, getCommandDefinition } from '@/lib/commands';
import { checkRateLimit } from '@/lib/security/rateLimiter';
import { toSafeUuid, isValidUuid } from '@/lib/utils/uuid';

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    // 1. Safe JSON parsing with SyntaxError handling
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (parseErr) {
      return NextResponse.json(
        { ok: false, error: 'Malformed request: invalid JSON payload' },
        { status: 400 }
      );
    }

    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Invalid command format: body must be an object' },
        { status: 400 }
      );
    }

    const command = rawBody as Command<unknown>;
    if (!command.type || typeof command.type !== 'string' || command.type.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid command format: missing command type' },
        { status: 400 }
      );
    }

    if (!getCommandDefinition(command.type)) {
      return NextResponse.json(
        { ok: false, error: `Unknown command type: ${command.type}` },
        { status: 400 }
      );
    }

    // Ensure payload is an object
    if (!command.payload || typeof command.payload !== 'object') {
      command.payload = {};
    }

    // 2. Resolve Client Authentication & Prevent Impersonation
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const authenticatedUser = authData?.user ?? null;

    let effectiveUserId: string;

    if (authenticatedUser) {
      effectiveUserId = authenticatedUser.id;
      // Impersonation Guard: An authenticated user cannot claim another actor's ID
      if (command.actor_id && command.actor_id !== authenticatedUser.id) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden: actor_id does not match authenticated user session' },
          { status: 403 }
        );
      }
    } else {
      // Guest mode handling
      const guestHeaderId = request.headers.get('x-guest-user-id');
      const clientActorId = command.actor_id;
      const candidateId = guestHeaderId || clientActorId;

      if (candidateId) {
        if (!isValidUuid(candidateId)) {
          return NextResponse.json(
            { ok: false, error: 'Invalid guest identity format: must be a valid UUID' },
            { status: 400 }
          );
        }

        // Impersonation Guard: Guest cannot claim an existing registered user's account
        const adminDb = createAdminClient();
        const { data: existingUser } = await adminDb
          .from('acct_account')
          .select('id, user_id')
          .eq('user_id', candidateId)
          .maybeSingle();

        // If the account exists and was created with an authenticated user (e.g. not a guest), block access
        if (existingUser && !candidateId.startsWith('00000000-0000-0000-0000-0000000000') && !candidateId.includes('0000000000')) {
          // If candidateId matches a real registered account and user is not authenticated, reject
          const { data: authUserCheck } = await adminDb.auth.admin.getUserById(candidateId);
          if (authUserCheck?.user) {
            return NextResponse.json(
              { ok: false, error: 'Unauthorized: authentication required to access this account' },
              { status: 401 }
            );
          }
        }

        effectiveUserId = candidateId;
      } else {
        effectiveUserId = '00000000-0000-0000-0000-000000000099';
      }
    }

    // 3. Rate Limiting Protection (per actor and IP)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${effectiveUserId}:${clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 25, windowMs: 10000 }); // 25 commands / 10s

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Rate limit exceeded: too many commands issued. Please wait a moment.',
          retryAfterMs: rateLimit.resetInMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateLimit.resetInMs / 1000).toString(),
          },
        }
      );
    }

    // 4. Normalize Idempotency Key to valid UUID
    if (command.idempotency_key) {
      command.idempotency_key = toSafeUuid(command.idempotency_key);
    }

    // 5. Authoritative Command Execution
    // The server command engine uses createAdminClient to ensure atomic audit logging,
    // event persistence, and ledger entries succeed without RLS denial on server tables.
    const adminDb = createAdminClient();
    const ctx = {
      db: adminDb as any,
      actorId: effectiveUserId,
    };

    const result = await executeCommand(command, ctx);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Command execution fatal error:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
