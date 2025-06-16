import { describe, it, expect, vi } from 'vitest';
import { createContextCard, calculateSessionStats, classifyError } from '../src/pipeline/orchestrator';

describe('Orchestrator Logic', () => {

  describe('createContextCard', () => {
    it('should create a context card from successful drone results', () => {
      const droneResults = [
        { success: true, summary: 'First part of the summary.' },
        { success: true, summary: 'Second part.' },
      ];
      const card = createContextCard(droneResults);
      expect(card).toContain('First part of the summary.');
      expect(card).toContain('Second part.');
      expect(card).not.toContain('[DRONE FAILED]');
    });

    it('should include a failure marker for failed drones', () => {
      const droneResults = [
        { success: true, summary: 'Successful part.' },
        { success: false, error: 'API Timeout' },
      ];
      const card = createContextCard(droneResults);
      expect(card).toContain('Successful part.');
      expect(card).toContain('[DRONE FAILED: Error - API Timeout]');
    });

    it('should handle an empty array of results', () => {
      const card = createContextCard([]);
      expect(card).toBe('');
    });
  });

  describe('calculateSessionStats', () => {
    it('should calculate stats correctly for a successful session', () => {
      const initialTokens = 10000;
      const finalTokens = 2500;
      const droneResults = [{ success: true }, { success: true }];
      const stats = calculateSessionStats(initialTokens, finalTokens, droneResults);

      expect(stats.successfulDrones).toBe(2);
      expect(stats.totalDrones).toBe(2);
      expect(stats.compressionRatio).toBe('4.0'); // 10000 / 2500
    });

    it('should handle division by zero when finalTokens is 0', () => {
      const stats = calculateSessionStats(10000, 0, []);
      expect(stats.compressionRatio).toBe('Infinity');
    });

    it('should count failed drones correctly', () => {
      const droneResults = [{ success: true }, { success: false }, { success: true }];
      const stats = calculateSessionStats(1000, 500, droneResults);
      expect(stats.successfulDrones).toBe(2);
      expect(stats.totalDrones).toBe(3);
    });
  });

  describe('classifyError', () => {
    it('should classify rate limit errors (429)', () => {
      const error = { response: { status: 429 } };
      const classification = classifyError(error);
      expect(classification.type).toBe('RATE_LIMIT');
      expect(classification.isRetryable).toBe(true);
    });

    it('should classify server errors (5xx) as retryable', () => {
      const error = { response: { status: 503 } };
      const classification = classifyError(error);
      expect(classification.type).toBe('API_ERROR');
      expect(classification.isRetryable).toBe(true);
    });

    it('should classify authentication errors (401, 403) as non-retryable', () => {
      const error = { response: { status: 401 } };
      const classification = classifyError(error);
      expect(classification.type).toBe('AUTH_ERROR');
      expect(classification.isRetryable).toBe(false);
    });

    it('should classify client errors (400) as catastrophic', () => {
        const error = { response: { status: 400 } };
        const classification = classifyError(error);
        expect(classification.type).toBe('BAD_REQUEST');
        expect(classification.isCatastrophic).toBe(true);
    });
  });
});
