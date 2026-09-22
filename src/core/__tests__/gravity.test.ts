import { describe, expect, it } from 'vitest';
import { createBoard } from '../board.js';
import { computeGhostY } from '../gravity.js';
import { gravityIntervalMs } from '../../constants.js';
import type { Board, CellType } from '../../types.js';
import { BOARD_ROWS } from '../../constants.js';

describe('gravityIntervalMs', () => {
  it('level 1 returns 1000ms', () => {
    expect(gravityIntervalMs(1)).toBeCloseTo(1000, 0);
  });

  it('level 20 returns a very small value (sub-millisecond, formula-correct)', () => {
    // Formula: (0.8 - 19*0.007)^19 * 1000 ≈ 0.667^19 * 1000 ≈ 0.455ms
    const val = gravityIntervalMs(20);
    expect(val).toBeLessThan(2); // significantly faster than level 1
    expect(val).toBeGreaterThan(0);
  });

  it('level 5 matches manual formula calculation', () => {
    const expected = Math.pow(0.8 - 4 * 0.007, 4) * 1000;
    expect(gravityIntervalMs(5)).toBeCloseTo(expected, 3);
  });

  it('higher levels have shorter intervals (faster gravity)', () => {
    for (let level = 1; level < 20; level++) {
      expect(gravityIntervalMs(level + 1)).toBeLessThan(gravityIntervalMs(level));
    }
  });
});

describe('computeGhostY', () => {
  it('returns piece y when already on the floor of empty board', () => {
    // T rotation 0: max row offset = 1; at y=BOARD_ROWS-2, bottom cells at row BOARD_ROWS-1
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: BOARD_ROWS - 2 };
    expect(computeGhostY(createBoard(), piece)).toBe(BOARD_ROWS - 2);
  });

  it('drops to the bottom of empty board', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 0 };
    // T rotation 0: max row offset 1, so ghost lands at BOARD_ROWS - 2
    expect(computeGhostY(createBoard(), piece)).toBe(BOARD_ROWS - 2);
  });

  it('I piece horizontal drops to correct row in empty board', () => {
    // I rotation 0: cells at row y+1 (offset [1,0..3]); bottom is row y+1
    // Can drop to y = BOARD_ROWS - 2 (cells at row BOARD_ROWS-1, the last row)
    const piece = { type: 'I' as const, rotation: 0 as const, x: 3, y: 0 };
    expect(computeGhostY(createBoard(), piece)).toBe(BOARD_ROWS - 2);
  });

  it('stops above a locked cell', () => {
    const b: Board = createBoard();
    // Fill row 15 completely
    for (let c = 0; c < 10; c++) {
      (b[15] as CellType[])[c] = 'I';
    }
    // T rotation 0: bounding box rows are y+0 and y+1 (offsets [0,1] and [1,x])
    // bottom cell is at row y+1; must land at y=13 (bottom cell at row 14, above locked row 15)
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 0 };
    expect(computeGhostY(b, piece)).toBe(13);
  });
});
