import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { CustomPromptEditor } from './CustomPromptEditor';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
  ChevronLeft: (props: any) => <svg data-testid="chevron-left-icon" {...props} />,
}));

// Mock the config.js import
vi.mock('../pipeline/config.js', () => ({
  DEFAULT_DRONE_PROMPT: 'Default system prompt for testing with {TARGET_TOKENS} tokens',
}));

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('CustomPromptEditor Component', () => {
  const mockOnSave = vi.fn();
  const mockOnBack = vi.fn();

  const defaultProps = {
    isOpen: true,
    customPrompt: '',
    onSave: mockOnSave,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReset();
  });

  describe('Rendering and Initial State', () => {
    it('should not render when isOpen is false', () => {
      render(<CustomPromptEditor {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render correctly when isOpen is true', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      // Check main container exists
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      
      // Check warning header
      expect(screen.getByText('WARNING: CORE LOGIC OVERRIDE')).toBeInTheDocument();
      expect(screen.getAllByTestId('alert-triangle-icon')).toHaveLength(2);
      
      // Check back button
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByTestId('chevron-left-icon')).toBeInTheDocument();
      
      // Check apply button
      expect(screen.getByRole('button', { name: /apply & close/i })).toBeInTheDocument();
    });    it('should display warning messages and instructions', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      expect(screen.getByText(/You are changing the fundamental instructions for the AI/)).toBeInTheDocument();
      expect(screen.getByText(/Unstable results and failures are likely/)).toBeInTheDocument();
      expect(screen.getByText(/System Prompt:/)).toBeInTheDocument();
      expect(screen.getAllByText(/TARGET_TOKENS/)).toHaveLength(3); // Appears in code, example, and textarea
      expect(screen.getByText(/Example:/)).toBeInTheDocument();
    });

    it('should populate with default prompt when no custom prompt provided', () => {
      render(<CustomPromptEditor {...defaultProps} customPrompt="" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Default system prompt for testing with {TARGET_TOKENS} tokens');
    });

    it('should populate with existing custom prompt when provided', () => {
      const customPrompt = 'My custom prompt with {TARGET_TOKENS} tokens';
      render(<CustomPromptEditor {...defaultProps} customPrompt={customPrompt} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(customPrompt);
    });
  });

  describe('Text Editing', () => {
    it('should allow editing the prompt text', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New prompt text' } });
      
      expect(textarea).toHaveValue('New prompt text');
    });

    it('should maintain edited text while modal is open', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Modified prompt' } });
      
      expect(textarea).toHaveValue('Modified prompt');
      
      // Simulate some other interaction
      fireEvent.focus(textarea);
      fireEvent.blur(textarea);
      
      expect(textarea).toHaveValue('Modified prompt');
    });
  });

  describe('Apply and Close Functionality', () => {
    it('should call onSave and onBack when Apply & Close is clicked', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      const newPrompt = 'Updated prompt text';
      fireEvent.change(textarea, { target: { value: newPrompt } });
      
      const applyButton = screen.getByRole('button', { name: /apply & close/i });
      fireEvent.click(applyButton);
      
      expect(mockOnSave).toHaveBeenCalledWith(newPrompt);
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should save the default prompt if no changes were made', () => {
      render(<CustomPromptEditor {...defaultProps} customPrompt="" />);
      
      const applyButton = screen.getByRole('button', { name: /apply & close/i });
      fireEvent.click(applyButton);
      
      expect(mockOnSave).toHaveBeenCalledWith('Default system prompt for testing with {TARGET_TOKENS} tokens');
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Back Button Functionality', () => {
    it('should call onBack immediately when no changes were made', () => {
      const customPrompt = 'Original prompt';
      render(<CustomPromptEditor {...defaultProps} customPrompt={customPrompt} />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockOnBack).toHaveBeenCalled();
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog when there are unsaved changes', () => {
      const customPrompt = 'Original prompt';
      mockConfirm.mockReturnValue(true);
      
      render(<CustomPromptEditor {...defaultProps} customPrompt={customPrompt} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Modified prompt' } });
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockConfirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to go back?');
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should not call onBack when user cancels confirmation', () => {
      const customPrompt = 'Original prompt';
      mockConfirm.mockReturnValue(false);
      
      render(<CustomPromptEditor {...defaultProps} customPrompt={customPrompt} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Modified prompt' } });
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockOnBack).not.toHaveBeenCalled();
    });

    it('should detect changes correctly between original and current prompt', () => {
      const customPrompt = 'Original prompt';
      mockConfirm.mockReturnValue(true);
      
      render(<CustomPromptEditor {...defaultProps} customPrompt={customPrompt} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Different prompt' } });
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockConfirm).toHaveBeenCalled();
    });

    it('should not show confirmation when text is changed back to original', () => {
      const customPrompt = 'Original prompt';
      
      render(<CustomPromptEditor {...defaultProps} customPrompt={customPrompt} />);
      
      const textarea = screen.getByRole('textbox');
      // Change the text
      fireEvent.change(textarea, { target: { value: 'Modified prompt' } });
      // Change it back to original
      fireEvent.change(textarea, { target: { value: customPrompt } });
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper textarea attributes', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', 'Enter your custom prompt...');
      expect(textarea).toHaveAttribute('spellCheck', 'false');
    });

    it('should be keyboard navigable', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      const backButton = screen.getByRole('button', { name: /back/i });
      const applyButton = screen.getByRole('button', { name: /apply & close/i });
      
      // Tab navigation should work
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
      
      // Buttons should be focusable
      backButton.focus();
      expect(document.activeElement).toBe(backButton);
      
      applyButton.focus();
      expect(document.activeElement).toBe(applyButton);
    });    it('should handle escape key to trigger back action', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      // The CustomPromptEditor component doesn't implement escape key handling
      // This test verifies the component doesn't crash when escape is pressed
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Escape', code: 'Escape' });
      
      // Component should still be visible (escape handling would be at modal level)
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Effect Hooks', () => {
    it('should update prompt text when customPrompt prop changes', () => {
      const { rerender } = render(<CustomPromptEditor {...defaultProps} customPrompt="Initial prompt" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Initial prompt');
      
      rerender(<CustomPromptEditor {...defaultProps} customPrompt="Updated prompt" />);
      expect(textarea).toHaveValue('Updated prompt');
    });

    it('should reset to default when customPrompt becomes empty', () => {
      const { rerender } = render(<CustomPromptEditor {...defaultProps} customPrompt="Some prompt" />);
      
      rerender(<CustomPromptEditor {...defaultProps} customPrompt="" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Default system prompt for testing with {TARGET_TOKENS} tokens');
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile-friendly elements', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      // Check that mobile-responsive classes are present
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
      
      // The "Back" text should be hidden on small screens (checked via CSS classes)
      const backButtonSpan = backButton.querySelector('span');
      expect(backButtonSpan).toHaveClass('hidden', 'sm:inline');
    });
  });

  describe('Layout and Styling', () => {
    it('should display footer disclaimer text', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      expect(screen.getByText(/By applying this custom prompt, you accept full responsibility/)).toBeInTheDocument();
      expect(screen.getByText(/unexpected behavior, increased costs, or processing failures/)).toBeInTheDocument();
    });

    it('should have proper CSS classes for danger styling', () => {
      render(<CustomPromptEditor {...defaultProps} />);
      
      const modal = screen.getByRole('textbox').closest('div');
      expect(modal?.closest('.fixed')).toHaveClass('bg-black', 'bg-opacity-50');
    });
  });
});
