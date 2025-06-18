// @ts-nocheck for React import since JSX requires it
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ConfigurationOverrideModal } from './ConfigurationOverrideModal';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
}));

describe('ConfigurationOverrideModal Component', () => {
  const mockOnProceed = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    isOpen: true,
    calculatedDrones: 75,
    maxDrones: 50,
    onProceed: mockOnProceed,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfigurationOverrideModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Settings Conflict Detected/i)).not.toBeInTheDocument();
  });

  it('should render the modal when isOpen is true', () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    expect(screen.getByText('Settings Conflict Detected')).toBeInTheDocument();
  });

  it('should display the correct calculated and max drone values', () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    expect(screen.getByText('75 drones')).toBeInTheDocument();
    expect(screen.getByText('50 drones')).toBeInTheDocument();
  });

  it('should call onProceed when Proceed button is clicked', async () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    
    const proceedButton = screen.getByText('Proceed Anyway');
    await userEvent.click(proceedButton);
    
    expect(mockOnProceed).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel button is clicked', async () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel & Edit Settings');
    await userEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should display warning information about the drone limit override', () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    
    expect(screen.getByText(/Your 'Drone Density' setting/)).toBeInTheDocument();
    expect(screen.getByText(/However, your 'Max Drones' safety limit/)).toBeInTheDocument();
    expect(screen.getByText(/Processing will proceed using only/)).toBeInTheDocument();
    expect(screen.getByText(/This may result in a less detailed summary than you intended./)).toBeInTheDocument();
  });

  it('should render the warning icon', () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  });

  it('should display the visual indicator with requested and actual drone counts', () => {
    render(<ConfigurationOverrideModal {...defaultProps} />);
    
    expect(screen.getByText('Requested:')).toBeInTheDocument();
    expect(screen.getByText('Will use:')).toBeInTheDocument();
  });
});
