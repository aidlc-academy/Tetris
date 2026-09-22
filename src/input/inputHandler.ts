import { ARR_MS, DAS_MS } from '../constants.js';
import type { InputAction } from '../types.js';

// ─── Key → Action mapping ─────────────────────────────────────────────────────

const KEY_MAP: Readonly<Record<string, InputAction>> = {
  ArrowLeft: 'MOVE_LEFT',
  ArrowRight: 'MOVE_RIGHT',
  ArrowDown: 'SOFT_DROP',
  Space: 'HARD_DROP',
  ArrowUp: 'ROTATE_CW',
  KeyX: 'ROTATE_CW',
  KeyZ: 'ROTATE_CCW',
  KeyC: 'HOLD',
  ShiftLeft: 'HOLD',
  ShiftRight: 'HOLD',
  KeyP: 'PAUSE',
  Escape: 'PAUSE',
  KeyR: 'RESTART',
  Enter: 'START',
} as const;

/** Actions that use lateral DAS/ARR (170 ms delay then 50 ms repeat). */
const DAS_ACTIONS = new Set<InputAction>(['MOVE_LEFT', 'MOVE_RIGHT']);

/**
 * SOFT_DROP repeats every ARR_MS with NO DAS phase — it fires on keydown
 * and then repeats immediately at ARR_MS until keyup.
 */
const SOFT_DROP_MS = ARR_MS;

// ─── InputHandler ─────────────────────────────────────────────────────────────

/**
 * Keyboard → InputAction queue with DAS/ARR for lateral movement and
 * immediate-repeat (no DAS) for soft drop.
 *
 * B3: SOFT_DROP held key repeats every SOFT_DROP_MS with no DAS delay.
 * B3: window blur clears all held state so keys don't get stuck.
 * B4: No resize listener here (resize is owned by main.ts / Renderer.resize()).
 */
export class InputHandler {
  private readonly queue: InputAction[] = [];

  // Lateral DAS/ARR state
  private dasAction: 'MOVE_LEFT' | 'MOVE_RIGHT' | null = null;
  private dasElapsed = 0;
  private arrElapsed = 0;
  private dasTriggered = false;
  private directionHistory: Array<'MOVE_LEFT' | 'MOVE_RIGHT'> = [];

  // Soft-drop held-repeat state
  private softDropHeld = false;
  private softDropElapsed = 0;

  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private readonly onBlur: () => void;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent): void => this.handleKeyDown(e);
    this.onKeyUp = (e: KeyboardEvent): void => this.handleKeyUp(e);
    this.onBlur = (): void => this.handleBlur();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const action = KEY_MAP[e.code];
    if (action === undefined) return;
    e.preventDefault();
    if (e.repeat) return; // OS key-repeat ignored; we handle it ourselves

    this.queue.push(action);

    if (action === 'MOVE_LEFT' || action === 'MOVE_RIGHT') {
      this.directionHistory = this.directionHistory.filter((d) => d !== action);
      this.directionHistory.push(action);
      this.activateDAS(action);
    }

    if (action === 'SOFT_DROP') {
      this.softDropHeld = true;
      this.softDropElapsed = 0;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = KEY_MAP[e.code];
    if (action === undefined) return;

    if (action === 'MOVE_LEFT' || action === 'MOVE_RIGHT') {
      this.directionHistory = this.directionHistory.filter((d) => d !== action);
      if (this.dasAction === action) {
        const remaining = this.directionHistory[this.directionHistory.length - 1] ?? null;
        if (remaining !== null) {
          this.activateDAS(remaining);
        } else {
          this.clearDAS();
        }
      }
    }

    if (action === 'SOFT_DROP') {
      this.softDropHeld = false;
      this.softDropElapsed = 0;
    }
  }

  /** B3: blur clears all held state so keys don't get stuck when focus is lost. */
  private handleBlur(): void {
    this.clearDAS();
    this.directionHistory = [];
    this.softDropHeld = false;
    this.softDropElapsed = 0;
  }

  private activateDAS(action: 'MOVE_LEFT' | 'MOVE_RIGHT'): void {
    this.dasAction = action;
    this.dasElapsed = 0;
    this.arrElapsed = 0;
    this.dasTriggered = false;
  }

  private clearDAS(): void {
    this.dasAction = null;
    this.dasElapsed = 0;
    this.arrElapsed = 0;
    this.dasTriggered = false;
  }

  /**
   * B1: Called by GameLoop BEFORE drainActions() each frame.
   * Advances DAS/ARR (lateral) and soft-drop repeat timers.
   */
  update(deltaMs: number): void {
    // ── Lateral DAS/ARR ───────────────────────────────────────────────────────
    if (this.dasAction !== null) {
      if (!this.dasTriggered) {
        this.dasElapsed += deltaMs;
        if (this.dasElapsed >= DAS_MS) {
          this.dasTriggered = true;
          this.arrElapsed = ARR_MS; // fire first repeat immediately upon DAS trigger
        }
      }

      if (this.dasTriggered) {
        this.arrElapsed += deltaMs;
        while (this.arrElapsed >= ARR_MS) {
          this.queue.push(this.dasAction);
          this.arrElapsed -= ARR_MS;
        }
      }
    }

    // ── Soft-drop repeat (no DAS; immediate repeat every SOFT_DROP_MS) ────────
    if (this.softDropHeld) {
      this.softDropElapsed += deltaMs;
      while (this.softDropElapsed >= SOFT_DROP_MS) {
        this.queue.push('SOFT_DROP');
        this.softDropElapsed -= SOFT_DROP_MS;
      }
    }
  }

  /** Returns all queued actions and clears the queue. */
  drainActions(): InputAction[] {
    const actions = [...this.queue];
    this.queue.length = 0;
    return actions;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}

export { KEY_MAP, DAS_ACTIONS };
