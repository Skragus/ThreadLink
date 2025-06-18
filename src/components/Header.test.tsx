// @ts-nocheck for React import since JSX requires it
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { Header } from './Header';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Info: (props: any) => <svg data-testid="info-icon" {...props} />,
  Key: (props: any) => <svg data-testid="key-icon" {...props} />,
  Settings: (props: any) => <svg data-testid="settings-icon" {...props} />,
}));

describe('Header Component', () => {
  const mockOnInfoClick = vi.fn();
  const mockOnAPIKeysClick = vi.fn();
  const mockOnSettingsClick = vi.fn();

  const defaultProps = {
    onInfoClick: mockOnInfoClick,
    onAPIKeysClick: mockOnAPIKeysClick,
    onSettingsClick: mockOnSettingsClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the header with title and buttons', () => {
    render(<Header {...defaultProps} />);

    // Check for title parts
    expect(screen.getByText('Thread')).toBeInTheDocument();
    expect(screen.getByText('Link')).toBeInTheDocument();

    // Check for subtitle (conditionally rendered based on screen size in component, but always in DOM)
    expect(screen.getByText('Condense, copy, continue — without breaking flow.')).toBeInTheDocument();

    // Check for buttons by aria-label and their icons
    expect(screen.getByLabelText('Open help documentation')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();

    expect(screen.getByLabelText('Manage API keys')).toBeInTheDocument();
    expect(screen.getByTestId('key-icon')).toBeInTheDocument();

    expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('should call onInfoClick when the info button is clicked', () => {
    render(<Header {...defaultProps} />);
    const infoButton = screen.getByLabelText('Open help documentation');
    fireEvent.click(infoButton);
    expect(mockOnInfoClick).toHaveBeenCalledTimes(1);
  });

  it('should call onAPIKeysClick when the API keys button is clicked', () => {
    render(<Header {...defaultProps} />);
    const apiKeysButton = screen.getByLabelText('Manage API keys');
    fireEvent.click(apiKeysButton);
    expect(mockOnAPIKeysClick).toHaveBeenCalledTimes(1);
  });

  it('should call onSettingsClick when the settings button is clicked', () => {
    render(<Header {...defaultProps} />);
    const settingsButton = screen.getByLabelText('Open settings');
    fireEvent.click(settingsButton);
    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
  });
});
