// BackdropClickBehavior.test.tsx - Tests for backdrop click-to-close functionality

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InfoPanel } from './InfoPanel';
import { SettingsModal } from './SettingModal';
import { APIKeysModal } from './APIKeysModal';
import { ExpandedSections } from '../types';

// Mock the MODEL_PROVIDERS module
vi.mock('../lib/client-api.js', () => ({
  MODEL_PROVIDERS: {
    'gemini-1.5-flash': 'google',
    'gpt-4.1-nano': 'openai',
    'gpt-4.1-mini': 'openai',
    'claude-3-5-haiku-20241022': 'anthropic'
  }
}));

// Mock the storage module
vi.mock('../lib/storage.js', () => ({
  getAvailableProviders: vi.fn(() => ['openai', 'anthropic'])
}));

// Test component for InfoPanel
const InfoPanelTestWrapper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    what: false,
    howto: false,
    compression: false,
    strategy: false,
    drones: false,
    recency: false,
    advanced: false,
    privacy: false
  });

  const onToggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Info Panel</button>
      <InfoPanel
        isOpen={isOpen}
        expandedSections={expandedSections}
        onToggleSection={onToggleSection}
        onClose={() => setIsOpen(false)}
      />
      {!isOpen && <div data-testid="info-panel-closed">Info Panel Closed</div>}
    </div>
  );
};

// Test component for SettingModal
const SettingModalTestWrapper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [model, setModel] = useState('gpt-4.1-nano');
  const [processingSpeed, setProcessingSpeed] = useState('normal');
  const [recencyMode, setRecencyMode] = useState(false);
  const [recencyStrength, setRecencyStrength] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advTemperature, setAdvTemperature] = useState(0.7);
  const [advDroneDensity, setAdvDroneDensity] = useState(3);  const [advMaxDrones, setAdvMaxDrones] = useState(100);
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Settings Modal</button>
      <SettingsModal
        isOpen={isOpen}
        model={model}
        setModel={setModel}
        processingSpeed={processingSpeed}
        setProcessingSpeed={setProcessingSpeed}
        recencyMode={recencyMode}
        setRecencyMode={setRecencyMode}
        recencyStrength={recencyStrength}
        setRecencyStrength={setRecencyStrength}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        advTemperature={advTemperature}
        setAdvTemperature={setAdvTemperature}
        advDroneDensity={advDroneDensity}
        setAdvDroneDensity={setAdvDroneDensity}
        advMaxDrones={advMaxDrones}
        setAdvMaxDrones={setAdvMaxDrones}
        useCustomPrompt={useCustomPrompt}
        setUseCustomPrompt={setUseCustomPrompt}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        googleAPIKey="test-google-key"
        openaiAPIKey="test-openai-key"
        anthropicAPIKey="test-anthropic-key"
        onClose={() => setIsOpen(false)}
      />      {!isOpen && <div data-testid="settings-modal-closed">Settings Modal Closed</div>}
    </div>
  );
};

// Test component for APIKeysModal
const APIKeysModalTestWrapper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [googleAPIKey, setGoogleAPIKey] = useState('');
  const [openaiAPIKey, setOpenaiAPIKey] = useState('');
  const [anthropicAPIKey, setAnthropicAPIKey] = useState('');
  const [googleCacheEnabled, setGoogleCacheEnabled] = useState(false);
  const [openaiCacheEnabled, setOpenaiCacheEnabled] = useState(false);
  const [anthropicCacheEnabled, setAnthropicCacheEnabled] = useState(false);

  const handleDeleteKey = (provider: 'google' | 'openai' | 'anthropic') => {
    switch (provider) {
      case 'google':
        setGoogleAPIKey('');
        break;
      case 'openai':
        setOpenaiAPIKey('');
        break;
      case 'anthropic':
        setAnthropicAPIKey('');
        break;
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open API Keys Modal</button>
      <APIKeysModal
        isOpen={isOpen}
        googleAPIKey={googleAPIKey}
        openaiAPIKey={openaiAPIKey}
        anthropicAPIKey={anthropicAPIKey}
        googleCacheEnabled={googleCacheEnabled}
        openaiCacheEnabled={openaiCacheEnabled}
        anthropicCacheEnabled={anthropicCacheEnabled}
        setGoogleAPIKey={setGoogleAPIKey}
        setOpenaiAPIKey={setOpenaiAPIKey}
        setAnthropicAPIKey={setAnthropicAPIKey}
        setGoogleCacheEnabled={setGoogleCacheEnabled}
        setOpenaiCacheEnabled={setOpenaiCacheEnabled}
        setAnthropicCacheEnabled={setAnthropicCacheEnabled}
        onClose={() => setIsOpen(false)}
        onDeleteKey={handleDeleteKey}
      />
      {!isOpen && <div data-testid="api-keys-modal-closed">API Keys Modal Closed</div>}
    </div>
  );
};

describe('Backdrop Click Behavior', () => {
  describe('InfoPanel', () => {
    it('should close when clicking the backdrop', () => {
      render(<InfoPanelTestWrapper />);
      
      // Verify modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('ThreadLink User Guide')).toBeInTheDocument();
      
      // Get the backdrop (the outermost div with backdrop styling)
      const backdrop = screen.getByRole('dialog').parentElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
      
      // Click the backdrop
      fireEvent.click(backdrop!);
      
      // Verify modal is closed
      expect(screen.getByTestId('info-panel-closed')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should NOT close when clicking the modal content', () => {
      render(<InfoPanelTestWrapper />);
      
      // Verify modal is open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Click on the modal content (the dialog itself)
      fireEvent.click(dialog);
      
      // Verify modal is still open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByTestId('info-panel-closed')).not.toBeInTheDocument();
    });

    it('should close when clicking the X button', () => {
      render(<InfoPanelTestWrapper />);
      
      // Verify modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Click the close button
      const closeButton = screen.getByLabelText('Close info panel');
      fireEvent.click(closeButton);
      
      // Verify modal is closed
      expect(screen.getByTestId('info-panel-closed')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('SettingModal', () => {
    it('should close when clicking the backdrop', () => {
      render(<SettingModalTestWrapper />);
      
      // Verify modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      
      // Get the backdrop (the outermost div with backdrop styling)
      const backdrop = screen.getByRole('dialog').parentElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
      
      // Click the backdrop
      fireEvent.click(backdrop!);
      
      // Verify modal is closed
      expect(screen.getByTestId('settings-modal-closed')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should NOT close when clicking the modal content', () => {
      render(<SettingModalTestWrapper />);
      
      // Verify modal is open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Click on the modal content (the dialog itself)
      fireEvent.click(dialog);
      
      // Verify modal is still open
      expect(screen.getByRole('dialog')).toBeInTheDocument();      expect(screen.queryByTestId('settings-modal-closed')).not.toBeInTheDocument();
    });
  });

  describe('APIKeysModal', () => {
    it('should close when clicking the backdrop', () => {
      render(<APIKeysModalTestWrapper />);
      
      // Verify modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('API Key Management')).toBeInTheDocument();
      
      // Get the backdrop (the outermost div with backdrop styling)
      const backdrop = screen.getByRole('dialog').parentElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
      
      // Click the backdrop
      fireEvent.click(backdrop!);
      
      // Verify modal is closed
      expect(screen.getByTestId('api-keys-modal-closed')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should NOT close when clicking the modal content', () => {
      render(<APIKeysModalTestWrapper />);
      
      // Verify modal is open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Click on the modal content (the dialog itself)
      fireEvent.click(dialog);
      
      // Verify modal is still open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByTestId('api-keys-modal-closed')).not.toBeInTheDocument();
    });

    it('should close when clicking the Cancel button', () => {
      render(<APIKeysModalTestWrapper />);
      
      // Verify modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Click the cancel button
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      // Verify modal is closed
      expect(screen.getByTestId('api-keys-modal-closed')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
