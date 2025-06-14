import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Settings, Loader2 } from 'lucide-react';

// API configuration
const API_BASE_URL = 'http://localhost:3001/api';

interface Stats {
  executionTime: string | number;
  compressionRatio: string | number;
  successfulDrones: number;
  totalDrones: number;
}

interface LoadingProgress {
  phase: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message: string;
  completedDrones?: number;
  totalDrones?: number;
  elapsedTime?: number;
}

function ThreadLink() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [compressionRatio, setCompressionRatio] = useState('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  
  // Loading progress state
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    phase: 'preparing',
    message: 'Preparing drone batches'
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Settings
  const [model, setModel] = useState('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [processingSpeed, setProcessingSpeed] = useState('balanced');
  const [recencyMode, setRecencyMode] = useState(false);
  const [recencyStrength, setRecencyStrength] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [adv_targetTokens, setAdv_targetTokens] = useState(1500);
  const [adv_temperature, setAdv_temperature] = useState(0.5);
  const [adv_droneDensity, setAdv_droneDensity] = useState(2);
  const [adv_recencyStrength, setAdv_recencyStrength] = useState(50);
  const [adv_maxDrones, setAdv_maxDrones] = useState(100);

  // Refs
  const errorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingStartTime = useRef<number>(0);
  const progressPollInterval = useRef<NodeJS.Timeout | null>(null);

  // Processing Speed logic
  const isAnthropicModel = model.includes('claude');
  const showProcessingSpeed = !isAnthropicModel;

  // Auto-reset processing speed when switching to Anthropic
  useEffect(() => {
    if (isAnthropicModel && processingSpeed === 'fast') {
      setProcessingSpeed('balanced');
    }
  }, [model, isAnthropicModel, processingSpeed]);

  const calculateConcurrency = () => {
    if (isAnthropicModel) return 1;
    if (processingSpeed === 'fast') return 6;
    return 3;
  };

  const roundTokenCount = (count: number): number => {
    if (count === 0) return 0;
    if (count < 1000) {
      return Math.round(count / 10) * 10;
    } else if (count < 5000) {
      return Math.round(count / 50) * 50;
    } else {
      return Math.round(count / 100) * 100;
    }
  };

  const formatTokenCount = (count: number): string => {
    const rounded = roundTokenCount(count);
    return `${count === 0 ? '' : '~'}${rounded.toLocaleString()} tokens`;
  };

  const estimateTokens = (text: string): number => {
    return Math.ceil((text || "").length / 4);
  };

  const calculateTargetTokens = (): number => {
    if (tokenCount === 0) return 100;
    
    switch (compressionRatio) {
      case 'light':
        return Math.max(50, Math.round(tokenCount / 5));
      case 'balanced':
        return Math.max(50, Math.round(tokenCount / 15));
      case 'aggressive':
        return Math.max(50, Math.round(tokenCount / 30));
      default:
        return Math.max(50, Math.round(tokenCount / 15));
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    setError('');
    setTokenCount(estimateTokens(text));
  };

  const getErrorDisplay = (errorMessage: string, errorType?: string): string => {
    if (errorType === 'AUTH_ERROR' || errorMessage.includes('Invalid API key')) {
      return 'Authentication failed. Please check your API key configuration.';
    }
    if (errorType === 'NETWORK_ERROR' || errorMessage.includes('Cannot connect')) {
      return 'Unable to connect to the processing server. Ensure the backend is running.';
    }
    if (errorType === 'RATE_LIMIT') {
      return 'API rate limit reached. The system is handling this automatically.';
    }
    if (errorType === 'PROCESSING_FAILURE') {
      return 'Processing failed - no content could be generated. All drones encountered errors.';
    }
    if (errorType === 'SERVER_ERROR') {
      return 'Server temporarily unavailable. Please try again in a moment.';
    }
    if (errorType === 'BAD_REQUEST') {
      return 'Invalid request. Please check your input or parameters.';
    }
    if (errorType === 'TIMEOUT') {
      return 'The operation timed out. Please try again. If the problem persists, consider reducing input size.';
    }
    return errorMessage;
  };

  const handleCompressionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompressionRatio(e.target.value);
  };

  // Progress polling function
  const pollProgress = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/progress/${jobId}`);
      const data = await response.json();
      
      if (data.phase && data.message) {
        const elapsedTime = (Date.now() - loadingStartTime.current) / 1000;
        setLoadingProgress({
          ...data,
          elapsedTime
        });
        
        // If processing is complete, stop polling
        if (data.phase === 'complete') {
          if (progressPollInterval.current) {
            clearInterval(progressPollInterval.current);
            progressPollInterval.current = null;
          }
        }
      }
    } catch (error) {
      console.warn('Progress poll failed:', error);
    }
  };

  const startProgressPolling = (jobId: string) => {
    loadingStartTime.current = Date.now();
    setLoadingProgress({
      phase: 'preparing',
      message: 'Preparing drone batches',
      elapsedTime: 0
    });
    
    // Poll every 500ms for smooth updates
    progressPollInterval.current = setInterval(() => {
      pollProgress(jobId);
    }, 500);
  };

  const stopProgressPolling = () => {
    if (progressPollInterval.current) {
      clearInterval(progressPollInterval.current);
      progressPollInterval.current = null;
    }
  };

  const handleCancel = async () => {
    if (!jobId || isCancelling) return;
    
    setIsCancelling(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/cancel/${jobId}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Processing cancelled successfully');
        setError('Processing was cancelled');
      } else {
        console.warn('⚠️ Cancel request failed:', data.message);
        setError('Failed to cancel processing');
      }
    } catch (error) {
      console.error('❌ Cancel request error:', error);
      setError('Failed to cancel processing');
    } finally {
      // Clean up regardless of cancel success/failure
      stopProgressPolling();
      setIsLoading(false);
      setIsCancelling(false);
      setJobId(null);
    }
  };

  const handleCondense = async () => {
    if (!inputText.trim()) {
      setError('Please paste some text to condense');
      return;
    }

    setIsLoading(true);
    setError('');
    setStats(null);
    const targetTokens = calculateTargetTokens();
    const calculatedConcurrency = calculateConcurrency();
    
    // Generate job ID for progress tracking
    const newJobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setJobId(newJobId);
    
    // Start progress polling
    startProgressPolling(newJobId);
    
    const recencyStrengthValue = recencyMode ? 
      (recencyStrength === 0 ? 25 : recencyStrength === 1 ? 50 : 90) : 0;
    
    try {
      const requestBody = {
        text: inputText,
        model: model,
        targetTokens: targetTokens,
        jobId: newJobId, // Include job ID for progress tracking
        
        // Processing settings
        processingSpeed: processingSpeed,
        concurrency: calculatedConcurrency,
        recencyMode: recencyMode,
        recencyStrength: recencyStrengthValue,
        
        // Advanced settings
        temperature: adv_temperature,
        droneDensity: recencyMode ? undefined : adv_droneDensity,
        maxDrones: adv_maxDrones,
        
        compressionRatio: compressionRatio
      };
      
      const response = await fetch(`${API_BASE_URL}/condense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorInfo = getErrorDisplay(data.message || data.error || 'Processing failed', data.errorType);
        throw new Error(errorInfo);
      }

      if (data.success) {
        setOutputText(data.contextCard);
        setStats(data.stats);
        setIsProcessed(true);
        console.log('✅ Processing complete:', data.stats);
      } else {
        const errorInfo = getErrorDisplay(data.message || 'Processing failed according to server.', data.errorType);
        setError(errorInfo);
        console.error('❌ Processing Failed:', errorInfo);
      }
      
    } catch (err: any) {
      console.error('❌ Caught an exception during processing:', err);
      const isNetworkError = err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('NetworkError'));
      const errorInfo = getErrorDisplay(
        err.message || 'An unexpected client-side error occurred.',
        isNetworkError ? 'NETWORK_ERROR' : 'GENERAL_ERROR'
      );
      setError(errorInfo);
    } finally {
      stopProgressPolling();
      setIsLoading(false);
      setJobId(null);
    }
  };

  const handleCopy = async () => {
    const textToCopy = isProcessed ? outputText : inputText;
    await navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleReset = () => {
    setInputText('');
    setOutputText('');
    setIsProcessed(false);
    setTokenCount(0);
    setError('');
    setStats(null);
    stopProgressPolling();
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const openHelp = () => {
    window.open('https://github.com/skragus/threadlink', '_blank');
  };
  
  const displayText = isProcessed ? outputText : inputText;
  
  // Effect to update token count based on displayed text
  useEffect(() => {
    setTokenCount(estimateTokens(displayText));
  }, [displayText]);

  // Effect to scroll to the relevant section after processing
  useEffect(() => {
    if (isProcessed && stats) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          if (statsRef.current) {
            statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isProcessed, stats]);

  useEffect(() => {
    if (outputTextareaRef.current && isProcessed) {
      const timer = setTimeout(() => {
        if (outputTextareaRef.current) {
          outputTextareaRef.current.scrollTop = 0;
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [outputText, isProcessed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressPolling();
    };
  }, []);

  return (
    <>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--highlight-blue);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--highlight-blue);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: none;
        }
      `}</style>
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4 select-none">Settings</h3>
              <div className="space-y-6">
                {/* Model Selection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="model-select" className="text-sm text-[var(--text-secondary)] select-none">
                      Model
                    </label>
                    <div className="group relative">
                      <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                        i
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
                        AI model used for text processing
                      </div>
                    </div>
                  </div>
                  <select
                    id="model-select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-48 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm"
                  >
                    <optgroup label="Google">
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </optgroup>
                    <optgroup label="OpenAI">
                      <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                      <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    </optgroup>
                    <optgroup label="Anthropic">
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                    </optgroup>
                  </select>
                </div>

                {/* Processing Speed Toggle */}
                {showProcessingSpeed && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-[var(--text-secondary)] select-none">
                        Processing Speed
                      </label>
                      <div className="group relative">
                        <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                          i
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
                          Fast mode uses higher concurrency for faster processing
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs select-none ${processingSpeed === 'balanced' ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                        Normal
                      </span>
                      <button
                        onClick={() => setProcessingSpeed(processingSpeed === 'balanced' ? 'fast' : 'balanced')}
                        title={`Switch to ${processingSpeed === 'balanced' ? 'fast' : 'balanced'} processing`}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none ${
                          processingSpeed === 'fast' ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                            processingSpeed === 'fast' ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs select-none ${processingSpeed === 'fast' ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                        Fast
                      </span>
                    </div>
                  </div>
                )}

                {/* Recency Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-[var(--text-secondary)] select-none">
                      Recency Mode
                    </label>
                    <div className="group relative">
                      <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                        i
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
                        Prioritizes more recent content in conversations
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs select-none ${!recencyMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                      Off
                    </span>
                    <button
                      onClick={() => setRecencyMode(!recencyMode)}
                      title={`${recencyMode ? 'Disable' : 'Enable'} recency mode`}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none ${
                        recencyMode ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                          recencyMode ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-xs select-none ${recencyMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                      On
                    </span>
                  </div>
                </div>

                {/* Recency Strength Slider */}
                {recencyMode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-[var(--text-secondary)] select-none">
                        Recency Strength
                      </label>
                      <div className="group relative">
                        <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                          i
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
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
                      <div className="flex justify-between text-xs text-[var(--text-secondary)] w-48 select-none">
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
                    className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none"
                  >
                    {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>Advanced Settings</span>
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-4 space-y-4">
                      {/* LLM Temperature */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <label htmlFor="adv-temperature" className="text-sm text-[var(--text-secondary)] select-none">
                            LLM Temperature
                          </label>
                          <div className="group relative">
                            <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                              i
                            </div>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
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
                          value={adv_temperature}
                          onChange={(e) => setAdv_temperature(parseFloat(e.target.value))}
                          className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm"
                        />
                      </div>

                      {/* Drone Density */}
                      {!recencyMode && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <label htmlFor="adv-drone-density" className="text-sm text-[var(--text-secondary)] select-none">
                              Drone Density
                            </label>
                            <div className="group relative">
                              <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] cursor-help select-none">
                                i
                              </div>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
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
                            value={adv_droneDensity}
                            onChange={(e) => setAdv_droneDensity(parseInt(e.target.value))}
                            className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm"
                          />
                        </div>
                      )}

                      {/* Danger Zone */}
                      <div className="border-t border-red-500/30 pt-4 mt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <label htmlFor="adv-max-drones" className="text-sm text-red-400/80 select-none">
                              Max Drones Limit
                            </label>
                            <div className="group relative">
                              <div className="w-4 h-4 rounded-full border border-red-400/80 flex items-center justify-center text-xs text-red-400/80 cursor-help select-none">
                                i
                              </div>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 select-none">
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
                            value={adv_maxDrones}
                            onChange={(e) => setAdv_maxDrones(parseInt(e.target.value))}
                            className="w-24 px-3 py-1 bg-[var(--bg-primary)] border border-red-500/30 rounded text-[var(--text-primary)] focus:outline-none focus:border-red-500/50 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg select-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-12 pt-6 pb-4 border-b border-[var(--divider)]">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-outfit leading-none flex items-center select-none">
              <span className="text-[#736C9E] tracking-[0.01em] font-normal">Thread</span>
              <span className="text-[#505C88] tracking-[-0.03em] font-medium">Link</span>
            </h1>
            <p className="text-sm font-outfit font-normal text-[#7D87AD] opacity-75 whitespace-nowrap hidden sm:block select-none">
              Condense, copy, continue — without breaking flow.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={openHelp}
              aria-label="Open help documentation"
              className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none"
            >
              <HelpCircle size={20} className="opacity-50" />
            </button>
            <button 
              onClick={openSettings}
              aria-label="Open settings"
              className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none"
            >
              <Settings size={20} className="opacity-50" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div ref={errorRef} className="mx-12 mt-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm select-none">
            {error}
          </div>
        )}

        {/* Stats Display */}
        {stats && (
          <div ref={statsRef} className="mx-12 mt-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 rounded text-green-400 text-sm select-none">
            Processed in {stats.executionTime}s • {stats.compressionRatio}:1 compression • {stats.successfulDrones}/{stats.totalDrones} drones successful
          </div>
        )}

        {/* Main content area */}
        <div className="flex-grow flex flex-col justify-center px-12 py-4 relative">
          <textarea
            ref={outputTextareaRef}
            className={`w-full flex-grow bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg p-4 resize-none focus:border-[var(--highlight-blue)] focus:outline-none ${isLoading ? 'blur-sm' : ''}`}
            placeholder="Paste your AI conversation here..."
            value={displayText}
            onChange={handleTextChange}
            readOnly={isProcessed || isLoading}
          />
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 mx-12 my-4 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
              <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-8 max-w-md w-full mx-4">
                <div className="flex flex-col items-center space-y-6">
                  {/* Loading Message */}
                  <div className="text-center">
                    <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
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
                      </div>
                      <div className="w-full bg-[var(--divider)] rounded-full h-2">
                        <div 
                          className="bg-[var(--highlight-blue)] h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ 
                            width: `${Math.min(100, ((loadingProgress.completedDrones || 0) / loadingProgress.totalDrones) * 100)}%` 
                          }}
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
                    onClick={handleCancel}
                    disabled={isCancelling || loadingProgress.phase === 'finalizing'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#181920] bg-[var(--bg-primary)] pb-4">
          <div className="px-12 py-4">
            <div className="flex flex-wrap justify-between items-center gap-3 min-h-[48px]">
              <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)] select-none">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono w-32">{formatTokenCount(tokenCount)}</span>
                  <span className="mx-2">•</span>
                  <label htmlFor="compression-ratio-select" className="whitespace-nowrap">Compress:</label>
                  <select
                    id="compression-ratio-select"
                    value={compressionRatio}
                    onChange={handleCompressionChange}
                    className="px-2 py-1 bg-[var(--card-bg)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] shrink-0 text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 shrink-0">
                {inputText && !isProcessed && (
                  <button 
                    onClick={handleCondense}
                    disabled={isLoading}
                    className="h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg disabled:opacity-50 min-w-[120px] whitespace-nowrap select-none"
                  >
                    {isLoading ? 'Processing...' : 'Condense'}
                  </button>
                )}
                {isProcessed && (
                  <>
                    <button 
                      onClick={handleCopy}
                      className="h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg relative min-w-[100px] whitespace-nowrap select-none"
                    >
                      <span className={isCopied ? 'opacity-0' : 'opacity-100'}>Copy</span>
                      {isCopied && (
                        <span className="absolute inset-0 flex items-center justify-center animate-pulse">
                          ✓
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={handleReset}
                      className="h-[38px] bg-[var(--text-secondary)] text-white px-4 rounded-lg min-w-[100px] whitespace-nowrap select-none"
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
          <p className="text-xs text-center text-[var(--text-secondary)] opacity-70 flex items-center justify-center flex-wrap gap-x-2 select-none">
            <span>Powered by</span>
            <a 
              href="https://bolt.new" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-outfit font-extrabold text-[#A0A4B8] tracking-[-0.01em] leading-none text-sm sm:text-base hover:opacity-100 transition-opacity"
            >
              bolt.new
            </a>
            <span>·</span>
            <span>Open Source</span>
            <span>·</span>
            <span>Backend Processing</span>
            <span>·</span>
            <span>Privacy-first</span>
          </p>
        </div>
      </div>
    </>
  );
}

export default ThreadLink;