// Comprehensive test suite for LLM Temperature feature in Advanced Settings
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

describe('LLM Temperature Advanced Setting', () => {
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

  describe('UI Visibility and Structure', () => {
    it('should not show temperature control when advanced settings are hidden', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={false} />);
      
      expect(screen.queryByLabelText('LLM Temperature')).not.toBeInTheDocument();
      expect(screen.queryByRole('spinbutton', { name: /temperature/i })).not.toBeInTheDocument();
    });

    it('should show temperature control when advanced settings are visible', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      const temperatureLabel = screen.getByLabelText('LLM Temperature');
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      expect(temperatureLabel).toBeInTheDocument();
      expect(temperatureInput).toBeInTheDocument();
      expect(temperatureInput).toHaveAttribute('id', 'adv-temperature');
      expect(temperatureInput).toHaveAttribute('type', 'number');
    });

    it('should have correct input attributes and constraints', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      expect(temperatureInput).toHaveAttribute('min', '0');
      expect(temperatureInput).toHaveAttribute('max', '2');
      expect(temperatureInput).toHaveAttribute('step', '0.1');
      expect(temperatureInput).toHaveAttribute('type', 'number');
    });    it('should display tooltip with helpful information', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      // Find the temperature info icon specifically by looking for the one near the temperature label
      const temperatureLabel = screen.getByLabelText('LLM Temperature');
      const temperatureSection = temperatureLabel.closest('.flex.items-center.justify-between');
      const infoIcon = temperatureSection?.querySelector('.group .cursor-help');
      
      expect(infoIcon).toBeInTheDocument();
      expect(infoIcon).toHaveTextContent('i');
      
      // Hover to show tooltip
      fireEvent.mouseEnter(infoIcon!);
      
      const tooltip = screen.getByText('Controls creativity. 0.2 = deterministic, 1.0 = creative');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Value Display and Formatting', () => {
    it('should display current temperature value correctly', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} advTemperature={0.3} />);
      
      const temperatureInput = screen.getByDisplayValue('0.3');
      expect(temperatureInput).toBeInTheDocument();
    });

    it('should display default temperature value when none provided', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} advTemperature={0.5} />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      expect(temperatureInput).toBeInTheDocument();
    });

    it('should handle decimal temperature values correctly', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} advTemperature={0.75} />);
      
      const temperatureInput = screen.getByDisplayValue('0.75');
      expect(temperatureInput).toBeInTheDocument();
    });    it('should handle edge case values within range', () => {
      const { rerender } = render(<SettingsModal {...defaultProps} showAdvanced={true} advTemperature={0} />);
      expect(screen.getByLabelText('LLM Temperature')).toHaveValue(0);

      rerender(<SettingsModal {...defaultProps} showAdvanced={true} advTemperature={2} />);
      expect(screen.getByLabelText('LLM Temperature')).toHaveValue(2);
    });
  });

  describe('User Interaction and State Updates', () => {
    it('should call setAdvTemperature when input value changes', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      fireEvent.change(temperatureInput, { target: { value: '0.8' } });
      
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.8);
      expect(mockSetAdvTemperature).toHaveBeenCalledTimes(1);
    });

    it('should handle valid decimal inputs', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      const testValues = ['0.2', '0.7', '1.0', '1.5'];
      
      testValues.forEach((value, index) => {
        fireEvent.change(temperatureInput, { target: { value } });
        expect(mockSetAdvTemperature).toHaveBeenNthCalledWith(index + 1, parseFloat(value));
      });
    });

    it('should handle boundary values correctly', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      // Test minimum boundary
      fireEvent.change(temperatureInput, { target: { value: '0' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0);
      
      // Test maximum boundary
      fireEvent.change(temperatureInput, { target: { value: '2' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(2);
    });

    it('should handle step increments correctly', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      // Test step increment (0.1)
      fireEvent.change(temperatureInput, { target: { value: '0.6' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.6);
      
      fireEvent.change(temperatureInput, { target: { value: '0.7' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.7);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle NaN values gracefully', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      fireEvent.change(temperatureInput, { target: { value: 'invalid' } });
      
      // parseFloat('invalid') returns NaN
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(NaN);
    });

    it('should handle empty string input', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      fireEvent.change(temperatureInput, { target: { value: '' } });
      
      // parseFloat('') returns NaN
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(NaN);
    });

    it('should handle values outside the suggested range', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByDisplayValue('0.5');
      
      // Test value below minimum (though HTML5 validation might prevent this)
      fireEvent.change(temperatureInput, { target: { value: '-0.5' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(-0.5);
      
      // Test value above maximum
      fireEvent.change(temperatureInput, { target: { value: '3.0' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(3.0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      expect(temperatureInput).toHaveAttribute('id', 'adv-temperature');
      
      const label = screen.getByText('LLM Temperature');
      expect(label).toHaveAttribute('for', 'adv-temperature');
    });

    it('should be focusable and keyboard accessible', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      temperatureInput.focus();
      expect(temperatureInput).toHaveFocus();
    });

    it('should have appropriate ARIA attributes', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      // Check that it's a proper number input
      expect(temperatureInput).toHaveAttribute('type', 'number');
      expect(temperatureInput).toHaveAttribute('min', '0');
      expect(temperatureInput).toHaveAttribute('max', '2');
      expect(temperatureInput).toHaveAttribute('step', '0.1');
    });
  });

  describe('Integration with Other Settings', () => {
    it('should work independently of other advanced settings', () => {
      const mockSetAdvTemperature = vi.fn();
      const mockSetAdvDroneDensity = vi.fn();
      
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature}
        setAdvDroneDensity={mockSetAdvDroneDensity}
      />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      fireEvent.change(temperatureInput, { target: { value: '0.9' } });
      
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.9);
      expect(mockSetAdvDroneDensity).not.toHaveBeenCalled();
    });

    it('should maintain state when switching between different models', () => {
      const { rerender } = render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        model="gpt-4"
        advTemperature={0.7}
      />);
      
      expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
      
      // Switch model
      rerender(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        model="gemini-1.5-flash"
        advTemperature={0.7}
      />);
      
      expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
    });

    it('should be visible with all supported models', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo', 'gemini-1.5-flash', 'claude-3-sonnet'];
      
      models.forEach(model => {
        render(<SettingsModal {...defaultProps} 
          showAdvanced={true} 
          model={model}
        />);
        
        expect(screen.getByLabelText('LLM Temperature')).toBeInTheDocument();
      });
    });
  });

  describe('Production Readiness Features', () => {
    it('should follow InfoPanel documentation requirements', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      // Verify the feature exists and is accessible
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      expect(temperatureInput).toBeInTheDocument();
      
      // Verify range constraints match documentation (0.0 to 2.0)
      expect(temperatureInput).toHaveAttribute('min', '0');
      expect(temperatureInput).toHaveAttribute('max', '2');
      
      // Verify step size allows fine-grained control
      expect(temperatureInput).toHaveAttribute('step', '0.1');
    });    it('should handle rapid consecutive changes smoothly', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      // Clear any initial calls
      mockSetAdvTemperature.mockClear();
      
      // Test rapid changes - focus on actual call validation rather than count
      fireEvent.change(temperatureInput, { target: { value: '0.1' } });
      fireEvent.change(temperatureInput, { target: { value: '0.9' } });
      fireEvent.change(temperatureInput, { target: { value: '1.5' } });
      
      // Verify the function was called and the last call had the correct value
      expect(mockSetAdvTemperature).toHaveBeenCalled();
      expect(mockSetAdvTemperature).toHaveBeenLastCalledWith(1.5);
    });

    it('should maintain precision for decimal values', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      // Test precise decimal values
      const preciseValues = ['0.25', '0.33', '0.66', '0.75', '1.25', '1.75'];
      
      preciseValues.forEach(value => {
        fireEvent.change(temperatureInput, { target: { value } });
        expect(mockSetAdvTemperature).toHaveBeenCalledWith(parseFloat(value));
      });
    });

    it('should provide visual feedback for state changes', () => {
      const { rerender } = render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        advTemperature={0.3}
      />);
      
      expect(screen.getByDisplayValue('0.3')).toBeInTheDocument();
      
      // Simulate state update
      rerender(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        advTemperature={1.2}
      />);
      
      expect(screen.getByDisplayValue('1.2')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('0.3')).not.toBeInTheDocument();
    });
  });

  describe('Documentation Compliance', () => {    it('should meet InfoPanel guidance on temperature usage', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      // Find the temperature info icon specifically
      const temperatureLabel = screen.getByLabelText('LLM Temperature');
      const temperatureSection = temperatureLabel.closest('.flex.items-center.justify-between');
      const infoIcon = temperatureSection?.querySelector('.group .cursor-help');
      
      expect(infoIcon).toBeInTheDocument();
      
      // Hover to show tooltip
      fireEvent.mouseEnter(infoIcon!);
      
      const tooltip = screen.getByText('Controls creativity. 0.2 = deterministic, 1.0 = creative');
      expect(tooltip).toBeInTheDocument();
      
      // This aligns with InfoPanel guidance:
      // - Low Temperature (0.2-0.5): deterministic, factual
      // - High Temperature (0.8-1.2): creative, narrative
    });

    it('should allow full range as documented (0.0 to 2.0)', () => {
      render(<SettingsModal {...defaultProps} showAdvanced={true} />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      // Verify full documented range is supported
      expect(temperatureInput).toHaveAttribute('min', '0');
      expect(temperatureInput).toHaveAttribute('max', '2');
    });    it('should support recommended values from documentation', () => {
      const mockSetAdvTemperature = vi.fn();
      render(<SettingsModal {...defaultProps} 
        showAdvanced={true} 
        advTemperature={0.1} // Start with a different value to ensure onChange fires
        setAdvTemperature={mockSetAdvTemperature} 
      />);
      
      const temperatureInput = screen.getByLabelText('LLM Temperature');
      
      // Clear previous calls
      mockSetAdvTemperature.mockClear();
      
      // Test recommended low values (0.2-0.5)
      fireEvent.change(temperatureInput, { target: { value: '0.2' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.2);
      
      fireEvent.change(temperatureInput, { target: { value: '0.5' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.5);
      
      // Test recommended high values (0.8-1.2)
      fireEvent.change(temperatureInput, { target: { value: '0.8' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(0.8);
      
      fireEvent.change(temperatureInput, { target: { value: '1.2' } });
      expect(mockSetAdvTemperature).toHaveBeenCalledWith(1.2);
      
      // Verify all calls were made
      expect(mockSetAdvTemperature).toHaveBeenCalledTimes(4);
    });
  });
});
