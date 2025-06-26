// components/LoadingOverlay.tsx - Loading Overlay Component

import React from 'react';
import { Loader2 } from 'lucide-react';
import { LoadingProgress } from '../types';
import { isValidLoadingProgress } from '../utils/progressNormalizer';

interface LoadingOverlayProps {
  loadingProgress: LoadingProgress;
  isCancelling: boolean;
  onCancel: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loadingProgress,
  isCancelling,
  onCancel
}) => {
  // Check if we have valid, ready progress data
  const hasValidProgressData = React.useMemo(() => {
    return (
      isValidLoadingProgress(loadingProgress) &&
      typeof loadingProgress.totalDrones === 'number' &&
      typeof loadingProgress.completedDrones === 'number' &&
      !isNaN(loadingProgress.totalDrones) &&
      !isNaN(loadingProgress.completedDrones) &&
      loadingProgress.totalDrones > 0
    );
  }, [loadingProgress]);

  // Calculate progress percentage with proper safeguards
  const progressPercent = React.useMemo(() => {
    if (!hasValidProgressData) return 0;
    
    const { completedDrones, totalDrones, progress } = loadingProgress;
    
    // Use explicit progress if available
    if (typeof progress === 'number' && !isNaN(progress)) {
      return Math.max(0, Math.min(100, progress));
    }
    
    // Calculate from drone counts with safety checks
    if (totalDrones > 0 && completedDrones >= 0) {
      return Math.max(0, Math.min(100, Math.round((completedDrones / totalDrones) * 100)));
    }
    
    return 0;
  }, [loadingProgress, hasValidProgressData]);

  // Create style object for CSS custom property
  const progressStyle = React.useMemo(() => ({
    '--progress-width': `${progressPercent}%`
  } as React.CSSProperties), [progressPercent]);

  // Only show the modal when we have meaningful data to display
  if (!hasValidProgressData) {
    return null; // Don't show modal until we have actual progress data
  }

  // Format drone counts safely - we know these are valid numbers now
  const droneCountDisplay = `${loadingProgress.completedDrones}/${loadingProgress.totalDrones}`;

  // Determine if we should show detailed progress (vs just a spinner)
  const showDetailedProgress = loadingProgress.phase === 'processing';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Loading Message */}
          <div className="text-center">
            <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {loadingProgress.message}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              {loadingProgress.elapsedTime.toFixed(1)}s elapsed
            </div>
          </div>

          {/* Progress Bar (only show during processing phase) */}
          {showDetailedProgress && (
            <div className="w-full">
              <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
                <span>Progress: {droneCountDisplay} drones</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-[var(--divider)] rounded-full h-2 progress-bar-container">
                <div 
                  className="bg-[var(--highlight-blue)] h-2 rounded-full transition-all duration-300 ease-out progress-bar"
                  style={progressStyle}
                />
              </div>
            </div>
          )}

          {/* Spinner for non-processing phases */}
          {!showDetailedProgress && (
            <div className="flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[var(--highlight-blue)]" />
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={isCancelling || loadingProgress.phase === 'finalizing'}
            className="h-[38px] bg-gray-700 text-gray-300 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm select-none"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
