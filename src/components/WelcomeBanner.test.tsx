// WelcomeBanner.test.tsx - Tests for WelcomeBanner component

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import WelcomeBanner from './WelcomeBanner';

describe('WelcomeBanner Component', () => {
  const mockOnDismiss = vi.fn();

  const defaultProps = {
    isVisible: true,
    onDismiss: mockOnDismiss
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isVisible is false', () => {
    render(<WelcomeBanner {...defaultProps} isVisible={false} />);
    expect(screen.queryByText('Welcome!')).not.toBeInTheDocument();
  });

  it('should render welcome banner when isVisible is true', () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText(/BYOK \(Bring Your Own Keys\)/)).toBeInTheDocument();
  });  it('should show the BYOK explanation and button directions', () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText(/ThreadLink uses BYOK/)).toBeInTheDocument();
    expect(screen.getByText(/Configure your API keys using the/)).toBeInTheDocument();
    expect(screen.getByText(/learn more with the/)).toBeInTheDocument();
    // Check for Key icon
    const keyIcon = document.querySelector('.lucide-key');
    expect(keyIcon).toBeInTheDocument();
    // Check for Info icon
    const infoIcon = document.querySelector('.lucide-info');
    expect(infoIcon).toBeInTheDocument();
  });

  it('should render dismiss button', () => {
    render(<WelcomeBanner {...defaultProps} />);
    const dismissButton = screen.getByRole('button', { name: /Dismiss welcome banner/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    render(<WelcomeBanner {...defaultProps} />);
    const dismissButton = screen.getByRole('button', { name: /Dismiss welcome banner/i });
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should have proper accessibility attributes', () => {
    render(<WelcomeBanner {...defaultProps} />);
    const dismissButton = screen.getByRole('button', { name: /Dismiss welcome banner/i });
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss welcome banner');
  });  it('should have yellow-themed styling', () => {
    render(<WelcomeBanner {...defaultProps} />);
    // Look for the root container with the yellow styling
    const container = document.querySelector('.bg-yellow-500\\/10');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('border-yellow-500/30');
  });

  it('should be compact and banner-like', () => {
    render(<WelcomeBanner {...defaultProps} />);
    // Look for the root container with padding
    const container = document.querySelector('.p-3');
    expect(container).toBeInTheDocument();
  });

  it('should have info icon', () => {
    render(<WelcomeBanner {...defaultProps} />);
    const container = screen.getByText('Welcome!').closest('div');
    // Check for Info icon class
    const infoIcon = container?.querySelector('svg');
    expect(infoIcon).toBeInTheDocument();
  });
});
