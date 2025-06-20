import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { CustomPromptEditor } from './CustomPromptEditor';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { MODEL_PROVIDERS } from '../lib/client-api.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { getAvailableProviders } from '../lib/storage.js';

interface SettingsModalProps {
  isOpen: boolean;
  model: string;
  setModel: (_model: string) => void;
  processingSpeed: string;
  setProcessingSpeed: (_speed: string) => void;
  recencyMode: boolean;
  setRecencyMode: (_enabled: boolean) => void;
  recencyStrength: number;
  setRecencyStrength: (_strength: number) => void;
  showAdvanced: boolean;
  setShowAdvanced: (_show: boolean) => void;
  advTemperature: number;
  setAdvTemperature: (_temp: number) => void;
  advDroneDensity: number;
  setAdvDroneDensity: (_density: number) => void;
  advMaxDrones: number;
  setAdvMaxDrones: (_max: number) => void;
  // Add custom prompt props
  useCustomPrompt: boolean;
  setUseCustomPrompt: (_enabled: boolean) => void;
  customPrompt: string;
  setCustomPrompt: (_prompt: string) => void;  // Current API key states (for checking availability)
  googleAPIKey: string;
  openaiAPIKey: string;
  mistralAPIKey: string;
  groqAPIKey: string;
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
  setAdvMaxDrones,  // Add custom prompt props
  useCustomPrompt,
  setUseCustomPrompt,
  customPrompt,
  setCustomPrompt,  // Current API key states  
  googleAPIKey,
  openaiAPIKey,
  mistralAPIKey,
  groqAPIKey,
  onClose
}) => {
  const [showPromptEditor, setShowPromptEditor] = useState(false);  // Get available providers based on both cached API keys AND current input values
  const availableProviders = useMemo(() => {
    const cached = getAvailableProviders();
    return {
      google: cached.google || !!googleAPIKey,
      openai: cached.openai || !!openaiAPIKey,
      mistral: cached.mistral || !!mistralAPIKey,
      groq: cached.groq || !!groqAPIKey
    };
  }, [googleAPIKey, openaiAPIKey, mistralAPIKey, groqAPIKey]);// Check if the current model has its provider API key configured
  const currentModelProvider = MODEL_PROVIDERS[model] as keyof typeof availableProviders;
  const isCurrentModelAvailable = currentModelProvider && availableProviders[currentModelProvider];  // All available models - only cheap, fast models for batch processing  
  const availableModels = useMemo(() => {
    return {
      google: [
        { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" }
      ],
      openai: [
        { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
        { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" }
      ],
      mistral: [
        { value: "mistral-small-latest", label: "Mistral Small" }
      ],      groq: [
        { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (8k)" },
        { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (128k)" }
      ]
    };
  }, []);
  if (!isOpen) return null;  const showProcessingSpeed = true; // All models now support processing speed controls

  const handleCustomPromptToggle = () => {
    if (!useCustomPrompt) {
      // When turning ON, open the editor
      setShowPromptEditor(true);
    } else {
      // When turning OFF, just disable it
      setUseCustomPrompt(false);
    }
  };

  const handlePromptEditorClose = (saved: boolean) => {
    if (saved) {
      setUseCustomPrompt(true);
    }
    setShowPromptEditor(false);
  };  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not its children
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div role="dialog" aria-labelledby="settings-title" aria-modal="true" className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">          <h3 id="settings-title" className="text-lg font-medium text-[var(--text-primary)] mb-4 select-none cursor-default">Settings</h3>            {/* Warning when the selected model doesn't have an API key configured */}
          {!isCurrentModelAvailable && currentModelProvider && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} className="text-amber-500" />
                <span className="text-sm text-amber-600">
                  No {currentModelProvider.charAt(0).toUpperCase() + currentModelProvider.slice(1)} API key configured for the selected model. 
                  Please add your {currentModelProvider === 'openai' ? 'OpenAI' : currentModelProvider === 'mistral' ? 'Mistral' : currentModelProvider === 'groq' ? 'Groq' : 'Google'} API key to continue.
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-6">{/* Model Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label htmlFor="model-select" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                  Model
                </label>
              </div>              <select
                id="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-48 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-pointer"
              >
                <optgroup label="Google">
                  {availableModels.google.map(modelOption => (
                    <option key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </option>
                  ))}                </optgroup>
                <optgroup label="OpenAI">
                  {availableModels.openai.map(modelOption => (
                    <option key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Mistral">
                  {availableModels.mistral.map(modelOption => (
                    <option key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Groq">
                  {availableModels.groq.map(modelOption => (
                    <option key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </option>
                  ))}
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
                        </div>                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                          Controls creativity. 0.2 = deterministic, 1.2 = highly creative (optimal for condensation)
                        </div>
                      </div>
                    </div>
                    <input
                      id="adv-temperature"
                      type="number"
                      min="0"
                      max="1.2"
                      step="0.1"
                      value={advTemperature}
                      onChange={(e) => {                        const value = parseFloat(e.target.value);
                        if (value > 1.2) {
                          setAdvTemperature(1.2);
                          // TODO: Show toast notification "Temperature capped at 1.2 for optimal condensation quality"
                        } else if (value < 0) {
                          setAdvTemperature(0);
                          // TODO: Show toast notification "Temperature minimum is 0"
                        } else {
                          setAdvTemperature(value);
                        }
                      }}
                      className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-text"
                    />
                  </div>
                  
                  {/* Mistral Temperature Warning */}
                  {currentModelProvider === 'mistral' && advTemperature > 1.0 && (
                    <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                      <span className="font-medium">Note:</span> Mistral temperature will be capped at 1.0 due to provider limitations.
                    </div>
                  )}

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
                        max="10"
                        step="1"
                        value={advDroneDensity}
                        onChange={(e) => {                          const value = parseInt(e.target.value);
                          if (value > 10) {
                            setAdvDroneDensity(10);
                            // TODO: Show toast notification "Drone density capped at 10 to prevent excessive costs"
                          } else if (value < 1) {
                            setAdvDroneDensity(1);
                            // TODO: Show toast notification "Drone density minimum is 1"
                          } else {
                            setAdvDroneDensity(value);
                          }
                        }}
                        className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-text"
                      />
                    </div>
                  )}                  {/* Danger Zone */}
                  <div className="border-t border-red-500/30 pt-4 mt-6">
                    <h4 className="text-sm font-medium text-red-400/80 mb-4 select-none cursor-default flex items-center space-x-2">
                      <AlertTriangle size={16} className="text-red-400/80" />
                      <span>DANGER ZONE</span>
                    </h4>
                    
                    {/* Max Drones Limit */}
                    <div className="flex items-center justify-between mb-4">
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
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value > 200) {
                            setAdvMaxDrones(200);
                            // TODO: Show toast notification "Max drones capped at 200"
                          } else if (value < 10) {
                            setAdvMaxDrones(10);
                            // TODO: Show toast notification "Max drones minimum is 10"
                          } else {
                            setAdvMaxDrones(value);
                          }
                        }}
                        className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-red-500/30 rounded text-[var(--text-primary)] focus:outline-none focus:border-red-500/50 text-sm cursor-text"
                      />
                    </div>

                    {/* Custom Prompt Toggle */}                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-red-400 font-medium select-none cursor-default">
                          Custom System Prompt <span className="text-xs text-red-400/70">(experimental)</span>
                        </label>
                        {useCustomPrompt && (
                          <AlertTriangle size={14} className="text-amber-500" />
                        )}
                        <div className="group relative">
                          <div className="w-4 h-4 rounded-full border border-red-400 flex items-center justify-center text-xs text-red-400 cursor-help select-none">
                            !
                          </div>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none cursor-default">
                            Override ALL drone system prompts - USE WITH EXTREME CAUTION
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs select-none cursor-default ${!useCustomPrompt ? 'text-red-400/60 font-medium' : 'text-red-400/40'}`}>
                          Off
                        </span>                        <button
                          onClick={handleCustomPromptToggle}
                          title={`${useCustomPrompt ? 'Disable' : 'Enable'} custom system prompt`}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
                            useCustomPrompt ? 'bg-red-500' : 'bg-[var(--divider)]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                              useCustomPrompt ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-xs select-none cursor-default ${useCustomPrompt ? 'text-red-400 font-medium' : 'text-red-400/40'}`}>
                          On
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none cursor-pointer hover:bg-[var(--highlight-blue)]/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>      {/* Custom Prompt Editor Modal */}
      <CustomPromptEditor
        isOpen={showPromptEditor}
        customPrompt={customPrompt}
        onSave={(prompt: string) => {
          setCustomPrompt(prompt);
          handlePromptEditorClose(true);
        }}
        onBack={() => handlePromptEditorClose(false)}
      />
    </>
  );
};