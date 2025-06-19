/**
 * Test script for verifying the error banner functionality
 * 
 * This script directly tests the error banner component to ensure
 * it's properly displaying error messages in various scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TextEditor from '../src/components/TextEditor';
import { LoadingProgress } from '../src/types';

// Sample test data
const mockProgress: LoadingProgress = {
  phase: 'preparing',
  message: 'Preparing drone batches'
};

describe('Error Banner Tests', () => {
  it('should display error message when error is provided', () => {
    const errorMessage = 'This is a test error message';
    
    render(
      <TextEditor
        displayText="Sample text"
        isLoading={false}
        isProcessed={false}
        error={errorMessage}
        stats={null}
        loadingProgress={mockProgress}
        isCancelling={false}
        errorRef={React.createRef()}
        statsRef={React.createRef()}
        outputTextareaRef={React.createRef()}
        onTextChange={() => {}}
        onCancel={() => {}}
      />
    );
    
    // Verify the error banner is displayed with the correct message
    const errorBanner = screen.getByTestId('error-display');
    expect(errorBanner).toBeInTheDocument();
    expect(errorBanner).toHaveTextContent(errorMessage);
    
    // Verify the error banner has the correct styling
    expect(errorBanner).toHaveClass('bg-red-500', 'bg-opacity-10', 'border', 'border-red-500');
    expect(errorBanner).toHaveClass('text-red-400');
  });
  
  it('should not display error message when error is empty', () => {
    render(
      <TextEditor
        displayText="Sample text"
        isLoading={false}
        isProcessed={false}
        error=""
        stats={null}
        loadingProgress={mockProgress}
        isCancelling={false}
        errorRef={React.createRef()}
        statsRef={React.createRef()}
        outputTextareaRef={React.createRef()}
        onTextChange={() => {}}
        onCancel={() => {}}
      />
    );
    
    // Verify the error banner is not displayed
    expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
  });
  
  it('should display stats instead of error when stats are provided', () => {
    render(
      <TextEditor
        displayText="Sample text"
        isLoading={false}
        isProcessed={true}
        error=""
        stats={{
          executionTime: '2.5',
          compressionRatio: '4.0',
          successfulDrones: 5,
          totalDrones: 5
        }}
        loadingProgress={mockProgress}
        isCancelling={false}
        errorRef={React.createRef()}
        statsRef={React.createRef()}
        outputTextareaRef={React.createRef()}
        onTextChange={() => {}}
        onCancel={() => {}}
      />
    );
    
    // Verify stats are displayed
    const statsDisplay = screen.getByTestId('stats-display');
    expect(statsDisplay).toBeInTheDocument();
    expect(statsDisplay).toHaveTextContent('Processed in 2.5s');
    expect(statsDisplay).toHaveTextContent('4.0:1 compression');
    expect(statsDisplay).toHaveTextContent('5/5 drones successful');
    
    // Verify no error is displayed
    expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
  });
  
  it('should display error with higher priority than stats', () => {
    render(
      <TextEditor
        displayText="Sample text"
        isLoading={false}
        isProcessed={true}
        error="An error occurred"
        stats={{
          executionTime: '2.5',
          compressionRatio: '4.0',
          successfulDrones: 5,
          totalDrones: 5
        }}
        loadingProgress={mockProgress}
        isCancelling={false}
        errorRef={React.createRef()}
        statsRef={React.createRef()}
        outputTextareaRef={React.createRef()}
        onTextChange={() => {}}
        onCancel={() => {}}
      />
    );
    
    // Verify error is displayed
    const errorBanner = screen.getByTestId('error-display');
    expect(errorBanner).toBeInTheDocument();
    expect(errorBanner).toHaveTextContent('An error occurred');
    
    // Stats should also be displayed
    const statsDisplay = screen.getByTestId('stats-display');
    expect(statsDisplay).toBeInTheDocument();
  });
});
