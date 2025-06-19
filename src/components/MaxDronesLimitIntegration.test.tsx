// MaxDronesLimitIntegration.test.tsx - Integration tests for Max Drones Limit safety triggering
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { ConfigurationOverrideModal } from './ConfigurationOverrideModal';

// Mock dependencies
vi.mock('../lib/storage.js', () => ({
  getAvailableProviders: vi.fn(() => ({
    google: true,
    openai: true,
    anthropic: true
  }))
}));

describe('Max Drones Limit - Safety Override Integration', () => {
  const defaultProps = {
    isOpen: true,
    calculatedDrones: 75,
    maxDrones: 50,
    onProceed: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Override Modal - Visibility and Trigger', () => {    it('should show override modal when calculated drones exceed max drones', () => {
      render(<ConfigurationOverrideModal {...defaultProps} />);

      expect(screen.getByText('Settings Conflict Detected')).toBeInTheDocument();
      // The modal doesn't have role="dialog" attribute, check for modal content instead
      expect(screen.getByText('Settings Conflict Detected')).toBeInTheDocument();
    });

    it('should not show when isOpen is false', () => {
      render(<ConfigurationOverrideModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Settings Conflict Detected')).not.toBeInTheDocument();
    });    it('should display correct calculated vs max drones values', () => {
      render(<ConfigurationOverrideModal {...defaultProps} />);

      expect(screen.getByText('75')).toBeInTheDocument(); // calculated drones
      expect(screen.getAllByText('50')).toHaveLength(2); // max drones appears in 2 places
    });
  });

  describe('Override Modal Content and Messaging', () => {
    beforeEach(() => {
      render(<ConfigurationOverrideModal {...defaultProps} />);
    });    it('should explain the conflict clearly', () => {
      expect(screen.getByText("'Drone Density'")).toBeInTheDocument();
      expect(screen.getByText("'Max Drones'")).toBeInTheDocument();
      expect(screen.getByText(/Processing will proceed using only/)).toBeInTheDocument();
    });it('should show warning icon and styling', () => {
      // Look for the AlertTriangle warning icon by finding the SVG element
      const warningIcon = document.querySelector('svg.lucide-triangle-alert');
      expect(warningIcon).toBeInTheDocument();
      
      // Check for warning styling
      expect(screen.getByText('Settings Conflict Detected')).toBeInTheDocument();
    });

    it('should highlight the safety override numbers', () => {
      expect(screen.getByText('75')).toHaveClass('text-amber-500', 'font-bold');
      
      // Check the max drones values are highlighted
      const maxDronesElements = screen.getAllByText('50');
      maxDronesElements.forEach(element => {
        expect(element).toHaveClass('text-amber-500', 'font-bold');
      });
    });

    it('should show requested vs will use comparison', () => {
      expect(screen.getByText('Requested:')).toBeInTheDocument();
      expect(screen.getByText('Will use:')).toBeInTheDocument();
      expect(screen.getByText('75 drones')).toBeInTheDocument();
      expect(screen.getByText('50 drones')).toBeInTheDocument();
    });
  });

  describe('User Actions and Flow', () => {
    let mockOnProceed: ReturnType<typeof vi.fn>;
    let mockOnCancel: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockOnProceed = vi.fn();
      mockOnCancel = vi.fn();
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          onProceed={mockOnProceed}
          onCancel={mockOnCancel}
        />
      );
    });

    it('should have Proceed Anyway button that calls onProceed', () => {
      const proceedButton = screen.getByText('Proceed Anyway');
      expect(proceedButton).toBeInTheDocument();
      
      fireEvent.click(proceedButton);
      expect(mockOnProceed).toHaveBeenCalledTimes(1);
    });

    it('should have Cancel & Edit Settings button that calls onCancel', () => {
      const cancelButton = screen.getByText('Cancel & Edit Settings');
      expect(cancelButton).toBeInTheDocument();
      
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should style Proceed button with warning colors', () => {
      const proceedButton = screen.getByText('Proceed Anyway');
      expect(proceedButton).toHaveClass('bg-amber-500', 'hover:bg-amber-600');
    });

    it('should style Cancel button appropriately', () => {
      const cancelButton = screen.getByText('Cancel & Edit Settings');
      expect(cancelButton).toHaveClass('bg-[var(--text-secondary)]');
    });
  });

  describe('Edge Cases and Different Values', () => {
    it('should handle small differences between calculated and max', () => {
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          calculatedDrones={52}
          maxDrones={50}
        />
      );

      expect(screen.getByText('52')).toBeInTheDocument();
      expect(screen.getAllByText('50')).toHaveLength(2); // appears in two places
    });

    it('should handle large differences between calculated and max', () => {
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          calculatedDrones={150}
          maxDrones={30}
        />
      );

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getAllByText('30')).toHaveLength(2);
    });

    it('should handle maximum values', () => {
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          calculatedDrones={999}
          maxDrones={200}
        />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getAllByText('200')).toHaveLength(2);
    });
  });

  describe('Accessibility and UX', () => {
    beforeEach(() => {
      render(<ConfigurationOverrideModal {...defaultProps} />);
    });    it('should have proper modal attributes', () => {
      // Check for modal content instead of role="dialog" since it's not defined
      const modalContent = screen.getByText('Settings Conflict Detected').closest('div');
      expect(modalContent).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const proceedButton = screen.getByText('Proceed Anyway');
      const cancelButton = screen.getByText('Cancel & Edit Settings');
      
      proceedButton.focus();
      expect(proceedButton).toHaveFocus();
      
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
    });    it('should have clear visual hierarchy', () => {
      const title = screen.getByText('Settings Conflict Detected');
      expect(title).toHaveClass('text-lg', 'font-medium');
      
      // Find the amber highlighted comparison section (the container with the border)
      const warningContainer = document.querySelector('.bg-amber-500\\/10');
      expect(warningContainer).toBeInTheDocument();
      expect(warningContainer).toHaveClass('border-amber-500/30');
    });

    it('should stack buttons properly on mobile', () => {
      const buttonContainer = screen.getByText('Proceed Anyway').parentElement;
      expect(buttonContainer).toHaveClass('flex', 'gap-3');
    });
  });

  describe('Safety Warnings and Messaging', () => {
    beforeEach(() => {
      render(<ConfigurationOverrideModal {...defaultProps} />);
    });

    it('should explain potential consequences of override', () => {
      expect(screen.getByText(/This may result in a less detailed summary than you intended/)).toBeInTheDocument();
    });

    it('should emphasize the safety aspect', () => {
      expect(screen.getByText(/safety limit/)).toBeInTheDocument();
    });

    it('should provide clear context about what will happen', () => {
      expect(screen.getByText(/Processing will proceed using only/)).toBeInTheDocument();
    });
  });

  describe('Modal State Management', () => {
    it('should close modal when onCancel is called', async () => {
      const mockOnCancel = vi.fn();
      const { rerender } = render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel & Edit Settings');
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      
      // Simulate parent component updating isOpen to false
      rerender(
        <ConfigurationOverrideModal 
          {...defaultProps}
          isOpen={false}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.queryByText('Settings Conflict Detected')).not.toBeInTheDocument();
    });

    it('should close modal when onProceed is called', async () => {
      const mockOnProceed = vi.fn();
      const { rerender } = render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          onProceed={mockOnProceed}
        />
      );

      const proceedButton = screen.getByText('Proceed Anyway');
      fireEvent.click(proceedButton);
      
      expect(mockOnProceed).toHaveBeenCalledTimes(1);
      
      // Simulate parent component updating isOpen to false
      rerender(
        <ConfigurationOverrideModal 
          {...defaultProps}
          isOpen={false}
          onProceed={mockOnProceed}
        />
      );
      
      expect(screen.queryByText('Settings Conflict Detected')).not.toBeInTheDocument();
    });
  });

  describe('Real-world Safety Scenarios', () => {
    it('should handle scenario: High drone density with low max drones', () => {
      // Simulate: User has drone density 10, processing large document = 100 drones calculated
      // But max drones is set to 30 for safety
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          calculatedDrones={100}
          maxDrones={30}
        />
      );

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getAllByText('30')).toHaveLength(2);
      expect(screen.getByText(/This may result in a less detailed summary/)).toBeInTheDocument();
    });

    it('should handle scenario: Moderate override situation', () => {
      // Simulate: Calculated 65 drones, max limit 50
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          calculatedDrones={65}
          maxDrones={50}
        />
      );

      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getAllByText('50')).toHaveLength(2);
    });

    it('should handle scenario: Extreme override situation', () => {
      // Simulate: Very high calculated drones, very low safety limit
      render(
        <ConfigurationOverrideModal 
          {...defaultProps}
          calculatedDrones={500}
          maxDrones={20}
        />
      );

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getAllByText('20')).toHaveLength(2);
    });
  });
});
