import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ARR_MS, DAS_MS } from '../../constants.js';
import { InputHandler } from '../inputHandler.js';

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function keyDown(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
}

function keyUp(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true, cancelable: true }));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let handler: InputHandler;

beforeEach(() => {
  handler = new InputHandler();
});

afterEach(() => {
  handler.destroy();
});

// ─── Immediate actions ────────────────────────────────────────────────────────

describe('InputHandler — immediate actions', () => {
  it('keydown LEFT enqueues MOVE_LEFT immediately', () => {
    keyDown('ArrowLeft');
    expect(handler.drainActions()).toContain('MOVE_LEFT');
    keyUp('ArrowLeft');
  });

  it('keydown RIGHT enqueues MOVE_RIGHT immediately', () => {
    keyDown('ArrowRight');
    expect(handler.drainActions()).toContain('MOVE_RIGHT');
    keyUp('ArrowRight');
  });

  it('keydown DOWN enqueues SOFT_DROP immediately', () => {
    keyDown('ArrowDown');
    expect(handler.drainActions()).toContain('SOFT_DROP');
    keyUp('ArrowDown');
  });

  it('keydown SPACE enqueues HARD_DROP', () => {
    keyDown('Space');
    expect(handler.drainActions()).toContain('HARD_DROP');
  });

  it('keydown ArrowUp enqueues ROTATE_CW', () => {
    keyDown('ArrowUp');
    expect(handler.drainActions()).toContain('ROTATE_CW');
  });

  it('keydown Z enqueues ROTATE_CCW', () => {
    keyDown('KeyZ');
    expect(handler.drainActions()).toContain('ROTATE_CCW');
  });

  it('keydown C enqueues HOLD', () => {
    keyDown('KeyC');
    expect(handler.drainActions()).toContain('HOLD');
  });

  it('keydown P enqueues PAUSE', () => {
    keyDown('KeyP');
    expect(handler.drainActions()).toContain('PAUSE');
  });

  it('keydown R enqueues RESTART', () => {
    keyDown('KeyR');
    expect(handler.drainActions()).toContain('RESTART');
  });

  it('keydown Enter enqueues START', () => {
    keyDown('Enter');
    expect(handler.drainActions()).toContain('START');
  });
});

// ─── DAS / ARR (lateral) ─────────────────────────────────────────────────────

describe('InputHandler — DAS/ARR', () => {
  it('no DAS repeat before threshold (169ms)', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    handler.update(DAS_MS - 1);
    expect(handler.drainActions()).toHaveLength(0);
    keyUp('ArrowLeft');
  });

  it('DAS fires first repeat at exactly DAS_MS', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    handler.update(DAS_MS);
    const actions = handler.drainActions();
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions).toContain('MOVE_LEFT');
    keyUp('ArrowLeft');
  });

  it('ARR fires another repeat after DAS + ARR_MS', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    handler.update(DAS_MS);
    handler.drainActions();
    handler.update(ARR_MS);
    const actions = handler.drainActions();
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions).toContain('MOVE_LEFT');
    keyUp('ArrowLeft');
  });

  it('no lateral repeats after key release', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    keyUp('ArrowLeft');
    handler.update(DAS_MS + ARR_MS * 5);
    expect(handler.drainActions()).toHaveLength(0);
  });

  it('HARD_DROP does not produce DAS/ARR repeats', () => {
    keyDown('Space');
    handler.drainActions();
    handler.update(DAS_MS + ARR_MS * 5);
    expect(handler.drainActions()).toHaveLength(0);
  });

  it('ROTATE_CW does not produce DAS/ARR repeats', () => {
    keyDown('ArrowUp');
    handler.drainActions();
    handler.update(DAS_MS + ARR_MS * 5);
    expect(handler.drainActions()).toHaveLength(0);
  });
});

// ─── Soft-drop repeat (B3: no DAS phase, fires every ARR_MS) ─────────────────

describe('InputHandler — soft-drop repeat (B3)', () => {
  it('SOFT_DROP repeats after ARR_MS without any DAS delay', () => {
    keyDown('ArrowDown');
    handler.drainActions(); // consume the immediate action
    handler.update(ARR_MS);
    const actions = handler.drainActions();
    expect(actions).toContain('SOFT_DROP');
    keyUp('ArrowDown');
  });

  it('SOFT_DROP does NOT require DAS_MS wait before repeating', () => {
    keyDown('ArrowDown');
    handler.drainActions();
    // DAS_MS - 1 ms elapsed but we have already passed ARR_MS — should have repeated
    handler.update(ARR_MS * 2);
    const actions = handler.drainActions();
    expect(actions.length).toBeGreaterThanOrEqual(2);
    keyUp('ArrowDown');
  });

  it('SOFT_DROP stops repeating after key release', () => {
    keyDown('ArrowDown');
    handler.drainActions();
    keyUp('ArrowDown');
    handler.update(ARR_MS * 10);
    expect(handler.drainActions()).toHaveLength(0);
  });
});

// ─── Blur clears held state (B3) ─────────────────────────────────────────────

describe('InputHandler — blur clears held state (B3)', () => {
  it('blur stops lateral DAS/ARR repeats', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    // Simulate window losing focus
    window.dispatchEvent(new Event('blur'));
    handler.update(DAS_MS + ARR_MS * 5);
    expect(handler.drainActions()).toHaveLength(0);
  });

  it('blur stops soft-drop repeats', () => {
    keyDown('ArrowDown');
    handler.drainActions();
    window.dispatchEvent(new Event('blur'));
    handler.update(ARR_MS * 10);
    expect(handler.drainActions()).toHaveLength(0);
  });
});

// ─── Simultaneous directions ──────────────────────────────────────────────────

describe('InputHandler — simultaneous directions', () => {
  it('most recently pressed key takes priority', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    keyDown('ArrowRight');
    handler.drainActions();
    handler.update(DAS_MS + ARR_MS);
    const repeats = handler.drainActions();
    expect(repeats).toContain('MOVE_RIGHT');
    expect(repeats).not.toContain('MOVE_LEFT');
    keyUp('ArrowLeft');
    keyUp('ArrowRight');
  });

  it('releasing newer key falls back to older held key', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    keyDown('ArrowRight');
    handler.drainActions();
    keyUp('ArrowRight');
    handler.update(DAS_MS + ARR_MS);
    const repeats = handler.drainActions();
    expect(repeats).toContain('MOVE_LEFT');
    keyUp('ArrowLeft');
  });
});

// ─── Drain clears queue ───────────────────────────────────────────────────────

describe('InputHandler — drain clears queue', () => {
  it('second drainActions returns empty array', () => {
    keyDown('ArrowLeft');
    handler.drainActions();
    expect(handler.drainActions()).toHaveLength(0);
    keyUp('ArrowLeft');
  });
});
