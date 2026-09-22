import { describe, expect, it } from 'vitest';
import { BOARD_COLS, BOARD_ROWS } from '../../constants.js';
import { clearRows, createBoard, findFullRows, getCell, isRowFull, placePiece } from '../board.js';
import type { Board, CellType } from '../../types.js';

function makeBoard(): Board {
  return createBoard();
}

function fillRow(board: Board, row: number): Board {
  const b = board.map((r) => [...r] as CellType[]);
  for (let c = 0; c < BOARD_COLS; c++) {
    (b[row] as CellType[])[c] = 'I';
  }
  return b;
}

describe('createBoard', () => {
  it('returns 22 rows', () => {
    expect(createBoard()).toHaveLength(BOARD_ROWS);
  });

  it('each row has 10 columns', () => {
    createBoard().forEach((row) => expect(row).toHaveLength(BOARD_COLS));
  });

  it('all cells are 0', () => {
    createBoard().forEach((row) => row.forEach((cell) => expect(cell).toBe(0)));
  });
});

describe('isRowFull', () => {
  it('returns false on empty row', () => {
    expect(isRowFull(makeBoard(), 5)).toBe(false);
  });

  it('returns true on full row', () => {
    const b = fillRow(makeBoard(), 5);
    expect(isRowFull(b, 5)).toBe(true);
  });

  it('returns false on partial row', () => {
    const b = makeBoard();
    (b[5] as CellType[])[3] = 'T';
    expect(isRowFull(b, 5)).toBe(false);
  });
});

describe('findFullRows', () => {
  it('returns empty array when no full rows', () => {
    expect(findFullRows(makeBoard())).toEqual([]);
  });

  it('returns correct indices for multiple full rows', () => {
    let b = makeBoard();
    b = fillRow(b, 20);
    b = fillRow(b, 21);
    expect(findFullRows(b)).toEqual([20, 21]);
  });

  it('does not include partially filled rows', () => {
    const b = makeBoard();
    (b[10] as CellType[])[0] = 'S';
    expect(findFullRows(b)).toEqual([]);
  });
});

describe('clearRows', () => {
  it('returns the same board when no rows to clear', () => {
    const b = makeBoard();
    expect(clearRows(b, [])).toBe(b);
  });

  it('removes the specified row and prepends an empty row', () => {
    let b = makeBoard();
    b = fillRow(b, 21);
    (b[20] as CellType[])[0] = 'Z';
    const result = clearRows(b, [21]);
    expect(result).toHaveLength(BOARD_ROWS);
    // The previously-full row 21 is gone
    expect(isRowFull(result, 21)).toBe(false);
    // The marker on row 20 shifts down to row 21
    expect(result[21]?.[0]).toBe('Z');
    // A new empty row was prepended at row 0
    expect(result[0]?.every((c) => c === 0)).toBe(true);
  });

  it('removes two rows and prepends two empty rows', () => {
    let b = makeBoard();
    b = fillRow(b, 20);
    b = fillRow(b, 21);
    const result = clearRows(b, [20, 21]);
    expect(result).toHaveLength(BOARD_ROWS);
    expect(result[0]?.every((c) => c === 0)).toBe(true);
    expect(result[1]?.every((c) => c === 0)).toBe(true);
  });

  it('does not mutate the original board', () => {
    const b = fillRow(makeBoard(), 21);
    const copy = b.map((r) => [...r]);
    clearRows(b, [21]);
    b.forEach((row, i) => row.forEach((cell, j) => expect(cell).toBe(copy[i]?.[j])));
  });
});

describe('getCell', () => {
  it('returns 0 for empty cells', () => {
    expect(getCell(makeBoard(), 0, 0)).toBe(0);
  });

  it('returns 0 for out-of-bounds row (negative)', () => {
    expect(getCell(makeBoard(), -1, 0)).toBe(0);
  });

  it('returns 0 for out-of-bounds col (too large)', () => {
    expect(getCell(makeBoard(), 0, BOARD_COLS)).toBe(0);
  });

  it('returns 0 for out-of-bounds row (too large)', () => {
    expect(getCell(makeBoard(), BOARD_ROWS, 0)).toBe(0);
  });

  it('returns the correct cell value', () => {
    const b = makeBoard();
    (b[5] as CellType[])[3] = 'T';
    expect(getCell(b, 5, 3)).toBe('T');
  });
});

describe('placePiece', () => {
  it('stamps the correct cells for a T piece at rotation 0', () => {
    const b = makeBoard();
    const piece = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    const result = placePiece(b, piece);
    // T rotation 0 offsets: [0,1],[1,0],[1,1],[1,2]
    expect(result[5]?.[4]).toBe('T'); // [0,1] → row 5, col 4
    expect(result[6]?.[3]).toBe('T'); // [1,0] → row 6, col 3
    expect(result[6]?.[4]).toBe('T'); // [1,1] → row 6, col 4
    expect(result[6]?.[5]).toBe('T'); // [1,2] → row 6, col 5
  });

  it('does not mutate the original board', () => {
    const b = makeBoard();
    const piece = { type: 'I' as const, rotation: 0 as const, x: 3, y: 5 };
    placePiece(b, piece);
    expect(b[6]?.[3]).toBe(0);
  });

  it('does not stamp cells that are out of bounds', () => {
    const b = makeBoard();
    // Place I piece at the very top — row 0 hidden rows
    const piece = { type: 'I' as const, rotation: 0 as const, x: 3, y: 0 };
    expect(() => placePiece(b, piece)).not.toThrow();
  });
});
