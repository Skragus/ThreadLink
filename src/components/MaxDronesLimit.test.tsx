// MaxDronesLimit.test.tsx - Comprehensive tests for Max Drones Limit setting
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

describe('Max Drones Limit Setting', () => {
  const defaultProps = {
    isOpen: true,
    model: 'gpt-4',
    setModel: vi.fn(),
    processingSpeed: 'normal' as const,
    setProcessingSpeed: vi.fn(),
    recencyMode: false,
    setRecencyMode: vi.fn(),
    recencyStrength: 1,
    setRecencyStrength: vi.fn(),
    showAdvanced: true,
    setShowAdvanced: vi.fn(),
    advTemperature: 0.7,
    setAdvTemperature: vi.fn(),
    advDroneDensity: 2,
    setAdvDroneDensity: vi.fn(),
    advMaxDrones: 50,
    setAdvMaxDrones: vi.fn(),
    useCustomPrompt: false,
    setUseCustomPrompt: vi.fn(),
    customPrompt: '',
    setCustomPrompt: vi.fn(),
    googleAPIKey: 'test-google-key',
    openaiAPIKey: 'test-openai-key',
    anthropicAPIKey: 'test-anthropic-key',
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility and Location', () => {
    it('should show max drones limit in the DANGER ZONE section', () => {
      render(<SettingsModal {...defaultProps} />);

      // Should be in danger zone section
      expect(screen.getByText('DANGER ZONE')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Drones Limit')).toBeInTheDocument();
    });

    it('should only show when advanced settings are expanded', () => {
      const { rerender } = render(
        <SettingsModal {...defaultProps} showAdvanced={false} />
      );

      // Should not be visible when advanced settings collapsed
      expect(screen.queryByLabelText('Max Drones Limit')).not.toBeInTheDocument();

      // Should be visible when advanced settings expanded
      rerender(<SettingsModal {...defaultProps} showAdvanced={true} />);
      expect(screen.getByLabelText('Max Drones Limit')).toBeInTheDocument();
    });    it('should have proper danger zone styling and warning indicators', () => {
      render(<SettingsModal {...defaultProps} />);

      const label = screen.getByText('Max Drones Limit');
      const dangerZoneTitle = screen.getByText('DANGER ZONE');

      // Check danger zone styling
      expect(dangerZoneTitle.parentElement).toHaveClass('text-red-400/80');
      
      // Check label has red styling
      expect(label).toHaveClass('text-red-400/80');
    });
  });

  describe('Input Properties and Attributes', () => {
    beforeEach(() => {
      render(<SettingsModal {...defaultProps} />);
    });

    it('should have correct input attributes', () => {
      const input = screen.getByLabelText('Max Drones Limit');

      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '10');
      expect(input).toHaveAttribute('max', '200');
      expect(input).toHaveAttribute('step', '10');
      expect(input).toHaveAttribute('id', 'adv-max-drones');
    });

    it('should display the current value', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      expect(input).toHaveValue(50);
    });

    it('should have proper danger zone styling classes', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      expect(input).toHaveClass('border-red-500/30');
      expect(input).toHaveClass('focus:border-red-500/50');
      expect(input).toHaveClass('w-24');
    });
  });

  describe('User Interactions and Value Changes', () => {
    let mockSetAdvMaxDrones: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSetAdvMaxDrones = vi.fn();
      render(
        <SettingsModal 
          {...defaultProps}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );
    });

    it('should call setAdvMaxDrones when value changes', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '100' } });
      
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(100);
      expect(mockSetAdvMaxDrones).toHaveBeenCalledTimes(1);
    });

    it('should handle minimum value (10)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '10' } });
      
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(10);
    });

    it('should handle maximum value (200)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '200' } });
      
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(200);
    });

    it('should handle step increment (multiples of 10)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '80' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(80);

      fireEvent.change(input, { target: { value: '120' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(120);
    });

    it('should handle non-step values (browser will handle)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      // User can type intermediate values, browser handles step validation
      fireEvent.change(input, { target: { value: '75' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(75);
    });

    it('should handle empty string input', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '' } });
      
      // parseInt('') returns NaN, but the function still gets called
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(NaN);
    });
  });

  describe('Tooltip Information', () => {
    beforeEach(() => {
      render(<SettingsModal {...defaultProps} />);
    });    it('should display danger-styled info icon next to label', () => {
      render(<SettingsModal {...defaultProps} />);
      
      // Look for all info icons and find the one with red styling (danger zone)
      const infoIcons = screen.getAllByText('i');
      const dangerInfoIcon = infoIcons.find(icon => 
        icon.classList.contains('text-red-400/80')
      );
      
      expect(dangerInfoIcon).toBeInTheDocument();
      
      // Check it has red border styling for danger zone
      expect(dangerInfoIcon).toHaveClass('border-red-400/80');
      expect(dangerInfoIcon).toHaveClass('text-red-400/80');
    });

    it('should have tooltip text about safety limit', () => {
      const tooltipText = screen.getByText('Hard safety limit on total drones per job');
      expect(tooltipText).toBeInTheDocument();
      
      // Tooltip should be initially hidden
      expect(tooltipText).toHaveClass('opacity-0');
      expect(tooltipText).toHaveClass('group-hover:opacity-100');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<SettingsModal {...defaultProps} />);
    });

    it('should have proper label association', () => {
      const label = screen.getByText('Max Drones Limit');
      const input = screen.getByLabelText('Max Drones Limit');
      
      expect(label).toHaveAttribute('for', 'adv-max-drones');
      expect(input).toHaveAttribute('id', 'adv-max-drones');
    });

    it('should be focusable', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      input.focus();
      expect(input).toHaveFocus();
    });

    it('should have semantic markup for danger zone', () => {
      const label = screen.getByLabelText('Max Drones Limit');
      
      // Should be within a proper form structure
      expect(label.tagName).toBe('INPUT');
      expect(label.closest('div')).toHaveClass('flex');
    });
  });

  describe('Value Validation and Edge Cases', () => {
    let mockSetAdvMaxDrones: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSetAdvMaxDrones = vi.fn();
      render(
        <SettingsModal 
          {...defaultProps}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );
    });

    it('should handle values below minimum (browser constraint)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      // Browser will handle min validation, but onChange still fires
      fireEvent.change(input, { target: { value: '5' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(5);
    });

    it('should handle values above maximum (browser constraint)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      // Browser will handle max validation, but onChange still fires
      fireEvent.change(input, { target: { value: '300' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(300);
    });

    it('should handle non-numeric input', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      // parseInt will return NaN for non-numeric input
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(NaN);
    });

    it('should handle zero value (below minimum)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '0' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(0);
    });

    it('should handle decimal values (converted to integer)', () => {
      const input = screen.getByLabelText('Max Drones Limit');
      
      fireEvent.change(input, { target: { value: '75.7' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(75); // parseInt truncates
    });
  });

  describe('Relationship with Drone Density', () => {
    it('should display both drone density and max drones when advanced settings open', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      expect(screen.getByLabelText('Drone Density')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Drones Limit')).toBeInTheDocument();
    });

    it('should maintain independent values for drone density and max drones', () => {
      const mockSetAdvDroneDensity = vi.fn();
      const mockSetAdvMaxDrones = vi.fn();
      
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
          advDroneDensity={3}
          advMaxDrones={80}
          setAdvDroneDensity={mockSetAdvDroneDensity}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );

      const densityInput = screen.getByLabelText('Drone Density');
      const maxDronesInput = screen.getByLabelText('Max Drones Limit');

      expect(densityInput).toHaveValue(3);
      expect(maxDronesInput).toHaveValue(80);

      // Change drone density
      fireEvent.change(densityInput, { target: { value: '5' } });
      expect(mockSetAdvDroneDensity).toHaveBeenCalledWith(5);
      expect(mockSetAdvMaxDrones).not.toHaveBeenCalled();

      // Change max drones
      fireEvent.change(maxDronesInput, { target: { value: '120' } });
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(120);
    });
  });

  describe('Safety Limit Context and Warning Indicators', () => {
    it('should be clearly marked as a safety feature in danger zone', () => {
      render(<SettingsModal {...defaultProps} />);

      // Should be in danger zone with warning styling
      const dangerZone = screen.getByText('DANGER ZONE');
      expect(dangerZone).toBeInTheDocument();
      
      // Should have AlertTriangle icon in danger zone
      const dangerZoneSection = dangerZone.closest('div');
      expect(dangerZoneSection).toBeInTheDocument();
    });

    it('should have distinct styling from regular settings', () => {
      render(
        <SettingsModal 
          {...defaultProps}
          recencyMode={false}
          showAdvanced={true}
        />
      );

      const densityInput = screen.getByLabelText('Drone Density');
      const maxDronesInput = screen.getByLabelText('Max Drones Limit');

      // Max drones should have red border, drone density should not
      expect(maxDronesInput).toHaveClass('border-red-500/30');
      expect(densityInput).not.toHaveClass('border-red-500/30');
    });

    it('should indicate this is a hard limit via tooltip', () => {
      render(<SettingsModal {...defaultProps} />);

      const tooltipText = screen.getByText('Hard safety limit on total drones per job');
      expect(tooltipText).toBeInTheDocument();
      
      // Should emphasize "Hard safety limit"
      expect(tooltipText.textContent).toContain('Hard safety limit');
    });
  });

  describe('Focus and Blur Behavior', () => {
    it('should have focus styles when focused', () => {
      render(<SettingsModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Max Drones Limit');
      
      input.focus();
      
      // Check if focus styles are applied (red themed for danger zone)
      expect(input).toHaveClass('focus:outline-none', 'focus:border-red-500/50');
    });

    it('should maintain value after focus/blur cycle', () => {
      const mockSetAdvMaxDrones = vi.fn();
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          advMaxDrones={100}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );
      
      const input = screen.getByLabelText('Max Drones Limit');
      
      // Test without focus() first - just change the value
      fireEvent.change(input, { target: { value: '150' } });
      
      // Verify the callback was called
      expect(mockSetAdvMaxDrones).toHaveBeenCalledWith(150);
      
      // Simulate the parent component updating the prop
      rerender(
        <SettingsModal 
          {...defaultProps}
          advMaxDrones={150}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );
      
      // Now test focus/blur behavior
      input.focus();
      input.blur();
      
      expect(input).toHaveValue(150);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders with same value', () => {
      const mockSetAdvMaxDrones = vi.fn();
      const { rerender } = render(
        <SettingsModal 
          {...defaultProps}
          advMaxDrones={50}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );
      
      // Re-render with same props
      rerender(
        <SettingsModal 
          {...defaultProps}
          advMaxDrones={50}
          setAdvMaxDrones={mockSetAdvMaxDrones}
        />
      );
      
      const input = screen.getByLabelText('Max Drones Limit');
      expect(input).toHaveValue(50);
      
      // Should not have been called during re-render
      expect(mockSetAdvMaxDrones).not.toHaveBeenCalled();
    });
  });
});
