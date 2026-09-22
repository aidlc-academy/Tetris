import type { Board, Piece, TSpin } from '../types.js';
import { getCell } from './board.js';

/**
 * Corner positions (relative to T bounding box top-left) for each rotation state.
 *
 * The T's 3×3 effective area sits within the 4×4 bounding box.
 * Corners are the 4 diagonal cells around the centre cell of the T shape.
 *
 * For each rotation, we track which two corners are in the "front" (the direction
 * the T is pointing) vs. the "back" (the flat side).
 *
 * Corner order: [top-left, top-right, bottom-left, bottom-right]
 * relative to the 3×3 sub-box whose top-left is at (bboxRow, bboxCol).
 */

/**
 * Returns [bboxRow, bboxCol] of the top-left of the T's 3×3 effective sub-box
 * within the 4×4 bounding box, for each rotation state.
 */
const T_BOX_OFFSET: readonly [number, number][] = [
  [0, 0], // rotation 0: effective 3×3 starts at offset (0,0) in bbox
  [0, 0], // rotation 1
  [0, 0], // rotation 2
  [0, 0], // rotation 3
];

/**
 * The 4 corner positions relative to the 3×3 sub-box, as [rowOffset, colOffset]:
 * top-left, top-right, bottom-left, bottom-right
 */
const CORNERS: readonly [number, number][] = [
  [0, 0],
  [0, 2],
  [2, 0],
  [2, 2],
];

/**
 * Front corners for each rotation (indices into CORNERS array):
 * - rotation 0: T points up → front corners are top-left (0) and top-right (1)
 * - rotation 1: T points right → front corners are top-right (1) and bottom-right (3)
 * - rotation 2: T points down → front corners are bottom-left (2) and bottom-right (3)
 * - rotation 3: T points left → front corners are top-left (0) and bottom-left (2)
 */
const FRONT_CORNERS: readonly [number, number][] = [
  [0, 1], // rotation 0: top-left, top-right
  [1, 3], // rotation 1: top-right, bottom-right
  [2, 3], // rotation 2: bottom-left, bottom-right
  [0, 2], // rotation 3: top-left, bottom-left
];

function isCornerOccupied(board: Board, row: number, col: number): boolean {
  return row < 0 || row >= 22 || col < 0 || col >= 10 || getCell(board, row, col) !== 0;
}

/**
 * Detects whether the last move constituted a T-spin, using the guideline
 * 3-corner rule.
 *
 * Rules:
 * - Only applies to the T-piece, and only when the last action was a
 *   successful rotation.
 * - Counts the 4 corner cells of the T's 3×3 bounding box (out-of-bounds
 *   counts as occupied).
 * - Fewer than 3 corners occupied → 'none'.
 * - 3 or 4 corners occupied:
 *     - If both FRONT corners are occupied → 'full'.
 *     - Otherwise → 'mini', EXCEPT kickIndex === 4 (the last-resort SRS
 *       kick) always upgrades the result to 'full' (the guideline "T-spin
 *       twist" case).
 */
export function detectTSpin(
  board: Board,
  piece: Piece,
  lastActionWasRotation: boolean,
  kickIndex: number,
): TSpin {
  if (piece.type !== 'T') return 'none';
  if (!lastActionWasRotation) return 'none';

  const [boxDr, boxDc] = T_BOX_OFFSET[piece.rotation] ?? [0, 0];
  const boxRow = piece.y + boxDr;
  const boxCol = piece.x + boxDc;

  let occupiedCount = 0;
  for (const [dr, dc] of CORNERS) {
    if (isCornerOccupied(board, boxRow + dr, boxCol + dc)) occupiedCount++;
  }

  if (occupiedCount < 3) return 'none';

  if (kickIndex === 4) return 'full';

  const frontIndices = FRONT_CORNERS[piece.rotation] ?? [0, 1];
  const [fi0, fi1] = frontIndices;
  const front0 = CORNERS[fi0];
  const front1 = CORNERS[fi1];
  if (front0 === undefined || front1 === undefined) return 'mini';

  const bothFrontOccupied =
    isCornerOccupied(board, boxRow + front0[0], boxCol + front0[1]) &&
    isCornerOccupied(board, boxRow + front1[0], boxCol + front1[1]);

  return bothFrontOccupied ? 'full' : 'mini';
}
