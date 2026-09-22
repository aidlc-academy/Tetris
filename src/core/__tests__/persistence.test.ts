import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHighScore, saveHighScore } from '../persistence.js';

// Mock localStorage for Node.js test environment
const mockStorage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockStorage.delete(key);
  }),
  clear: vi.fn(() => {
    mockStorage.clear();
  }),
};

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.getItem.mockImplementation((key: string) => mockStorage.get(key) ?? null);
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    mockStorage.set(key, value);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadHighScore', () => {
  it('returns 0 when key is absent', () => {
    expect(loadHighScore()).toBe(0);
  });

  it('returns the stored number when key is present', () => {
    mockStorage.set('tetris-high-score', '42000');
    expect(loadHighScore()).toBe(42000);
  });

  it('returns 0 when stored value is non-numeric', () => {
    mockStorage.set('tetris-high-score', 'not-a-number');
    expect(loadHighScore()).toBe(0);
  });

  it('returns 0 when stored value is empty string', () => {
    mockStorage.set('tetris-high-score', '');
    expect(loadHighScore()).toBe(0);
  });

  it('does not throw when localStorage.getItem throws', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => loadHighScore()).not.toThrow();
    expect(loadHighScore()).toBe(0);
  });
});

describe('saveHighScore', () => {
  it('writes the score under the correct key', () => {
    saveHighScore(9999);
    expect(mockStorage.get('tetris-high-score')).toBe('9999');
  });

  it('does not throw when localStorage.setItem throws (quota exceeded)', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveHighScore(100)).not.toThrow();
  });

  it('overwrites an existing value', () => {
    mockStorage.set('tetris-high-score', '1000');
    saveHighScore(5000);
    expect(mockStorage.get('tetris-high-score')).toBe('5000');
  });
});
