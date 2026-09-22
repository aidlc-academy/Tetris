import { describe, expect, it } from 'vitest';
import { BOARD_COLS, BOARD_ROWS } from '../../constants.js';
import { canMove, isOnFloor, isValidPosition } from '../collision.js';
import { createBoard } from '../board.js';
import type { Board, CellType } from '../../types.js';

function emptyBoard(): Board {
  return createBoard();
}

function boardWithCell(row: number, col: number, val: CellType = 'I'): Board {
  const b = createBoard();
  (b[row] as CellType[])[col] = val;
  return b;
}

describe('isValidPosition', () => {
  it('piece within empty board is valid', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(isValidPosition(emptyBoard(), piece)).toBe(true);
  });

  it('piece overlapping left wall is invalid', () => {
    // T rotation 0 offsets: [0,1],[1,0],[1,1],[1,2] — placing at x=-1 puts cells at col -1
    const piece = { type: 'T' as const, rotation: 0 as const, x: -1, y: 5 };
    expect(isValidPosition(emptyBoard(), piece)).toBe(false);
  });

  it('piece overlapping right wall is invalid', () => {
    // T rotation 0 max col offset is 2; placing at x=9 puts a cell at col 11
    const piece = { type: 'T' as const, rotation: 0 as const, x: BOARD_COLS - 1, y: 5 };
    expect(isValidPosition(emptyBoard(), piece)).toBe(false);
  });

  it('piece overlapping bottom is invalid', () => {
    // T rotation 0 max row offset is 1; y=BOARD_ROWS-1 puts a cell at row BOARD_ROWS
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: BOARD_ROWS - 1 };
    expect(isValidPosition(emptyBoard(), piece)).toBe(false);
  });

  it('piece overlapping a locked cell is invalid', () => {
    const b = boardWithCell(6, 4); // occupies row 6, col 4
    // T rotation 0 at x=3,y=5: cell [1,1]→row6,col4 would overlap
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(isValidPosition(b, piece)).toBe(false);
  });

  it('piece entirely in hidden rows (0–1) is valid on empty board', () => {
    // I rotation 1 (vertical): offsets [0,2],[1,2],[2,2],[3,2] — y=-2 puts rows -2..1
    // Use I rotation 0 at y=0: offsets [1,0..3] → row 1, cols 3-6
    const piece = { type: 'I' as const, rotation: 0 as const, x: 3, y: 0 };
    expect(isValidPosition(emptyBoard(), piece)).toBe(true);
  });
});

describe('isOnFloor', () => {
  it('returns true when piece is one row above the floor', () => {
    // T rotation 0: max row offset 1; y=BOARD_ROWS-3 → cells at rows BOARD_ROWS-3, BOARD_ROWS-2
    // moving down puts max cell at BOARD_ROWS-1... wait, let's check the actual floor
    // T rotation 0 max row offset = 1; at y=BOARD_ROWS-2 cells sit on rows BOARD_ROWS-2 and BOARD_ROWS-1
    // moving down would put a cell at BOARD_ROWS → invalid
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: BOARD_ROWS - 2 };
    expect(isOnFloor(emptyBoard(), piece)).toBe(true);
  });

  it('returns false when piece has space below', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(isOnFloor(emptyBoard(), piece)).toBe(false);
  });

  it('returns true when piece is directly above a locked cell', () => {
    // Place locked cell at row 7, col 4
    const b = boardWithCell(7, 4);
    // T rotation 0 at x=3,y=5: bottom cells at row 6, col 3,4,5
    // moving down puts [1,1]→row7,col4 → overlaps locked cell
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(isOnFloor(b, piece)).toBe(true);
  });
});

describe('canMove', () => {
  it('can move left on empty board', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(canMove(emptyBoard(), piece, -1, 0)).toBe(true);
  });

  it('cannot move left into wall', () => {
    // T rotation 0 at x=0 — leftmost cell is at col 0; moving left goes to col -1
    const piece = { type: 'T' as const, rotation: 0 as const, x: 0, y: 5 };
    expect(canMove(emptyBoard(), piece, -1, 0)).toBe(false);
  });

  it('can move right on empty board', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(canMove(emptyBoard(), piece, 1, 0)).toBe(true);
  });

  it('cannot move right into wall', () => {
    // T rotation 0: rightmost col offset = 2; at x=7 rightmost cell is col 9; moving right → col 10
    const piece = { type: 'T' as const, rotation: 0 as const, x: 7, y: 5 };
    expect(canMove(emptyBoard(), piece, 1, 0)).toBe(false);
  });

  it('can move down on empty board', () => {
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(canMove(emptyBoard(), piece, 0, 1)).toBe(true);
  });
});
