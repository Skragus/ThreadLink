// @ts-nocheck for React import since JSX requires it
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { InfoPanel } from './InfoPanel';
import { ExpandedSections } from '../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="chevron-right-icon" {...props} />,
  Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
  Copy: (props: any) => <svg data-testid="copy-icon" {...props} />,
  Shield: (props: any) => <svg data-testid="shield-icon" {...props} />,
  Package: (props: any) => <svg data-testid="package-icon" {...props} />,
  Scale: (props: any) => <svg data-testid="scale-icon" {...props} />,
  Bot: (props: any) => <svg data-testid="bot-icon" {...props} />,
  Focus: (props: any) => <svg data-testid="focus-icon" {...props} />,
  Settings: (props: any) => <svg data-testid="settings-icon" {...props} />,
}));

describe('InfoPanel Component', () => {
  const mockOnToggleSection = vi.fn();
  const mockOnClose = vi.fn();

  const defaultExpandedSections: ExpandedSections = {
    what: false,
    howto: false,
    compression: false,
    strategy: false,
    drones: false,
    recency: false,
    advanced: false,
    privacy: false,
  };

  const defaultProps = {
    isOpen: true,
    expandedSections: defaultExpandedSections,
    onToggleSection: mockOnToggleSection,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render if isOpen is false', () => {
    render(<InfoPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render correctly when isOpen is true', () => {
    render(<InfoPanel {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('ThreadLink User Guide')).toBeInTheDocument();
    expect(screen.getByLabelText('Close info panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it, thanks!' })).toBeInTheDocument();
  });

  it('should call onClose when the close button (X) is clicked', () => {
    render(<InfoPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close info panel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when the "Got it, thanks!" button is clicked', () => {
    render(<InfoPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it, thanks!' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  const sections: Array<{ key: keyof ExpandedSections; title: string, contentSample: string }> = [
    { key: 'what', title: 'What is ThreadLink?', contentSample: "Modern AI is powerful but fundamentally amnesiac." },
    { key: 'howto', title: 'How to Use ThreadLink', contentSample: "The quality of your context card depends entirely" },
    { key: 'compression', title: 'Understanding Compression', contentSample: "The effectiveness of condensation is a direct function" },
    { key: 'strategy', title: 'Context Card Strategy', contentSample: "The size of your final context card is a strategic choice." },
    { key: 'drones', title: 'Meet Your Drones', contentSample: "Different AI models have distinct personalities" },
    { key: 'recency', title: 'Recency Mode: The Temporal Zoom Lens', contentSample: "Recency Mode creates a temporally weighted briefing" },
    { key: 'advanced', title: 'Advanced Controls', contentSample: "These settings provide direct control over the cost" },
    { key: 'privacy', title: 'Privacy & The Project', contentSample: "ThreadLink is built with a privacy-first" },
  ];

  sections.forEach(section => {
    it(`should toggle section "${section.title}" and display its content`, () => {
      // Initial render with section closed
      render(<InfoPanel {...defaultProps} expandedSections={{ ...defaultExpandedSections, [section.key]: false }} />);
      
      const sectionButton = screen.getByRole('button', { name: new RegExp(section.title) });
      expect(sectionButton).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(section.contentSample))).not.toBeInTheDocument(); // Content should be hidden

      // Click to expand
      fireEvent.click(sectionButton);
      expect(mockOnToggleSection).toHaveBeenCalledWith(section.key);

      // Rerender with section open
      // In a real app, the parent would rerender. Here we simulate it.
      render(<InfoPanel {...defaultProps} expandedSections={{ ...defaultExpandedSections, [section.key]: true }} />);
      expect(screen.getByText(new RegExp(section.contentSample))).toBeInTheDocument(); // Content should be visible
    });

    it(`should display ChevronRight when section "${section.title}" is closed`, () => {
      render(<InfoPanel {...defaultProps} expandedSections={{ ...defaultExpandedSections, [section.key]: false }} />);
      const sectionButton = screen.getByRole('button', { name: new RegExp(section.title) });
      // Check within the button for the icon
      const rightIcon = sectionButton.querySelector('[data-testid="chevron-right-icon"]');
      expect(rightIcon).toBeInTheDocument();
      const downIcon = sectionButton.querySelector('[data-testid="chevron-down-icon"]');
      expect(downIcon).not.toBeInTheDocument();
    });

    it(`should display ChevronDown when section "${section.title}" is open`, () => {
      render(<InfoPanel {...defaultProps} expandedSections={{ ...defaultExpandedSections, [section.key]: true }} />);
      const sectionButton = screen.getByRole('button', { name: new RegExp(section.title) });
      const downIcon = sectionButton.querySelector('[data-testid="chevron-down-icon"]');
      expect(downIcon).toBeInTheDocument();
      const rightIcon = sectionButton.querySelector('[data-testid="chevron-right-icon"]');
      expect(rightIcon).not.toBeInTheDocument();
    });
  });

  it('should render all section headers', () => {
    render(<InfoPanel {...defaultProps} />);
    sections.forEach(section => {
      expect(screen.getByRole('button', { name: new RegExp(section.title) })).toBeInTheDocument();
    });
  });
});
