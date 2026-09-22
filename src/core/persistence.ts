const HIGH_SCORE_KEY = 'tetris-high-score';

/**
 * Reads the stored high score from localStorage.
 * Returns 0 if the key is absent, the value is not a valid number,
 * or any exception is thrown (e.g. private browsing, quota).
 */
export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (raw === null) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Writes the high score to localStorage.
 * Silently swallows any errors (quota exceeded, private browsing, etc.).
 */
export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // intentionally silent
  }
}
