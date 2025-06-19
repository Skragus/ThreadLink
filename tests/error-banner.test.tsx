/**
 * Error Banner Testing Suite
 * 
 * This script tests the error banner functionality to ensure it's production-ready.
 * It verifies different error triggers and error message displays.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThreadLink from '../src/ThreadLink';

// Mock the modules that are imported in ThreadLink
vi.mock('../src/pipeline/orchestrator.js', () => {
  return {
    runCondensationPipeline: vi.fn(),
    createContextCard: vi.fn(),
    calculateEstimatedDrones: vi.fn().mockReturnValue(5)
  };
});

vi.mock('../src/lib/storage.js', () => ({
  getAPIKey: vi.fn(),
  saveAPIKey: vi.fn(),
  removeAPIKey: vi.fn(),
  getCustomPrompt: vi.fn(),
  saveCustomPrompt: vi.fn(),
  getUseCustomPrompt: vi.fn(),
  saveUseCustomPrompt: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn()
}));

vi.mock('../src/lib/client-api.js', () => ({
  MODEL_PROVIDERS: {
    'gemini-1.5-flash': { provider: 'google', key: 'gemini-key' },
    'gpt-4o': { provider: 'openai', key: 'openai-key' },
    'claude-3-5-sonnet': { provider: 'anthropic', key: 'anthropic-key' }
  },
  estimateTokens: (text) => Math.round(text.length / 4)
}));

// Import mocked modules for type checking
import * as orchestrator from '../src/pipeline/orchestrator.js';
import * as storage from '../src/lib/storage.js';

describe('Error Banner Tests', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(storage.getAPIKey).mockImplementation((provider) => {
      if (provider === 'google') return 'google-api-key';
      if (provider === 'openai') return 'openai-api-key';
      if (provider === 'anthropic') return 'anthropic-api-key';
      return '';
    });
    
    vi.mocked(storage.getUseCustomPrompt).mockReturnValue(false);
    vi.mocked(storage.getCustomPrompt).mockReturnValue('');
    vi.mocked(storage.getSettings).mockReturnValue({
      model: 'gemini-1.5-flash',
      processingSpeed: 'balanced',
      recencyMode: false,
      recencyStrength: 1,
      showAdvanced: false,
      adv_temperature: 0.5,
      adv_droneDensity: 2,
      adv_maxDrones: 50
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display error when attempting to process empty text', async () => {
    render(<ThreadLink />);
    
    // Attempt to process with empty text
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Check that error message is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('Please paste some text to condense');
    expect(screen.getByTestId('error-display')).toHaveClass('bg-red-500', 'bg-opacity-10', 'border', 'border-red-500');
  });

  it('should display error when API key is missing', async () => {
    // Mock that API key is missing
    vi.mocked(storage.getAPIKey).mockReturnValue('');
    
    render(<ThreadLink />);
    
    // Add some text
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some conversation text to condense.' } });
    
    // Try to process
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Check that API key error is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('Please configure your API key to get started');
  });

  it('should display error when custom prompt is enabled but empty', async () => {
    // Mock that custom prompt is enabled but empty
    vi.mocked(storage.getUseCustomPrompt).mockReturnValue(true);
    vi.mocked(storage.getCustomPrompt).mockReturnValue('');
    
    render(<ThreadLink />);
    
    // Add some text
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some conversation text to condense.' } });
    
    // Try to process
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Check that custom prompt error is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('Custom prompt cannot be empty');
  });

  it('should display error when unknown model is selected', async () => {
    // Mock that an unknown model is selected
    vi.mocked(storage.getSettings).mockReturnValue({
      model: 'unknown-model',
      processingSpeed: 'balanced',
      recencyMode: false,
      recencyStrength: 1,
      showAdvanced: false,
      adv_temperature: 0.5,
      adv_droneDensity: 2,
      adv_maxDrones: 50
    });
    
    render(<ThreadLink />);
    
    // Add some text
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some conversation text to condense.' } });
    
    // Try to process
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Check that unknown model error is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('Unknown model: unknown-model');
  });
  it('should display error when processing is cancelled', async () => {
    // Mock successful pipeline start but will be cancelled
    vi.mocked(orchestrator.runCondensationPipeline).mockImplementation((options: any) => {
      // Trigger the progress callback a few times
      if (options && typeof options.progressCallback === 'function') {
        options.progressCallback({ phase: 'preparing', message: 'Preparing' });
        options.progressCallback({ phase: 'processing', message: 'Processing batch 1/5' });
      }
      
      // Simulate checking the cancelRef and stopping
      if (options && options.cancelRef && options.cancelRef.current) {
        return Promise.resolve({
          success: false,
          error: 'Processing was cancelled',
          cancelled: true
        });
      }
      
      return Promise.resolve({ 
        success: true,
        result: 'Condensed text', 
        stats: { executionTime: '2.5', compressionRatio: '4.0', successfulDrones: 5, totalDrones: 5 } 
      });
    });
    
    render(<ThreadLink />);
    
    // Add some text
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some long conversation that needs to be condensed.' } });
    
    // Start processing
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Wait for the loading overlay to appear
    await waitFor(() => {
      expect(screen.getByText(/processing batch 1\/5/i)).toBeInTheDocument();
    });
    
    // Find and click the cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toHaveTextContent('Processing was cancelled');
    });
  });
  it('should display error when pipeline processing fails', async () => {
    // Mock pipeline failure
    vi.mocked(orchestrator.runCondensationPipeline).mockResolvedValue({
      success: false,
      error: 'API rate limit exceeded',
      errorType: 'RATE_LIMIT',
      fatal: true,
      cancelled: false
    });
    
    render(<ThreadLink />);
    
    // Add some text
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some conversation text to process.' } });
    
    // Start processing
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toHaveTextContent('API rate limit exceeded');
    });
  });

  it('should display error when attempting to copy without content', async () => {
    // Mock the clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });
    
    render(<ThreadLink />);
    
    // Try to copy with no content
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    // Check that error message is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('No content to copy');
  });

  it('should clear error message when input text changes', async () => {
    render(<ThreadLink />);
    
    // Attempt to process with empty text to trigger an error
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Check that error message is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('Please paste some text to condense');
    
    // Change the input text
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some new text input.' } });
    
    // Check that error message is cleared
    await waitFor(() => {
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });
  });

  it('should clear error message after successful processing', async () => {
    // First trigger an error
    render(<ThreadLink />);
    const processButton = screen.getByRole('button', { name: /condense/i });
    fireEvent.click(processButton);
    
    // Check that error message is displayed
    expect(screen.getByTestId('error-display')).toHaveTextContent('Please paste some text to condense');
    
    // Mock successful processing    vi.mocked(orchestrator.runCondensationPipeline).mockResolvedValue({ 
      success: true,
      result: 'Condensed text', 
      stats: { executionTime: '2.5', compressionRatio: '4.0', successfulDrones: 5, totalDrones: 5 } 
    });
    
    // Add text and process again
    const textarea = screen.getByPlaceholderText(/paste your ai conversation/i);
    fireEvent.change(textarea, { target: { value: 'Some conversation text to process.' } });
    
    // Error should be gone after text change
    expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    
    // Process the text
    fireEvent.click(processButton);
    
    // Wait for processing to complete
    await waitFor(() => {
      // Should show stats instead of error
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
      expect(screen.getByTestId('stats-display')).toBeInTheDocument();
    });
  });
});
