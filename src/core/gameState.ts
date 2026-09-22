import { LINE_CLEAR_ANIM_MS, NEXT_QUEUE_SIZE, gravityIntervalMs } from '../constants.js';
import type { Board, GameState, InputAction, Piece, PieceType } from '../types.js';
import { type BagState, createBag, nextPiece } from './bag.js';
import { clearRows, createBoard, findFullRows, placePiece } from './board.js';
import { canMove, isOnFloor, isValidPosition } from './collision.js';
import { computeGhostY } from './gravity.js';
import { type HoldSupplier, applyHold } from './hold.js';
import { createLockDelay, resetLockDelay, shouldLock, tickLockDelay } from './lockDelay.js';
import { getBlocks, spawnPiece } from './piece.js';
import { computeLevelAndLines, computeScore } from './scoring.js';
import { tryRotate } from './srs.js';
import { detectTSpin } from './tspin.js';

// ─── Internal extended state ──────────────────────────────────────────────────

interface ExtGameState extends GameState {
  _bag: BagState;
  _queueFull: PieceType[];
}

function ext(state: GameState): ExtGameState {
  return state as ExtGameState;
}

// ─── Carrier / queue management ───────────────────────────────────────────────

interface Carrier {
  bag: BagState;
  queue: PieceType[];
}

function refillQueue(c: Carrier): Carrier {
  let { bag, queue } = c;
  while (queue.length < NEXT_QUEUE_SIZE + 1) {
    const [piece, newBag] = nextPiece(bag);
    bag = newBag;
    queue = [...queue, piece];
  }
  return { bag, queue };
}

function popQueue(c: Carrier): [PieceType, Carrier] {
  const filled = refillQueue(c);
  const [first, ...rest] = filled.queue;
  if (first === undefined) throw new Error('Queue empty after refill');
  return [first, refillQueue({ bag: filled.bag, queue: rest })];
}

function saveCarrier(state: GameState, carrier: Carrier): GameState {
  const s = ext(state);
  s._bag = carrier.bag;
  s._queueFull = carrier.queue;
  return state;
}

function getCarrier(state: GameState): Carrier {
  const s = ext(state);
  const bag = s._bag ?? createBag(0);
  const queue = s._queueFull ?? [];
  return refillQueue({ bag, queue });
}

/** Wrap a Carrier as a HoldSupplier so applyHold can use the queue. */
function carrierSupplier(carrier: Carrier): HoldSupplier & { carrier: Carrier } {
  return {
    carrier,
    pop(): [PieceType, HoldSupplier & { carrier: Carrier }] {
      const [type, next] = popQueue(this.carrier);
      return [type, carrierSupplier(next)];
    },
  };
}

// ─── Top-out helpers ──────────────────────────────────────────────────────────

export function isBlockOut(board: Board, piece: Piece): boolean {
  return !isValidPosition(board, piece);
}

export function isLockOut(piece: Piece): boolean {
  return getBlocks(piece).every(([r]) => r < 2);
}

// ─── createInitialState ───────────────────────────────────────────────────────

/**
 * C5: game starts in 'menu' phase.
 * highScore is preserved; seed is used for the RNG.
 */
export function createInitialState(highScore: number, seed: number): GameState {
  let carrier: Carrier = refillQueue({ bag: createBag(seed), queue: [] });
  const [firstType, carrier2] = popQueue(carrier);
  carrier = carrier2;

  const board = createBoard();
  const activePiece = spawnPiece(firstType);

  const base: GameState = {
    // C5: start in menu, not playing
    phase: 'menu',
    board,
    activePiece,
    ghostY: computeGhostY(board, activePiece),
    holdPiece: null,
    holdUsed: false,
    nextQueue: carrier.queue.slice(0, NEXT_QUEUE_SIZE),
    score: 0,
    highScore,
    level: 1,
    lines: 0,
    combo: -1,
    isBackToBack: false,
    lockDelay: createLockDelay(),
    gravityElapsed: 0,
    lineClearAnim: null,
    lastActionWasRotation: false,
    lastKickIndex: 0,
    softDropCells: 0,
  };
  return saveCarrier(base, carrier);
}

/** Start a brand-new game round (transitions from menu/gameover into playing). */
function createPlayingState(highScore: number, seed: number): GameState {
  const s = createInitialState(highScore, seed);
  return { ...s, phase: 'playing' };
}

// ─── spawnNext ────────────────────────────────────────────────────────────────

function spawnNext(carrier: Carrier): { piece: Piece; carrier: Carrier } {
  const [type, newCarrier] = popQueue(carrier);
  return { piece: spawnPiece(type), carrier: newCarrier };
}

// ─── tick ─────────────────────────────────────────────────────────────────────

export function tick(stateIn: GameState, actions: InputAction[], deltaMs: number): GameState {
  let carrier = getCarrier(stateIn);
  let state = { ...stateIn };

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (state.phase === 'menu') {
    for (const action of actions) {
      // C5: START or any movement key begins play (REQ-15.2)
      if (
        action === 'START' ||
        action === 'MOVE_LEFT' ||
        action === 'MOVE_RIGHT' ||
        action === 'SOFT_DROP' ||
        action === 'HARD_DROP' ||
        action === 'ROTATE_CW' ||
        action === 'ROTATE_CCW'
      ) {
        return createPlayingState(state.highScore, Date.now());
      }
    }
    return saveCarrier(state, carrier);
  }

  // ── GameOver ──────────────────────────────────────────────────────────────
  if (state.phase === 'gameover') {
    for (const action of actions) {
      if (action === 'START' || action === 'RESTART') {
        return createPlayingState(state.highScore, Date.now());
      }
    }
    return saveCarrier(state, carrier);
  }

  // ── Paused ────────────────────────────────────────────────────────────────
  if (state.phase === 'paused') {
    for (const action of actions) {
      if (action === 'PAUSE') return saveCarrier({ ...state, phase: 'playing' }, carrier);
      if (action === 'RESTART') return createPlayingState(state.highScore, Date.now());
    }
    return saveCarrier(state, carrier);
  }

  // ── Line-clear animation ──────────────────────────────────────────────────
  if (state.lineClearAnim !== null) {
    for (const action of actions) {
      if (action === 'PAUSE') return saveCarrier({ ...state, phase: 'paused' }, carrier);
      if (action === 'RESTART') return createPlayingState(state.highScore, Date.now());
    }
    const anim = state.lineClearAnim;
    const elapsed = anim.elapsed + deltaMs;
    if (elapsed < LINE_CLEAR_ANIM_MS) {
      return saveCarrier({ ...state, lineClearAnim: { ...anim, elapsed } }, carrier);
    }

    // C1: Animation done — spawn next piece NOW (board was already cleared at lock time)
    const { piece: nextPieceObj, carrier: newCarrier } = spawnNext(carrier);
    carrier = newCarrier;

    if (isBlockOut(state.board, nextPieceObj)) {
      const newHighScore = Math.max(state.score, state.highScore);
      return saveCarrier(
        {
          ...state,
          phase: 'gameover',
          activePiece: nextPieceObj,
          highScore: newHighScore,
          lineClearAnim: null,
        },
        carrier,
      );
    }

    return saveCarrier(
      {
        ...state,
        activePiece: nextPieceObj,
        ghostY: computeGhostY(state.board, nextPieceObj),
        nextQueue: newCarrier.queue.slice(0, NEXT_QUEUE_SIZE),
        lockDelay: createLockDelay(),
        gravityElapsed: 0,
        holdUsed: false,
        lineClearAnim: null,
        lastActionWasRotation: false,
        lastKickIndex: 0,
        softDropCells: 0,
      },
      carrier,
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  let piece = state.activePiece;
  if (piece === null) return saveCarrier(state, carrier);

  let lockDelay = state.lockDelay;
  let lastActionWasRotation = state.lastActionWasRotation;
  let lastKickIndex = state.lastKickIndex;
  // C2: soft/hard drop cells accumulate here; NOT added to score inline
  let softDropCells = state.softDropCells;
  let hardDropCells = 0;
  let score = state.score;
  let holdPiece = state.holdPiece;
  let holdUsed = state.holdUsed;
  let forceImmediateLock = false;

  // Process input actions
  for (const action of actions) {
    switch (action) {
      case 'PAUSE':
        return saveCarrier(
          {
            ...state,
            phase: 'paused',
            activePiece: piece,
            holdPiece,
            holdUsed,
            score,
            lockDelay,
            lastActionWasRotation,
            lastKickIndex,
            softDropCells,
          },
          carrier,
        );

      case 'RESTART':
        return createPlayingState(state.highScore, Date.now());

      case 'MOVE_LEFT':
        if (canMove(state.board, piece, -1, 0)) {
          piece = { ...piece, x: piece.x - 1 };
          lastActionWasRotation = false;
          if (lockDelay.active) lockDelay = resetLockDelay(lockDelay);
        }
        break;

      case 'MOVE_RIGHT':
        if (canMove(state.board, piece, 1, 0)) {
          piece = { ...piece, x: piece.x + 1 };
          lastActionWasRotation = false;
          if (lockDelay.active) lockDelay = resetLockDelay(lockDelay);
        }
        break;

      case 'SOFT_DROP':
        // C2: accumulate cells; no inline score increment
        if (canMove(state.board, piece, 0, 1)) {
          piece = { ...piece, y: piece.y + 1 };
          softDropCells++;
          lastActionWasRotation = false;
          if (lockDelay.active) lockDelay = resetLockDelay(lockDelay);
        }
        break;

      case 'HARD_DROP': {
        // C2: accumulate cells; no inline score increment
        const landY = computeGhostY(state.board, piece);
        hardDropCells = landY - piece.y;
        piece = { ...piece, y: landY };
        lastActionWasRotation = false;
        forceImmediateLock = true;
        break;
      }

      case 'ROTATE_CW': {
        const r = tryRotate(state.board, piece, 'cw');
        if (r !== null) {
          piece = r.piece;
          lastActionWasRotation = true;
          lastKickIndex = r.kickIndex;
          if (lockDelay.active) lockDelay = resetLockDelay(lockDelay);
        }
        break;
      }

      case 'ROTATE_CCW': {
        const r = tryRotate(state.board, piece, 'ccw');
        if (r !== null) {
          piece = r.piece;
          lastActionWasRotation = true;
          lastKickIndex = r.kickIndex;
          if (lockDelay.active) lockDelay = resetLockDelay(lockDelay);
        }
        break;
      }

      case 'HOLD': {
        // C3: use carrierSupplier so the full queue is used and preview stays correct
        const sup = carrierSupplier(carrier);
        const hr = applyHold(piece, holdPiece, holdUsed, sup);
        if (hr !== null) {
          // C3: block-out check on swapped-in piece
          if (isBlockOut(state.board, hr.activePiece)) {
            const newHighScore = Math.max(score, state.highScore);
            return saveCarrier(
              {
                ...state,
                phase: 'gameover',
                activePiece: hr.activePiece,
                holdPiece: hr.holdPiece,
                holdUsed: hr.holdUsed,
                score,
                highScore: newHighScore,
              },
              carrier,
            );
          }
          const updatedSup = hr.supplier as HoldSupplier & { carrier: Carrier };
          carrier = updatedSup.carrier;
          piece = hr.activePiece;
          holdPiece = hr.holdPiece;
          holdUsed = hr.holdUsed;
          lockDelay = createLockDelay();
          lastActionWasRotation = false;
          softDropCells = 0;
        }
        break;
      }
    }
  }

  // ── Gravity ────────────────────────────────────────────────────────────────
  // C4: do not accumulate gravityElapsed while lock delay is active; reset
  // gravityElapsed to 0 as soon as the piece first touches the floor.
  let gravityElapsed = state.gravityElapsed;
  const onFloorNow = isOnFloor(state.board, piece);

  if (!onFloorNow && !lockDelay.active) {
    // Piece is airborne — advance gravity normally
    gravityElapsed += deltaMs;
    const gravityInterval = gravityIntervalMs(state.level);
    while (gravityElapsed >= gravityInterval) {
      gravityElapsed -= gravityInterval;
      if (canMove(state.board, piece, 0, 1)) {
        piece = { ...piece, y: piece.y + 1 };
        lastActionWasRotation = false;
      }
    }
  } else if (onFloorNow && !lockDelay.active) {
    // C4: piece just landed — reset gravity accumulator to avoid burst drop after leaving ledge
    gravityElapsed = 0;
  }
  // While lock delay is active, do not touch gravityElapsed at all.

  // ── Lock delay tick ────────────────────────────────────────────────────────
  const onFloor = isOnFloor(state.board, piece);
  lockDelay = tickLockDelay(lockDelay, deltaMs, onFloor);

  const mustLock = forceImmediateLock || shouldLock(lockDelay);

  if (mustLock) {
    return lockPiece({
      state,
      carrier,
      piece,
      score,
      holdPiece,
      holdUsed,
      softDropCells,
      hardDropCells,
      lastActionWasRotation,
      lastKickIndex,
      gravityElapsed,
    });
  }

  // ── Update ghost and return ───────────────────────────────────────────────
  const ghostY = computeGhostY(state.board, piece);
  return saveCarrier(
    {
      ...state,
      activePiece: piece,
      ghostY,
      lockDelay,
      gravityElapsed,
      lastActionWasRotation,
      lastKickIndex,
      softDropCells,
      score,
      holdPiece,
      holdUsed,
      nextQueue: carrier.queue.slice(0, NEXT_QUEUE_SIZE),
    },
    carrier,
  );
}

// ─── lockPiece ────────────────────────────────────────────────────────────────

interface LockArgs {
  state: GameState;
  carrier: Carrier;
  piece: Piece;
  score: number;
  holdPiece: PieceType | null;
  holdUsed: boolean;
  softDropCells: number;
  hardDropCells: number;
  lastActionWasRotation: boolean;
  lastKickIndex: number;
  gravityElapsed: number;
}

function lockPiece(args: LockArgs): GameState {
  const {
    state,
    piece,
    score,
    holdPiece,
    holdUsed,
    softDropCells,
    hardDropCells,
    lastActionWasRotation,
    lastKickIndex,
  } = args;
  let { carrier } = args;

  const newBoard = placePiece(state.board, piece);

  // Lock-out check
  if (isLockOut(piece)) {
    const newHighScore = Math.max(score, state.highScore);
    return saveCarrier(
      {
        ...state,
        phase: 'gameover',
        board: newBoard,
        activePiece: piece,
        score,
        highScore: newHighScore,
        holdPiece,
        holdUsed,
      },
      carrier,
    );
  }

  const fullRows = findFullRows(newBoard);

  // D3: detectTSpin on EVERY lock, not just when lines clear
  const tSpin = detectTSpin(newBoard, piece, lastActionWasRotation, lastKickIndex);

  if (fullRows.length > 0) {
    // Lines cleared — score includes drop bonuses + line-clear score
    const isScoringB2B = fullRows.length === 4 || tSpin === 'full' || tSpin === 'mini';
    const newCombo = state.combo + 1;

    const lineScore = computeScore({
      linesCleared: fullRows.length,
      tSpin,
      isBackToBack: state.isBackToBack,
      combo: newCombo,
      // C2: drop bonuses go through computeScore here only
      softDropCells,
      hardDropCells,
      level: state.level,
    });
    const totalScore = score + lineScore;
    const { level: newLevel, lines: newLines } = computeLevelAndLines(
      state.lines,
      fullRows.length,
    );
    const clearedBoard = clearRows(newBoard, fullRows);

    // C1: Do NOT spawn next piece here. Set activePiece: null, store anim.
    // The next piece is spawned when the animation completes (anim branch in tick).
    // Block-out will be checked then.
    return saveCarrier(
      {
        ...state,
        board: clearedBoard,
        // C1: no active piece while animation plays
        activePiece: null,
        ghostY: 0,
        nextQueue: carrier.queue.slice(0, NEXT_QUEUE_SIZE),
        score: totalScore,
        highScore: Math.max(totalScore, state.highScore),
        level: newLevel,
        lines: newLines,
        combo: newCombo,
        isBackToBack: isScoringB2B,
        lineClearAnim: {
          rows: fullRows,
          elapsed: 0,
          // E4: snapshot board BEFORE clearing for the renderer to flash
          boardBefore: newBoard,
        },
        lockDelay: createLockDelay(),
        gravityElapsed: 0,
        holdPiece,
        holdUsed: false,
        softDropCells: 0,
        lastActionWasRotation: false,
        lastKickIndex: 0,
      },
      carrier,
    );
  }

  // No line clear
  // D3: T-spin with 0 lines: score it (400/100/0 × level) but do NOT update b2b
  const noLineScore = computeScore({
    linesCleared: 0,
    tSpin,
    isBackToBack: false, // D3: 0-line clears never grant or consume b2b
    combo: -1,           // D3: 0-line clears reset combo
    softDropCells,
    hardDropCells,
    level: state.level,
  });
  const totalScore = score + noLineScore;

  // C1: no line clear → spawn next piece immediately (no anim)
  const { piece: nextPieceObj, carrier: newCarrier } = spawnNext(carrier);
  carrier = newCarrier;

  if (isBlockOut(newBoard, nextPieceObj)) {
    const newHighScore = Math.max(totalScore, state.highScore);
    return saveCarrier(
      {
        ...state,
        phase: 'gameover',
        board: newBoard,
        activePiece: nextPieceObj,
        score: totalScore,
        highScore: newHighScore,
        holdPiece,
        holdUsed,
      },
      carrier,
    );
  }

  return saveCarrier(
    {
      ...state,
      board: newBoard,
      activePiece: nextPieceObj,
      ghostY: computeGhostY(newBoard, nextPieceObj),
      nextQueue: carrier.queue.slice(0, NEXT_QUEUE_SIZE),
      score: totalScore,
      highScore: Math.max(totalScore, state.highScore),
      combo: -1,
      // D3: b2b flag unchanged when no lines cleared
      lockDelay: createLockDelay(),
      gravityElapsed: 0,
      holdPiece,
      holdUsed: false,
      softDropCells: 0,
      lastActionWasRotation: false,
      lastKickIndex: 0,
    },
    carrier,
  );
}
