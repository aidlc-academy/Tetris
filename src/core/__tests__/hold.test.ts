import { describe, expect, it } from 'vitest';
import { type HoldSupplier, applyHold } from '../hold.js';
import { spawnPiece } from '../piece.js';
import type { Piece, PieceType } from '../../types.js';

// ─── Minimal HoldSupplier implementation for tests ───────────────────────────

function makeSupplier(pieces: PieceType[]): HoldSupplier & { remaining: PieceType[] } {
  const remaining = [...pieces];
  const self = {
    remaining,
    pop(): [PieceType, HoldSupplier & { remaining: PieceType[] }] {
      const next = [...this.remaining];
      const type = next.shift();
      if (type === undefined) throw new Error('Supplier empty');
      return [type, makeSupplier(next)];
    },
  };
  return self;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('applyHold', () => {
  it('returns null when holdUsed is true (slot empty)', () => {
    const sup = makeSupplier(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
    const piece: Piece = spawnPiece('T');
    expect(applyHold(piece, null, true, sup)).toBeNull();
  });

  it('returns null when holdUsed is true (slot occupied)', () => {
    const sup = makeSupplier(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
    const piece: Piece = spawnPiece('T');
    expect(applyHold(piece, 'I', true, sup)).toBeNull();
  });

  it('hold when slot empty: active piece moves to slot, next from supplier spawns', () => {
    const sup = makeSupplier(['S', 'Z', 'J']);
    const activePiece: Piece = spawnPiece('T');
    const result = applyHold(activePiece, null, false, sup);
    expect(result).not.toBeNull();
    expect(result!.holdPiece).toBe('T');
    expect(result!.activePiece.type).toBe('S'); // first from supplier
    expect(result!.holdUsed).toBe(true);
    // Supplier should have advanced past 'S'
    const [nextFromResult] = result!.supplier.pop();
    expect(nextFromResult).toBe('Z');
  });

  it('hold when slot occupied: pieces swap, swapped-in at rotation 0', () => {
    const sup = makeSupplier(['S', 'Z', 'J']);
    const activePiece: Piece = spawnPiece('T');
    const result = applyHold(activePiece, 'I', false, sup);
    expect(result).not.toBeNull();
    expect(result!.holdPiece).toBe('T');
    expect(result!.activePiece.type).toBe('I');
    expect(result!.activePiece.rotation).toBe(0);
    expect(result!.holdUsed).toBe(true);
  });

  it('C3: swapping does not consume from the supplier', () => {
    const sup = makeSupplier(['S', 'Z', 'J']);
    const activePiece: Piece = spawnPiece('T');
    const result = applyHold(activePiece, 'I', false, sup);
    expect(result).not.toBeNull();
    // supplier position unchanged — next pop still returns 'S'
    const [nextFromResult] = result!.supplier.pop();
    expect(nextFromResult).toBe('S');
  });

  it('spawned piece has correct spawn position and rotation 0', () => {
    const sup = makeSupplier(['O', 'I', 'T']);
    const activePiece: Piece = spawnPiece('S');
    const result = applyHold(activePiece, 'O', false, sup);
    expect(result).not.toBeNull();
    expect(result!.activePiece.rotation).toBe(0);
    expect(result!.activePiece.type).toBe('O');
    expect(result!.activePiece.x).toBe(3); // E3: O's box spawns at x=3 (cells land at cols 4-5)
  });

  it('slot empty → active piece held, supplier advanced by exactly one', () => {
    const sup = makeSupplier(['I', 'O', 'T', 'S', 'Z']);
    const piece: Piece = spawnPiece('J');
    const result = applyHold(piece, null, false, sup);
    expect(result).not.toBeNull();
    expect(result!.activePiece.type).toBe('I');
    expect(result!.holdPiece).toBe('J');
    // two pops from result supplier should give 'O', 'T'
    const [a, s1] = result!.supplier.pop();
    const [b] = s1.pop();
    expect(a).toBe('O');
    expect(b).toBe('T');
  });
});
