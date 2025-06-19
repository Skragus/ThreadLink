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
}) => {  if (!isVisible) return null;
  return (
    <div className="mx-12 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info size={16} className="text-yellow-600 flex-shrink-0" />          <span className="text-sm text-yellow-700">
            <strong>Welcome!</strong> ThreadLink uses BYOK (Bring Your Own Keys). 
            Configure your API keys using the <Key size={14} className="inline mx-1" /> button, or learn more with the <Info size={14} className="inline mx-1" /> button.
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss welcome banner"
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-yellow-500/20 transition-colors text-yellow-600"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default WelcomeBanner;
