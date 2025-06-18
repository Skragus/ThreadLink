import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { LoadingOverlay } from './LoadingOverlay';
import { LoadingProgress } from '../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

describe('LoadingOverlay Component', () => {
  const mockOnCancel = vi.fn();

  const defaultLoadingProgress: LoadingProgress = {
    phase: 'preparing',
    message: 'Initializing...',
  };

  const defaultProps = {
    loadingProgress: defaultLoadingProgress,
    isCancelling: false,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial message and spinner', () => {
    render(<LoadingOverlay {...defaultProps} />);
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Initializing...');
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('displays elapsed time when provided', () => {
    const progressWithTime: LoadingProgress = {
      ...defaultLoadingProgress,
      elapsedTime: 5.3,
    };
    render(<LoadingOverlay {...defaultProps} loadingProgress={progressWithTime} />);
    expect(screen.getByText('5.3s elapsed')).toBeInTheDocument();
  });

  describe('when phase is "processing"', () => {
    const processingProgress: LoadingProgress = {
      phase: 'processing',
      message: 'Processing data...',
      completedDrones: 2,
      totalDrones: 5,
      elapsedTime: 10.1,
    };

    it('renders progress bar, drone count, and percentage', () => {
      render(<LoadingOverlay {...defaultProps} loadingProgress={processingProgress} />);
      expect(screen.getByTestId('loading-message')).toHaveTextContent('Processing data...');
      expect(screen.getByText('Progress: 2/5 drones')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument(); // (2/5 * 100)
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });

    it('updates progress bar width correctly', () => {
      const { rerender } = render(<LoadingOverlay {...defaultProps} loadingProgress={processingProgress} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveStyle('width: 40%');

      const updatedProgress: LoadingProgress = {
        ...processingProgress,
        completedDrones: 4,
      };
      rerender(<LoadingOverlay {...defaultProps} loadingProgress={updatedProgress} />);
      expect(progressBar).toHaveStyle('width: 80%'); // (4/5 * 100)
    });    it('handles zero totalDrones gracefully in processing phase', () => {
      const zeroDronesProgress: LoadingProgress = {
        phase: 'processing',
        message: 'Processing data...',
        completedDrones: 0,
        totalDrones: 0,
      };
      render(<LoadingOverlay {...defaultProps} loadingProgress={zeroDronesProgress} />);
      // When totalDrones is 0, the component doesn't show the progress bar section
      expect(screen.queryByText(/Progress:/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
      
      // Based on the component implementation, when in processing phase with totalDrones=0,
      // neither the progress bar nor the loader icon are shown
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(<LoadingOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables Cancel button and shows "Cancelling..." when isCancelling is true', () => {
    render(<LoadingOverlay {...defaultProps} isCancelling={true} />);
    const cancelButton = screen.getByRole('button', { name: 'Cancelling...' });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeDisabled();
  });

  it('disables Cancel button when loadingProgress.phase is "finalizing"', () => {
    const finalizingProgress: LoadingProgress = {
      phase: 'finalizing',
      message: 'Finalizing results...',
    };
    render(<LoadingOverlay {...defaultProps} loadingProgress={finalizingProgress} />);
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeDisabled();
  });

  it('shows spinner for "finalizing" phase', () => {
    const finalizingProgress: LoadingProgress = {
      phase: 'finalizing',
      message: 'Finalizing results...',
    };
    render(<LoadingOverlay {...defaultProps} loadingProgress={finalizingProgress} />);
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
  });

  it('supports complete cancellation flow', () => {
    // Start with initial rendering
    const { rerender } = render(<LoadingOverlay {...defaultProps} />);
    
    // Verify cancel button is enabled and click it
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    
    // Verify onCancel was called
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    
    // Update to cancelling state
    rerender(<LoadingOverlay {...defaultProps} isCancelling={true} />);
    
    // Verify button is now disabled and shows "Cancelling..."
    const cancellingButton = screen.getByRole('button', { name: 'Cancelling...' });
    expect(cancellingButton).toBeDisabled();
    
    // Update to cancelled phase
    const cancelledProgress: LoadingProgress = {
      phase: 'cancelled',
      message: 'Operation cancelled',
    };
    rerender(<LoadingOverlay {...defaultProps} loadingProgress={cancelledProgress} isCancelling={false} />);
    
    // Verify the message is updated and cancel button is back to normal
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Operation cancelled');
    const finalCancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(finalCancelButton).toBeEnabled();
    
    // The overlay itself should still be present
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
  });  it('handles cancellation until overlay disappears', () => {
    // Create a mock cancel function for testing
    const mockCancelFunction = vi.fn(() => {
      // This test directly tests the parent component's responsibility
      // for hiding the overlay after cancellation completes
    });
    
    // Setup test component with an initially visible overlay
    const { rerender } = render(
      <LoadingOverlay 
        loadingProgress={{ phase: 'preparing', message: 'Initializing...' }}
        isCancelling={false}
        onCancel={mockCancelFunction}
      />
    );
    
    // Verify initial state
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByText('Initializing...')).toBeInTheDocument();
    
    // Simulate user clicking cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCancelFunction).toHaveBeenCalledTimes(1);
    
    // Simulate parent component updating to cancelling state
    rerender(
      <LoadingOverlay 
        loadingProgress={{ phase: 'preparing', message: 'Initializing...' }}
        isCancelling={true}
        onCancel={mockCancelFunction}
      />
    );
    expect(screen.getByRole('button', { name: 'Cancelling...' })).toBeDisabled();
    
    // Simulate parent updating to cancelled state
    rerender(
      <LoadingOverlay 
        loadingProgress={{ phase: 'cancelled', message: 'Operation cancelled' }}
        isCancelling={false}
        onCancel={mockCancelFunction}
      />
    );
    expect(screen.getByText('Operation cancelled')).toBeInTheDocument();
      // Simulate parent component removing the overlay completely
    // This would typically happen in the actual application
    rerender(<div data-testid="parent">Overlay removed</div>);
    
    // Verify the overlay is no longer in the document
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('parent')).toBeInTheDocument();
  });
});
