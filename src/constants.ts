import type { PieceType } from './types.js';

// ─── Board ───────────────────────────────────────────────────────────────────

export const BOARD_COLS = 10;
export const BOARD_ROWS = 22;
export const VISIBLE_ROWS = 20;
export const SPAWN_ROWS = 2;

// ─── Input timing ────────────────────────────────────────────────────────────

/** Delayed Auto Shift threshold in milliseconds */
export const DAS_MS = 170;
/** Auto Repeat Rate interval in milliseconds */
export const ARR_MS = 50;

// ─── Lock delay ──────────────────────────────────────────────────────────────

export const LOCK_DELAY_MS = 500;
export const LOCK_RESET_CAP = 15;

// ─── Animations ──────────────────────────────────────────────────────────────

export const LINE_CLEAR_ANIM_MS = 200;

// ─── Preview queue ───────────────────────────────────────────────────────────

export const NEXT_QUEUE_SIZE = 5;

// ─── Pieces ──────────────────────────────────────────────────────────────────

export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ─── Gravity formula ─────────────────────────────────────────────────────────
//
//   interval(level) = (0.8 - (level - 1) × 0.007)^(level - 1)  seconds/row
//
// Returns milliseconds per row.
export function gravityIntervalMs(level: number): number {
  return Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000;
}

// ─── Game loop ───────────────────────────────────────────────────────────────

export const FIXED_STEP_MS = 1000 / 60; // ≈ 16.667 ms
export const MAX_DELTA_MS = 250; // spiral-of-death guard
