import { describe, expect, it } from 'vitest';
import { PIECE_TYPES } from '../../constants.js';
import { createBag, nextPiece, peekQueue } from '../bag.js';
import type { PieceType } from '../../types.js';

describe('createBag', () => {
  it('same seed produces identical first 7 pieces', () => {
    const bag1 = createBag(42);
    const bag2 = createBag(42);
    const seq1: PieceType[] = [];
    const seq2: PieceType[] = [];
    let b1 = bag1;
    let b2 = bag2;
    for (let i = 0; i < 7; i++) {
      const [p1, next1] = nextPiece(b1);
      const [p2, next2] = nextPiece(b2);
      seq1.push(p1);
      seq2.push(p2);
      b1 = next1;
      b2 = next2;
    }
    expect(seq1).toEqual(seq2);
  });

  it('two different seeds produce different orderings (with very high probability)', () => {
    const seq1 = peekQueue(createBag(1), 7);
    const seq2 = peekQueue(createBag(999999), 7);
    // It would be astronomically unlikely for two different seeds to produce the exact same order
    expect(seq1).not.toEqual(seq2);
  });
});

describe('nextPiece', () => {
  it('7 consecutive calls return all 7 piece types exactly once', () => {
    let bag = createBag(123);
    const seen: PieceType[] = [];
    for (let i = 0; i < 7; i++) {
      const [piece, next] = nextPiece(bag);
      seen.push(piece);
      bag = next;
    }
    const sorted = [...seen].sort();
    expect(sorted).toEqual([...PIECE_TYPES].sort());
  });

  it('8th piece starts a new bag (pieces may repeat across bags — just must be a valid piece type)', () => {
    let bag = createBag(456);
    for (let i = 0; i < 7; i++) {
      const [, next] = nextPiece(bag);
      bag = next;
    }
    // 8th piece must be valid
    const [piece] = nextPiece(bag);
    expect(PIECE_TYPES).toContain(piece);
  });

  it('14 consecutive calls return each of 7 types exactly twice', () => {
    let bag = createBag(789);
    const counts = new Map<PieceType, number>();
    for (const t of PIECE_TYPES) counts.set(t, 0);
    for (let i = 0; i < 14; i++) {
      const [piece, next] = nextPiece(bag);
      counts.set(piece, (counts.get(piece) ?? 0) + 1);
      bag = next;
    }
    for (const [, count] of counts) {
      expect(count).toBe(2);
    }
  });

  it('does not mutate the input bag', () => {
    const bag = createBag(42);
    const originalRemaining = [...bag.remaining];
    nextPiece(bag);
    expect(bag.remaining).toEqual(originalRemaining);
  });
});

describe('peekQueue', () => {
  it('returns the correct number of pieces', () => {
    const bag = createBag(42);
    expect(peekQueue(bag, 5)).toHaveLength(5);
  });

  it('does not advance the bag — nextPiece after peek returns the same first piece', () => {
    const bag = createBag(42);
    const peeked = peekQueue(bag, 5);
    const [first] = nextPiece(bag);
    expect(first).toBe(peeked[0]);
  });

  it('peekQueue(bag, 14) has each type exactly twice', () => {
    const bag = createBag(100);
    const pieces = peekQueue(bag, 14);
    const counts = new Map<PieceType, number>();
    for (const t of PIECE_TYPES) counts.set(t, 0);
    for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
    for (const [, count] of counts) {
      expect(count).toBe(2);
    }
  });

  it('E2: peeking 14 pieces then drawing 14 gives an identical sequence (pure, no shared mutable state)', () => {
    const bag = createBag(2024);
    const peeked = peekQueue(bag, 14);

    let current = bag;
    const drawn: PieceType[] = [];
    for (let i = 0; i < 14; i++) {
      const [piece, next] = nextPiece(current);
      drawn.push(piece);
      current = next;
    }

    expect(drawn).toEqual(peeked);
  });
});
