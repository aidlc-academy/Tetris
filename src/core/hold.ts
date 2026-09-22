import type { Piece, PieceType } from '../types.js';
import { spawnPiece } from './piece.js';

/**
 * C3: applyHold now accepts and returns a generic "next-piece supplier" so that
 * the caller (gameState.ts) can pass its full carrier-based queue, ensuring the
 * preview queue is updated correctly when the hold slot is empty.
 *
 * - slot empty  → pop next piece from supplier, store active type in slot
 * - slot filled → swap types; supplier unchanged (no piece consumed)
 *
 * Returns null when holdUsed is true (hold locked for this piece).
 */

export interface HoldSupplier {
  /** Pop the next piece type and return an updated supplier. */
  pop: () => [PieceType, HoldSupplier];
}

export interface HoldResult {
  activePiece: Piece;
  holdPiece: PieceType;
  holdUsed: boolean;
  /** Updated supplier (advanced by one piece when slot was empty, unchanged when swap). */
  supplier: HoldSupplier;
}

export function applyHold(
  activePiece: Piece,
  holdPiece: PieceType | null,
  holdUsed: boolean,
  supplier: HoldSupplier,
): HoldResult | null {
  if (holdUsed) return null;

  if (holdPiece === null) {
    // C3: pop from the full carrier queue (not bare bag), so preview stays correct
    const [nextType, nextSupplier] = supplier.pop();
    return {
      activePiece: spawnPiece(nextType),
      holdPiece: activePiece.type,
      holdUsed: true,
      supplier: nextSupplier,
    };
  }

  // Slot occupied: swap — no piece consumed from queue
  return {
    activePiece: spawnPiece(holdPiece),
    holdPiece: activePiece.type,
    holdUsed: true,
    supplier,
  };
}
