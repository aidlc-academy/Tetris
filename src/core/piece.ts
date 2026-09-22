import type { Piece, PieceType } from '../types.js';

/**
 * Piece shapes defined as [row, col] offsets from the top-left of a 4×4
 * bounding box, for each of the 4 rotation states.
 *
 * Convention: rotation 0 = spawn, 1 = 90° CW, 2 = 180°, 3 = 270° CW.
 * All shapes match the Tetris Guideline exactly.
 */
export const PIECE_SHAPES: Readonly<Record<PieceType, readonly (readonly [number, number])[][]>> = {
  I: [
    // rotation 0  (horizontal bar on row 1 of 4×4 box)
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    // rotation 1  (vertical bar on col 2 of 4×4 box)
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    // rotation 2  (horizontal bar on row 2)
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    // rotation 3  (vertical bar on col 1)
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  ],
  O: [
    // all four rotations are identical
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
  ],
  T: [
    // rotation 0
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    // rotation 1
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    // rotation 2
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    // rotation 3
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  S: [
    // rotation 0
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    // rotation 1
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    // rotation 2
    [
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ],
    // rotation 3
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  Z: [
    // rotation 0
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    // rotation 1
    [
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    // rotation 2
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    // rotation 3
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  ],
  J: [
    // rotation 0
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    // rotation 1
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
    // rotation 2
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    // rotation 3
    [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
  ],
  L: [
    // rotation 0
    [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    // rotation 1
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    // rotation 2
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ],
    // rotation 3
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
} as const;

/** Guideline colors per piece type (hex strings). */
export const PIECE_COLORS: Readonly<Record<PieceType, string>> = {
  I: '#00F0F0',
  O: '#F0F000',
  T: '#A000F0',
  S: '#00F000',
  Z: '#F00000',
  J: '#0000F0',
  L: '#F0A000',
} as const;

/**
 * Returns the 4 absolute [row, col] positions of the piece's cells on the board,
 * by adding the bounding-box offsets to the piece's (x, y) position.
 */
export function getBlocks(piece: Piece): [number, number][] {
  const shapes = PIECE_SHAPES[piece.type];
  const rotShape = shapes[piece.rotation];
  if (rotShape === undefined) return [];
  return rotShape.map(([dr, dc]) => [piece.y + dr, piece.x + dc]);
}

/**
 * Returns a new piece at the standard guideline spawn position, rotation 0.
 *
 * E3: the bounding-box x is 3 for every piece, including O. The O shape's
 * cells sit at relative columns 1–2 of its box (not 0–1), so x=3 places its
 * actual cells at board columns 4–5 — centered on the 10-wide board. Using
 * x=4 (as if O's cells were at relative columns 0–1) shifted it one column
 * too far right.
 */
export function spawnPiece(type: PieceType): Piece {
  return { type, rotation: 0, x: 3, y: 0 };
}
