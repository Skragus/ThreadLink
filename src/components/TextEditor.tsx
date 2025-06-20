// components/TextEditor.tsx - Text Editor Component

import React from 'react';
import { LoadingOverlay } from './LoadingOverlay';
import { LoadingProgress, Stats } from '../types';

interface TextEditorProps {
  displayText: string;
  isLoading: boolean;
  isProcessed: boolean;
  error: string;
  stats: Stats | null;
  loadingProgress: LoadingProgress;
  isCancelling: boolean;
  errorRef: React.RefObject<HTMLDivElement>;
  statsRef: React.RefObject<HTMLDivElement>;
  outputTextareaRef: React.RefObject<HTMLTextAreaElement>;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  displayText,
  isLoading,
  isProcessed,
  error,
  stats,
  loadingProgress,
  isCancelling,
  errorRef,
  statsRef,
  outputTextareaRef,
  onTextChange,
  onCancel
}) => {
  return (
    <>
      {/* Error Display */}
      {error && (
        <div ref={errorRef} className="mx-4 sm:mx-8 lg:mx-12 mt-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm select-none cursor-default">
          {error}
        </div>
      )}

      {/* Stats Display */}
      {stats && (
        <div 
          ref={statsRef} 
          className="mx-4 sm:mx-8 lg:mx-12 mt-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 rounded text-green-400 text-sm select-none cursor-default"
        >
          <div className="hidden sm:block">
            Processed in {stats.executionTime}s • {stats.compressionRatio}:1 compression • {stats.successfulDrones}/{stats.totalDrones} drones successful
          </div>
          <div className="sm:hidden">
            <div>Processed in {stats.executionTime}s</div>
            <div>{stats.compressionRatio}:1 compression</div>
            <div>{stats.successfulDrones}/{stats.totalDrones} drones successful</div>
          </div>
        </div>
      )}      {/* Main content area */}
      <div className="flex-grow flex flex-col justify-center px-3 sm:px-8 lg:px-12 py-2 sm:py-4 relative mobile-flex-fix">
        <div className="relative w-full flex-grow mobile-flex-fix">
          <textarea
            ref={outputTextareaRef}
            className={`w-full h-full bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg p-3 sm:p-4 resize-none focus:border-[var(--highlight-blue)] focus:outline-none text-sm sm:text-base ${isProcessed || isLoading ? 'cursor-default' : 'cursor-text'}`}
            placeholder="Paste your AI conversation here..."
            value={displayText}
            onChange={onTextChange}
            readOnly={isProcessed || isLoading}
            spellCheck={false}
          />{/* Floating Badge - positioned to avoid scroll bars */}
          <a 
            href="https://bolt.new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-10 pointer-events-auto"
          >            
            <img 
              src="/assets/bolt-badge.png"
              alt="Powered by Bolt.new" 
              className="w-16 sm:w-20 h-auto opacity-10 hover:opacity-50 transition-opacity drop-shadow-sm"
            />
          </a>
        </div>
        
        {/* Loading Overlay */}
        {isLoading && (
          <LoadingOverlay 
            loadingProgress={loadingProgress}
            isCancelling={isCancelling}
            onCancel={onCancel}
          />
        )}
      </div>
    </>
  );
};

export default TextEditor;
