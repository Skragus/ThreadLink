// components/LoadingOverlay.tsx - Loading Overlay Component

import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { LoadingProgress } from '../types';

interface LoadingOverlayProps {
  loadingProgress: LoadingProgress;
  isCancelling: boolean;
  onCancel: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loadingProgress,
  isCancelling,
  onCancel
}) => {  const progressBarRef = useRef<HTMLDivElement>(null);

  // Update progress bar width
  useEffect(() => {
    if (progressBarRef.current) {
      if (loadingProgress.totalDrones && loadingProgress.totalDrones > 0) {
        const progressPercent = Math.min(100, ((loadingProgress.completedDrones || 0) / loadingProgress.totalDrones) * 100);
        progressBarRef.current.style.width = `${progressPercent}%`;
      } else {
        // Start with 0% width to prevent flash
        progressBarRef.current.style.width = '0%';
      }
    }
  }, [loadingProgress.completedDrones, loadingProgress.totalDrones]);return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6">          {/* Loading Message */}
          <div className="text-center">            <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {loadingProgress.message}
            </div>
            {loadingProgress.elapsedTime !== undefined && (
              <div className="text-sm text-[var(--text-secondary)]">
                {loadingProgress.elapsedTime.toFixed(1)}s elapsed
              </div>
            )}
          </div>

          {/* Progress Bar (only show during processing phase) */}
          {loadingProgress.phase === 'processing' && loadingProgress.totalDrones && (
            <div className="w-full">
              <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
                <span>Progress: {loadingProgress.completedDrones || 0}/{loadingProgress.totalDrones} drones</span>
                <span>{Math.round(((loadingProgress.completedDrones || 0) / loadingProgress.totalDrones) * 100)}%</span>
              </div>              <div className="w-full bg-[var(--divider)] rounded-full h-2">
                <div 
                  ref={progressBarRef}
                  className="bg-[var(--highlight-blue)] h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: '0%' }} /* Initialize with 0% width */
                />
              </div>
            </div>
          )}

          {/* Spinner for non-processing phases */}
          {loadingProgress.phase !== 'processing' && (
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
