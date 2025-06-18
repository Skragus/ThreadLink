import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { TextEditor } from './TextEditor';
import { LoadingProgress, Stats } from '../types';

// Mock LoadingOverlay as its internal tests are separate
vi.mock('./LoadingOverlay', () => ({
  LoadingOverlay: vi.fn(({ onCancel, isCancelling, loadingProgress }) => (
    <div data-testid="loading-overlay">
      <p>{loadingProgress.message}</p>
      <button onClick={onCancel} disabled={isCancelling}>
        Cancel
      </button>
    </div>
  )),
}));

describe('TextEditor Component', () => {
  const mockOnTextChange = vi.fn();
  const mockOnCancel = vi.fn();
  const errorRef = React.createRef<HTMLDivElement>();
  const statsRef = React.createRef<HTMLDivElement>();
  const outputTextareaRef = React.createRef<HTMLTextAreaElement>();
  const defaultLoadingProgress: LoadingProgress = {
    phase: 'preparing',
    message: 'Initializing...',
  };

  const defaultProps = {
    displayText: 'Initial text',
    isLoading: false,
    isProcessed: false,
    error: '',
    stats: null,
    loadingProgress: defaultLoadingProgress,
    isCancelling: false,
    errorRef,
    statsRef,
    outputTextareaRef,
    onTextChange: mockOnTextChange,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the textarea with placeholder and initial text', () => {
    render(<TextEditor {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Paste your AI conversation here...');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(defaultProps.displayText);
  });

  it('calls onTextChange when textarea value changes', () => {
    render(<TextEditor {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Paste your AI conversation here...');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    expect(mockOnTextChange).toHaveBeenCalledTimes(1);
  });

  it('displays an error message when error prop is provided', () => {
    const errorMessage = 'Something went wrong!';
    render(<TextEditor {...defaultProps} error={errorMessage} />);
    expect(screen.getByTestId('error-display')).toHaveTextContent(errorMessage);
  });

  it('does not display an error message when error prop is empty', () => {
    render(<TextEditor {...defaultProps} error="" />);
    expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
  });

  it('displays stats when stats prop is provided', () => {
    const stats: Stats = {
      executionTime: '5.0',
      compressionRatio: '10.0',
      successfulDrones: 5,
      totalDrones: 5,
    };
    render(<TextEditor {...defaultProps} stats={stats} />);
    const statsDisplay = screen.getByTestId('stats-display');
    expect(statsDisplay).toHaveTextContent(
      `Processed in ${stats.executionTime}s • ${stats.compressionRatio}:1 compression • ${stats.successfulDrones}/${stats.totalDrones} drones successful`
    );
  });

  it('does not display stats when stats prop is null', () => {
    render(<TextEditor {...defaultProps} stats={null} />);
    expect(screen.queryByTestId('stats-display')).not.toBeInTheDocument();
  });

  it('renders LoadingOverlay and blurs textarea when isLoading is true', () => {
    const loadingProgressWithMessage: LoadingProgress = {
        phase: 'processing',
        message: 'Processing data...',
        completedDrones: 1,
        totalDrones: 2,
    }
    render(<TextEditor {...defaultProps} isLoading={true} loadingProgress={loadingProgressWithMessage} />);
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('loading-overlay')).toHaveTextContent('Processing data...');
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).toHaveClass('blur-sm');
  });

  it('does not render LoadingOverlay when isLoading is false', () => {
    render(<TextEditor {...defaultProps} isLoading={false} />);
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).not.toHaveClass('blur-sm');
  });

  it('sets textarea to readOnly when isProcessed is true', () => {
    render(<TextEditor {...defaultProps} isProcessed={true} />);
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).toHaveAttribute('readonly');
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).toHaveClass('cursor-default');
  });

  it('sets textarea to readOnly when isLoading is true', () => {
    render(<TextEditor {...defaultProps} isLoading={true} />);
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).toHaveAttribute('readonly');
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).toHaveClass('cursor-default');
  });

  it('textarea is not readOnly and has cursor-text by default', () => {
    render(<TextEditor {...defaultProps} />);
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).not.toHaveAttribute('readonly');
    expect(screen.getByPlaceholderText('Paste your AI conversation here...')).toHaveClass('cursor-text');
  });
  
  it('calls onCancel when cancel button in LoadingOverlay is clicked', () => {
    render(<TextEditor {...defaultProps} isLoading={true} />);
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the Bolt.new badge with correct link and image', () => {
    render(<TextEditor {...defaultProps} />);
    const badgeLink = screen.getByRole('link', { name: /powered by bolt\.new/i });
    expect(badgeLink).toBeInTheDocument();
    expect(badgeLink).toHaveAttribute('href', 'https://bolt.new');
    expect(badgeLink).toHaveAttribute('target', '_blank');
    
    const badgeImage = screen.getByAltText('Powered by Bolt.new');
    expect(badgeImage).toBeInTheDocument();
    expect(badgeImage).toHaveAttribute('src', 'src/assets/bolt-badge.png');
  });

  it('assigns refs correctly', () => {
    render(<TextEditor {...defaultProps} error="Test Error" stats={{ executionTime: '1', compressionRatio: '1', successfulDrones: 1, totalDrones: 1 }} />);
    expect(errorRef.current).toBeInTheDocument();
    expect(statsRef.current).toBeInTheDocument();
    expect(outputTextareaRef.current).toBeInTheDocument();
    expect(errorRef.current?.textContent).toBe('Test Error');
  });
});
