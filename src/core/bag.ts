import { PIECE_TYPES } from '../constants.js';
import type { PieceType } from '../types.js';

/**
 * Mulberry32 — fast, seedable 32-bit PRNG, decomposed into a pure step
 * function: given a seed, returns the generated value in [0, 1) together
 * with the next seed to use. No shared/mutable state is captured anywhere.
 */
export function mulberry32Step(seed: number): { value: number; nextSeed: number } {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextSeed: s };
}

/** Opaque state for the 7-bag randomizer. E2: the RNG state is a plain number. */
export interface BagState {
  readonly seed: number;
  readonly remaining: readonly PieceType[];
}

/** Fisher-Yates shuffle, purely: returns the shuffled array and the advanced seed. */
function shuffle(arr: readonly PieceType[], seed: number): { shuffled: PieceType[]; seed: number } {
  const result = [...arr];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    const { value, nextSeed } = mulberry32Step(currentSeed);
    currentSeed = nextSeed;
    const j = Math.floor(value * (i + 1));
    const tmp = result[i] as PieceType;
    (result[i] as PieceType) = result[j] as PieceType;
    (result[j] as PieceType) = tmp;
  }
  return { shuffled: result, seed: currentSeed };
}

/** Creates a new bag state with a freshly shuffled first bag. */
export function createBag(seed: number): BagState {
  const { shuffled, seed: nextSeed } = shuffle(PIECE_TYPES, seed);
  return { seed: nextSeed, remaining: shuffled };
}

/**
 * Returns the next piece type and an updated BagState (pure — does not
 * mutate the input state, and does not close over any shared RNG object).
 * When the current bag is exhausted a new shuffled bag is generated.
 */
export function nextPiece(bag: BagState): [PieceType, BagState] {
  let remaining: PieceType[] = [...bag.remaining];
  let seed = bag.seed;

  if (remaining.length === 0) {
    const result = shuffle(PIECE_TYPES, seed);
    remaining = result.shuffled;
    seed = result.seed;
  }

  const piece = remaining.shift() as PieceType;
  return [piece, { seed, remaining }];
}

/**
 * Returns the next `count` piece types without advancing the bag.
 * Used to populate/refresh the preview queue.
 */
export function peekQueue(bag: BagState, count: number): PieceType[] {
  const result: PieceType[] = [];
  let current: BagState = bag;

  for (let i = 0; i < count; i++) {
    const [piece, next] = nextPiece(current);
    result.push(piece);
    current = next;
  }

  return result;
}
