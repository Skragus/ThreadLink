// Simple unit test for the provider logic
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsModal } from './SettingModal';
import * as storage from '../lib/storage.js';

vi.mock('../lib/storage.js', () => ({
  getAvailableProviders: vi.fn(() => ({
    google: false,
    openai: false,  
    anthropic: false
  }))
}));

describe('SettingsModal Provider Logic', () => {
  it('should show models when API keys are provided via props', () => {
    const defaultProps = {
      isOpen: true,
      model: 'gemini-1.5-flash',
      setModel: vi.fn(),
      processingSpeed: 'balanced',
      setProcessingSpeed: vi.fn(),
      recencyMode: false,
      setRecencyMode: vi.fn(),
      recencyStrength: 1,
      setRecencyStrength: vi.fn(),
      showAdvanced: false,
      setShowAdvanced: vi.fn(),
      advTemperature: 0.5,
      setAdvTemperature: vi.fn(),
      advDroneDensity: 2,
      setAdvDroneDensity: vi.fn(),
      advMaxDrones: 50,
      setAdvMaxDrones: vi.fn(),
      useCustomPrompt: false,
      setUseCustomPrompt: vi.fn(),
      customPrompt: '',
      setCustomPrompt: vi.fn(),
      onClose: vi.fn()
    };

    // Test 1: No API keys at all
    const { rerender, container } = render(
      <SettingsModal 
        {...defaultProps}
        googleAPIKey=""
        openaiAPIKey=""
        anthropicAPIKey=""
      />
    );
    
    // Should show warning
    expect(container.textContent).toContain('No API keys configured');
    
    // Test 2: Google API key provided
    rerender(
      <SettingsModal 
        {...defaultProps}
        googleAPIKey="AIzaSyTest123456789"
        openaiAPIKey=""
        anthropicAPIKey=""
      />
    );
    
    // Should NOT show warning and should have Google models
    expect(container.textContent).not.toContain('No API keys configured');
    expect(container.textContent).toContain('Gemini 1.5 Flash');
    
    console.log('✅ Provider logic test passed');
  });
});
