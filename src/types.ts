// ─── Cell ────────────────────────────────────────────────────────────────────

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** A cell on the board. 0 = empty; otherwise the piece type that filled it. */
export type CellType = 0 | PieceType;

// ─── Piece ───────────────────────────────────────────────────────────────────

export interface Piece {
  type: PieceType;
  /** 0 = spawn orientation, 1 = 90° CW, 2 = 180°, 3 = 270° CW */
  rotation: 0 | 1 | 2 | 3;
  /** Column of the top-left corner of the 4×4 bounding box */
  x: number;
  /** Row of the top-left corner of the 4×4 bounding box (0 = top hidden row) */
  y: number;
}

// ─── Board ───────────────────────────────────────────────────────────────────

/** 22 rows × 10 cols. Rows 0–1 are hidden spawn rows; rows 2–21 are visible. */
export type Board = CellType[][];

// ─── Input ───────────────────────────────────────────────────────────────────

export type InputAction =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'SOFT_DROP'
  | 'HARD_DROP'
  | 'ROTATE_CW'
  | 'ROTATE_CCW'
  | 'HOLD'
  | 'PAUSE'
  | 'RESTART'
  | 'START';

// ─── Scoring ─────────────────────────────────────────────────────────────────

export type TSpin = 'none' | 'mini' | 'full';

export interface ScoreEvent {
  linesCleared: number;
  tSpin: TSpin;
  isBackToBack: boolean;
  /** 0-indexed: 0 = first consecutive clear, -1 = no combo active */
  combo: number;
  softDropCells: number;
  hardDropCells: number;
  level: number;
}

// ─── Lock Delay ──────────────────────────────────────────────────────────────

export interface LockDelayState {
  active: boolean;
  /** Milliseconds elapsed since timer started */
  elapsed: number;
  /** Number of resets consumed this placement */
  resetCount: number;
}

// ─── DAS / ARR ───────────────────────────────────────────────────────────────

export interface DASState {
  direction: 'left' | 'right' | null;
  /** ms elapsed toward DAS threshold */
  dasElapsed: number;
  /** ms elapsed toward next ARR tick */
  arrElapsed: number;
  /** True once DAS threshold has been crossed */
  dasTriggered: boolean;
}

// ─── Line Clear Animation ────────────────────────────────────────────────────

export interface LineClearAnimation {
  /** Board row indices being cleared */
  rows: number[];
  /** Milliseconds elapsed (animation done when ≥ LINE_CLEAR_ANIM_MS) */
  elapsed: number;
  /**
   * E4: Snapshot of the board BEFORE the rows were removed, so the renderer
   * can display the filled rows during the flash animation.
   */
  boardBefore: Board;
}

// ─── Game State ──────────────────────────────────────────────────────────────

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  phase: GamePhase;

  board: Board;
  activePiece: Piece | null;
  /** Pre-computed ghost landing row (top-left Y of ghost bounding box) */
  ghostY: number;

  holdPiece: PieceType | null;
  /** True if hold has already been used for the current active piece */
  holdUsed: boolean;

  /** Always maintained at length ≥ NEXT_QUEUE_SIZE */
  nextQueue: PieceType[];

  score: number;
  highScore: number;
  level: number;
  /** Total lines cleared */
  lines: number;
  /** -1 = no combo; 0 = first consecutive clear; 1 = second, etc. */
  combo: number;

  /** True if last scoring action was a Tetris or T-spin (enables back-to-back bonus) */
  isBackToBack: boolean;

  lockDelay: LockDelayState;
  /** Milliseconds elapsed since last gravity drop */
  gravityElapsed: number;

  lineClearAnim: LineClearAnimation | null;

  /** Set true when the last action taken was a rotation (needed for T-spin check) */
  lastActionWasRotation: boolean;
  /** Index of the kick offset that succeeded last rotation (0 = no kick) */
  lastKickIndex: number;

  /** Cells dropped by soft drop this piece (for scoring) */
  softDropCells: number;
}
