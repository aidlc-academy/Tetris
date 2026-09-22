import { BOARD_COLS, LINE_CLEAR_ANIM_MS, NEXT_QUEUE_SIZE, VISIBLE_ROWS } from '../constants.js';
import { PIECE_COLORS, PIECE_SHAPES } from '../core/piece.js';
import type { GameState, Piece, PieceType } from '../types.js';

// ─── Layout constants (logical pixels) ───────────────────────────────────────

const PANEL_COLS = 5;   // width of hold / preview panel in cells
const BORDER = 1;       // 1-cell gap / border

// ─── Colours ─────────────────────────────────────────────────────────────────

const BG_COLOR = '#0a0a0a';
const GRID_COLOR = '#1a1a2e';
const BORDER_COLOR = '#2a2a4e';
const GHOST_ALPHA = 0.25;
const LABEL_COLOR = '#8888aa';
const VALUE_COLOR = '#ffffff';
const OVERLAY_BG = 'rgba(0,0,0,0.75)';

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private cellSize = 30;
  private offsetX = 0;  // left edge of playfield (logical px)
  private offsetY = 0;  // top edge of visible playfield (logical px)
  private holdX = 0;
  private previewX = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resize();
    // B4: resize listener lives in main.ts; no duplicate here.
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  resize(): void {
    this.dpr = window.devicePixelRatio ?? 1;
    const availW = window.innerWidth;
    const availH = window.innerHeight;

    const totalLogicalCols = PANEL_COLS + BORDER + BOARD_COLS + BORDER + PANEL_COLS;
    const cellByWidth = Math.floor(availW / totalLogicalCols);
    const cellByHeight = Math.floor(availH / VISIBLE_ROWS);
    this.cellSize = Math.max(16, Math.min(cellByWidth, cellByHeight));

    const logicalW = totalLogicalCols * this.cellSize;
    const logicalH = VISIBLE_ROWS * this.cellSize;

    this.canvas.width = Math.floor(logicalW * this.dpr);
    this.canvas.height = Math.floor(logicalH * this.dpr);
    this.canvas.style.width = `${logicalW}px`;
    this.canvas.style.height = `${logicalH}px`;

    this.ctx.scale(this.dpr, this.dpr);

    this.holdX = 0;
    this.offsetX = (PANEL_COLS + BORDER) * this.cellSize;
    this.offsetY = 0;
    this.previewX = (PANEL_COLS + BORDER + BOARD_COLS + BORDER) * this.cellSize;
  }

  // ─── Main render entry ─────────────────────────────────────────────────────

  render(state: GameState): void {
    const { ctx, cellSize: cs } = this;
    const totalW = this.canvas.width / this.dpr;
    const totalH = this.canvas.height / this.dpr;

    // 1. Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, totalW, totalH);

    // 2. Draw playfield background
    this.drawPlayfieldBg();

    // 3. Draw locked board cells
    this.drawBoard(state);

    // 4. Draw ghost piece
    if (state.activePiece !== null && state.lineClearAnim === null) {
      this.drawGhost(state);
    }

    // 5. Draw active piece
    if (state.activePiece !== null && state.lineClearAnim === null) {
      this.drawPiece(state.activePiece, 1.0);
    }

    // 6. Draw line-clear flash
    if (state.lineClearAnim !== null) {
      this.drawLineClearFlash(state);
    }

    // 7. Hold panel
    this.drawHoldPanel(state);

    // 8. Preview panel
    this.drawPreviewPanel(state);

    // 9. HUD
    this.drawHUD(state, cs);

    // 10. Overlay (menu / paused / gameover)
    if (state.phase !== 'playing') {
      this.drawOverlay(state, totalW, totalH);
    }
  }

  // ─── Playfield background ─────────────────────────────────────────────────

  private drawPlayfieldBg(): void {
    const { ctx, cellSize: cs, offsetX: ox, offsetY: oy } = this;
    const w = BOARD_COLS * cs;
    const h = VISIBLE_ROWS * cs;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(Math.floor(ox), Math.floor(oy), w, h);

    // Grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= BOARD_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(Math.floor(ox + c * cs), oy);
      ctx.lineTo(Math.floor(ox + c * cs), oy + h);
      ctx.stroke();
    }
    for (let r = 0; r <= VISIBLE_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, Math.floor(oy + r * cs));
      ctx.lineTo(ox + w, Math.floor(oy + r * cs));
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(ox), Math.floor(oy), w, h);
  }

  // ─── Board cells ──────────────────────────────────────────────────────────

  private drawBoard(state: GameState): void {
    // E4: during line-clear animation, render boardBefore so cleared rows are visible
    const board = state.lineClearAnim?.boardBefore ?? state.board;
    const animRows = new Set(state.lineClearAnim?.rows ?? []);
    for (let r = 2; r < 22; r++) {
      const visRow = r - 2;
      if (animRows.has(r)) continue; // flash handled separately
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = board[r]?.[c] ?? 0;
        if (cell !== 0) {
          this.drawCell(visRow, c, PIECE_COLORS[cell as PieceType], 1.0);
        }
      }
    }
  }

  // ─── Line-clear flash ──────────────────────────────────────────────────────

  private drawLineClearFlash(state: GameState): void {
    if (state.lineClearAnim === null) return;
    const { rows, elapsed, boardBefore } = state.lineClearAnim;
    // 4 flashes: alternates between white and piece colour every 50ms
    const flashPhase = Math.floor(elapsed / (LINE_CLEAR_ANIM_MS / 4));
    const isWhite = flashPhase % 2 === 0;
    for (const r of rows) {
      const visRow = r - 2;
      if (visRow < 0) continue;
      for (let c = 0; c < BOARD_COLS; c++) {
        // E4: flash uses the pre-clear board cell color, then a white overlay
        const cell = boardBefore[r]?.[c] ?? 0;
        const baseColor = cell !== 0 ? PIECE_COLORS[cell as PieceType] : '#ffffff';
        const color = isWhite ? '#ffffff' : baseColor;
        this.drawCell(visRow, c, color, 0.85);
      }
    }
  }

  // ─── Ghost piece ──────────────────────────────────────────────────────────

  private drawGhost(state: GameState): void {
    if (state.activePiece === null) return;
    const ghost: Piece = { ...state.activePiece, y: state.ghostY };
    this.drawPiece(ghost, GHOST_ALPHA);
  }

  // ─── Active piece ──────────────────────────────────────────────────────────

  private drawPiece(piece: Piece, alpha: number): void {
    const shapes = PIECE_SHAPES[piece.type];
    const cells = shapes[piece.rotation];
    if (cells === undefined) return;
    const color = PIECE_COLORS[piece.type];
    for (const [dr, dc] of cells) {
      const r = piece.y + dr;
      const c = piece.x + dc;
      if (r < 2) continue; // skip hidden rows
      this.drawCell(r - 2, c, color, alpha);
    }
  }

  // ─── Cell draw primitive ──────────────────────────────────────────────────

  private drawCell(visRow: number, col: number, color: string, alpha: number): void {
    const { ctx, cellSize: cs, offsetX: ox, offsetY: oy } = this;
    const x = Math.floor(ox + col * cs);
    const y = Math.floor(oy + visRow * cs);
    const pad = 1;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);

    // Highlight (top-left bevel)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, 3);
    ctx.fillRect(x + pad, y + pad, 3, cs - pad * 2);

    // Shadow (bottom-right bevel)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + pad, y + cs - pad - 3, cs - pad * 2, 3);
    ctx.fillRect(x + cs - pad - 3, y + pad, 3, cs - pad * 2);

    ctx.globalAlpha = 1.0;
  }

  // ─── Hold panel ───────────────────────────────────────────────────────────

  private drawHoldPanel(state: GameState): void {
    const { ctx, cellSize: cs } = this;
    const panelX = this.holdX;
    const panelW = PANEL_COLS * cs;
    const panelH = 5 * cs;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(Math.floor(panelX), 0, panelW, panelH);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(panelX), 0, panelW, panelH);

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `bold ${Math.floor(cs * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', Math.floor(panelX + panelW / 2), Math.floor(cs * 0.75));

    if (state.holdPiece !== null) {
      const alpha = state.holdUsed ? 0.4 : 1.0;
      this.drawMiniPiece(state.holdPiece, panelX, cs * 1.2, panelW, alpha);
    }
  }

  // ─── Preview panel ────────────────────────────────────────────────────────

  private drawPreviewPanel(state: GameState): void {
    const { ctx, cellSize: cs } = this;
    const panelX = this.previewX;
    const panelW = PANEL_COLS * cs;

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `bold ${Math.floor(cs * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', Math.floor(panelX + panelW / 2), Math.floor(cs * 0.75));

    const count = Math.min(state.nextQueue.length, NEXT_QUEUE_SIZE);
    for (let i = 0; i < count; i++) {
      const type = state.nextQueue[i];
      if (type !== undefined) {
        this.drawMiniPiece(type, panelX, cs * (1.2 + i * 3), panelW, 1.0);
      }
    }
  }

  // ─── Mini piece (hold + preview) ──────────────────────────────────────────

  private drawMiniPiece(
    type: PieceType,
    panelX: number,
    topY: number,
    panelW: number,
    alpha: number,
  ): void {
    const { ctx, cellSize: cs } = this;
    const miniCs = Math.floor(cs * 0.6);
    const shapes = PIECE_SHAPES[type];
    const cells = shapes[0]; // always spawn rotation
    if (cells === undefined) return;
    const color = PIECE_COLORS[type];

    // Compute bounding box of cells to centre them
    let minR = Infinity, minC = Infinity;
    for (const [r, c] of cells) {
      if (r < minR) minR = r;
      if (c < minC) minC = c;
    }

    const centerX = Math.floor(panelX + panelW / 2);

    ctx.globalAlpha = alpha;
    for (const [r, c] of cells) {
      const x = Math.floor(centerX + (c - minC - 1.5) * miniCs);
      const y = Math.floor(topY + (r - minR) * miniCs);
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, miniCs - 2, miniCs - 2);
    }
    ctx.globalAlpha = 1.0;
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private drawHUD(state: GameState, cs: number): void {
    const { ctx } = this;
    const panelX = this.holdX;
    const panelW = PANEL_COLS * cs;
    const startY = 6 * cs;

    const items: [string, string | number][] = [
      ['SCORE', state.score],
      ['BEST', state.highScore],
      ['LEVEL', state.level],
      ['LINES', state.lines],
    ];

    ctx.textAlign = 'center';
    const cx = Math.floor(panelX + panelW / 2);

    items.forEach(([label, value], i) => {
      const y = Math.floor(startY + i * cs * 2.5);
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = `${Math.floor(cs * 0.45)}px monospace`;
      ctx.fillText(String(label), cx, y);
      ctx.fillStyle = VALUE_COLOR;
      ctx.font = `bold ${Math.floor(cs * 0.6)}px monospace`;
      ctx.fillText(String(value), cx, y + Math.floor(cs * 0.8));
    });
  }

  // ─── Overlay ──────────────────────────────────────────────────────────────

  private drawOverlay(state: GameState, totalW: number, totalH: number): void {
    const { ctx, cellSize: cs } = this;
    ctx.fillStyle = OVERLAY_BG;
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.textAlign = 'center';
    const cx = totalW / 2;
    const cy = totalH / 2;

    if (state.phase === 'menu') {
      ctx.fillStyle = '#00f0f0';
      ctx.font = `bold ${cs * 1.5}px monospace`;
      ctx.fillText('TETRIS', Math.floor(cx), Math.floor(cy - cs * 2));
      ctx.fillStyle = VALUE_COLOR;
      ctx.font = `${cs * 0.6}px monospace`;
      ctx.fillText('Press ENTER to Start', Math.floor(cx), Math.floor(cy));
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = `${cs * 0.45}px monospace`;
      ctx.fillText('← → move   ↑/X rotate CW   Z rotate CCW', Math.floor(cx), Math.floor(cy + cs));
      ctx.fillText('↓ soft drop   Space hard drop   C/Shift hold', Math.floor(cx), Math.floor(cy + cs * 1.7));
    } else if (state.phase === 'paused') {
      ctx.fillStyle = '#f0f000';
      ctx.font = `bold ${cs * 1.2}px monospace`;
      ctx.fillText('PAUSED', Math.floor(cx), Math.floor(cy - cs * 0.5));
      ctx.fillStyle = VALUE_COLOR;
      ctx.font = `${cs * 0.6}px monospace`;
      ctx.fillText('Press P or ESC to Resume', Math.floor(cx), Math.floor(cy + cs * 0.8));
      ctx.fillText('Press R to Restart', Math.floor(cx), Math.floor(cy + cs * 1.6));
    } else if (state.phase === 'gameover') {
      ctx.fillStyle = '#f00000';
      ctx.font = `bold ${cs * 1.2}px monospace`;
      ctx.fillText('GAME OVER', Math.floor(cx), Math.floor(cy - cs * 2));
      ctx.fillStyle = VALUE_COLOR;
      ctx.font = `bold ${cs * 0.8}px monospace`;
      ctx.fillText(`Score: ${state.score}`, Math.floor(cx), Math.floor(cy - cs * 0.8));
      if (state.score >= state.highScore && state.score > 0) {
        ctx.fillStyle = '#f0f000';
        ctx.font = `${cs * 0.6}px monospace`;
        ctx.fillText('New High Score!', Math.floor(cx), Math.floor(cy));
      }
      ctx.fillStyle = VALUE_COLOR;
      ctx.font = `${cs * 0.6}px monospace`;
      ctx.fillText('Press R or ENTER to Restart', Math.floor(cx), Math.floor(cy + cs));
    }
  }
}
