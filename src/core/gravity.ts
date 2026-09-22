import { gravityIntervalMs } from '../constants.js';
import type { Board, Piece } from '../types.js';
import { isValidPosition } from './collision.js';

/** Re-export for consumers that only need the gravity interval. */
export { gravityIntervalMs };

/**
 * Returns the lowest Y position the piece can occupy by dropping straight
 * down — i.e. the landing position for a hard drop or ghost piece.
 */
export function computeGhostY(board: Board, piece: Piece): number {
  let y = piece.y;
  while (isValidPosition(board, { ...piece, y: y + 1 })) {
    y++;
  }
  return y;
}
