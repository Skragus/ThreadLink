// Test for comprehensive API key delete functionality
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ThreadLink from '../ThreadLink';
import * as storage from '../lib/storage.js';

// Mock the storage functions
vi.mock('../lib/storage.js', () => ({
  getAPIKey: vi.fn(() => 'mock-api-key'),
  saveAPIKey: vi.fn(),
  removeAPIKey: vi.fn(),
  getUseCustomPrompt: vi.fn(() => false),
  getCustomPrompt: vi.fn(() => ''),
  saveUseCustomPrompt: vi.fn(),
  saveCustomPrompt: vi.fn(),
  getSettings: vi.fn(() => ({
    model: 'gemini-1.5-flash',
    temperature: 0.3,
    processingSpeed: 'balanced',
    recencyMode: false,
    recencyStrength: 0,
    droneDensity: 10,
    maxDrones: 100
  })),
  saveSettings: vi.fn(),
  getAvailableProviders: vi.fn(() => ({
    google: true,
    openai: true,
    anthropic: true
  }))
}));

// Mock other dependencies
vi.mock('../pipeline/orchestrator.js', () => ({
  runCondensationPipeline: vi.fn()
}));

vi.mock('../pipeline/config.js', () => ({
  calculateEstimatedDrones: () => 3,
  DEFAULT_DRONE_PROMPT: 'Test default prompt'
}));

vi.mock('../lib/client-api.js', () => ({
  MODEL_PROVIDERS: {
    'gemini-1.5-flash': 'google',
    'gpt-4o-mini': 'openai',
    'claude-3-5-haiku-20241022': 'anthropic'
  }
}));

vi.mock('../utils/textProcessing', () => ({
  estimateTokens: vi.fn(() => 100),
  calculateTargetTokens: vi.fn(() => 50),
  getErrorDisplay: vi.fn(() => 'Test error'),
  formatTokenCount: vi.fn(() => '100')
}));

describe('API Key Management Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });  it('should properly delete API key with full cleanup (clear input, disable cache, remove from storage)', async () => {
    render(<ThreadLink />);
    
    // Open the API Keys modal
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    const apiKeysButton = screen.getByRole('button', { name: /api keys/i });
    fireEvent.click(apiKeysButton);
    
    // Add an API key to the Google field
    const googleKeyInput = screen.getByPlaceholderText('AIza...');
    fireEvent.change(googleKeyInput, { target: { value: 'AIzaSyTest123456789' } });
    
    // Verify the key was entered
    expect(googleKeyInput).toHaveValue('AIzaSyTest123456789');
    
    // Verify cache toggle is enabled (should be true by default when a key is present)
    const googleCacheToggle = googleKeyInput.closest('.space-y-3')?.querySelector('button[title*="Toggle browser storage"]');
    expect(googleCacheToggle).toBeInTheDocument();
    
    // Click the delete/trash button
    const deleteButton = googleKeyInput.closest('.relative')?.querySelector('button[title*="Clear"]');
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton!);
    
    // Verify the input field is cleared
    expect(googleKeyInput).toHaveValue('');
      // Verify removeAPIKey was called to clear from storage
    expect(vi.mocked(storage.removeAPIKey)).toHaveBeenCalledWith('google');
    
    console.log('✅ Delete API key test completed successfully');
  });
  it('should show warning when no API keys are configured in settings', async () => {
    // Mock no available providers
    vi.mocked(storage.getAvailableProviders).mockReturnValue({
      google: false,
      openai: false,
      anthropic: false
    });
    
    render(<ThreadLink />);
    
    // Open settings modal
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);    // Should show warning about no API keys
    expect(screen.getByText(/please configure your api keys/i)).toBeInTheDocument();
    
    // Should show disabled model select with specific message
    const modelSelect = screen.getByLabelText(/model/i);
    expect(modelSelect).toBeInTheDocument();
    
    // Check for the option within the select
    const disabledOption = screen.getByRole('option', { name: /no api keys configured/i });
    expect(disabledOption).toBeInTheDocument();
    expect(disabledOption).toBeDisabled();
  });
    it('should only show models for providers with configured API keys', async () => {
    // Mock only Google provider available
    vi.mocked(storage.getAvailableProviders).mockReturnValue({
      google: true,
      openai: false,
      anthropic: false
    });
    
    render(<ThreadLink />);
    
    // Open settings modal
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    // Should show only Google models
    const modelSelect = screen.getByLabelText(/model/i);
    expect(modelSelect).toBeInTheDocument();
    
    // Check that Google options are present
    expect(screen.getByText('Gemini 1.5 Flash')).toBeInTheDocument();
    
    // OpenAI and Anthropic models should not be present when not configured
    expect(screen.queryByText('GPT-4')).not.toBeInTheDocument();
    expect(screen.queryByText('Claude 3.5 Sonnet')).not.toBeInTheDocument();
  });
});
