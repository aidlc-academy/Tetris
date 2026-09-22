import { LOCK_DELAY_MS, LOCK_RESET_CAP } from '../constants.js';
import type { LockDelayState } from '../types.js';

export function createLockDelay(): LockDelayState {
  return { active: false, elapsed: 0, resetCount: 0 };
}

/**
 * Advances the lock-delay timer by deltaMs.
 *
 * Rules:
 * - Timer only runs while the piece is on the floor (isOnFloor = true).
 * - If isOnFloor becomes false, the timer is paused (active set to false,
 *   elapsed preserved — this matches the spec: "moves piece off floor pauses timer").
 */
export function tickLockDelay(
  state: LockDelayState,
  deltaMs: number,
  isOnFloor: boolean,
): LockDelayState {
  if (!isOnFloor) {
    return { ...state, active: false };
  }
  const elapsed = state.elapsed + deltaMs;
  return { ...state, active: true, elapsed };
}

/**
 * Resets the lock-delay timer after a successful move or rotation.
 *
 * - If resetCount is already at LOCK_RESET_CAP, returns state unchanged
 *   (the timer will not be reset; the piece will lock on next expiry).
 */
export function resetLockDelay(state: LockDelayState): LockDelayState {
  if (state.resetCount >= LOCK_RESET_CAP) return state;
  return { active: state.active, elapsed: 0, resetCount: state.resetCount + 1 };
}

/**
 * Returns true when the lock-delay timer has expired and the piece should lock.
 */
export function shouldLock(state: LockDelayState): boolean {
  return state.active && state.elapsed >= LOCK_DELAY_MS;
}
