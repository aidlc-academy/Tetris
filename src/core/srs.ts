import type { Board, Piece } from '../types.js';
import { isValidPosition } from './collision.js';

// ─── Kick tables ─────────────────────────────────────────────────────────────
//
// Offsets are [colDelta, rowDelta]:
//   positive col → move right
//   positive row → move down  (canvas/board Y increases downward)
//
// Source: Tetris Guideline (Tetris Wiki). The wiki publishes these offsets in
// a +y-is-up coordinate system; since this board's +row is down, the row
// (second) component of every offset below is the NEGATION of the wiki value.

type KickOffset = readonly [number, number];
type KickList = readonly KickOffset[];

export const KICKS_JLSTZ: Readonly<Record<string, KickList>> = {
  '0→1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, +2],
    [-1, +2],
  ],
  '1→2': [
    [0, 0],
    [+1, 0],
    [+1, +1],
    [0, -2],
    [+1, -2],
  ],
  '2→3': [
    [0, 0],
    [+1, 0],
    [+1, -1],
    [0, +2],
    [+1, +2],
  ],
  '3→0': [
    [0, 0],
    [-1, 0],
    [-1, +1],
    [0, -2],
    [-1, -2],
  ],
  '1→0': [
    [0, 0],
    [+1, 0],
    [+1, +1],
    [0, -2],
    [+1, -2],
  ],
  '2→1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, +2],
    [-1, +2],
  ],
  '3→2': [
    [0, 0],
    [-1, 0],
    [-1, +1],
    [0, -2],
    [-1, -2],
  ],
  '0→3': [
    [0, 0],
    [+1, 0],
    [+1, -1],
    [0, +2],
    [+1, +2],
  ],
} as const;

export const KICKS_I: Readonly<Record<string, KickList>> = {
  '0→1': [
    [0, 0],
    [-2, 0],
    [+1, 0],
    [-2, +1],
    [+1, -2],
  ],
  '1→2': [
    [0, 0],
    [-1, 0],
    [+2, 0],
    [-1, -2],
    [+2, +1],
  ],
  '2→3': [
    [0, 0],
    [+2, 0],
    [-1, 0],
    [+2, -1],
    [-1, +2],
  ],
  '3→0': [
    [0, 0],
    [+1, 0],
    [-2, 0],
    [+1, +2],
    [-2, -1],
  ],
  '1→0': [
    [0, 0],
    [+2, 0],
    [-1, 0],
    [+2, -1],
    [-1, +2],
  ],
  '2→1': [
    [0, 0],
    [+1, 0],
    [-2, 0],
    [+1, +2],
    [-2, -1],
  ],
  '3→2': [
    [0, 0],
    [-2, 0],
    [+1, 0],
    [-2, +1],
    [+1, -2],
  ],
  '0→3': [
    [0, 0],
    [-1, 0],
    [+2, 0],
    [-1, -2],
    [+2, +1],
  ],
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the next rotation state (0-3) in the given direction. */
export function nextRotation(current: 0 | 1 | 2 | 3, dir: 'cw' | 'ccw'): 0 | 1 | 2 | 3 {
  if (dir === 'cw') return ((current + 1) % 4) as 0 | 1 | 2 | 3;
  return ((current + 3) % 4) as 0 | 1 | 2 | 3;
}

// ─── Main SRS function ───────────────────────────────────────────────────────

export interface RotationResult {
  piece: Piece;
  kickIndex: number;
}

/**
 * Attempts to rotate the piece in the given direction using SRS.
 *
 * - O-piece: always succeeds with no kick (its shape is rotation-invariant).
 * - Tries each kick offset in order; returns the first valid position.
 * - Returns null if all offsets fail.
 */
export function tryRotate(
  board: Board,
  piece: Piece,
  dir: 'cw' | 'ccw',
): RotationResult | null {
  const toRot = nextRotation(piece.rotation, dir);

  // O-piece is rotation-invariant; always succeeds
  if (piece.type === 'O') {
    return { piece: { ...piece, rotation: toRot }, kickIndex: 0 };
  }

  const key = `${piece.rotation}→${toRot}`;
  const kicks = piece.type === 'I' ? KICKS_I[key] : KICKS_JLSTZ[key];

  if (kicks === undefined) return null;

  const rotated: Piece = { ...piece, rotation: toRot };

  for (let i = 0; i < kicks.length; i++) {
    const kick = kicks[i];
    if (kick === undefined) continue;
    const [dc, dr] = kick;
    const candidate: Piece = { ...rotated, x: rotated.x + dc, y: rotated.y + dr };
    if (isValidPosition(board, candidate)) {
      return { piece: candidate, kickIndex: i };
    }
  }

  return null;
}
