// tests/output-assembly.test.js - Browser-Compatible Version
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createContextCard,
  calculateSessionStats,
  classifyError
} from '../src/pipeline/orchestrator.js';

// Mock the modules using vi.mock
vi.mock('../src/lib/utils.js', () => ({
  estimateTokens: vi.fn(text => Math.floor((text || "").length / 4)),
  cleanAnthropicIntros: vi.fn(text => text),
}));

vi.mock('../src/pipeline/config.js', () => ({
  TARGET_CONTEXT_CARD_TOKENS: 3000,
  MAX_FINAL_OUTPUT_TOKENS: 10000,
  MINIMUM_OUTPUT_PER_DRONE: 50,
  MAX_COMPRESSION_RATIO: 25,
  ABSOLUTE_MIN_VIABLE_DRONE_TOKENS: 100,
  DEFAULT_DRONE_OUTPUT_TOKEN_TARGET: 500,
  SEGMENT_TEXT_SEPARATOR: '\n\n',
  calculateEstimatedDrones: vi.fn(() => 3),
  calculateDroneOutputTarget: vi.fn(() => 500),
}));

describe('ThreadLink Output Assembly Pipeline (Browser Environment)', () => {  beforeEach(() => {
    vi.clearAllMocks();
    
    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock window.fs for browser environment tests
    global.window = global.window || {};
    global.window.fs = {
      readFile: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateSessionStats', () => {
    test('calculates stats for valid drone payloads', () => {
      const payloads = [
        { input_text: 'A'.repeat(4000), actual_token_count: 1000 },
        { input_text: 'B'.repeat(8000), actual_token_count: 2000 },
        { input_text: 'C'.repeat(6000), actual_token_count: 1500 }
      ];
      
      const stats = calculateSessionStats(payloads);
      
      expect(stats.totalInputTokens).toBe(4500);
      expect(stats.estimatedDrones).toBeGreaterThan(0);
      expect(stats.targetOutputPerDrone).toBeGreaterThan(0);
      expect(stats.compressionRatio).not.toBe('N/A');
      expect(parseFloat(stats.compressionRatio)).toBeGreaterThan(1);
    });

    test('handles string payloads correctly', () => {
      const payloads = [
        'A'.repeat(2000), // ~500 tokens
        'B'.repeat(4000), // ~1000 tokens
        'C'.repeat(2000)  // ~500 tokens
      ];
      
      const stats = calculateSessionStats(payloads);
      
      expect(stats.totalInputTokens).toBe(2000);
      expect(stats.estimatedDrones).toBeGreaterThan(0);
      expect(stats.compressionRatio).not.toBe('N/A');
    });
  });

  describe('createContextCard', () => {
    test('creates context card from successful drone results', () => {
      const droneResults = [
        "This is the first drone's comprehensive summary.",
        "This is the second drone's thorough condensation.",
        "This is the third drone's complete analysis."
      ];
      
      const sessionStats = {
        totalInputTokens: 12000,
        displayTargetTokens: 1500,
        estimatedDrones: 3
      };
      
      const contextCard = createContextCard(droneResults, sessionStats);
      
      expect(contextCard).toContain('# Threadlink Context Card');
      expect(contextCard).toContain('Source size: 12.000 tokens');
      expect(contextCard).toContain('Drones: 3');
      expect(contextCard).not.toContain('N/A:1');
    });

    test('CONFIRMS THE N/A:1 BUG IS FIXED - now shows 0.0:1', () => {
      const droneResults = [
        "[Drone 1 failed: Invalid API key]",
        "[Drone 2 failed: Invalid API key]", 
        "[Drone 3 failed: Invalid API key]"
      ];
      
      const sessionStats = {
        totalInputTokens: 10000,
        displayTargetTokens: 1500,
        estimatedDrones: 3
      };
      
      const contextCard = createContextCard(droneResults, sessionStats);
      
      expect(contextCard).toContain('0.0:1');
      expect(contextCard).toContain('Drones: 0');
      expect(sessionStats.compressionRatio).toBe('0.0');
      expect(sessionStats.successfulDrones).toBe(0);
    });
  });

  describe('Browser-Specific Tests', () => {    test('handles localStorage API keys correctly', async () => {
      // Test that your storage module works with browser localStorage
      const { saveAPIKey, getAPIKey } = await import('../src/lib/storage.js');
      
      const testKey = 'test-api-key-123';
      saveAPIKey('openai', testKey);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'threadlink_openai_api_key',
        testKey
      );
    });

    test('handles window.fs.readFile for CSV processing', async () => {
      const mockCSVContent = 'header1,header2\nvalue1,value2';
      window.fs.readFile.mockResolvedValue(mockCSVContent);
      
      // Your file reading logic here
      const content = await window.fs.readFile('test.csv', { encoding: 'utf8' });
      expect(content).toBe(mockCSVContent);
    });
  });
});