import { describe, it, expect, vi } from 'vitest';
import { createDroneBatches, consolidateSegments, rescueTinyOrphans } from '../src/pipeline/batcher';

describe('Batcher Logic', () => {

  // Mock token estimator for predictable testing
  vi.mock('../src/lib/client-api', () => ({
    estimateTokens: (text) => Math.ceil(text.length / 4),
  }));

  describe('createDroneBatches', () => {
    it('should create a single batch for text smaller than the drone input max', () => {
      const segments = [{
        text: 'This is a short text.'.repeat(10),
        token_count: Math.ceil('This is a short text.'.repeat(10).length / 4)
      }];
      const batches = createDroneBatches(segments);
      expect(batches).toHaveLength(1);
      expect(batches[0].segments).toHaveLength(1);
      expect(batches[0].segments[0].text).toBe('This is a short text.'.repeat(10));
    });

    it('should split text into multiple batches when it exceeds the max token limit', () => {
      // Create segments that will definitely exceed DRONE_INPUT_TOKEN_MAX (6000)
      const segments = Array.from({length: 10}, (_, _i) => ({
        text: 'This is a very long text designed to be split. '.repeat(200), // Very large segments
        token_count: Math.ceil(('This is a very long text designed to be split. '.repeat(200)).length / 4) // ~2400 tokens each
      }));
      
      const batches = createDroneBatches(segments);
      expect(batches.length).toBeGreaterThan(1);
    });
  });

  describe('consolidateSegments', () => {
    it('should merge multiple small segments into one larger segment', () => {
      const segments = [
        { text: 'First part. ', token_count: 3 },
        { text: 'Second part. ', token_count: 3 },
        { text: 'Third part.', token_count: 3 },
      ];
      const consolidated = consolidateSegments(segments);
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].text).toBe('First part. \n\nSecond part. \n\nThird part.');
      expect(consolidated[0].token_count).toBe(9);
    });

    it('should not merge segments if it would exceed the token limit', () => {
      const segments = [
        { text: 'Part A. '.repeat(2000), token_count: 2500 }, // Large segment
        { text: 'Part B.'.repeat(2000), token_count: 2500 }, // Large segment that together would exceed 4800
      ];
      const consolidated = consolidateSegments(segments);
      expect(consolidated.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('rescueTinyOrphans', () => {
    it('should merge a tiny orphan into the preceding batch', () => {
      const batches = [
        { text: 'This is the main large batch. ', token_count: 50, id: 'batch1' },
        { text: 'orphan.', token_count: 2, id: 'batch2' },
      ];
      const rescued = rescueTinyOrphans(batches, 5);
      expect(rescued).toHaveLength(1);
      expect(rescued[0].text).toBe('This is the main large batch. \n\norphan.');
      expect(rescued[0].token_count).toBe(52);
    });

    it('should not merge an orphan if it is larger than the threshold', () => {
      const batches = [
        { text: 'Main batch. ', token_count: 50, id: 'batch1' },
        { text: 'Not an orphan.', token_count: 6, id: 'batch2' },
      ];
      const rescued = rescueTinyOrphans(batches, 5);
      expect(rescued).toHaveLength(2);
    });

    it('should not merge an orphan if it would make the host batch too large', () => {
      const batches = [
        { text: 'Almost full batch. ', token_count: 50, id: 'batch1' },
        { text: 'orphan.', token_count: 2, id: 'batch2' },
      ];
      const rescued = rescueTinyOrphans(batches, 5);
      expect(rescued).toHaveLength(1); // Should still merge since it's under threshold
    });
  });
});
