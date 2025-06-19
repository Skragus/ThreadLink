// WelcomeBanner.tsx - Welcome banner for first-time visitors

import React from 'react';
import { Info, Key, X } from 'lucide-react';

interface WelcomeBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  isVisible,
  onDismiss
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2 flex-1">
          <Info size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700 min-w-0">
            <div className="font-medium mb-1">Welcome!</div>
            <div className="hidden sm:block">
              ThreadLink uses BYOK. 
              Configure your API keys using the <Key size={14} className="inline mx-1" /> button, or learn more with the <Info size={14} className="inline mx-1" /> button.
            </div>
            <div className="sm:hidden">
              ThreadLink uses BYOK. Configure API keys <Key size={14} className="inline mx-1" /> or learn more <Info size={14} className="inline mx-1" />.
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss welcome banner"
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-yellow-500/20 transition-colors text-yellow-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default WelcomeBanner;
