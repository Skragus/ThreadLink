// DroneDensity.test.tsx - Comprehensive tests for Drone Density input setting
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

describe('Drone Density Input Setting', () => {
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
    showAdvanced: true, // Start with advanced settings open
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

  describe('Visibility Rules', () => {
    it('should show drone density when recency mode is OFF', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      expect(screen.getByLabelText('Drone Density')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    it('should hide drone density when recency mode is ON', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          showAdvanced={true}
        />
      );

      expect(screen.queryByLabelText('Drone Density')).not.toBeInTheDocument();
    });

    it('should hide drone density when advanced settings are collapsed', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={false}
        />
      );

      expect(screen.queryByLabelText('Drone Density')).not.toBeInTheDocument();
    });
  });

  describe('Input Properties', () => {
    beforeEach(() => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={5}
        />
      );
    });

    it('should have correct input attributes', () => {
      const input = screen.getByLabelText('Drone Density');
      
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '20');
      expect(input).toHaveAttribute('step', '1');
      expect(input).toHaveAttribute('id', 'adv-drone-density');
    });

    it('should display the current value', () => {
      const input = screen.getByLabelText('Drone Density');
      expect(input).toHaveValue(5);
    });

    it('should have proper styling classes', () => {
      const input = screen.getByLabelText('Drone Density');
      expect(input).toHaveClass(
        'w-24', 'px-3', 'py-1', 'bg-[var(--bg-primary)]',
        'border', 'border-[var(--divider)]', 'rounded',
        'text-[var(--text-primary)]', 'text-sm', 'cursor-text'
      );
    });
  });

  describe('User Interactions', () => {
    let mockSetAdvDroneDensity: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSetAdvDroneDensity = vi.fn();
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={2}
          setAdvDroneDensity={mockSetAdvDroneDensity}
        />
      );
    });

    it('should call setAdvDroneDensity when value changes', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '5' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(5);
      expect(mockSetAdvDroneDensity).toHaveBeenCalledTimes(1);
    });

    it('should handle minimum value', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '1' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(1);
    });

    it('should handle maximum value', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '20' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(20);
    });

    it('should handle decimal values by converting to integer', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '7.5' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(7);
    });

    it('should handle empty string input', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(NaN);
    });
  });

  describe('Tooltip Information', () => {
    beforeEach(() => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );
    });    it('should display info icon next to label', () => {
      // Find the specific drone density info icon by looking for the parent structure
      const droneDensitySection = screen.getByLabelText('Drone Density').closest('div');
      const infoIcon = droneDensitySection?.querySelector('.cursor-help');
      expect(infoIcon).toBeInTheDocument();
      expect(infoIcon).toHaveClass('cursor-help');
    });

    it('should have tooltip text in DOM (even if hidden)', () => {
      expect(screen.getByText('Drones per 10k tokens. Controls cost vs. granularity')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );
    });

    it('should have proper label association', () => {
      const input = screen.getByLabelText('Drone Density');
      const label = screen.getByText('Drone Density');
      
      expect(input).toHaveAttribute('id', 'adv-drone-density');
      expect(label).toHaveAttribute('for', 'adv-drone-density');
    });

    it('should be focusable', () => {
      const input = screen.getByLabelText('Drone Density');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('should have semantic markup', () => {
      const label = screen.getByText('Drone Density').closest('label');
      expect(label).toHaveAttribute('for', 'adv-drone-density');
      expect(label).toHaveClass('select-none', 'cursor-default');
    });
  });

  describe('Value Validation Edge Cases', () => {
    let mockSetAdvDroneDensity: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSetAdvDroneDensity = vi.fn();
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          setAdvDroneDensity={mockSetAdvDroneDensity}
        />
      );
    });

    it('should handle negative values (browser constraint)', () => {
      const input = screen.getByLabelText('Drone Density');
      
      // Try to set a negative value
      fireEvent.change(input, { target: { value: '-5' } });
      
      // parseInt will still process it, but browser should prevent it
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(-5);
    });

    it('should handle values above maximum (browser constraint)', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '25' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(25);
    });

    it('should handle non-numeric input', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: 'abc' } });
      
      // parseInt('abc') returns NaN
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(NaN);
    });

    it('should handle zero value (below minimum)', () => {
      const input = screen.getByLabelText('Drone Density');
      
      fireEvent.change(input, { target: { value: '0' } });
      
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(0);
    });
  });

  describe('Integration with Recency Mode', () => {
    it('should hide drone density immediately when recency mode is toggled on', () => {
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      // Initially visible
      expect(screen.getByLabelText('Drone Density')).toBeInTheDocument();

      // Toggle recency mode on
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          showAdvanced={true}
        />
      );

      // Should be hidden
      expect(screen.queryByLabelText('Drone Density')).not.toBeInTheDocument();
    });

    it('should show drone density when recency mode is toggled off', () => {
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={true}
          showAdvanced={true}
        />
      );

      // Initially hidden
      expect(screen.queryByLabelText('Drone Density')).not.toBeInTheDocument();

      // Toggle recency mode off
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      // Should be visible
      expect(screen.getByLabelText('Drone Density')).toBeInTheDocument();
    });
  });
  describe('Focus and Blur Behavior', () => {
    it('should have focus styles when focused', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );
      
      const input = screen.getByLabelText('Drone Density');
      
      input.focus();
      
      // Check if focus styles are applied (these are CSS classes)
      expect(input).toHaveClass('focus:outline-none', 'focus:border-[var(--highlight-blue)]');
    });it('should maintain value after focus/blur cycle', () => {
      const mockSetAdvDroneDensity = vi.fn();
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={2}
          setAdvDroneDensity={mockSetAdvDroneDensity}
        />
      );
      
      const input = screen.getByLabelText('Drone Density');
      
      // Test without focus() first - just change the value
      fireEvent.change(input, { target: { value: '8' } });
      
      // Verify the callback was called
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(8);
      
      // Simulate the parent component updating the prop
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={8}
          setAdvDroneDensity={mockSetAdvDroneDensity}
        />
      );
      
      // Now test focus/blur behavior
      input.focus();
      input.blur();
      
      expect(input).toHaveValue(8);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders with same value', () => {
      const mockSetAdvDroneDensity = vi.fn();
      
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={5}
          setAdvDroneDensity={mockSetAdvDroneDensity}
        />
      );

      // Re-render with same props
      rerender(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={5}
          setAdvDroneDensity={mockSetAdvDroneDensity}
        />
      );

      // Setter should not have been called during re-renders
      expect(mockSetAdvDroneDensity).not.toHaveBeenCalled();
    });
  });
});
