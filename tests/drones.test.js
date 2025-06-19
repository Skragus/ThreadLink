// tests/drone-error-handling.test.js - Browser Version
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  classifyError,
  processDroneBatch,
  processDronesWithConcurrency,
} from '../src/pipeline/orchestrator.js';

// Mock ES modules
vi.mock('../src/lib/client-api.js', () => ({
  generateResponse: vi.fn(),
  estimateTokens: vi.fn(text => Math.floor((text || "").length / 4)),
  cleanAnthropicIntros: vi.fn(text => text),
  MODEL_PROVIDERS: {},
}));

vi.mock('../src/pipeline/config.js', () => ({
  DEFAULT_DRONE_PROMPT: "Test prompt with {TARGET_TOKENS} tokens target.",
  DRONE_INPUT_TOKEN_MIN: 1000,
  MAX_TOTAL_DRONES: 50,
  MAX_FINAL_OUTPUT_TOKENS: 10000,
  calculateDroneOutputTarget: vi.fn(() => 500),
  calculateEstimatedDrones: vi.fn(() => 3),
  MODEL_CONFIGS: {
    'gemini-1.5-flash': {
      safeConcurrency: 2,
      aggressive: true,
      rateLimitBackoff: 5000
    },
    'claude-3-5-haiku-20241022': {
      safeConcurrency: 1,
      aggressive: false,
      rateLimitBackoff: 10000
    }
  }
}));

// Helper function to create mock error objects
function mockError(status, message, headers = {}) {
  const error = new Error(message);
  error.status = status;
  error.response = { status };
  if (Object.keys(headers).length > 0) {
    error.response.headers = new Headers(headers); // Use browser Headers API
    error.headers = headers;
  }
  return error;
}

describe('Drone Error Handling (Browser)', () => {
  let generateResponse;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mocked function
    const clientApi = await import('../src/lib/client-api.js');
    generateResponse = clientApi.generateResponse;
    
    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('classifyError', () => {
    test('should classify rate limit errors (status 429)', () => {
      const err = mockError(429, 'Too Many Requests');
      const classification = classifyError(err);
      expect(classification.type).toBe('RATE_LIMIT');
      expect(classification.retryable).toBe(true);
      expect(classification.reduceConcurrency).toBe(true);
    });

    test('should handle browser-specific network errors', () => {
      // Browser-specific error types
      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError'; // Common browser fetch error
      
      const classification = classifyError(networkError);
      expect(classification.type).toBe('NETWORK_ERROR');
      expect(classification.retryable).toBe(true);
    });

    test('should handle CORS errors', () => {
      const corsError = new Error('CORS policy blocked');
      const classification = classifyError(corsError);
      expect(classification.type).toBe('NETWORK_ERROR');
      expect(classification.retryable).toBe(false); // CORS errors aren't retryable
    });
  });

  describe('processDroneBatch', () => {
    const batchData = { 
      input_text: "This is a test batch with sufficient content for processing." 
    };
    const batchIndex = 0;
    const totalBatches = 1;
    const options = { 
      model: 'gemini-1.5-flash', 
      temperature: 0.3, 
      targetTokens: 50, 
      retries: 2 
    };

    test.skip('should handle browser fetch errors', async () => {
      const fetchError = new TypeError('Failed to fetch');
      generateResponse.mockRejectedValueOnce(fetchError);
      generateResponse.mockResolvedValueOnce("Successful response after retry");
      
      const result = await processDroneBatch(
        batchData, 
        batchIndex, 
        totalBatches, 
        options
      );
      
      expect(result.success).toBe(true);
      expect(generateResponse).toHaveBeenCalledTimes(2);
    });

    test.skip('should handle API key from localStorage', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('test-api-key'),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
      
      generateResponse.mockResolvedValueOnce("Success with API key");
      
      const result = await processDroneBatch(
        batchData, 
        batchIndex, 
        totalBatches, 
        options
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('Browser-Specific Concurrency', () => {
    test.skip('should respect browser connection limits', async () => {
      const batches = Array(10).fill().map((_, i) => ({
        input_text: `Batch ${i} content`
      }));
      
      generateResponse.mockImplementation(async () => {
        // Simulate browser connection delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return "Processed successfully";
      });
      
      const startTime = Date.now();
      const results = await processDronesWithConcurrency(batches, {
        model: 'gemini-1.5-flash',
        maxConcurrency: 6, // Browser typically limits to 6 connections per domain
        retries: 0
      });
      
      const duration = Date.now() - startTime;
        expect(results).toHaveLength(10);
      expect(results.every(r => r !== null && r !== undefined)).toBe(true);
      
      // With concurrency of 6, should take roughly 2 batches worth of time
      expect(duration).toBeLessThan(100); // Should be fast with proper concurrency
    });

    test('should handle AbortController for cancellation', async () => {
      const controller = new AbortController();
      const batches = [{ input_text: "Test batch" }];
      
      // Cancel immediately
      controller.abort();
      
      const cancelled = () => controller.signal.aborted;
      
      await expect(
        processDronesWithConcurrency(batches, {
          model: 'gemini-1.5-flash',
          cancelled
        })
      ).rejects.toThrow('Processing was cancelled');
    });
  });

  describe('Browser Storage Integration', () => {
    test('should save progress to localStorage', async () => {
      const mockSetItem = vi.fn();
      window.localStorage = { setItem: mockSetItem };
      
      const onProgress = (update) => {
        // Save progress to localStorage
        localStorage.setItem('threadlink_progress', JSON.stringify(update));
      };
      
      generateResponse.mockResolvedValue("Success");
      
      await processDronesWithConcurrency(
        [{ input_text: "Test" }],
        { model: 'gemini-1.5-flash' },
        onProgress
      );
      
      expect(mockSetItem).toHaveBeenCalled();
      expect(mockSetItem.mock.calls[0][0]).toBe('threadlink_progress');
    });
  });
});