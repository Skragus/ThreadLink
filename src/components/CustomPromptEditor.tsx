// components/CustomPromptEditor.tsx - Custom Prompt Editor Component

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { DEFAULT_DRONE_PROMPT } from '../pipeline/config.js';

interface CustomPromptEditorProps {
  isOpen: boolean;
  customPrompt: string;
  onSave: (prompt: string) => void;
  onBack: () => void;
}

export const CustomPromptEditor: React.FC<CustomPromptEditorProps> = ({
  isOpen,
  customPrompt,
  onSave,
  onBack
}) => {  const [promptText, setPromptText] = useState(customPrompt);

  useEffect(() => {
    // If no custom prompt exists, populate with default from config
    if (!customPrompt) {
      setPromptText(DEFAULT_DRONE_PROMPT);
    } else {
      setPromptText(customPrompt);
    }
  }, [customPrompt]);

  if (!isOpen) return null;

  const handleApplyAndClose = () => {
    onSave(promptText);
    onBack();
  };  const handleCancel = () => {
    onBack();
  };return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-[var(--card-bg)] border border-red-500/50 rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">        {/* Header */}
        <div className="border-b border-red-500/30 p-3 sm:p-4 bg-red-950/20">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center space-x-1 sm:space-x-2 text-red-400">
              <AlertTriangle size={16} className="sm:w-5 sm:h-5" />
              <span className="font-bold text-xs sm:text-sm">WARNING: CORE LOGIC OVERRIDE</span>
              <AlertTriangle size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-red-300 text-xs sm:text-sm text-center">
              You are changing the fundamental instructions for the AI. Unstable results and failures are likely.
            </p><div className="bg-red-900/20 border border-red-500/30 rounded p-2 sm:p-3 mt-3">              <p className="text-[var(--text-secondary)] text-xs sm:text-sm mb-3">
                <strong>System Prompt:</strong> This acts as a function applied to every text batch. Each drone gets this prompt + your text segment. 
                The <code className="bg-black/30 px-1 py-0.5 rounded text-red-300 text-xs">{'{TARGET_TOKENS}'}</code> variable 
                sets each drone's output length target. Using the variable is optional.
              </p>
              
              <p className="text-red-200 text-xs mb-1">
                <strong>Example:</strong> "Extract key insights from this text in exactly {'{TARGET_TOKENS}'} tokens."
              </p>

            </div>
          </div>
        </div>        {/* Editor Body */}
        <div className="flex-1 p-3 sm:p-4 overflow-hidden">
          <div className="h-full flex flex-col">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="flex-1 w-full p-3 sm:p-4 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] font-mono text-xs sm:text-sm resize-none focus:outline-none focus:border-red-500/50"
              placeholder="Enter your custom prompt..."
              spellCheck={false}
            />
          </div>
        </div>        {/* Footer */}
        <div className="border-t border-red-500/30 p-3 sm:p-4 bg-red-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-red-300 pointer-events-none flex-1">
              By applying this custom prompt, you accept full responsibility for any unexpected behavior, increased costs, or processing failures.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">              <button
                onClick={handleCancel}
                className="px-4 sm:px-6 py-2 bg-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/80 text-white rounded-lg font-medium transition-colors flex-shrink-0 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAndClose}
                className="px-4 sm:px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors relative z-10 flex-shrink-0 w-full sm:w-auto"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};