import { describe, expect, it } from 'vitest';
import { computeLevelAndLines, computeScore } from '../scoring.js';
import type { ScoreEvent } from '../../types.js';

function event(overrides: Partial<ScoreEvent> = {}): ScoreEvent {
  return {
    linesCleared: 0,
    tSpin: 'none',
    isBackToBack: false,
    combo: -1,
    softDropCells: 0,
    hardDropCells: 0,
    level: 1,
    ...overrides,
  };
}

describe('computeScore — line clears (no T-spin)', () => {
  it('single line at level 1: 100', () => {
    expect(computeScore(event({ linesCleared: 1 }))).toBe(100);
  });

  it('double at level 2: 600', () => {
    expect(computeScore(event({ linesCleared: 2, level: 2 }))).toBe(600);
  });

  it('triple at level 3: 1500', () => {
    expect(computeScore(event({ linesCleared: 3, level: 3 }))).toBe(1500);
  });

  it('tetris at level 1: 800', () => {
    expect(computeScore(event({ linesCleared: 4 }))).toBe(800);
  });

  it('no lines = 0 points (ignoring drops)', () => {
    expect(computeScore(event({ linesCleared: 0 }))).toBe(0);
  });
});

describe('computeScore — back-to-back', () => {
  it('tetris back-to-back at level 1: 1200 (800 × 1.5)', () => {
    expect(computeScore(event({ linesCleared: 4, isBackToBack: true }))).toBe(1200);
  });

  it('single line b2b gives no bonus (singles are not b2b eligible)', () => {
    // Single is not b2b eligible — b2b flag is ignored
    expect(computeScore(event({ linesCleared: 1, isBackToBack: true }))).toBe(100);
  });
});

describe('computeScore — T-spin (full)', () => {
  it('T-spin no lines at level 1: 400', () => {
    expect(computeScore(event({ tSpin: 'full', linesCleared: 0 }))).toBe(400);
  });

  it('T-spin single at level 1: 800', () => {
    expect(computeScore(event({ tSpin: 'full', linesCleared: 1 }))).toBe(800);
  });

  it('T-spin double at level 1: 1200', () => {
    expect(computeScore(event({ tSpin: 'full', linesCleared: 2 }))).toBe(1200);
  });

  it('T-spin triple at level 1: 1600', () => {
    expect(computeScore(event({ tSpin: 'full', linesCleared: 3 }))).toBe(1600);
  });

  it('T-spin double back-to-back at level 2: 3600 (1200 × 1.5 × 2)', () => {
    // base = 1200 * 2 = 2400; b2b = floor(2400 * 1.5) = 3600
    expect(computeScore(event({ tSpin: 'full', linesCleared: 2, isBackToBack: true, level: 2 }))).toBe(
      3600,
    );
  });
});

describe('computeScore — T-spin triple acceptance test', () => {
  it('T-spin triple at level 1 scores 1600', () => {
    expect(computeScore(event({ tSpin: 'full', linesCleared: 3, level: 1 }))).toBe(1600);
  });

  it('T-spin triple back-to-back at level 1 scores 2400', () => {
    // floor(1600 * 1.5) = 2400
    expect(
      computeScore(event({ tSpin: 'full', linesCleared: 3, isBackToBack: true, level: 1 })),
    ).toBe(2400);
  });
});

describe('computeScore — mini T-spin', () => {
  // E1: per REQ-12.4, mini T-spins score 100×level (1 line) / 200×level (2 lines).
  it('mini T-spin single at level 1: 100', () => {
    expect(computeScore(event({ tSpin: 'mini', linesCleared: 1 }))).toBe(100);
  });

  it('mini T-spin double at level 1: 200', () => {
    expect(computeScore(event({ tSpin: 'mini', linesCleared: 2 }))).toBe(200);
  });

  it('mini T-spin no lines at level 1: 0 base (spec defines no base for 0 lines)', () => {
    expect(computeScore(event({ tSpin: 'mini', linesCleared: 0 }))).toBe(0);
  });

  it('mini T-spin single b2b at level 1: 150 (100 × 1.5)', () => {
    expect(computeScore(event({ tSpin: 'mini', linesCleared: 1, isBackToBack: true }))).toBe(150);
  });

  it('mini T-spin with 0 lines never gets the b2b multiplier', () => {
    expect(computeScore(event({ tSpin: 'mini', linesCleared: 0, isBackToBack: true }))).toBe(0);
  });
});

describe('computeScore — T-spin with 0 lines never gets the b2b multiplier', () => {
  it('full T-spin, 0 lines, isBackToBack true: still 400 (no ×1.5)', () => {
    expect(computeScore(event({ tSpin: 'full', linesCleared: 0, isBackToBack: true }))).toBe(400);
  });
});

describe('computeScore — combo bonus', () => {
  // E1: bonus = 50 × combo × level, awarded only once combo >= 1 (REQ-12.6/12.7).
  // combo = 0 is the first consecutive clear and gets no bonus.
  it('combo -1 (no combo): no bonus', () => {
    expect(computeScore(event({ linesCleared: 1, combo: -1 }))).toBe(100);
  });

  it('combo 0 (first consecutive clear): no bonus', () => {
    expect(computeScore(event({ linesCleared: 1, combo: 0 }))).toBe(100);
  });

  it('combo 1 (second consecutive clear) at level 1: 100 + 50', () => {
    expect(computeScore(event({ linesCleared: 1, combo: 1 }))).toBe(150);
  });

  it('combo 2 at level 1: 100 + 100', () => {
    expect(computeScore(event({ linesCleared: 1, combo: 2 }))).toBe(200);
  });

  it('combo 3 at level 2: 600 + 300', () => {
    // base = 300*2=600; combo = 50*3*2 = 300
    expect(computeScore(event({ linesCleared: 2, combo: 3, level: 2 }))).toBe(900);
  });

  it('combo bonus not awarded when no lines cleared', () => {
    expect(computeScore(event({ linesCleared: 0, combo: 5 }))).toBe(0);
  });
});

describe('computeScore — drop bonuses', () => {
  it('soft drop 5 cells: +5 points', () => {
    expect(computeScore(event({ softDropCells: 5 }))).toBe(5);
  });

  it('hard drop 10 cells: +20 points', () => {
    expect(computeScore(event({ hardDropCells: 10 }))).toBe(20);
  });

  it('combined soft and hard drop bonuses', () => {
    expect(computeScore(event({ softDropCells: 3, hardDropCells: 5 }))).toBe(13);
  });
});

describe('computeLevelAndLines', () => {
  it('starting at 0 lines, clearing 10 → level 2, lines 10', () => {
    expect(computeLevelAndLines(0, 10)).toEqual({ level: 2, lines: 10 });
  });

  it('at 19 lines, clearing 1 → level 3, lines 20', () => {
    expect(computeLevelAndLines(19, 1)).toEqual({ level: 3, lines: 20 });
  });

  it('starts at level 1 with 0 lines', () => {
    expect(computeLevelAndLines(0, 0)).toEqual({ level: 1, lines: 0 });
  });

  it('level 1 with 9 lines', () => {
    expect(computeLevelAndLines(0, 9)).toEqual({ level: 1, lines: 9 });
  });

  it('level does not cap (level 21 achievable)', () => {
    expect(computeLevelAndLines(0, 200).level).toBe(21);
  });
});
