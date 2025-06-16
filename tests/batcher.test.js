import { describe, it, expect, vi } from 'vitest';
import { createDroneBatches, consolidateSegments, rescueTinyOrphans } from '../src/pipeline/batcher';

describe('Batcher Logic', () => {

  // Mock token estimator for predictable testing
  vi.mock('../src/lib/client-api', () => ({
    estimateTokens: (text) => Math.ceil(text.length / 4),
  }));

  describe('createDroneBatches', () => {
    it('should create a single batch for text smaller than the drone input max', () => {
      const text = 'This is a short text.'.repeat(10);
      const batches = createDroneBatches(text, { droneInputTokenMax: 1000 });
      expect(batches).toHaveLength(1);
      expect(batches[0].content).toBe(text);
    });

    it('should split text into multiple batches when it exceeds the max token limit', () => {
      const longText = 'This is a very long text designed to be split. '.repeat(100); // approx 1250 tokens
      const batches = createDroneBatches(longText, { droneInputTokenMax: 1000 });
      expect(batches.length).toBeGreaterThan(1);
    });
  });

  describe('consolidateSegments', () => {
    it('should merge multiple small segments into one larger segment', () => {
      const segments = [
        { content: 'First part. ', tokenCount: 3 },
        { content: 'Second part. ', tokenCount: 3 },
        { content: 'Third part.', tokenCount: 3 },
      ];
      const consolidated = consolidateSegments(segments, 10);
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].content).toBe('First part. Second part. Third part.');
      expect(consolidated[0].tokenCount).toBe(9);
    });

    it('should not merge segments if it would exceed the token limit', () => {
      const segments = [
        { content: 'Part A. ', tokenCount: 6 },
        { content: 'Part B.', tokenCount: 6 },
      ];
      const consolidated = consolidateSegments(segments, 10);
      expect(consolidated).toHaveLength(2);
      expect(consolidated[0].content).toBe('Part A. ');
      expect(consolidated[1].content).toBe('Part B.');
    });
  });

  describe('rescueTinyOrphans', () => {
    it('should merge a tiny orphan into the preceding batch', () => {
      const batches = [
        { content: 'This is the main large batch. ', tokenCount: 50 },
        { content: 'orphan.', tokenCount: 2 },
      ];
      // min_orphan_token_threshold = 5, drone_input_token_max = 1000
      const rescued = rescueTinyOrphans(batches, 5, 1000);
      expect(rescued).toHaveLength(1);
      expect(rescued[0].content).toBe('This is the main large batch. orphan.');
      expect(rescued[0].tokenCount).toBe(52);
    });

    it('should not merge an orphan if it is larger than the threshold', () => {
      const batches = [
        { content: 'Main batch. ', tokenCount: 50 },
        { content: 'Not an orphan.', tokenCount: 6 },
      ];
      const rescued = rescueTinyOrphans(batches, 5, 1000);
      expect(rescued).toHaveLength(2);
    });

    it('should not merge an orphan if it would make the host batch too large', () => {
      const batches = [
        { content: 'Almost full batch. ', tokenCount: 999 },
        { content: 'orphan.', tokenCount: 2 },
      ];
      const rescued = rescueTinyOrphans(batches, 5, 1000);
      expect(rescued).toHaveLength(2);
    });
  });
});
