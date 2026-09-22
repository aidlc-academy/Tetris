import type { ScoreEvent } from '../types.js';

// ─── Base score tables ────────────────────────────────────────────────────────

/** Guideline line-clear base scores (multiplied by level). */
export const LINE_CLEAR_BASE: Readonly<Record<number, number>> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
} as const;

/** T-spin line-clear base scores (multiplied by level). */
export const TSPIN_BASE: Readonly<Record<number, number>> = {
  0: 400,
  1: 800,
  2: 1200,
  3: 1600,
} as const;

/**
 * Mini T-spin line-clear base scores (multiplied by level).
 *
 * E1: per REQ-12.4 in requirements.md, mini T-spins score 100×level with 1
 * line cleared and 200×level with 2 lines cleared (the spec does not define
 * a base for 0 or 3 lines, which fall back to 0 below).
 */
export const MINI_TSPIN_BASE: Readonly<Record<number, number>> = {
  1: 100,
  2: 200,
} as const;

// ─── Score computation ────────────────────────────────────────────────────────

/**
 * Computes the total points to award for a single piece lock event.
 *
 * Back-to-back multiplier (×1.5) applies to Tetris and full/mini T-spins,
 * and only when the event actually cleared at least one line (E1: a 0-line
 * T-spin is not a "qualifying clear" per REQ-12.5 and never gets the ×1.5).
 *
 * Combo bonus: 50 × combo × level, awarded only once the combo counter has
 * reached 1 (REQ-12.6/12.7) — the first consecutive clear (combo = 0) gets
 * no bonus; the second (combo = 1) gets 50 × level, etc.
 *
 * Soft drop: 1pt/cell; hard drop: 2pt/cell.
 */
export function computeScore(event: ScoreEvent): number {
  const { linesCleared, tSpin, isBackToBack, combo, softDropCells, hardDropCells, level } = event;

  // Base line-clear score
  let base = 0;
  const b2bEligible: boolean =
    linesCleared > 0 && (linesCleared === 4 || tSpin === 'full' || tSpin === 'mini');

  if (tSpin === 'full') {
    base = (TSPIN_BASE[linesCleared] ?? 0) * level;
  } else if (tSpin === 'mini') {
    base = (MINI_TSPIN_BASE[linesCleared] ?? 0) * level;
  } else {
    base = (LINE_CLEAR_BASE[linesCleared] ?? 0) * level;
  }

  // Back-to-back bonus: multiply by 1.5 (floor the result)
  if (isBackToBack && b2bEligible && base > 0) {
    base = Math.floor(base * 1.5);
  }

  // Combo bonus (only when lines were cleared, and combo has reached 1)
  let comboBonus = 0;
  if (linesCleared > 0 && combo >= 1) {
    comboBonus = 50 * combo * level;
  }

  // Drop bonuses
  const dropBonus = softDropCells + hardDropCells * 2;

  return base + comboBonus + dropBonus;
}

// ─── Level / lines computation ────────────────────────────────────────────────

export interface LevelResult {
  level: number;
  lines: number;
}

/**
 * Returns the new level and total line count after clearing `clearedNow` lines.
 * Level = floor(totalLines / 10) + 1. No cap.
 */
export function computeLevelAndLines(currentLines: number, clearedNow: number): LevelResult {
  const lines = currentLines + clearedNow;
  const level = Math.floor(lines / 10) + 1;
  return { level, lines };
}
