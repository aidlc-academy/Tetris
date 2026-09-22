import { describe, expect, it } from 'vitest';
import { createBoard } from '../board.js';
import { detectTSpin } from '../tspin.js';
import type { Board, CellType, Piece } from '../../types.js';

function emptyBoard(): Board {
  return createBoard();
}

/** Fill a cell on the board */
function setCell(b: Board, row: number, col: number, val: CellType = 'I'): void {
  (b[row] as CellType[])[col] = val;
}

describe('detectTSpin', () => {
  it('returns none for non-T pieces', () => {
    const piece: Piece = { type: 'I', rotation: 0, x: 3, y: 10 };
    expect(detectTSpin(emptyBoard(), piece, true, 0)).toBe('none');
  });

  it('returns none when last action was not a rotation', () => {
    const piece: Piece = { type: 'T', rotation: 1, x: 4, y: 10 };
    expect(detectTSpin(emptyBoard(), piece, false, 0)).toBe('none');
  });

  it('returns none when fewer than 3 corners are occupied', () => {
    // T at center of empty board — no corners occupied
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(emptyBoard(), piece, true, 0)).toBe('none');
  });

  it('returns none when exactly 2 corners are occupied', () => {
    const b = emptyBoard();
    setCell(b, 10, 4); // front corner (top-left)
    setCell(b, 12, 6); // back corner (bottom-right)
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(b, piece, true, 0)).toBe('none');
  });

  it('returns full T-spin when 3 corners are filled and both front corners are occupied', () => {
    const b = emptyBoard();
    // T rotation 0 at x=4, y=10: 3×3 box at (10,4)
    // Corners: (10,4),(10,6),(12,4),(12,6); front corners for rotation 0 are top-left/top-right
    setCell(b, 10, 4); // front: top-left
    setCell(b, 10, 6); // front: top-right
    setCell(b, 12, 4); // back: bottom-left
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(b, piece, true, 0)).toBe('full');
  });

  it('returns full T-spin when all 4 corners are filled', () => {
    const b = emptyBoard();
    setCell(b, 10, 4);
    setCell(b, 10, 6);
    setCell(b, 12, 4);
    setCell(b, 12, 6);
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(b, piece, true, 0)).toBe('full');
  });

  it('returns mini when 3 corners are filled but only one front corner is occupied', () => {
    const b = emptyBoard();
    // Front corners for rotation 0 are top-left (10,4) and top-right (10,6).
    // Fill only one front corner, plus both back corners, for 3 total.
    setCell(b, 10, 4); // front: top-left
    setCell(b, 12, 4); // back: bottom-left
    setCell(b, 12, 6); // back: bottom-right
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(b, piece, true, 0)).toBe('mini');
  });

  it('kickIndex === 4 upgrades an otherwise-mini result to full (T-spin twist)', () => {
    const b = emptyBoard();
    setCell(b, 10, 4); // front: top-left only
    setCell(b, 12, 4); // back: bottom-left
    setCell(b, 12, 6); // back: bottom-right
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(b, piece, true, 4)).toBe('full');
  });

  it('kickIndex === 4 with both front corners occupied is still full', () => {
    const b = emptyBoard();
    setCell(b, 10, 4);
    setCell(b, 10, 6);
    setCell(b, 12, 4);
    const piece: Piece = { type: 'T', rotation: 0, x: 4, y: 10 };
    expect(detectTSpin(b, piece, true, 4)).toBe('full');
  });

  it('T piece near left wall — out-of-bounds corners count as occupied', () => {
    const b = emptyBoard();
    setCell(b, 0, 0); // top-left corner at (y=0, x+0=0)
    setCell(b, 0, 2); // top-right corner at (y=0, x+2=2)
    setCell(b, 2, 0); // bottom-left
    const piece: Piece = { type: 'T', rotation: 0, x: 0, y: 0 };
    expect(detectTSpin(b, piece, true, 0)).toBe('full');
  });

  it('standard TST T-spin triple setup — T at rotation 1 locked into pocket', () => {
    // TST: T enters from the side into a pocket where 3 corners are filled
    // Simulate: T at rotation 1 (pointing right), x=3, y=15
    // 3×3 box at (15,3); corners: (15,3),(15,5),(17,3),(17,5)
    // Front corners for rotation 1 are top-right and bottom-right.
    const b = emptyBoard();
    setCell(b, 15, 3); // back: top-left
    setCell(b, 15, 5); // front: top-right
    setCell(b, 17, 5); // front: bottom-right
    // 3 corners filled, both front corners occupied → full T-spin
    const piece: Piece = { type: 'T', rotation: 1, x: 3, y: 15 };
    expect(detectTSpin(b, piece, true, 0)).toBe('full');
  });
});
