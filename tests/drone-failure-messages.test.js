/**
 * Drone Failure Message Tests using Vitest
 * Tests the drone failure message system in isolation from fragile tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createContextCard } from '../src/pipeline/orchestrator';

describe('Drone Failure Messages', () => {
  describe('Context Card Creation with Failures', () => {
    it('should properly format a single drone failure', () => {
      // Create mock drone results with one failure
      const droneResults = [
        'Successfully processed first content.',
        '[Drone 2 failed: Rate limit exceeded]',
        'Successfully processed third content.'
      ];
      
      const mockSessionStats = {
        totalInputTokens: 3000,
        displayTargetTokens: 1000,
        compressionRatio: '3.0'
      };
      
      const mockPayloads = [
        { actual_token_count: 1000 },
        { actual_token_count: 1200 },
        { actual_token_count: 800 }
      ];
      
      const contextCard = createContextCard(droneResults, mockSessionStats, mockPayloads);
      
      // Check that failure message is properly formatted
      expect(contextCard).toContain('Successfully processed first content.');
      expect(contextCard).toContain('[⚠ Drone 2 failed — Input size: 1200 tokens]');
      expect(contextCard).toContain('Successfully processed third content.');
    });
    
    it('should handle multiple drone failures', () => {
      // Create mock drone results with multiple failures
      const droneResults = [
        '[Drone 1 failed: Network error]',
        'Successfully processed second content.',
        '[Drone 3 failed: Invalid API key]'
      ];
      
      const mockSessionStats = {
        totalInputTokens: 3000,
        displayTargetTokens: 1000,
        compressionRatio: '3.0'
      };
      
      const mockPayloads = [
        { actual_token_count: 900 },
        { actual_token_count: 1100 },
        { actual_token_count: 1000 }
      ];
      
      const contextCard = createContextCard(droneResults, mockSessionStats, mockPayloads);
      
      // Check that failure messages are properly formatted
      expect(contextCard).toContain('[⚠ Drone 1 failed — Input size: 900 tokens]');
      expect(contextCard).toContain('Successfully processed second content.');
      expect(contextCard).toContain('[⚠ Drone 3 failed — Input size: 1000 tokens]');
    });
    
    it('should handle all drone failures', () => {
      // Create mock drone results with all failures
      const droneResults = [
        '[Drone 1 failed: Server error]',
        '[Drone 2 failed: Rate limit exceeded]',
        '[Drone 3 failed: Network error]'
      ];
      
      const mockSessionStats = {
        totalInputTokens: 3000,
        displayTargetTokens: 1000,
        compressionRatio: '3.0'
      };
      
      const mockPayloads = [
        { actual_token_count: 800 },
        { actual_token_count: 1200 },
        { actual_token_count: 1000 }
      ];
      
      const contextCard = createContextCard(droneResults, mockSessionStats, mockPayloads);
      
      // Check that all failure messages are properly formatted
      expect(contextCard).toContain('[⚠ Drone 1 failed — Input size: 800 tokens]');
      expect(contextCard).toContain('[⚠ Drone 2 failed — Input size: 1200 tokens]');
      expect(contextCard).toContain('[⚠ Drone 3 failed — Input size: 1000 tokens]');
    });
    
    it('should handle different payload formats', () => {
      const droneResults = [
        'Successfully processed first content.',
        '[Drone 2 failed: Rate limit exceeded]',
        '[Drone 3 failed: Network error]'
      ];
      
      const mockSessionStats = {
        totalInputTokens: 3000,
        displayTargetTokens: 1000,
        compressionRatio: '3.0'
      };
      
      // Test different payload formats the code should handle
      const mockPayloads = [
        { text: "This is sample text that should be estimated" }, // Using text property
        { token_estimate: 1500 },                                // Using token_estimate property
        { input_text: "Another sample text for estimating" }     // Using input_text property
      ];
      
      const contextCard = createContextCard(droneResults, mockSessionStats, mockPayloads);
      
      // Check that the context card contains the expected content with token estimates
      expect(contextCard).toContain('Successfully processed first content.');
      expect(contextCard).toContain('[⚠ Drone 2 failed');
      expect(contextCard).toContain('[⚠ Drone 3 failed');
      
      // Since token estimation depends on estimateTokens implementation which we're not testing directly,
      // we can just check the format pattern with a regex
      expect(contextCard).toMatch(/\[⚠ Drone 2 failed — Input size: \d+ tokens\]/);
      expect(contextCard).toMatch(/\[⚠ Drone 3 failed — Input size: \d+ tokens\]/);
    });
  });
  
  describe('Error Classification for Drone Failures', () => {
    it('should properly handle test scenarios without session stats', () => {
      // Test the simplified version of createContextCard that handles test cases
      const droneResults = [
        { success: true, summary: 'Success case' },
        { success: false, error: 'Rate limit error' },
        'Direct string result'
      ];
      
      const contextCard = createContextCard(droneResults);
      
      // Check that simple test mode creates appropriate failure messages
      expect(contextCard).toContain('Success case');
      expect(contextCard).toContain('[DRONE FAILED: Error - Rate limit error]');
      expect(contextCard).toContain('Direct string result');
    });
    
    it('should handle empty drone results list', () => {
      // Test with empty results array
      const droneResults = [];
      
      const contextCard = createContextCard(droneResults);
      
      // Should return empty string for empty results array
      expect(contextCard).toBe('');
    });
  });
});
