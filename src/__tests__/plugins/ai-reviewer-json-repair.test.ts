/**
 * AI Paper Reviewer - JSON Repair Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { parseWithRetry } from '../../../plugins/ai-paper-reviewer/lib/json-repair';

describe('parseWithRetry', () => {
  const mockRepairFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid JSON on first try', async () => {
    const validJson = JSON.stringify({ score: 5, summary: 'Good' });
    const result = await parseWithRetry(validJson, mockRepairFn);

    expect(result.data).toEqual({ score: 5, summary: 'Good' });
    expect(result.parseAttempts).toBe(1);
    expect(result.repairApplied).toBe(false);
    expect(result.rawResponse).toBe(validJson);
    expect(mockRepairFn).not.toHaveBeenCalled();
  });

  it('should strip markdown fences and parse', async () => {
    const withFences = '```json\n{"score": 4}\n```';
    const result = await parseWithRetry(withFences, mockRepairFn);

    expect(result.data).toEqual({ score: 4 });
    expect(result.parseAttempts).toBe(1);
    expect(result.repairApplied).toBe(false);
  });

  it('should strip plain markdown fences without language tag', async () => {
    const withFences = '```\n{"score": 3}\n```';
    const result = await parseWithRetry(withFences, mockRepairFn);

    expect(result.data).toEqual({ score: 3 });
    expect(result.repairApplied).toBe(false);
  });

  it('should call repair function on invalid JSON', async () => {
    const brokenJson = '{"score": 5, "summary": "missing close brace"';
    const fixedJson = '{"score": 5, "summary": "missing close brace"}';

    mockRepairFn.mockResolvedValueOnce(fixedJson);

    const result = await parseWithRetry(brokenJson, mockRepairFn);

    expect(result.data).toEqual({ score: 5, summary: 'missing close brace' });
    expect(result.repairApplied).toBe(true);
    expect(result.parseAttempts).toBe(2);
    expect(mockRepairFn).toHaveBeenCalledWith(brokenJson);
  });

  it('should throw error when max retries exceeded', async () => {
    const brokenJson = 'not json at all';

    mockRepairFn.mockResolvedValue('still not json');

    await expect(
      parseWithRetry(brokenJson, mockRepairFn, 2)
    ).rejects.toThrow('Failed to parse JSON after');
  });

  it('should track parseAttempts correctly', async () => {
    const brokenJson = '{"broken"}';
    const fixedJson = '{"score": 1}';

    // First repair fails, second succeeds
    mockRepairFn
      .mockResolvedValueOnce('still broken')
      .mockResolvedValueOnce(fixedJson);

    const result = await parseWithRetry(brokenJson, mockRepairFn, 2);

    expect(result.data).toEqual({ score: 1 });
    expect(result.parseAttempts).toBe(3);
    expect(result.repairApplied).toBe(true);
  });

  it('should handle repair function throwing', async () => {
    const brokenJson = '{"broken"}';

    mockRepairFn.mockRejectedValue(new Error('API error'));

    await expect(
      parseWithRetry(brokenJson, mockRepairFn, 1)
    ).rejects.toThrow('Failed to parse JSON after');
  });

  it('should preserve rawResponse in result', async () => {
    const original = '```json\n{"data": true}\n```';
    const result = await parseWithRetry(original, mockRepairFn);

    expect(result.rawResponse).toBe(original);
  });
});
