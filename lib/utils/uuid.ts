import crypto from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOSE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks whether a given string is a valid UUID format.
 */
export function isValidUuid(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  return LOOSE_UUID_REGEX.test(str.trim());
}

/**
 * Normalizes an idempotency key or identifier to a valid UUID.
 * If the input is already a valid UUID, returns it unchanged.
 * If it is an arbitrary string (e.g. "buy_123"), deterministically hashes it
 * to a RFC 4122 UUID v5-compatible representation so PostgreSQL uuid columns never throw syntax errors.
 */
export function toSafeUuid(input: string): string {
  const trimmed = input.trim();
  if (LOOSE_UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Deterministic 16-byte hash (SHA-256 slice)
  const hash = crypto.createHash('sha256').update(trimmed).digest();

  // Set version to 4 (random/hash) and variant to RFC 4122
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.toString('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
