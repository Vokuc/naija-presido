import { MovementFrame, PresencePlayer } from './types';

export const MOVEMENT_BOUNDS = {
  minX: -36,
  maxX: 36,
  minY: -0.5,
  maxY: 4.0,
  minZ: -25,
  maxZ: 25,
};

export const MAX_REASONABLE_SPEED = 18.0; // meters per second (speed-hack protection)

export interface ValidationResult<T> {
  isValid: boolean;
  sanitized?: T;
  reason?: string;
}

/**
 * Validates and sanitizes a high-frequency movement update frame.
 * Rejects impossible states such as NaN/Infinity, out-of-bounds coordinates,
 * and unrealistic speed-hack teleportation.
 */
export function validateMovementFrame(
  frame: unknown,
  previousPosition?: [number, number, number],
  previousTimestamp?: number
): ValidationResult<MovementFrame> {
  if (!frame || typeof frame !== 'object') {
    return { isValid: false, reason: 'Invalid frame format' };
  }

  const f = frame as Partial<MovementFrame>;

  if (!f.characterId || typeof f.characterId !== 'string') {
    return { isValid: false, reason: 'Missing or invalid characterId' };
  }

  if (!Array.isArray(f.position) || f.position.length !== 3) {
    return { isValid: false, reason: 'Position must be a 3D coordinate array [x, y, z]' };
  }

  const [x, y, z] = f.position;

  // Check for NaN or non-finite numbers
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return { isValid: false, reason: 'Coordinates must be finite numbers' };
  }

  // Bounds enforcement
  if (
    x < MOVEMENT_BOUNDS.minX ||
    x > MOVEMENT_BOUNDS.maxX ||
    y < MOVEMENT_BOUNDS.minY ||
    y > MOVEMENT_BOUNDS.maxY ||
    z < MOVEMENT_BOUNDS.minZ ||
    z > MOVEMENT_BOUNDS.maxZ
  ) {
    return {
      isValid: false,
      reason: `Position [${x}, ${y}, ${z}] is out of allowable neighbourhood bounds`,
    };
  }

  const rot = typeof f.rotation === 'number' && Number.isFinite(f.rotation) ? f.rotation : 0;
  const now = typeof f.timestamp === 'number' && Number.isFinite(f.timestamp) ? f.timestamp : Date.now();

  // Speed-hack / Teleportation protection
  if (previousPosition && previousTimestamp && now > previousTimestamp) {
    const dt = Math.max(0.01, (now - previousTimestamp) / 1000);
    const dist = Math.hypot(x - previousPosition[0], z - previousPosition[2]);
    const speed = dist / dt;

    if (speed > MAX_REASONABLE_SPEED) {
      return {
        isValid: false,
        reason: `Impossible movement velocity: ${speed.toFixed(1)} m/s exceeds max allowable speed ${MAX_REASONABLE_SPEED} m/s`,
      };
    }
  }

  return {
    isValid: true,
    sanitized: {
      characterId: f.characterId,
      displayName: typeof f.displayName === 'string' ? f.displayName.slice(0, 32) : 'Citizen',
      position: [x, y, z],
      rotation: rot,
      velocity: f.velocity,
      isMoving: Boolean(f.isMoving),
      timestamp: now,
      sequenceNumber: typeof f.sequenceNumber === 'number' ? f.sequenceNumber : 0,
    },
  };
}

/**
 * Sanitizes and validates chat message text.
 */
export function sanitizeChatMessage(text: string): { isValid: boolean; sanitizedText: string; reason?: string } {
  if (typeof text !== 'string') {
    return { isValid: false, sanitizedText: '', reason: 'Chat message must be text' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { isValid: false, sanitizedText: '', reason: 'Message cannot be empty' };
  }

  if (trimmed.length > 140) {
    return { isValid: false, sanitizedText: '', reason: 'Message exceeds maximum 140 character limit' };
  }

  // Strip potential HTML tags / control characters
  const clean = trimmed
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  if (clean.length === 0) {
    return { isValid: false, sanitizedText: '', reason: 'Message contained only invalid characters' };
  }

  return { isValid: true, sanitizedText: clean };
}

/**
 * Validates player presence information when joining a neighbourhood.
 */
export function validatePresencePlayer(player: unknown): ValidationResult<PresencePlayer> {
  if (!player || typeof player !== 'object') {
    return { isValid: false, reason: 'Invalid presence payload' };
  }

  const p = player as Partial<PresencePlayer>;
  if (!p.characterId || typeof p.characterId !== 'string') {
    return { isValid: false, reason: 'Missing characterId in presence' };
  }

  if (!p.displayName || typeof p.displayName !== 'string') {
    return { isValid: false, reason: 'Missing displayName in presence' };
  }

  if (!p.zoneId || typeof p.zoneId !== 'string') {
    return { isValid: false, reason: 'Missing zoneId in presence' };
  }

  return {
    isValid: true,
    sanitized: {
      characterId: p.characterId,
      userId: p.userId,
      displayName: p.displayName.slice(0, 32),
      jobTitle: p.jobTitle ? String(p.jobTitle).slice(0, 32) : 'Citizen',
      avatarConfig: p.avatarConfig || {},
      joinedAt: p.joinedAt || new Date().toISOString(),
      zoneId: p.zoneId,
      venueId: p.venueId ?? null,
    },
  };
}
