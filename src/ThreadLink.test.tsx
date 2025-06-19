import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThreadLink from './ThreadLink';

// Mock imports must be at the top because they're hoisted
vi.mock('./lib/storage.js', () => ({
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

// Setup mocks
vi.mock('../src/pipeline/orchestrator.js', () => ({
  runCondensationPipeline: vi.fn((options: any) => {
    if (options.cancelled && options.cancelled()) {
      return Promise.resolve({
        success: false,
        text: '',
        contextCard: '',
        executionTime: '0.1',
        sessionStats: {
          executionTime: '0.1',
          compressionRatio: '0.0',
          successfulDrones: 0,
          totalDrones: 1,
          initialTokens: 100,
          finalTokens: 0
        }
      });
    }
    
    // Call the progress callback to simulate progress if available
    if (options.onProgress) {
      options.onProgress({
        phase: 'processing',
        message: 'Processing...',
        completedDrones: 1,
        totalDrones: 3,
        progress: 0.33
      });
      
      options.onProgress({
        phase: 'processing',
        message: 'Processing...',
        completedDrones: 2,
        totalDrones: 3,
        progress: 0.66
      });
      
      options.onProgress({
        phase: 'processing',
        message: 'Finishing up...',
        completedDrones: 3,
        totalDrones: 3,
        progress: 1
      });
    }
    
    return Promise.resolve({
      success: true,
      text: 'Processed summary',
      contextCard: 'Processed summary with context',
      executionTime: '1.5',
      sessionStats: {
        executionTime: '1.5',
        compressionRatio: '10.5',
        successfulDrones: 3,
        totalDrones: 3,
        initialTokens: 1000,
        finalTokens: 95
      }
    });
  })
}));

vi.mock('../src/pipeline/config.js', () => ({
  calculateEstimatedDrones: () => 3
}));

vi.mock('./utils/textProcessing', () => ({
  calculateTargetTokens: (_count: number, level: string) => {
    if (level === 'light') return 200;
    if (level === 'aggressive') return 50;
    return 67; // balanced
  },
  estimateTokens: (text: string | null | undefined) => text?.length || 0,
  formatTokenCount: (count: number) => `~${count} tokens`
}));

vi.mock('./lib/client-api.js', () => ({
  MODEL_PROVIDERS: {
    'gemini-1.5-flash': 'google',
    'gpt-4.1-nano': 'openai',
    'gpt-4.1-mini': 'openai',
    'claude-3-5-haiku-20241022': 'anthropic'
  }
}));

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve())
  }
});

describe('ThreadLink Component Button Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('condense button should process input text', async () => {
    render(<ThreadLink />);
    
    // Add some text to the input
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Here is some sample text to be condensed. It should be processed and summarized.' } });
    
    // Click the condense button
    const condenseButton = screen.getByRole('button', { name: 'Condense' });
    fireEvent.click(condenseButton);
    
    // Check that loading starts
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument();
      // Wait for the processing to complete
    await waitFor(() => {
      expect(screen.getByText(/Processed summary with context/)).toBeInTheDocument();
    });
    
    // Check that the Copy and Reset buttons are now visible
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
  
  it('copy button should copy output text to clipboard', async () => {
    render(<ThreadLink />);
    
    // Add text and process it
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Sample text for copying' } });
    
    const condenseButton = screen.getByRole('button', { name: 'Condense' });
    fireEvent.click(condenseButton);
    
    // Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });
    
    // Click the copy button
    const copyButton = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);
    
    // Check that clipboard API was called with the correct text
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Processed summary with context');
    
    // Check that the copied state is displayed
    await waitFor(() => {
      const checkmark = screen.getByText('✓');
      expect(checkmark).toBeInTheDocument();
    });
  });
  
  it('reset button should clear the text and state', async () => {
    render(<ThreadLink />);
    
    // Add text and process it
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Text to be reset' } });
    
    const condenseButton = screen.getByRole('button', { name: 'Condense' });
    fireEvent.click(condenseButton);
    
    // Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });
    
    // Click the reset button
    const resetButton = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);
    
    // Check that the UI is reset - text area is empty and condense button is displayed again
    expect(textarea).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Condense' })).toBeInTheDocument();
    
    // Verify that copy and reset buttons are no longer visible
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });  it('handles generic clipboard errors gracefully', async () => {
    // Mock clipboard to reject with a generic error
    // @ts-ignore - need to override the mock for this test
    navigator.clipboard.writeText = vi.fn().mockRejectedValueOnce(new Error('Clipboard access denied'));
    
    render(<ThreadLink />);
    
    // Add text and process it
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Text for clipboard error test' } });
    
    const condenseButton = screen.getByRole('button', { name: 'Condense' });
    fireEvent.click(condenseButton);
    
    // Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });
    
    // Click the copy button
    const copyButton = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to copy to clipboard. Please try again.')).toBeInTheDocument();
    });
  });
  
  it('handles permission denied clipboard errors with specific message', async () => {
    // Mock clipboard to reject with a NotAllowedError
    const notAllowedError = new DOMException('Permission denied', 'NotAllowedError');
    // @ts-ignore - need to override the mock for this test
    navigator.clipboard.writeText = vi.fn().mockRejectedValueOnce(notAllowedError);
    
    render(<ThreadLink />);
    
    // Add text and process it
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Text for clipboard permission test' } });
    
    const condenseButton = screen.getByRole('button', { name: 'Condense' });
    fireEvent.click(condenseButton);
    
    // Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });
    
    // Click the copy button
    const copyButton = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);
    
    // Check that specific error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Clipboard permission denied. Check your browser settings.')).toBeInTheDocument();
    });
  });
    it('shows appropriate error when trying to copy empty content', async () => {
    render(<ThreadLink />);
    
    // Attempt to condense with empty text
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });
    
    // Click condense with empty input
    const condenseButton = screen.getByRole('button', { name: 'Condense' });
    fireEvent.click(condenseButton);
    
    // Should show validation error
    expect(screen.getByText('Please paste some text to condense')).toBeInTheDocument();
  });
});
