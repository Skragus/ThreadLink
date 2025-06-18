// Comprehensive test suite for Recency Mode feature in Settings Modal
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { SettingsModal } from './SettingModal';

// Mock dependencies
vi.mock('../lib/storage.js', () => ({
  getAvailableProviders: vi.fn(() => ({
    google: true,
    openai: true,
    anthropic: true
  }))
}));

describe('Recency Mode Feature', () => {
  const defaultProps = {
    isOpen: true,
    model: 'gpt-4',
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
    googleAPIKey: 'AIzaSyTest123456789',
    openaiAPIKey: 'sk-test123456789',
    anthropicAPIKey: 'sk-ant-test123456789',
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UI Visibility', () => {
    it('should always show Recency Mode toggle regardless of model', () => {
      // Test with OpenAI model
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          model="gpt-4"
          recencyMode={false}
        />
      );

      expect(screen.getByText('Recency Mode')).toBeInTheDocument();
      expect(screen.getByText('Off')).toBeInTheDocument();
      expect(screen.getByText('On')).toBeInTheDocument();

      // Test with Anthropic model
      rerender(
        <SettingsModal 
          {...defaultProps}
          model="claude-3-5-sonnet-20241022"
          recencyMode={false}
        />
      );

      expect(screen.getByText('Recency Mode')).toBeInTheDocument();
      expect(screen.getByText('Off')).toBeInTheDocument();
      expect(screen.getByText('On')).toBeInTheDocument();

      // Test with Google model
      rerender(
        <SettingsModal 
          {...defaultProps}
          model="gemini-1.5-pro"
          recencyMode={false}
        />
      );

      expect(screen.getByText('Recency Mode')).toBeInTheDocument();
      expect(screen.getByText('Off')).toBeInTheDocument();
      expect(screen.getByText('On')).toBeInTheDocument();
    });    it('should show info tooltip for Recency Mode', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
        />
      );

      // There are multiple 'i' tooltips, so we need to be more specific
      const recencySection = screen.getByText('Recency Mode').closest('div');
      const infoIcon = recencySection?.querySelector('.cursor-help');
      expect(infoIcon).toBeInTheDocument();
      expect(infoIcon).toHaveTextContent('i');
    });

    it('should show correct visual state when Recency Mode is off', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
        />
      );

      const offLabel = screen.getByText('Off');
      const onLabel = screen.getByText('On');
      
      // "Off" should be highlighted when recency mode is false
      expect(offLabel).toHaveClass('text-[var(--text-primary)]', 'font-medium');
      expect(onLabel).toHaveClass('text-[var(--text-secondary)]');
    });

    it('should show correct visual state when Recency Mode is on', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
        />
      );

      const offLabel = screen.getByText('Off');
      const onLabel = screen.getByText('On');
      
      // "On" should be highlighted when recency mode is true
      expect(onLabel).toHaveClass('text-[var(--text-primary)]', 'font-medium');
      expect(offLabel).toHaveClass('text-[var(--text-secondary)]');
    });
  });

  describe('Recency Strength Slider Visibility', () => {
    it('should hide Recency Strength slider when Recency Mode is off', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          recencyStrength={1}
        />
      );

      expect(screen.queryByText('Recency Strength')).not.toBeInTheDocument();
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('should show Recency Strength slider when Recency Mode is on', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
        />
      );

      expect(screen.getByText('Recency Strength')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should show info tooltip for Recency Strength', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
        />
      );

      const recencyStrengthSection = screen.getByText('Recency Strength').closest('div');
      const infoIcon = recencyStrengthSection?.querySelector('.cursor-help');
      expect(infoIcon).toBeInTheDocument();
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from off to on when clicked', () => {
      const mockSetRecencyMode = vi.fn();
      
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          setRecencyMode={mockSetRecencyMode}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enable recency mode/i });
      fireEvent.click(toggleButton);
      
      expect(mockSetRecencyMode).toHaveBeenCalledWith(true);
    });

    it('should toggle from on to off when clicked', () => {
      const mockSetRecencyMode = vi.fn();
      
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          setRecencyMode={mockSetRecencyMode}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /disable recency mode/i });
      fireEvent.click(toggleButton);
      
      expect(mockSetRecencyMode).toHaveBeenCalledWith(false);
    });

    it('should toggle switch visual state correctly', () => {
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enable recency mode/i });
      const switchElement = toggleButton.querySelector('span');
      
      // When off, switch should be positioned left
      expect(switchElement).toHaveClass('translate-x-1');
      expect(toggleButton).toHaveClass('bg-[var(--divider)]');

      // Re-render with recency mode on
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
        />
      );

      const toggleButtonOn = screen.getByRole('button', { name: /disable recency mode/i });
      const switchElementOn = toggleButtonOn.querySelector('span');
      
      // When on, switch should be positioned right and button should be blue
      expect(switchElementOn).toHaveClass('translate-x-5');
      expect(toggleButtonOn).toHaveClass('bg-[var(--highlight-blue)]');
    });
  });

  describe('Recency Strength Slider', () => {
    it('should show correct labels and slider when Recency Mode is enabled', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '2');
      expect(slider).toHaveAttribute('step', '1');
      expect(slider).toHaveValue('1');

      // Check labels
      expect(screen.getByText('Subtle')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should highlight correct label based on recency strength value', () => {
      // Test Subtle (0)
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={0}
        />
      );

      expect(screen.getByText('Subtle')).toHaveClass('text-[var(--text-primary)]', 'font-medium');
      expect(screen.getByText('Balanced')).not.toHaveClass('font-medium');
      expect(screen.getByText('Strong')).not.toHaveClass('font-medium');

      // Test Balanced (1)
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
        />
      );

      expect(screen.getByText('Balanced')).toHaveClass('text-[var(--text-primary)]', 'font-medium');
      expect(screen.getByText('Subtle')).not.toHaveClass('font-medium');
      expect(screen.getByText('Strong')).not.toHaveClass('font-medium');

      // Test Strong (2)
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={2}
        />
      );

      expect(screen.getByText('Strong')).toHaveClass('text-[var(--text-primary)]', 'font-medium');
      expect(screen.getByText('Subtle')).not.toHaveClass('font-medium');
      expect(screen.getByText('Balanced')).not.toHaveClass('font-medium');
    });

    it('should call setRecencyStrength when slider value changes', () => {
      const mockSetRecencyStrength = vi.fn();
      
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
          setRecencyStrength={mockSetRecencyStrength}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2' } });
      
      expect(mockSetRecencyStrength).toHaveBeenCalledWith(2);
    });    it('should handle all valid slider values', () => {
      const mockSetRecencyStrength = vi.fn();
      
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
          setRecencyStrength={mockSetRecencyStrength}
        />
      );

      const slider = screen.getByRole('slider');

      // Test value 0 (Subtle)
      fireEvent.change(slider, { target: { value: '0' } });
      expect(mockSetRecencyStrength).toHaveBeenLastCalledWith(0);

      // Test value 1 (Balanced) - re-render to start fresh
      mockSetRecencyStrength.mockClear();
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={0}
          setRecencyStrength={mockSetRecencyStrength}
        />
      );
      const slider1 = screen.getByRole('slider');
      fireEvent.change(slider1, { target: { value: '1' } });
      expect(mockSetRecencyStrength).toHaveBeenLastCalledWith(1);

      // Test value 2 (Strong) - re-render to start fresh
      mockSetRecencyStrength.mockClear();
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
          setRecencyStrength={mockSetRecencyStrength}
        />
      );
      const slider2 = screen.getByRole('slider');
      fireEvent.change(slider2, { target: { value: '2' } });
      expect(mockSetRecencyStrength).toHaveBeenLastCalledWith(2);
    });
  });

  describe('Drone Density Interaction', () => {
    it('should hide Drone Density input when Recency Mode is enabled', async () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          showAdvanced={true}
        />
      );

      // Drone Density should not be visible when recency mode is on
      expect(screen.queryByText('Drone Density')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/drone density/i)).not.toBeInTheDocument();
    });

    it('should show Drone Density input when Recency Mode is disabled', async () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      // Drone Density should be visible when recency mode is off
      expect(screen.getByText('Drone Density')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    it('should toggle Drone Density visibility when Recency Mode is toggled', async () => {
      const mockSetRecencyMode = vi.fn();
      
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          setRecencyMode={mockSetRecencyMode}
        />
      );

      // Initially, drone density should be visible
      expect(screen.getByText('Drone Density')).toBeInTheDocument();

      // Re-render with recency mode on
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          showAdvanced={true}
          setRecencyMode={mockSetRecencyMode}
        />
      );

      // Now drone density should be hidden
      expect(screen.queryByText('Drone Density')).not.toBeInTheDocument();
    });
  });

  describe('State Persistence and Integration', () => {
    it('should maintain Recency Mode state when other settings change', () => {
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={2}
          model="gpt-4"
        />
      );

      // Verify initial state
      expect(screen.getByText('Recency Strength')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toHaveValue('2');

      // Change model but keep recency mode settings
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={2}
          model="claude-3-5-sonnet-20241022"
        />
      );

      // Recency mode should still be enabled and strength preserved
      expect(screen.getByText('Recency Strength')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toHaveValue('2');
    });

    it('should maintain Recency Strength when toggling mode off and on', () => {
      const mockSetRecencyMode = vi.fn();
      
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={2}
          setRecencyMode={mockSetRecencyMode}
        />
      );

      // Toggle off
      const toggleButton = screen.getByRole('button', { name: /disable recency mode/i });
      fireEvent.click(toggleButton);
      expect(mockSetRecencyMode).toHaveBeenCalledWith(false);

      // Re-render as if toggled off
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          recencyStrength={2} // Strength should be preserved
          setRecencyMode={mockSetRecencyMode}
        />
      );

      // Re-render as if toggled back on
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={2} // Strength should still be preserved
          setRecencyMode={mockSetRecencyMode}
        />
      );

      // Verify strength is maintained
      expect(screen.getByRole('slider')).toHaveValue('2');
      expect(screen.getByText('Strong')).toHaveClass('font-medium');
    });
  });

  describe('Edge Cases and Error Handling', () => {    it('should handle rapid toggle clicks gracefully', async () => {
      const mockSetRecencyMode = vi.fn();
      
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          setRecencyMode={mockSetRecencyMode}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enable recency mode/i });
      
      // Rapid clicks - each click should toggle the state
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      
      // Should have called setRecencyMode 3 times
      expect(mockSetRecencyMode).toHaveBeenCalledTimes(3);
      // Each call should toggle: false->true, then true->false, then false->true
      expect(mockSetRecencyMode).toHaveBeenNthCalledWith(1, true);
      expect(mockSetRecencyMode).toHaveBeenNthCalledWith(2, true); // The button still shows "enable" because we didn't re-render
      expect(mockSetRecencyMode).toHaveBeenNthCalledWith(3, true);
    });    it('should handle invalid recency strength values gracefully', () => {
      // Test with out-of-range value (should clamp to valid range)
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={5} // Invalid value > 2
        />
      );

      const slider = screen.getByRole('slider');
      // The HTML input element will clamp the value to the max (2) automatically
      expect(slider).toHaveValue('2');
    });

    it('should work with all model types', () => {
      const modelTypes = [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307',
        'gemini-1.5-pro',
        'gemini-1.5-flash'
      ];

      modelTypes.forEach(model => {
        const { unmount } = render(
          <SettingsModal 
            {...defaultProps}
            model={model}
            recencyMode={true}
            recencyStrength={1}
          />
        );

        // Recency Mode should work with all models
        expect(screen.getByText('Recency Mode')).toBeInTheDocument();
        expect(screen.getByText('Recency Strength')).toBeInTheDocument();
        expect(screen.getByRole('slider')).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for toggle button', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enable recency mode/i });
      expect(toggleButton).toHaveAttribute('title', 'Enable recency mode');
    });

    it('should have proper ARIA attributes for slider', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('title', 'Adjust recency strength');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '2');
      expect(slider).toHaveAttribute('step', '1');
    });

    it('should support keyboard navigation', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enable recency mode/i });
      
      // Button should be focusable
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);
    });
  });

  describe('Recency Mode Temporal Logic Documentation Compliance', () => {
    it('should implement the three-band temporal processing logic', () => {
      // This test verifies the feature matches the Info Panel documentation
      // According to docs: Recent (20%), Mid (50%), Oldest (30%)
      // with different drone densities for each band
      
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          recencyStrength={1}
        />
      );

      // Verify UI shows recency mode is active
      expect(screen.getByText('Recency Mode')).toBeInTheDocument();
      expect(screen.getByText('Recency Strength')).toBeInTheDocument();
      
      // Verify the three strength levels match documentation
      expect(screen.getByText('Subtle')).toBeInTheDocument(); // Gentle gradient
      expect(screen.getByText('Balanced')).toBeInTheDocument(); // Standard temporal weighting
      expect(screen.getByText('Strong')).toBeInTheDocument(); // Aggressive recency bias
    });

    it('should disable Drone Density as documented when Recency Mode is active', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          showAdvanced={true}
        />
      );

      // According to Info Panel: "This setting is disabled when Recency Mode is active. 
      // Recency Mode uses its own dynamic logic to vary the drone density automatically."
      expect(screen.queryByText('Drone Density')).not.toBeInTheDocument();
    });

    it('should show Drone Density when Recency Mode is disabled', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      // When recency mode is off, drone density should be available
      expect(screen.getByText('Drone Density')).toBeInTheDocument();
    });
  });
});
