// accessibility.test.tsx - Comprehensive Accessibility Test Suite

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Import components to test
import Header from '../components/Header';
import TextEditor from '../components/TextEditor';
import Footer from '../components/Footer';
import { SettingsModal } from '../components/SettingModal';
import { CustomPromptEditor } from '../components/CustomPromptEditor';
import APIKeysModal from '../components/APIKeysModal';
import ThreadLink from '../ThreadLink';

// Import types
import type { LoadingProgress } from '../types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
vi.mock('../lib/storage.js', () => ({
  getAPIKey: vi.fn(() => ''),
  saveAPIKey: vi.fn(),
  removeAPIKey: vi.fn(),
  getCustomPrompt: vi.fn(() => ''),
  saveCustomPrompt: vi.fn(),
  getUseCustomPrompt: vi.fn(() => false),
  saveUseCustomPrompt: vi.fn(),
  getSettings: vi.fn(() => ({})),
  saveSettings: vi.fn(),
  getAvailableProviders: vi.fn(() => ({ google: false, openai: false, anthropic: false }))
}));

vi.mock('../lib/client-api.js', () => ({
  MODEL_PROVIDERS: {},
  estimateTokens: vi.fn(() => 100),
  generateResponse: vi.fn()
}));

vi.mock('../pipeline/config.js', () => ({
  DEFAULT_DRONE_PROMPT: 'Default prompt for testing',
  calculateEstimatedDrones: vi.fn(() => 5)
}));

vi.mock('../pipeline/orchestrator.js', () => ({
  runCondensationPipeline: vi.fn()
}));

describe('Accessibility Test Suite', () => {
  describe('Header Component', () => {
    const mockProps = {
      onInfoClick: vi.fn(),
      onAPIKeysClick: vi.fn(),
      onSettingsClick: vi.fn()
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<Header {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for all buttons', () => {
      render(<Header {...mockProps} />);
      
      expect(screen.getByLabelText('Open help documentation')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage API keys')).toBeInTheDocument();
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
    });    it('should be keyboard navigable', () => {
      render(<Header {...mockProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should be focusable by default (no need for explicit tabIndex)
        expect(button).not.toHaveAttribute('disabled');
        
        // Test that click events are triggered by keyboard
        button.focus();
        fireEvent.keyDown(button, { key: 'Enter' });
        fireEvent.keyDown(button, { key: ' ' });
      });
    });

    it('should have proper heading structure', () => {
      render(<Header {...mockProps} />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('ThreadLink');
    });
  });
  describe('TextEditor Component', () => {
    const mockProps = {
      displayText: 'Sample text',
      isLoading: false,
      isProcessed: false,
      error: '',
      stats: null,
      loadingProgress: { phase: 'preparing' as const, message: 'Preparing...' },
      isCancelling: false,
      errorRef: React.createRef<HTMLDivElement>(),
      statsRef: React.createRef<HTMLDivElement>(),
      outputTextareaRef: React.createRef<HTMLTextAreaElement>(),
      onTextChange: vi.fn(),
      onCancel: vi.fn()
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<TextEditor {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper textarea accessibility', () => {
      render(<TextEditor {...mockProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', 'Paste your AI conversation here...');
    });

    it('should have accessible error display', () => {
      const propsWithError = {
        ...mockProps,
        error: 'Test error message'
      };
      
      render(<TextEditor {...propsWithError} />);
      
      const errorElement = screen.getByTestId('error-display');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Test error message');
    });

    it('should have accessible stats display', () => {
      const propsWithStats = {
        ...mockProps,
        stats: {
          executionTime: 5.2,
          compressionRatio: 3.5,
          successfulDrones: 8,
          totalDrones: 10
        }
      };
      
      render(<TextEditor {...propsWithStats} />);
      
      const statsElement = screen.getByTestId('stats-display');
      expect(statsElement).toBeInTheDocument();
    });

    it('should have accessible image with alt text', () => {
      render(<TextEditor {...mockProps} />);
      
      const image = screen.getByAltText('Powered by Bolt.new');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Footer Component', () => {
    const mockProps = {
      tokenCount: 1500,
      outputTokenCount: 500,
      compressionRatio: 'balanced',
      onCompressionChange: vi.fn(),
      isProcessed: false,
      isLoading: false,
      isCopied: false,
      onCondense: vi.fn(),
      onCopy: vi.fn(),
      onReset: vi.fn()
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<Footer {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have properly labeled form controls', () => {
      render(<Footer {...mockProps} />);
      
      const select = screen.getByLabelText('Compression level:');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('id', 'compression-ratio-select');
    });

    it('should have accessible button states', () => {
      render(<Footer {...mockProps} />);
      
      const condenseButton = screen.getByRole('button', { name: /condense/i });
      expect(condenseButton).toBeInTheDocument();
      expect(condenseButton).not.toBeDisabled();
    });

    it('should handle loading state accessibility', () => {
      const loadingProps = { ...mockProps, isLoading: true };
      render(<Footer {...loadingProps} />);
      
      const processingButton = screen.getByRole('button', { name: /processing/i });
      expect(processingButton).toBeDisabled();
    });
  });

  describe('Settings Modal', () => {
    const mockProps = {
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
      googleAPIKey: '',
      openaiAPIKey: '',
      anthropicAPIKey: '',
      onClose: vi.fn()
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<SettingsModal {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper modal accessibility', () => {
      render(<SettingsModal {...mockProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'settings-title');
    });

    it('should have proper form labels', () => {
      render(<SettingsModal {...mockProps} />);
      
      const modelSelect = screen.getByLabelText('Model');
      expect(modelSelect).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(<SettingsModal {...mockProps} />);
      
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Custom Prompt Editor', () => {
    const mockProps = {
      isOpen: true,
      customPrompt: '',
      onSave: vi.fn(),
      onBack: vi.fn()
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<CustomPromptEditor {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible textarea', () => {
      render(<CustomPromptEditor {...mockProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', 'Enter your custom prompt...');
    });

    it('should handle keyboard navigation', () => {
      render(<CustomPromptEditor {...mockProps} />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.keyDown(backButton, { key: 'Enter' });
      expect(mockProps.onBack).toHaveBeenCalled();
    });
  });

  describe('API Keys Modal', () => {
    const mockProps = {
      isOpen: true,
      googleAPIKey: '',
      openaiAPIKey: '',
      anthropicAPIKey: '',
      googleCacheEnabled: false,
      openaiCacheEnabled: false,
      anthropicCacheEnabled: false,
      setGoogleAPIKey: vi.fn(),
      setOpenaiAPIKey: vi.fn(),
      setAnthropicAPIKey: vi.fn(),
      setGoogleCacheEnabled: vi.fn(),
      setOpenaiCacheEnabled: vi.fn(),
      setAnthropicCacheEnabled: vi.fn(),
      onClose: vi.fn(),
      onDeleteKey: vi.fn()
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<APIKeysModal {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper modal accessibility', () => {
      render(<APIKeysModal {...mockProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby', 'api-keys-title');
    });

    it('should have accessible form inputs', () => {
      render(<APIKeysModal {...mockProps} />);
      
      const inputs = screen.getAllByDisplayValue('');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'password');
      });
    });
  });

  describe('Color Contrast and Visual Design', () => {
    it('should test focus indicators', () => {
      const { container } = render(
        <Header 
          onInfoClick={vi.fn()} 
          onAPIKeysClick={vi.fn()} 
          onSettingsClick={vi.fn()} 
        />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        fireEvent.focus(button);
        // Check that focus is properly managed
        expect(document.activeElement).toBe(button);
      });
    });
  });

  describe('Full Application Integration', () => {
    it('should have no accessibility violations on main app', async () => {
      // Mock all the external dependencies properly
      const { container } = render(<ThreadLink />);
      
      // Wait for any async operations to complete
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
