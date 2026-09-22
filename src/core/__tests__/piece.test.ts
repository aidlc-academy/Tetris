import { describe, expect, it } from 'vitest';
import { PIECE_COLORS, PIECE_SHAPES, getBlocks, spawnPiece } from '../piece.js';
import type { Piece, PieceType } from '../../types.js';

const ALL_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('PIECE_SHAPES', () => {
  it('each piece type has exactly 4 rotation states', () => {
    for (const type of ALL_TYPES) {
      expect(PIECE_SHAPES[type]).toHaveLength(4);
    }
  });

  it('each rotation state has exactly 4 cells', () => {
    for (const type of ALL_TYPES) {
      for (const rotation of PIECE_SHAPES[type]) {
        expect(rotation).toHaveLength(4);
      }
    }
  });
});

describe('PIECE_COLORS', () => {
  const expectedColors: Record<PieceType, string> = {
    I: '#00F0F0',
    O: '#F0F000',
    T: '#A000F0',
    S: '#00F000',
    Z: '#F00000',
    J: '#0000F0',
    L: '#F0A000',
  };

  it('all 7 piece types have a color', () => {
    for (const type of ALL_TYPES) {
      expect(PIECE_COLORS[type]).toBeDefined();
    }
  });

  it('colors match guideline hex values', () => {
    for (const type of ALL_TYPES) {
      expect(PIECE_COLORS[type]).toBe(expectedColors[type]);
    }
  });

  it('all colors are valid hex strings', () => {
    for (const type of ALL_TYPES) {
      expect(PIECE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('getBlocks', () => {
  it('I piece rotation 0 at spawn produces a horizontal bar on the correct row', () => {
    const piece = { type: 'I' as const, rotation: 0 as const, x: 3, y: 0 };
    const blocks = getBlocks(piece);
    // PIECE_SHAPES I rotation 0: [1,0],[1,1],[1,2],[1,3] → absolute row=1, cols 3-6
    expect(blocks).toContainEqual([1, 3]);
    expect(blocks).toContainEqual([1, 4]);
    expect(blocks).toContainEqual([1, 5]);
    expect(blocks).toContainEqual([1, 6]);
    expect(blocks).toHaveLength(4);
  });

  it('T piece rotation 0 matches guideline shape', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    const blocks = getBlocks(piece);
    expect(blocks).toContainEqual([5, 4]); // [0,1]
    expect(blocks).toContainEqual([6, 3]); // [1,0]
    expect(blocks).toContainEqual([6, 4]); // [1,1]
    expect(blocks).toContainEqual([6, 5]); // [1,2]
  });

  it('T piece rotation 1 matches guideline shape', () => {
    const piece = { type: 'T' as const, rotation: 1 as const, x: 3, y: 5 };
    const blocks = getBlocks(piece);
    // PIECE_SHAPES T rot 1: [0,1],[1,1],[1,2],[2,1]
    expect(blocks).toContainEqual([5, 4]); // [0,1]
    expect(blocks).toContainEqual([6, 4]); // [1,1]
    expect(blocks).toContainEqual([6, 5]); // [1,2]
    expect(blocks).toContainEqual([7, 4]); // [2,1]
  });

  it('T piece rotation 2 matches guideline shape', () => {
    const piece = { type: 'T' as const, rotation: 2 as const, x: 3, y: 5 };
    const blocks = getBlocks(piece);
    // PIECE_SHAPES T rot 2: [1,0],[1,1],[1,2],[2,1]
    expect(blocks).toContainEqual([6, 3]); // [1,0]
    expect(blocks).toContainEqual([6, 4]); // [1,1]
    expect(blocks).toContainEqual([6, 5]); // [1,2]
    expect(blocks).toContainEqual([7, 4]); // [2,1]
  });

  it('T piece rotation 3 matches guideline shape', () => {
    const piece = { type: 'T' as const, rotation: 3 as const, x: 3, y: 5 };
    const blocks = getBlocks(piece);
    // PIECE_SHAPES T rot 3: [0,1],[1,0],[1,1],[2,1]
    expect(blocks).toContainEqual([5, 4]); // [0,1]
    expect(blocks).toContainEqual([6, 3]); // [1,0]
    expect(blocks).toContainEqual([6, 4]); // [1,1]
    expect(blocks).toContainEqual([7, 4]); // [2,1]
  });
});

describe('spawnPiece', () => {
  it('I spawns at col 3', () => {
    expect(spawnPiece('I').x).toBe(3);
  });

  it('O spawns at bounding-box col 3 (E3: cells land at cols 4-5, not 5-6)', () => {
    expect(spawnPiece('O').x).toBe(3);
  });

  it('T spawns at col 3', () => {
    expect(spawnPiece('T').x).toBe(3);
  });

  it('all pieces spawn at row 0', () => {
    for (const type of ALL_TYPES) {
      expect(spawnPiece(type).y).toBe(0);
    }
  });

  it('all pieces spawn at rotation 0', () => {
    for (const type of ALL_TYPES) {
      expect(spawnPiece(type).rotation).toBe(0);
    }
  });

  // E3: assert the actual occupied board columns for every piece's spawn,
  // not just the bounding-box x, since a shape's cells may be offset within
  // its 4×4 box (as O's are).
  it('every piece spawns with its cells centered on the 10-wide board', () => {
    const expectedColRange: Record<PieceType, [number, number]> = {
      I: [3, 6],
      O: [4, 5],
      T: [3, 5],
      S: [3, 5],
      Z: [3, 5],
      J: [3, 5],
      L: [3, 5],
    };

    for (const type of ALL_TYPES) {
      const piece: Piece = spawnPiece(type);
      const cols = getBlocks(piece).map(([, c]) => c);
      const [expectedMin, expectedMax] = expectedColRange[type];
      expect(Math.min(...cols)).toBe(expectedMin);
      expect(Math.max(...cols)).toBe(expectedMax);
    }
  });
});
