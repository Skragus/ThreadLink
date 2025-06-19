// components/Footer.tsx - Footer Component

import React from 'react';
import { formatTokenCount } from '../utils/textProcessing';

interface FooterProps {
  tokenCount: number;
  outputTokenCount: number;
  compressionRatio: string;
  onCompressionChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  isProcessed: boolean;
  isLoading: boolean;
  isCopied: boolean;
  onCondense: () => void;
  onCopy: () => void;
  onReset: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  tokenCount,
  compressionRatio,
  onCompressionChange,
  isProcessed,
  isLoading,
  isCopied,
  onCondense,
  onCopy,
  onReset
}) => {
  return (
    <>
      <div className="border-t border-[#181920] bg-[var(--bg-primary)] pb-4">
        <div className="px-12 py-4">
          <div className="flex flex-wrap justify-between items-center gap-3 min-h-[48px]">            <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)] select-none cursor-default">
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono w-32" data-testid="input-tokens">{formatTokenCount(tokenCount)}</span>
                <label htmlFor="compression-ratio-select" className="whitespace-nowrap cursor-default">
                  Compression level:
                </label>
                <select
                  id="compression-ratio-select"
                  value={compressionRatio}
                  onChange={onCompressionChange}
                  className="px-2 py-1 bg-[var(--card-bg)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-pointer min-w-[120px]"
                >
                  <option value="light" className="cursor-pointer">Light</option>
                  <option value="balanced" className="cursor-pointer">Balanced</option>
                  <option value="aggressive" className="cursor-pointer">Aggressive</option>
                </select>
              </div>
            </div>
              <div className="flex gap-3 shrink-0">
              {!isProcessed && (
                <button 
                  onClick={onCondense}
                  disabled={isLoading}
                  className={`h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg min-w-[120px] whitespace-nowrap select-none ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isLoading ? 'Processing...' : 'Condense'}
                </button>
              )}
              {isProcessed && (
                <>
                  <button 
                    onClick={onCopy}
                    className="h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg relative min-w-[100px] whitespace-nowrap select-none cursor-pointer"
                  >
                    <span className={isCopied ? 'opacity-0' : 'opacity-100'}>Copy</span>
                    {isCopied && (
                      <span className="absolute inset-0 flex items-center justify-center animate-pulse">
                        ✓
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={onReset}
                    className="h-[38px] bg-[var(--text-secondary)] text-white px-4 rounded-lg min-w-[100px] whitespace-nowrap select-none cursor-pointer"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] py-1">
        <p className="text-xs text-center text-[var(--text-secondary)] opacity-70 flex items-center justify-center flex-wrap gap-x-2 select-none cursor-default">
          <span>Open Source</span>
          <span>·</span>
          <span>BYOK</span>
          <span>·</span>
          <span>Privacy-first</span>
        </p>
      </div>
    </>
  );
};

export default Footer;
