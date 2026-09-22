import { FIXED_STEP_MS, MAX_DELTA_MS } from '../constants.js';
import type { GameState, InputAction } from '../types.js';
import type { InputHandler } from '../input/inputHandler.js';

type TickFn = (state: GameState, actions: InputAction[], deltaMs: number) => GameState;
type RenderFn = (state: GameState) => void;

/**
 * Fixed-timestep game loop using requestAnimationFrame.
 *
 * Frame ordering per rAF callback:
 *   1. Clamp raw delta to MAX_DELTA_MS.
 *   2. Call inputHandler.update(dt) to advance DAS/ARR/soft-drop timers.
 *   3. Only drain input when at least one tick will fire this frame
 *      (accumulator + dt >= FIXED_STEP_MS). This guarantees every enqueued
 *      action is consumed exactly once and is never silently dropped.
 *   4. Run tick loop, passing drained actions only on the first step.
 *   5. Render once.
 */
export class GameLoop {
  private rafHandle = 0;
  private lastTime = 0;
  private accumulator = 0;
  private state: GameState;

  constructor(
    private readonly onTick: TickFn,
    private readonly onRender: RenderFn,
    private readonly inputHandler: InputHandler,
    initialState: GameState,
  ) {
    this.state = initialState;
  }

  start(): void {
    this.lastTime = performance.now();
    this.rafHandle = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
  }

  setState(state: GameState): void {
    this.state = state;
  }

  getState(): GameState {
    return this.state;
  }

  private loop(timestamp: number): void {
    const rawDt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    const dt = Math.min(rawDt, MAX_DELTA_MS);

    // B1: advance DAS/ARR/soft-drop timers BEFORE draining actions
    this.inputHandler.update(dt);

    this.accumulator += dt;

    // B2: only drain when at least one tick will run; otherwise leave queued
    const willTick = this.accumulator >= FIXED_STEP_MS;
    const actions = willTick ? this.inputHandler.drainActions() : [];

    let firstTick = true;
    while (this.accumulator >= FIXED_STEP_MS) {
      this.state = this.onTick(
        this.state,
        firstTick ? actions : [],
        FIXED_STEP_MS,
      );
      this.accumulator -= FIXED_STEP_MS;
      firstTick = false;
    }

    this.onRender(this.state);

    this.rafHandle = requestAnimationFrame((t) => this.loop(t));
  }
}
