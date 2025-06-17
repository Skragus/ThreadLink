// components/CustomPromptEditor.tsx - Custom Prompt Editor Component

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
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
  const [showInitialWarning, setShowInitialWarning] = useState(true);

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
  };

  const handleBack = () => {
    // Confirm if there are unsaved changes
    if (promptText !== customPrompt) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to go back?');
      if (!confirmed) return;
    }
    onBack();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] border border-red-500/50 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* First-time warning overlay */}
        {showInitialWarning && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 rounded-lg">
            <div className="bg-red-950 border-2 border-red-500 rounded-lg p-6 max-w-lg mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle size={32} className="text-red-400" />
                <h3 className="text-xl font-bold text-red-400">FIRST TIME WARNING</h3>
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              
              <div className="space-y-4 text-red-200">
                <p className="font-medium">
                  You are about to access <strong>ADVANCED SYSTEM PROMPT EDITING</strong>.
                </p>
                <div className="bg-red-900/30 border border-red-400/30 rounded p-3">
                  <p className="text-sm">
                    <strong>⚠️ RISKS:</strong>
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>Complete processing failure</li>
                    <li>Dramatically increased API costs</li>
                    <li>Unpredictable or corrupted output</li>
                    <li>No technical support for custom prompts</li>
                  </ul>
                </div>
                <p className="text-sm text-red-300">
                  This will override the core logic that makes ThreadLink work. Only proceed if you understand prompt engineering and accept full responsibility for any issues.
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInitialWarning(false)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  I Accept All Risks
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-red-500/30 p-4 bg-red-950/20">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleBack}
              className="flex items-center space-x-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft size={20} />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle size={20} />
              <span className="font-bold">DANGER ZONE</span>
              <AlertTriangle size={20} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-red-400 flex items-center space-x-2">
              <AlertTriangle size={24} />
              <span>WARNING: CORE LOGIC OVERRIDE</span>
            </h2>
            <p className="text-red-300 text-sm">
              You are changing the fundamental instructions for the AI. Unstable results, higher costs, and processing failures are likely.
            </p>
            <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mt-3">
              <p className="text-[var(--text-secondary)] text-sm">
                <strong>Core Logic:</strong> This prompt is sent to EVERY drone that processes your text. 
                The <code className="bg-black/30 px-1 py-0.5 rounded text-red-300">{'{TARGET_TOKENS}'}</code> variable 
                will be replaced with the calculated token budget for each drone based on your compression settings.
              </p>
            </div>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col">
            <label className="text-sm text-[var(--text-secondary)] mb-2">
              System Prompt (sent to every drone):
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="flex-1 w-full p-4 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] font-mono text-sm resize-none focus:outline-none focus:border-red-500/50"
              placeholder="Enter your custom prompt..."
              spellCheck={false}
            />
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {promptText.length} characters | ~{Math.ceil(promptText.length / 4)} tokens (estimate)
            </div>
          </div>
        </div>        {/* Footer */}
        <div className="border-t border-red-500/30 p-4 bg-red-950/10">
          <div className="space-y-3">
            <p className="text-xs text-red-300 pointer-events-none">
              By applying this custom prompt, you accept full responsibility for any unexpected behavior, increased costs, or processing failures.
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleApplyAndClose}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors relative z-10"
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