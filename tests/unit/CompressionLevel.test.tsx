import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import ThreadLink from '../../src/ThreadLink';
import * as textProcessing from '../../src/utils/textProcessing';

// Move mock declarations to the top due to hoisting
vi.mock('../../src/lib/storage.js', () => ({
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(() => null),
  getAPIKey: vi.fn(() => 'mock-api-key'),
  saveAPIKey: vi.fn(),
  getUseCustomPrompt: vi.fn(() => false),
  getCustomPrompt: vi.fn(() => ''),
  saveUseCustomPrompt: vi.fn(),
  saveCustomPrompt: vi.fn(),
  getAvailableProviders: vi.fn(() => ({
    google: true,
    openai: true,
    anthropic: true
  })),
  getSettings: vi.fn(() => ({
    model: 'gemini-1.5-flash',
    temperature: 0.3,
    processingSpeed: 'balanced',
    recencyMode: false,
    recencyStrength: 0,
    droneDensity: 10,
    maxDrones: 100,
    targetTokens: null,
    useCustomPrompt: false,
    customPrompt: null
  })),
  saveSettings: vi.fn(),
  getDefaultSettings: vi.fn(() => ({
    model: 'gemini-1.5-flash',
    temperature: 0.3,
    processingSpeed: 'balanced',
    recencyMode: false,
    recencyStrength: 0,
    droneDensity: 10,
    maxDrones: 100,
    targetTokens: null,
    useCustomPrompt: false,
    customPrompt: null
  }))
}));

// Mock pipeline module with runCondensationPipeline
const mockCondensationPipeline = vi.fn(() => Promise.resolve({
  text: 'Processed text',
  sessionStats: {
    executionTime: '1.2',
    compressionRatio: '10.5',
    successfulDrones: 5,
    totalDrones: 5,
    initialTokens: 1000,
    finalTokens: 95
  }
}));

vi.mock('../src/pipeline/orchestrator.js', () => ({
  runCondensationPipeline: mockCondensationPipeline
}));

vi.mock('../src/pipeline/config.js', () => ({
  calculateEstimatedDrones: vi.fn(() => 5)
}));

vi.mock('../src/lib/client-api.js', () => ({
  MODEL_PROVIDERS: {
    'gemini-1.5-flash': 'google',
    'gpt-4.1-nano': 'openai',
    'gpt-4.1-mini': 'openai',
    'claude-3-5-haiku-20241022': 'anthropic'
  },
  estimateTokens: vi.fn((_text) => 1000)
}));

// Direct test of the calculateTargetTokens function in a separate describe block
describe('calculateTargetTokens Function', () => {
  it('calculates correct tokens for light compression', () => {
    const result = textProcessing.calculateTargetTokens(1000, 'light');
    expect(result).toBe(200); // 1000 / 5 = 200
  });
  
  it('calculates correct tokens for balanced compression', () => {
    const result = textProcessing.calculateTargetTokens(1000, 'balanced');
    expect(result).toBe(67); // 1000 / 15 = ~67
  });
  
  it('calculates correct tokens for aggressive compression', () => {
    const result = textProcessing.calculateTargetTokens(1000, 'aggressive');
    expect(result).toBe(50); // 1000 / 30 = ~33, but minimum is 50
  });
  
  it('handles edge case with zero tokens', () => {
    const result = textProcessing.calculateTargetTokens(0, 'balanced');
    expect(result).toBe(100); // Returns default of 100 for zero tokens
  });
  
  it('respects minimum token value of 50', () => {
    const result = textProcessing.calculateTargetTokens(100, 'aggressive');
    // 100 / 30 is ~3.33, which is below the minimum of 50
    expect(result).toBe(50);
  });
});

describe('Compression Level UI Feature', () => {
  // Mock estimateTokens to return a consistent value for testing
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(textProcessing, 'estimateTokens').mockImplementation(() => 1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders compression level dropdown with default value', () => {
    render(<ThreadLink />);
    
    // Find the dropdown
    const compressionDropdown = screen.getByRole('combobox', { name: 'Compression level:' });
    expect(compressionDropdown).toBeInTheDocument();
    
    // Default value should be 'balanced'
    expect(compressionDropdown).toHaveValue('balanced');
    
    // Check that all options are available
    expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Balanced' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aggressive' })).toBeInTheDocument();
  });

  it('updates compression level when dropdown value changes', () => {
    render(<ThreadLink />);
    
    // Find and change the dropdown value
    const compressionDropdown = screen.getByRole('combobox', { name: 'Compression level:' });
    fireEvent.change(compressionDropdown, { target: { value: 'aggressive' } });
    
    // Check that the value was updated
    expect(compressionDropdown).toHaveValue('aggressive');
  });

  // Note: We test the integration of the dropdown value with targetTokens calculation
  // through unit tests on the calculateTargetTokens function above, since the UI testing
  // of the full pipeline is harder to mock correctly without seeing the internal state
});
