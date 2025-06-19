/**
 * Tests for drone payload processing with failures
 */

import { describe, it, expect, vi } from 'vitest';
import { createContextCard } from '../src/pipeline/orchestrator';

// Mock API response function for testing
const createMockApiResponse = (shouldFail = false, failureType = 'SERVER_ERROR') => {
  if (shouldFail) {
    switch (failureType) {
      case 'RATE_LIMIT':
        throw { status: 429, message: 'Rate limit exceeded' };
      case 'AUTH_ERROR':
        throw { status: 401, message: 'Invalid API key' };
      case 'NETWORK_ERROR':
        throw new TypeError('Failed to fetch');
      case 'SERVER_ERROR':
      default:
        throw { status: 500, message: 'Internal server error' };
    }
  }
  
  return {
    candidates: [{
      content: {
        parts: [{ text: 'Successfully processed content with good quality output that meets all requirements.' }]
      }
    }]
  };
};

describe('Drone Payload Processing with Failures', () => {
  describe('Context Card Formatting with Different Payload Types', () => {
    it('should handle missing payload information', () => {
      // Test case where payloads are missing or undefined
      const droneResults = [
        'Success for drone 1',
        '[Drone 2 failed: Rate limit exceeded]',
        'Success for drone 3'
      ];
      
      const mockSessionStats = {
        totalInputTokens: 3000,
        displayTargetTokens: 1000,
        compressionRatio: '3.0'
      };
      
      // Undefined payloads should still produce a valid context card
      const contextCard = createContextCard(droneResults, mockSessionStats, undefined);
      
      expect(contextCard).toContain('Success for drone 1');
      expect(contextCard).toMatch(/\[⚠ Drone 2 failed — Input size: \?\?\? tokens\]/);
      expect(contextCard).toContain('Success for drone 3');
    });
    
    it('should handle string payloads', () => {
      const droneResults = [
        'Success for drone 1',
        '[Drone 2 failed: Server error]',
      ];
      
      const mockSessionStats = {
        totalInputTokens: 2000,
        displayTargetTokens: 500,
        compressionRatio: '4.0'
      };
      
      // String payloads should be processed with token estimation
      const mockPayloads = [
        'This is a simple string payload',
        'Another string payload that should be analyzed for token count'
      ];
      
      const contextCard = createContextCard(droneResults, mockSessionStats, mockPayloads);
      
      expect(contextCard).toContain('Success for drone 1');
      expect(contextCard).toMatch(/\[⚠ Drone 2 failed — Input size: \d+ tokens\]/);
    });
  });
  
  describe('Integration with Token Estimation', () => {
    it('should use payload token counts when available', () => {
      const droneResults = [
        '[Drone 1 failed: Network error]',
        'Success for drone 2',
      ];
      
      const mockSessionStats = {
        totalInputTokens: 2000,
        displayTargetTokens: 500,
        compressionRatio: '4.0'
      };
      
      // Token counts provided directly
      const mockPayloads = [
        { actual_token_count: 1234 }, // Exact count provided
        { text: 'Some sample text for estimating tokens' }
      ];
      
      const contextCard = createContextCard(droneResults, mockSessionStats, mockPayloads);
      
      // Should use the exact token count from the payload
      expect(contextCard).toContain('[⚠ Drone 1 failed — Input size: 1234 tokens]');
      expect(contextCard).toContain('Success for drone 2');
    });
  });
});
