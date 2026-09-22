import { BOARD_COLS, BOARD_ROWS } from '../constants.js';
import type { Board, CellType, Piece } from '../types.js';
import { getBlocks } from './piece.js';

/** Returns a fresh 22×10 board filled with 0 (empty). */
export function createBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array<CellType>(BOARD_COLS).fill(0));
}

/** Bounds-safe cell accessor — returns 0 for any out-of-bounds coordinate. */
export function getCell(board: Board, row: number, col: number): CellType {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return 0;
  return board[row]?.[col] ?? 0;
}

/** Returns true if every cell in the given row is non-zero. */
export function isRowFull(board: Board, row: number): boolean {
  const r = board[row];
  if (r === undefined) return false;
  return r.every((cell) => cell !== 0);
}

/** Returns a sorted (ascending) list of row indices that are completely filled. */
export function findFullRows(board: Board): number[] {
  const full: number[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    if (isRowFull(board, r)) full.push(r);
  }
  return full;
}

/**
 * Returns a new board with the specified rows removed and the same number of
 * empty rows prepended at the top.
 */
export function clearRows(board: Board, rows: number[]): Board {
  if (rows.length === 0) return board;
  const rowSet = new Set(rows);
  const kept = board.filter((_, i) => !rowSet.has(i));
  const empty = Array.from({ length: rows.length }, () =>
    Array<CellType>(BOARD_COLS).fill(0),
  );
  return [...empty, ...kept];
}

/**
 * Returns a new board with the piece's cells stamped onto it.
 * Does not mutate the original board.
 */
export function placePiece(board: Board, piece: Piece): Board {
  const newBoard = board.map((row) => [...row] as CellType[]);
  for (const [r, c] of getBlocks(piece)) {
    if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) {
      (newBoard[r] as CellType[])[c] = piece.type;
    }
  }
  return newBoard;
}
