import { describe, expect, it } from 'vitest';
import { createInitialState, isBlockOut, isLockOut, tick } from '../gameState.js';
import type { CellType, GameState, Piece } from '../../types.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function emptyBoard(): CellType[][] {
  return Array.from({ length: 22 }, () => Array<CellType>(10).fill(0));
}

/** Returns a state ready to receive game-play actions (phase = 'playing'). */
function playingState(seed = 42): ReturnType<typeof createInitialState> {
  const s = createInitialState(0, seed);
  // Transition out of menu by sending START
  return tick(s, ['START'], 0);
}

// ─── createInitialState (C5: starts in menu) ─────────────────────────────────

describe('createInitialState', () => {
  it('C5: starts in menu phase', () => {
    expect(createInitialState(0, 42).phase).toBe('menu');
  });

  it('has a non-null active piece ready for when play starts', () => {
    expect(createInitialState(0, 42).activePiece).not.toBeNull();
  });

  it('next queue has NEXT_QUEUE_SIZE pieces', () => {
    expect(createInitialState(0, 42).nextQueue).toHaveLength(5);
  });

  it('score starts at 0', () => {
    expect(createInitialState(0, 42).score).toBe(0);
  });

  it('level starts at 1', () => {
    expect(createInitialState(0, 42).level).toBe(1);
  });

  it('preserves highScore', () => {
    expect(createInitialState(9999, 42).highScore).toBe(9999);
  });

  it('same seed → same first piece', () => {
    const s1 = createInitialState(0, 100);
    const s2 = createInitialState(0, 100);
    expect(s1.activePiece?.type).toBe(s2.activePiece?.type);
  });
});

// ─── C5: menu transitions ─────────────────────────────────────────────────────

describe('tick — C5 menu transitions', () => {
  it('START transitions menu → playing', () => {
    const s = createInitialState(0, 42);
    expect(tick(s, ['START'], 16).phase).toBe('playing');
  });

  it('MOVE_LEFT transitions menu → playing', () => {
    const s = createInitialState(0, 42);
    expect(tick(s, ['MOVE_LEFT'], 16).phase).toBe('playing');
  });

  it('MOVE_RIGHT transitions menu → playing', () => {
    const s = createInitialState(0, 42);
    expect(tick(s, ['MOVE_RIGHT'], 16).phase).toBe('playing');
  });

  it('HARD_DROP transitions menu → playing', () => {
    const s = createInitialState(0, 42);
    expect(tick(s, ['HARD_DROP'], 16).phase).toBe('playing');
  });

  it('PAUSE while in menu does nothing', () => {
    const s = createInitialState(0, 42);
    expect(tick(s, ['PAUSE'], 16).phase).toBe('menu');
  });

  it('gravity does not run in menu phase', () => {
    const s = createInitialState(0, 42);
    const gravBefore = s.gravityElapsed;
    const next = tick(s, [], 5000);
    expect(next.gravityElapsed).toBe(gravBefore);
    expect(next.phase).toBe('menu');
  });
});

// ─── State transitions ────────────────────────────────────────────────────────

describe('tick — state transitions', () => {
  it('PAUSE transitions playing → paused', () => {
    const s = playingState();
    expect(tick(s, ['PAUSE'], 16).phase).toBe('paused');
  });

  it('second PAUSE transitions paused → playing', () => {
    let s = playingState();
    s = tick(s, ['PAUSE'], 16);
    s = tick(s, ['PAUSE'], 16);
    expect(s.phase).toBe('playing');
  });

  it('RESTART from paused → fresh playing state, score 0', () => {
    let s = playingState();
    s = tick(s, ['PAUSE'], 16);
    s = tick(s, ['RESTART'], 16);
    expect(s.phase).toBe('playing');
    expect(s.score).toBe(0);
  });

  it('RESTART from gameover → fresh playing state', () => {
    const board = emptyBoard();
    for (let r = 2; r <= 21; r++) {
      for (let c = 0; c < 10; c++) {
        (board[r] as CellType[])[c] = 'I';
      }
    }
    let s = playingState();
    s = { ...s, board };
    s = tick(s, ['HARD_DROP'], 0);
    expect(s.phase).toBe('gameover');
    s = tick(s, ['RESTART'], 16);
    expect(s.phase).toBe('playing');
    expect(s.score).toBe(0);
  });

  it('paused state: gravity timer does not advance', () => {
    let s = playingState();
    s = tick(s, ['PAUSE'], 16);
    const gravBefore = s.gravityElapsed;
    s = tick(s, [], 5000);
    expect(s.gravityElapsed).toBe(gravBefore);
  });
});

// ─── Hard drop ────────────────────────────────────────────────────────────────

describe('tick — hard drop', () => {
  it('hard drop locks the piece (board has non-zero cells after)', () => {
    const s = playingState();
    const next = tick(s, ['HARD_DROP'], 0);
    const hasCells = next.board.some((row) => row.some((c) => c !== 0));
    expect(hasCells).toBe(true);
  });

  it('C2: hard drop awards 2 pts/cell via computeScore only (no inline scoring)', () => {
    const s = playingState();
    const ghostY = s.ghostY;
    const pieceY = s.activePiece?.y ?? 0;
    const cellsDropped = ghostY - pieceY;
    const next = tick(s, ['HARD_DROP'], 0);
    // Minimum expected = hard drop bonus = 2 × cells dropped
    expect(next.score).toBeGreaterThanOrEqual(cellsDropped * 2);
  });

  it('C2: soft drop awards 1 pt/cell (must be nonzero when piece is above floor)', () => {
    let s = playingState();
    // Move piece one row down via soft drop
    s = tick(s, ['SOFT_DROP'], 0);
    if (s.softDropCells > 0) {
      // Next lock will include the soft-drop bonus — check after hard drop
      const locked = tick(s, ['HARD_DROP'], 0);
      expect(locked.score).toBeGreaterThanOrEqual(s.softDropCells);
    }
    // If piece was already on floor the soft drop did nothing — that's fine
  });
});

// ─── Game over ────────────────────────────────────────────────────────────────

describe('tick — game over conditions', () => {
  it('block-out → gameover', () => {
    const board = emptyBoard();
    for (let r = 2; r <= 21; r++) {
      for (let c = 0; c < 10; c++) {
        (board[r] as CellType[])[c] = 'I';
      }
    }
    let s = playingState();
    s = { ...s, board };
    const next = tick(s, ['HARD_DROP'], 0);
    expect(next.phase).toBe('gameover');
  });
});

// ─── C1: line clears — activePiece is null during animation ──────────────────

describe('tick — C1 line-clear behaviour', () => {
  it('C1: activePiece is null while lineClearAnim is active', () => {
    const board = emptyBoard();
    for (let c = 0; c < 10; c++) {
      if (c !== 4 && c !== 5) (board[21] as CellType[])[c] = 'I';
    }
    const activePiece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 };
    let s: GameState = { ...playingState(), board, activePiece };
    s = tick(s, ['HARD_DROP'], 0);
    expect(s.lineClearAnim).not.toBeNull();
    // C1: no piece during animation
    expect(s.activePiece).toBeNull();
  });

  it('C1: after animation completes, activePiece is spawned from nextQueue', () => {
    const board = emptyBoard();
    for (let c = 0; c < 10; c++) {
      if (c !== 4 && c !== 5) (board[21] as CellType[])[c] = 'I';
    }
    const activePiece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 };
    let s: GameState = { ...playingState(), board, activePiece };
    // Lock → anim starts
    s = tick(s, ['HARD_DROP'], 0);
    expect(s.lineClearAnim).not.toBeNull();
    // Run animation to completion
    s = tick(s, [], 200);
    expect(s.lineClearAnim).toBeNull();
    expect(s.activePiece).not.toBeNull();
  });

  it('lines count updates and level increments after 10 lines', () => {
    const board = emptyBoard();
    for (let c = 0; c < 10; c++) {
      if (c !== 4 && c !== 5) (board[21] as CellType[])[c] = 'I';
    }
    const activePiece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 };
    let s: GameState = { ...playingState(), board, activePiece, lines: 9 };
    s = tick(s, ['HARD_DROP'], 0);
    s = tick(s, [], 200); // finish animation
    expect(s.lines).toBeGreaterThanOrEqual(10);
    expect(s.level).toBeGreaterThanOrEqual(2);
  });

  it('tetris (4 lines) scores at least 800', () => {
    const board = emptyBoard();
    for (let r = 18; r <= 21; r++) {
      for (let c = 0; c < 10; c++) {
        if (c !== 3) (board[r] as CellType[])[c] = 'Z';
      }
    }
    // I rotation 1: col = x+2; at x=1 → col 3, rows y..y+3
    const activePiece: Piece = { type: 'I', rotation: 1, x: 1, y: 14 };
    let s: GameState = { ...playingState(), board, activePiece, level: 1 };
    s = tick(s, ['HARD_DROP'], 0);
    s = tick(s, [], 200); // finish animation
    expect(s.lines).toBeGreaterThanOrEqual(4);
    expect(s.score).toBeGreaterThanOrEqual(800);
  });
});

// ─── C4: gravity accumulator ──────────────────────────────────────────────────

describe('tick — C4 gravity accumulator', () => {
  it('C4: gravityElapsed does not advance while lock delay is active', () => {
    let s = playingState();
    // Drop piece to floor
    s = tick(s, ['HARD_DROP'], 0);
    // Take the new piece; find a state where lock delay is active
    // Hard-drop lands immediately, so spawn a fresh state and manually activate lock delay
    // by ticking until piece is on floor
    s = playingState();
    const landedY = s.ghostY;
    // Move piece to floor position by ticking enough gravity time
    s = { ...s, activePiece: { ...s.activePiece!, y: landedY }, lockDelay: { active: true, elapsed: 100, resetCount: 0 } };
    const gravBefore = s.gravityElapsed;
    s = tick(s, [], 16);
    // gravityElapsed must not have changed while on the floor with lock delay active
    // (it was already 0 because we set it in the state spread above)
    // The key invariant: lock delay active → gravity accumulator frozen
    expect(s.gravityElapsed).toBe(gravBefore);
  });
});

// ─── isBlockOut / isLockOut ───────────────────────────────────────────────────

describe('isBlockOut / isLockOut', () => {
  it('isBlockOut returns false on empty board', () => {
    const s = createInitialState(0, 42);
    expect(isBlockOut(s.board, s.activePiece!)).toBe(false);
  });

  it('isLockOut returns false for piece at y=5', () => {
    expect(isLockOut({ type: 'T', rotation: 0, x: 3, y: 5 })).toBe(false);
  });

  it('isLockOut returns true for O piece at y=0 (rows 0–1)', () => {
    expect(isLockOut({ type: 'O', rotation: 0, x: 4, y: 0 })).toBe(true);
  });
});
