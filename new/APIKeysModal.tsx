// components/SettingsModal.tsx - Settings Modal Component

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  model: string;
  setModel: (model: string) => void;
  processingSpeed: string;
  setProcessingSpeed: (speed: string) => void;
  recencyMode: boolean;
  setRecencyMode: (enabled: boolean) => void;
  recencyStrength: number;
  setRecencyStrength: (strength: number) => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  advTemperature: number;
  setAdvTemperature: (temp: number) => void;
  advDroneDensity: number;
  setAdvDroneDensity: (density: number) => void;
  advMaxDrones: number;
  setAdvMaxDrones: (max: number) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  model,
  setModel,
  processingSpeed,
  setProcessingSpeed,
  recencyMode,
  setRecencyMode,
  recencyStrength,
  setRecencyStrength,
  showAdvanced,
  setShowAdvanced,
  advTemperature,
  setAdvTemperature,
  advDroneDensity,
  setAdvDroneDensity,
  advMaxDrones,
  setAdvMaxDrones,
  onClose
}) => {
  if (!isOpen) return null;

  const isAnthropicModel = model.includes('claude');
  const showProcessingSpeed = !isAnthropicModel;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4 select-none cursor-default">Settings</h3>
        <div className="space-y-6">
          {/* Model Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label htmlFor="model-select" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                Model
              </label>
            </div>
            <select
              id="model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-48 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-pointer"
            >
              <optgroup label="Google">
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-pro">Gemini Pro</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </optgroup>
            </select>
          </div>

          {/* Processing Speed Toggle */}
          {showProcessingSpeed && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                  Processing Speed
                </label>
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                    i
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                    Fast mode uses higher concurrency for faster processing
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs select-none cursor-default ${processingSpeed === 'balanced' ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                  Normal
                </span>
                <button
                  onClick={() => setProcessingSpeed(processingSpeed === 'balanced' ? 'fast' : 'balanced')}
                  title={`Switch to ${processingSpeed === 'balanced' ? 'fast' : 'balanced'} processing`}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
                    processingSpeed === 'fast' ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                      processingSpeed === 'fast' ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs select-none cursor-default ${processingSpeed === 'fast' ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                  Fast
                </span>
              </div>
            </div>
          )}

          {/* Recency Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                Recency Mode
              </label>
              <div className="group relative">
                <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                  i
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                  Prioritizes more recent content in conversations
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-xs select-none cursor-default ${!recencyMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                Off
              </span>
              <button
                onClick={() => setRecencyMode(!recencyMode)}
                title={`${recencyMode ? 'Disable' : 'Enable'} recency mode`}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
                  recencyMode ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                    recencyMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs select-none cursor-default ${recencyMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                On
              </span>
            </div>
          </div>

          {/* Recency Strength Slider */}
          {recencyMode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                  Recency Strength
                </label>
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                    i
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                    How strongly to weight recent vs older content
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={recencyStrength}
                  onChange={(e) => setRecencyStrength(parseInt(e.target.value))}
                  title="Adjust recency strength"
                  className="w-48 h-1 bg-[var(--divider)] rounded-lg appearance-none cursor-pointer select-none"
                />
                <div className="flex justify-between text-xs text-[var(--text-secondary)] w-48 select-none cursor-default">
                  <span className={recencyStrength === 0 ? 'text-[var(--text-primary)] font-medium' : ''}>Subtle</span>
                  <span className={recencyStrength === 1 ? 'text-[var(--text-primary)] font-medium' : ''}>Balanced</span>
                  <span className={recencyStrength === 2 ? 'text-[var(--text-primary)] font-medium' : ''}>Strong</span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="border-t border-[var(--divider)] pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none cursor-pointer"
            >
              {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>Advanced Settings</span>
            </button>
            
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* LLM Temperature */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="adv-temperature" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                      LLM Temperature
                    </label>
                    <div className="group relative">
                      <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                        i
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                        Controls creativity. 0.2 = deterministic, 1.0 = creative
                      </div>
                    </div>
                  </div>
                  <input
                    id="adv-temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={advTemperature}
                    onChange={(e) => setAdvTemperature(parseFloat(e.target.value))}
                    className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-text"
                  />
                </div>

                {/* Drone Density */}
                {!recencyMode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="adv-drone-density" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                        Drone Density
                      </label>
                      <div className="group relative">
                        <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                          i
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                          Drones per 10k tokens. Controls cost vs. granularity
                        </div>
                      </div>
                    </div>
                    <input
                      id="adv-drone-density"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={advDroneDensity}
                      onChange={(e) => setAdvDroneDensity(parseInt(e.target.value))}
                      className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-text"
                    />
                  </div>
                )}

                {/* Danger Zone */}
                <div className="border-t border-red-500/30 pt-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="adv-max-drones" className="text-sm text-red-400/80 select-none cursor-default">
                        Max Drones Limit
                      </label>
                      <div className="group relative">
                        <div className="w-4 h-4 rounded-full border border-red-400/80 flex items-center justify-center text-xs text-red-400/80 cursor-help select-none">
                          i
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                          Hard safety limit on total drones per job
                        </div>
                      </div>
                    </div>
                    <input
                      id="adv-max-drones"
                      type="number"
                      min="10"
                      max="200"
                      step="10"
                      value={advMaxDrones}
                      onChange={(e) => setAdvMaxDrones(parseInt(e.target.value))}
                      className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-red-500/30 rounded text-[var(--text-primary)] focus:outline-none focus:border-red-500/50 text-sm cursor-text"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg select-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};