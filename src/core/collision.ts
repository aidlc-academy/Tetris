import { BOARD_COLS, BOARD_ROWS } from '../constants.js';
import type { Board, Piece } from '../types.js';
import { getBlocks } from './piece.js';

/**
 * Returns true if the piece is in a valid position on the board:
 * - all 4 cells are within the board bounds (row 0–21, col 0–9)
 * - none of the cells overlap a locked (non-zero) board cell
 */
export function isValidPosition(board: Board, piece: Piece): boolean {
  for (const [r, c] of getBlocks(piece)) {
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return false;
    if ((board[r]?.[c] ?? 0) !== 0) return false;
  }
  return true;
}

/**
 * Returns true if moving the piece down by 1 row would result in an invalid
 * position (i.e. the piece is resting on the floor or on a locked cell).
 */
export function isOnFloor(board: Board, piece: Piece): boolean {
  return !isValidPosition(board, { ...piece, y: piece.y + 1 });
}

/**
 * Returns true if moving the piece by (dx cols, dy rows) would be valid.
 */
export function canMove(board: Board, piece: Piece, dx: number, dy: number): boolean {
  return isValidPosition(board, { ...piece, x: piece.x + dx, y: piece.y + dy });
}
