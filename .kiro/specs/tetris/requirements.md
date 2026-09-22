# Tetris Clone — Requirements

**Notation**: EARS (Easy Approach to Requirements Syntax)  
**Revision**: 1.0  
**Date**: 2026-09-21

---

## 1. Playfield

**REQ-1.1** The system shall maintain a 10-column × 22-row internal grid (rows 0–1 are hidden spawn rows; rows 2–21 are visible).  
**REQ-1.2** When the game is rendered, the system shall display only rows 2–21 (the 10×20 visible playfield).  
**REQ-1.3** Each cell shall store one of: empty, or a tetromino color identifier (I, O, T, S, Z, J, L).  
**REQ-1.4** While a piece is active, the system shall not modify locked cells on the board.

---

## 2. Tetrominoes

**REQ-2.1** The system shall support exactly seven tetromino types: I, O, T, S, Z, J, L.  
**REQ-2.2** Each tetromino shall have a guideline color:

| Piece | Color       | Hex       |
|-------|-------------|-----------|
| I     | Cyan        | `#00F0F0` |
| O     | Yellow      | `#F0F000` |
| T     | Purple      | `#A000F0` |
| S     | Green       | `#00F000` |
| Z     | Red         | `#F00000` |
| J     | Blue        | `#0000F0` |
| L     | Orange      | `#F0A000` |

**REQ-2.3** Each tetromino shall have four rotation states (0°, 90° CW, 180°, 270° CW) encoded as 4×4 or 2×2 bitmasks per the Tetris guideline.  
**REQ-2.4** When a new piece spawns, the system shall place it centered horizontally at spawn rows (rows 0–1), using the guideline spawn orientation (rotation state 0).  
**REQ-2.5** The O-piece shall spawn at column 4 (0-indexed); the I-piece shall spawn at column 3.

---

## 3. Randomizer — 7-Bag

**REQ-3.1** The system shall use a 7-bag randomizer: before each bag is consumed, all 7 piece types are shuffled into a random order.  
**REQ-3.2** Within a single bag, each of the 7 pieces shall appear exactly once.  
**REQ-3.3** When a bag is exhausted, the system shall immediately generate and shuffle a new bag.  
**REQ-3.4** The randomizer shall accept a numeric seed for deterministic test replay.  
**REQ-3.5** The default game seed shall be derived from `Date.now()`.

---

## 4. Rotation — SRS with Wall Kicks

**REQ-4.1** The system shall implement the Super Rotation System (SRS) for all pieces.  
**REQ-4.2** When a rotation is attempted, the system shall first try the rotated position with no offset; if that fails, it shall try each of the four wall-kick offsets for that rotation transition in order, accepting the first that does not collide.  
**REQ-4.3** The system shall use the standard SRS kick table for J, L, S, T, Z pieces:

```
State 0→1: (0,0), (-1,0), (-1,+1), (0,-2), (-1,-2)
State 1→2: (0,0), (+1,0), (+1,-1), (0,+2), (+1,+2)
State 2→3: (0,0), (+1,0), (+1,+1), (0,-2), (+1,-2)
State 3→0: (0,0), (-1,0), (-1,-1), (0,+2), (-1,+2)
State 1→0: (0,0), (+1,0), (+1,-1), (0,+2), (+1,+2)
State 2→1: (0,0), (-1,0), (-1,+1), (0,-2), (-1,-2)
State 3→2: (0,0), (-1,0), (-1,-1), (0,+2), (-1,+2)
State 0→3: (0,0), (+1,0), (+1,+1), (0,-2), (+1,-2)
```

**REQ-4.4** The system shall use the separate SRS kick table for the I-piece:

```
State 0→1: (0,0), (-2,0), (+1,0), (-2,-1), (+1,+2)
State 1→2: (0,0), (-1,0), (+2,0), (-1,+2), (+2,-1)
State 2→3: (0,0), (+2,0), (-1,0), (+2,+1), (-1,-2)
State 3→0: (0,0), (+1,0), (-2,0), (+1,-2), (-2,+1)
State 1→0: (0,0), (+2,0), (-1,0), (+2,+1), (-1,-2)
State 2→1: (0,0), (+1,0), (-2,0), (+1,-2), (-2,+1)
State 3→2: (0,0), (-2,0), (+1,0), (-2,-1), (+1,+2)
State 0→3: (0,0), (-1,0), (+2,0), (-1,+2), (+2,-1)
```

**REQ-4.5** The O-piece shall not rotate (all four states are identical; no kicks needed).  
**REQ-4.6** The system shall support clockwise (CW) and counter-clockwise (CCW) rotation independently.  
**REQ-4.7** When no kick offset resolves the collision, the system shall reject the rotation and leave the piece unchanged.

---

## 5. Movement — DAS / ARR

**REQ-5.1** When the left or right key is held, the system shall move the piece once immediately on key-down.  
**REQ-5.2** When a directional key is held continuously for 170 ms (DAS — Delayed Auto Shift), the system shall begin repeating movement.  
**REQ-5.3** While auto-shifting, the system shall move the piece every 50 ms (ARR — Auto Repeat Rate).  
**REQ-5.4** When a directional key is released, the system shall cancel DAS/ARR for that direction.  
**REQ-5.5** When both left and right keys are held simultaneously, the most recently pressed key shall take priority.  
**REQ-5.6** Soft drop shall move the piece down one cell per input frame (approximately 50 ms) while the down key is held, and shall award 1 point per cell dropped.  
**REQ-5.7** Hard drop shall instantly move the piece to the lowest valid position, lock it, and award 2 points per cell dropped.

---

## 6. Gravity

**REQ-6.1** The system shall calculate the gravity interval using the guideline formula:

```
interval(level) = (0.8 - (level - 1) × 0.007)^(level - 1)  seconds/row
```

**REQ-6.2** At level 1, the interval shall be 1.0 second per row.  
**REQ-6.3** At level 20, the interval shall be approximately 0.02 seconds per row.  
**REQ-6.4** Gravity shall not apply while the soft-drop key is held (soft drop speed supersedes gravity).

---

## 7. Lock Delay

**REQ-7.1** When a piece comes to rest on a surface, a 500 ms lock-delay timer shall start.  
**REQ-7.2** When the piece is successfully moved or rotated during the lock delay, the timer shall reset to 500 ms.  
**REQ-7.3** The lock-delay reset shall be capped at 15 resets per piece placement; after 15 resets the piece shall lock immediately on the next timer expiry without further resets.  
**REQ-7.4** When the lock-delay timer expires and the piece cannot move down, the piece shall lock in place.  
**REQ-7.5** When a locked piece causes one or more complete rows, line-clear processing shall begin before the next piece spawns.

---

## 8. Hold

**REQ-8.1** The player shall be able to hold the current piece by pressing the hold key (C or Shift).  
**REQ-8.2** When hold is used and the hold slot is empty, the current piece shall move to the hold slot and the next piece from the queue shall spawn.  
**REQ-8.3** When hold is used and the hold slot contains a piece, the current piece and the held piece shall swap; the swapped-in piece shall spawn at the standard spawn position with rotation state 0.  
**REQ-8.4** Hold shall be locked for the remainder of the current piece's life after it is used once; it shall unlock when the next piece spawns.  
**REQ-8.5** The hold piece shall be displayed in a dedicated hold panel.

---

## 9. Preview Queue

**REQ-9.1** The system shall display the next 5 pieces from the bag queue in a dedicated preview panel.  
**REQ-9.2** The preview shall update immediately when the current piece locks and the next piece spawns.  
**REQ-9.3** Each preview piece shall be rendered in its spawn orientation using its guideline color.

---

## 10. Ghost Piece

**REQ-10.1** While a piece is active, the system shall render a ghost piece at the lowest valid position directly below the current piece.  
**REQ-10.2** The ghost piece shall be rendered in the same shape as the current piece with reduced opacity (approximately 30% alpha).  
**REQ-10.3** When the current piece moves or rotates, the ghost shall update in the same frame.

---

## 11. Line Clears

**REQ-11.1** When a row is completely filled after a piece locks, the system shall mark that row for clearing.  
**REQ-11.2** The system shall play a line-clear animation lasting approximately 200 ms before removing the rows and dropping cells above.  
**REQ-11.3** The system shall handle simultaneous clearing of 1 (single), 2 (double), 3 (triple), or 4 (tetris) rows.  
**REQ-11.4** After the animation completes, cleared rows shall be removed and all rows above shall shift down by the number of cleared rows.

---

## 12. Scoring

**REQ-12.1** The system shall award points for line clears using the following base values × current level:

| Lines | Name    | Base Score |
|-------|---------|------------|
| 1     | Single  | 100        |
| 2     | Double  | 300        |
| 3     | Triple  | 500        |
| 4     | Tetris  | 800        |

**REQ-12.2** The system shall detect T-spins using the 3-corner rule: after a T-piece rotation, if at least 3 of the 4 corner cells of the T's 3×3 bounding box are occupied (by board cells or walls), the clear is classified as a T-spin.  
**REQ-12.3** T-spin scores shall use the following base values × level:

| Lines | Name            | Base Score |
|-------|-----------------|------------|
| 0     | T-Spin (no lines)| 400       |
| 1     | T-Spin Single   | 800        |
| 2     | T-Spin Double   | 1200       |
| 3     | T-Spin Triple   | 1600       |

**REQ-12.4** Mini T-spin (only 2 corners filled) shall score 100 × level with 1 line, 200 × level with 2 lines.  
**REQ-12.5** When a Tetris or T-spin follows another Tetris or T-spin (back-to-back), the score for the second and subsequent qualifying clears shall be multiplied by 1.5.  
**REQ-12.6** The combo counter shall increment by 1 for each consecutive piece that clears at least one line; a piece that clears no lines resets the combo to −1.  
**REQ-12.7** Combo bonus = 50 × combo count × level (awarded in addition to the line-clear score).  
**REQ-12.8** Soft-drop bonus = 1 point per cell.  
**REQ-12.9** Hard-drop bonus = 2 points per cell.

---

## 13. Levels

**REQ-13.1** The game shall start at level 1.  
**REQ-13.2** The level shall increase by 1 for every 10 lines cleared (cumulative).  
**REQ-13.3** There shall be no level cap; gravity continues to accelerate per the formula.

---

## 14. Game Over

**REQ-14.1** Block-out: when a newly spawned piece overlaps an occupied cell, the game shall transition to the GameOver state.  
**REQ-14.2** Lock-out: when a piece locks entirely within the two hidden spawn rows (rows 0–1), the game shall transition to the GameOver state.  
**REQ-14.3** On game over, all timers and the game loop shall be frozen.  
**REQ-14.4** The final score shall be compared to the stored high score, and the high score shall be updated if the final score is greater.

---

## 15. Game States

**REQ-15.1** The game shall have exactly four states: Menu, Playing, Paused, GameOver.  
**REQ-15.2** From Menu, pressing Start (Enter or any movement key) shall transition to Playing.  
**REQ-15.3** From Playing, pressing P or Escape shall transition to Paused.  
**REQ-15.4** From Paused, pressing P or Escape shall resume Playing.  
**REQ-15.5** From Playing or Paused, pressing R shall restart and transition to Playing (resetting all state).  
**REQ-15.6** From GameOver, pressing R or Enter shall restart and transition to Playing.  
**REQ-15.7** While Paused, gravity, lock delay, DAS/ARR, and animations shall all be frozen.

---

## 16. Persistence

**REQ-16.1** The system shall save the high score to `localStorage` under the key `"tetris-high-score"`.  
**REQ-16.2** All `localStorage` reads and writes shall be wrapped in `try/catch` to silently handle quota errors or private-browsing restrictions.  
**REQ-16.3** On load, the system shall read the stored high score; if none exists or parsing fails, the high score shall default to 0.

---

## 17. Controls

| Key(s)           | Action                        |
|------------------|-------------------------------|
| ← Arrow          | Move left                     |
| → Arrow          | Move right                    |
| ↓ Arrow          | Soft drop                     |
| Space            | Hard drop                     |
| ↑ Arrow, X       | Rotate CW                     |
| Z                | Rotate CCW                    |
| C, Shift         | Hold                          |
| P, Escape        | Pause / Resume                |
| R                | Restart                       |
| Enter            | Start (Menu / GameOver)       |

**REQ-17.1** All listed keys shall be handled exclusively by the input module; the game core shall receive named `InputAction` events.  
**REQ-17.2** Default browser actions for all game keys (scrolling, etc.) shall be suppressed with `preventDefault()`.

---

## 18. Display

**REQ-18.1** The canvas shall scale responsively to fit the browser viewport while maintaining the aspect ratio of the full game UI (playfield + side panels).  
**REQ-18.2** The canvas resolution shall be multiplied by `window.devicePixelRatio` for crisp rendering on HiDPI displays.  
**REQ-18.3** The game loop shall target 60 FPS using `requestAnimationFrame`.  
**REQ-18.4** The renderer shall use integer pixel snapping for all cell draws to prevent sub-pixel blurring.  
**REQ-18.5** The UI shall display: current score, high score, current level, lines cleared, hold panel, and next-5 preview panel.
