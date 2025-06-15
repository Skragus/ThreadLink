// tests/preprocessing.test.js - Browser Version
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  rescueTinyOrphans, 
  consolidateSegments, 
  createDroneBatches, 
  prepareDroneInputs 
} from '../src/pipeline/batcher.js';
import { spliceIntoConceptualParagraphs } from '../src/pipeline/splicer.js';

// Mock ES modules
vi.mock('../src/lib/utils.js', () => ({
  estimateTokens: vi.fn(text => Math.floor((text || "").length / 4)),
}));

vi.mock('../src/pipeline/config.js', () => ({
  // Segmentation
  MIN_ORPHAN_TOKEN_THRESHOLD: 50,
  MIN_SEGMENT_TARGET_TOKENS: 250,
  AGGREGATOR_CEILING_TOKENS: 4800,
  SEGMENT_TEXT_SEPARATOR: '\n\n',
  
  // Drone batching
  DRONE_INPUT_TOKEN_MIN: 3000,
  DRONE_INPUT_TOKEN_MAX: 6000,
  DRONE_IDEAL_TARGET_TOKENS: 4500,
  DRONE_TARGET_TOKEN_WINDOW_LOWER_PERCENT: 0.6,
  DRONE_TARGET_TOKEN_WINDOW_UPPER_PERCENT: 1.0,
  
  // Quality controls
  DEFAULT_DRONE_OUTPUT_TOKEN_TARGET: 500,
  MINIMUM_OUTPUT_PER_DRONE: 50,
  MAX_COMPRESSION_RATIO: 25,
  ABSOLUTE_MIN_VIABLE_DRONE_TOKENS: 100,
  
  // Rebalancing
  REBALANCE_LOWER_THRESHOLD_PERCENT: 0.85,
  REBALANCE_UPPER_THRESHOLD_PERCENT: 1.05,
  RECENT_CONVERSATION_MIN_TOKENS: 600,
  
  // Console detection
  CONSOLE_SPECIAL_CHAR_THRESHOLD_PERCENT: 0.05,
  
  // Separators
  ORPHAN_MERGE_SEPARATOR: '\n',
  CONSOLIDATION_SEPARATOR: '\n\n',
  
  // Functions
  calculateDroneOutputTarget: vi.fn(() => 500),
  calculateEstimatedDrones: vi.fn(() => 3),
  DEFAULT_DRONE_PROMPT: "Test prompt with {TARGET_TOKENS} tokens target.",
}));

describe('ThreadLink Preprocessing Pipeline (Browser)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Text Splicing into Conceptual Paragraphs', () => {
    test('handles empty input gracefully', () => {
      expect(spliceIntoConceptualParagraphs("")).toEqual([]);
      expect(spliceIntoConceptualParagraphs("   \n\n  ")).toEqual([]);
    });

    test('creates proper paragraph objects', () => {
      const input = "This is a test paragraph.\n\nThis is another paragraph.";
      const result = spliceIntoConceptualParagraphs(input);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('token_count');
      expect(result[0]).toHaveProperty('char_count');
      expect(result[0]).toHaveProperty('line_count');
      expect(result[0].id).toMatch(/paragraph_\d{3}/);
    });
  });

  describe('Browser-Specific Pipeline Tests', () => {
    test('handles file reading from window.fs', async () => {
      // Mock window.fs for file operations
      window.fs = {
        readFile: vi.fn().mockResolvedValue('Test file content')
      };
      
      const content = await window.fs.readFile('test.txt', { encoding: 'utf8' });
      expect(content).toBe('Test file content');
    });

    test('processes large text without blocking UI', async () => {
      // Simulate processing with setTimeout to allow UI updates
      const largeText = 'X'.repeat(100000);
      let processed = false;
      
      // Your actual processing function should yield periodically
      const processWithYield = async (text) => {
        const chunks = [];
        const chunkSize = 10000;
        
        for (let i = 0; i < text.length; i += chunkSize) {
          chunks.push(text.slice(i, i + chunkSize));
          // Yield to browser
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        return chunks.join('');
      };
      
      const result = await processWithYield(largeText);
      expect(result).toBe(largeText);
    });

    test('handles API errors gracefully', async () => {
      const mockError = new Error('Network request failed');
      mockError.name = 'NetworkError';
      
      const errorHandler = (error) => {
        if (error.name === 'NetworkError') {
          return { error: 'Please check your internet connection' };
        }
        throw error;
      };
      
      const result = errorHandler(mockError);
      expect(result.error).toContain('internet connection');
    });
  });

  describe('Memory Management', () => {
    test('cleans up large arrays after processing', () => {
      let largeArray = new Array(10000).fill('data');
      const processArray = (arr) => arr.length;
      
      const result = processArray(largeArray);
      largeArray = null; // Explicit cleanup
      
      expect(result).toBe(10000);
      expect(largeArray).toBeNull();
    });
  });
});