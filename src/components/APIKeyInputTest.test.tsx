// Quick manual test script to verify API key behavior
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ThreadLink from '../ThreadLink';
import * as storage from '../lib/storage.js';

// Mock the dependencies
vi.mock('../lib/storage.js', () => ({
  getAPIKey: vi.fn(() => null), // No cached keys
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
    google: false,
    openai: false,
    anthropic: false
  }))
}));

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

describe('API Key Input Test - Real Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('should allow model selection when API key is entered (not cached)', async () => {
    render(<ThreadLink />);
    
    // Initially no models should be available (no cached keys, no input keys)
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    // Should show warning about no API keys initially
    expect(screen.getByText(/no api keys configured/i)).toBeInTheDocument();
    
    // Close settings and open API Keys modal
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    
    const apiKeysButton = screen.getByRole('button', { name: /api keys/i });
    fireEvent.click(apiKeysButton);
    
    // Enter a Google API key (but don't save to cache)
    const googleKeyInput = screen.getByPlaceholderText('AIza...');
    fireEvent.change(googleKeyInput, { target: { value: 'AIzaSyTest123456789' } });
    
    // Verify the key was entered
    expect(googleKeyInput).toHaveValue('AIzaSyTest123456789');
    
    // Close API Keys modal and open settings again
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    const settingsButton2 = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton2);
    
    // Now should NOT show warning and should have Google models available
    expect(screen.queryByText(/no api keys configured/i)).not.toBeInTheDocument();
    
    // Should show Google models
    expect(screen.getByText('Gemini 1.5 Flash')).toBeInTheDocument();
    expect(screen.getByText('Gemini 1.5 Pro')).toBeInTheDocument();
    
    console.log('✅ API key input test passed - models available without caching!');
  });
});
