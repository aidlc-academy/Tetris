import { describe, expect, it } from 'vitest';
import { LOCK_DELAY_MS, LOCK_RESET_CAP } from '../../constants.js';
import { createLockDelay, resetLockDelay, shouldLock, tickLockDelay } from '../lockDelay.js';

describe('createLockDelay', () => {
  it('starts inactive with zero elapsed and zero resets', () => {
    const s = createLockDelay();
    expect(s.active).toBe(false);
    expect(s.elapsed).toBe(0);
    expect(s.resetCount).toBe(0);
  });
});

describe('tickLockDelay', () => {
  it('does not activate timer when piece is not on floor', () => {
    const s = createLockDelay();
    const next = tickLockDelay(s, 100, false);
    expect(next.active).toBe(false);
    expect(next.elapsed).toBe(0);
  });

  it('activates and accumulates when piece is on floor', () => {
    const s = createLockDelay();
    const next = tickLockDelay(s, 100, true);
    expect(next.active).toBe(true);
    expect(next.elapsed).toBe(100);
  });

  it('pauses timer (active=false) when piece leaves floor', () => {
    let s = createLockDelay();
    s = tickLockDelay(s, 200, true); // now active, elapsed=200
    s = tickLockDelay(s, 100, false); // leaves floor
    expect(s.active).toBe(false);
  });

  it('does not increase elapsed when not on floor', () => {
    let s = createLockDelay();
    s = tickLockDelay(s, 200, true);
    const elapsedBeforeLeave = s.elapsed;
    s = tickLockDelay(s, 100, false);
    expect(s.elapsed).toBe(elapsedBeforeLeave);
  });
});

describe('shouldLock', () => {
  it('returns false below the threshold', () => {
    let s = createLockDelay();
    s = tickLockDelay(s, LOCK_DELAY_MS - 1, true);
    expect(shouldLock(s)).toBe(false);
  });

  it('returns true at exactly the threshold', () => {
    let s = createLockDelay();
    s = tickLockDelay(s, LOCK_DELAY_MS, true);
    expect(shouldLock(s)).toBe(true);
  });

  it('returns true above the threshold', () => {
    let s = createLockDelay();
    s = tickLockDelay(s, LOCK_DELAY_MS + 50, true);
    expect(shouldLock(s)).toBe(true);
  });

  it('returns false when not active even if elapsed is large', () => {
    // Manually construct a state that has elapsed but is not active
    const s = { active: false, elapsed: 9999, resetCount: 0 };
    expect(shouldLock(s)).toBe(false);
  });
});

describe('resetLockDelay', () => {
  it('resets elapsed to 0 and increments resetCount', () => {
    let s = createLockDelay();
    s = tickLockDelay(s, 400, true);
    s = resetLockDelay(s);
    expect(s.elapsed).toBe(0);
    expect(s.resetCount).toBe(1);
  });

  it('resets on the 14th attempt (one before cap)', () => {
    let s = createLockDelay();
    for (let i = 0; i < LOCK_RESET_CAP - 1; i++) {
      s = tickLockDelay(s, 400, true);
      s = resetLockDelay(s);
    }
    expect(s.resetCount).toBe(LOCK_RESET_CAP - 1);
    expect(s.elapsed).toBe(0);
  });

  it('does NOT reset on the cap attempt — timer stays at current elapsed', () => {
    let s = createLockDelay();
    // Use up all resets
    for (let i = 0; i < LOCK_RESET_CAP; i++) {
      s = tickLockDelay(s, 400, true);
      s = resetLockDelay(s);
    }
    // resetCount should be capped at LOCK_RESET_CAP
    expect(s.resetCount).toBe(LOCK_RESET_CAP);
    // Try one more reset — should have no effect on elapsed
    s = tickLockDelay(s, 400, true);
    const elapsedBeforeCappedReset = s.elapsed;
    const afterReset = resetLockDelay(s);
    expect(afterReset.elapsed).toBe(elapsedBeforeCappedReset);
    expect(afterReset.resetCount).toBe(LOCK_RESET_CAP);
  });

  it('after cap is reached, next tick with isOnFloor=true results in shouldLock=true', () => {
    let s = createLockDelay();
    for (let i = 0; i < LOCK_RESET_CAP; i++) {
      s = tickLockDelay(s, 400, true);
      s = resetLockDelay(s);
    }
    // Now tick past the delay — should lock
    s = tickLockDelay(s, LOCK_DELAY_MS, true);
    expect(shouldLock(s)).toBe(true);
  });
});
