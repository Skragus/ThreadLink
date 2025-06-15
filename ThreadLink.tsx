import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Info, 
  Settings, 
  Loader2, 
  Key, 
  X,
  Sparkles,
  Copy,
  Trash2,
  Package,
  Scale,
  Bot,
  Focus,
  Shield
} from 'lucide-react';

// Import our browser-based modules
// @ts-ignore - JavaScript modules without TypeScript declarations
import { runCondensationPipeline } from './src/pipeline/orchestrator.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { getAPIKey, saveAPIKey, removeAPIKey } from './src/lib/storage.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { MODEL_PROVIDERS } from './src/lib/client-api.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { estimateTokens } from './src/lib/client-api.js';

// Local type definitions
interface ProgressUpdate {
  phase?: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message?: string;
  completedDrones?: number;
  totalDrones?: number;
  progress?: number;
}

interface Stats {
  executionTime: string | number;
  compressionRatio: string | number;
  successfulDrones: number;
  totalDrones: number;
  initialTokens?: number;
  finalTokens?: number;
}

interface LoadingProgress {
  phase: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message: string;
  completedDrones?: number;
  totalDrones?: number;
  elapsedTime?: number;
  progress?: number;
}

function ThreadLink() {
  // Main app state
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
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelRef = useRef<boolean>(false);

  // Settings
  const [model, setModel] = useState('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [processingSpeed, setProcessingSpeed] = useState('balanced');
  const [recencyMode, setRecencyMode] = useState(false);  const [recencyStrength, setRecencyStrength] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // const [adv_targetTokens, setAdv_targetTokens] = useState(1500); // Unused
  const [adv_temperature, setAdv_temperature] = useState(0.5);
  const [adv_droneDensity, setAdv_droneDensity] = useState(2);
  // const [adv_recencyStrength, setAdv_recencyStrength] = useState(50); // Unused
  const [adv_maxDrones, setAdv_maxDrones] = useState(50);

  // API Keys state - Initialize from storage
  const [googleAPIKey, setGoogleAPIKey] = useState('');
  const [openaiAPIKey, setOpenaiAPIKey] = useState('');
  const [anthropicAPIKey, setAnthropicAPIKey] = useState('');
  
  // Cache toggle states - Initialize from storage
  const [googleCacheEnabled, setGoogleCacheEnabled] = useState(false);
  const [openaiCacheEnabled, setOpenaiCacheEnabled] = useState(false);
  const [anthropicCacheEnabled, setAnthropicCacheEnabled] = useState(false);

  // Info Panel expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    what: false,
    howto: false,
    compression: false,
    strategy: false,
    drones: false,
    recency: false,
    advanced: false,
    privacy: false
  });
  // Refs
  const errorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingStartTime = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Processing Speed logic
  const isAnthropicModel = model.includes('claude');
  const showProcessingSpeed = !isAnthropicModel;
  // Initialize API keys from storage on mount
  useEffect(() => {
    // Load API keys
    const loadedGoogleKey = getAPIKey('google');
    const loadedOpenAIKey = getAPIKey('openai');
    const loadedAnthropicKey = getAPIKey('anthropic');
    
    if (loadedGoogleKey) setGoogleAPIKey(loadedGoogleKey);
    if (loadedOpenAIKey) setOpenaiAPIKey(loadedOpenAIKey);
    if (loadedAnthropicKey) setAnthropicAPIKey(loadedAnthropicKey);
    
    // Load cache states - simplified to always false for now
    setGoogleCacheEnabled(false);
    setOpenaiCacheEnabled(false);
    setAnthropicCacheEnabled(false);
  }, []);

  useEffect(() => {
    if ((isProcessed || isLoading) && outputTextareaRef.current) {
      outputTextareaRef.current.blur();
    }
  }, [isProcessed, isLoading]);

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
    if (errorType === 'NETWORK_ERROR' || errorMessage.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    if (errorType === 'RATE_LIMIT') {
      return 'API rate limit reached. The system is handling this automatically.';
    }
    if (errorType === 'PROCESSING_FAILURE') {
      return 'Processing failed - no content could be generated. All drones encountered errors.';
    }
    if (errorType === 'CANCELLED') {
      return 'Processing was cancelled.';
    }
    return errorMessage;
  };

  const handleCompressionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompressionRatio(e.target.value);
  };

  const handleCancel = () => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    cancelRef.current = true;
    
    // The orchestrator will check cancelRef and handle cleanup
    setError('Processing was cancelled');
  };
  const saveAPIKeys = () => {
    // Save Google API key
    if (googleAPIKey) {
      saveAPIKey('google', googleAPIKey);
    } else {
      removeAPIKey('google');
    }
    
    // Save OpenAI API key
    if (openaiAPIKey) {
      saveAPIKey('openai', openaiAPIKey);
    } else {
      removeAPIKey('openai');
    }
    
    // Save Anthropic API key
    if (anthropicAPIKey) {
      saveAPIKey('anthropic', anthropicAPIKey);
    } else {
      removeAPIKey('anthropic');
    }
  };

  const handleCondense = async () => {
    if (!inputText.trim()) {
      setError('Please paste some text to condense');
      return;
    }

    // Check if we have the required API key for the selected model
    const provider = MODEL_PROVIDERS[model];
    if (!provider) {
      setError(`Unknown model: ${model}`);
      return;
    }

    const apiKey = getAPIKey(provider);
    if (!apiKey) {
      setError(`Please configure your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key`);
      setShowAPIKeys(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setStats(null);
    cancelRef.current = false;
    setIsCancelling(false);
    
    const targetTokens = calculateTargetTokens();
    const calculatedConcurrency = calculateConcurrency();
    loadingStartTime.current = Date.now();
    
    const recencyStrengthValue = recencyMode ? 
      (recencyStrength === 0 ? 25 : recencyStrength === 1 ? 50 : 90) : 0;
    
    try {      const result = await runCondensationPipeline({
        rawText: inputText,
        apiKey: apiKey,
        settings: {
          model: model,
          temperature: adv_temperature,
          maxConcurrency: calculatedConcurrency,
          customTargetTokens: targetTokens,
          processingSpeed: processingSpeed,
          recencyMode: recencyMode,        recencyStrength: recencyStrengthValue,
          droneDensity: recencyMode ? undefined : adv_droneDensity,
          maxDrones: adv_maxDrones
        },
        onProgress: (update: ProgressUpdate) => {
          const elapsedTime = (Date.now() - loadingStartTime.current) / 1000;
          setLoadingProgress({
            phase: update.phase || 'processing',
            message: update.message || 'Processing...',
            completedDrones: update.completedDrones,
            totalDrones: update.totalDrones,
            elapsedTime: elapsedTime,
            progress: update.progress
          });
        },
        cancelled: () => cancelRef.current
      } as any);if (result.success) {
        setOutputText(result.contextCard);
        setStats({
          executionTime: (result as any).executionTime || '0',
          compressionRatio: (result as any).sessionStats?.compressionRatio || result.stats?.compressionRatio || '0',
          successfulDrones: (result as any).sessionStats?.successfulDrones || result.stats?.successfulDrones || 0,
          totalDrones: (result as any).sessionStats?.totalDrones || result.stats?.totalDrones || 0,
          initialTokens: result.stats?.initialTokens,
          finalTokens: result.stats?.finalTokens || (result as any).sessionStats?.finalContentTokens
        });
        setIsProcessed(true);
        console.log('✅ Processing complete:', result.stats);
      } else {
        const errorInfo = getErrorDisplay((result as any).error || 'Processing failed', (result as any).errorType);
        setError(errorInfo);
        console.error('❌ Processing Failed:', errorInfo);
      }
      
    } catch (err: any) {
      console.error('❌ Caught an exception during processing:', err);
      const errorInfo = getErrorDisplay(
        err.message || 'An unexpected error occurred.',
        'GENERAL_ERROR'
      );
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsCancelling(false);
      cancelRef.current = false;
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
    cancelRef.current = false;
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const openAPIKeys = () => {
    setShowAPIKeys(true);
  };

  const openInfo = () => {
    setShowInfo(true);
  };  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
  // Update progress bar width
  useEffect(() => {
    if (progressBarRef.current && loadingProgress.totalDrones && loadingProgress.totalDrones > 0) {
      const progressPercent = Math.min(100, ((loadingProgress.completedDrones || 0) / loadingProgress.totalDrones) * 100);
      progressBarRef.current.style.width = `${progressPercent}%`;
    }
  }, [loadingProgress.completedDrones, loadingProgress.totalDrones]);

  return (
    <>      <style>{`
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
                          value={adv_temperature}
                          onChange={(e) => setAdv_temperature(parseFloat(e.target.value))}
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
                            value={adv_droneDensity}
                            onChange={(e) => setAdv_droneDensity(parseInt(e.target.value))}
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
                            value={adv_maxDrones}
                            onChange={(e) => setAdv_maxDrones(parseInt(e.target.value))}
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
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg select-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Modal */}
        {showAPIKeys && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4 select-none cursor-default">API Key Management</h3>
              <div className="space-y-6">
                {/* Google API Key */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="google-api-key" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                      Google API Key
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[var(--text-secondary)] select-none cursor-default">Save to Browser</span>
                      <button
                        onClick={() => setGoogleCacheEnabled(!googleCacheEnabled)}
                        title="Toggle browser storage for Google API Key"
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
                          googleCacheEnabled ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                          googleCacheEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      id="google-api-key"
                      type="password"
                      placeholder="AIza..."
                      value={googleAPIKey}
                      onChange={(e) => setGoogleAPIKey(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm font-mono cursor-text"
                    />                    <button
                      onClick={() => {
                        setGoogleAPIKey('');
                        setGoogleCacheEnabled(false);
                        removeAPIKey('google');
                      }}
                      title="Clear Google API Key"
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* OpenAI API Key */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="openai-api-key" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                      OpenAI API Key
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[var(--text-secondary)] select-none cursor-default">Save to Browser</span>
                      <button
                        onClick={() => setOpenaiCacheEnabled(!openaiCacheEnabled)}
                        title="Toggle browser storage for OpenAI API Key"
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
                          openaiCacheEnabled ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                          openaiCacheEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      id="openai-api-key"
                      type="password"
                      placeholder="sk-..."
                      value={openaiAPIKey}
                      onChange={(e) => setOpenaiAPIKey(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm font-mono cursor-text"
                    />                    <button
                      onClick={() => {
                        setOpenaiAPIKey('');
                        setOpenaiCacheEnabled(false);
                        removeAPIKey('openai');
                      }}
                      title="Clear OpenAI API Key"
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Anthropic API Key */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="anthropic-api-key" className="text-sm text-[var(--text-secondary)] select-none cursor-default">
                      Anthropic API Key
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[var(--text-secondary)] select-none cursor-default">Save to Browser</span>
                      <button
                        onClick={() => setAnthropicCacheEnabled(!anthropicCacheEnabled)}
                        title="Toggle browser storage for Anthropic API Key"
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
                          anthropicCacheEnabled ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
                          anthropicCacheEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      id="anthropic-api-key"
                      type="password"
                      placeholder="sk-ant-..."
                      value={anthropicAPIKey}
                      onChange={(e) => setAnthropicAPIKey(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm font-mono cursor-text"
                    />                    <button
                      onClick={() => {
                        setAnthropicAPIKey('');
                        setAnthropicCacheEnabled(false);
                        removeAPIKey('anthropic');
                      }}
                      title="Clear Anthropic API Key"
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    saveAPIKeys();
                    setShowAPIKeys(false);
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAPIKeys(false)}
                  className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg select-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel Modal */}
        {showInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-medium text-[var(--text-primary)] select-none cursor-default">ThreadLink User Guide</h2>
                <button
                  onClick={() => setShowInfo(false)}
                  aria-label="Close info panel"
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
                >
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {/* Section 1: What is ThreadLink? */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('what')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Sparkles size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">What is ThreadLink?</h3>
                      <p className="text-sm text-[var(--text-secondary)] cursor-default">LLMs forget. ThreadLink doesn't.</p>
                    </div>
                    {expandedSections.what ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>

                  {expandedSections.what && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                      <p>
                        Modern AI is powerful but fundamentally amnesiac. ThreadLink is the antidote. It's a high-signal engine that turns sprawling chat logs and raw text into a clean, portable context card.
                      </p>
                      <p>
                        Its purpose is to preserve your momentum. The moment you hit a session cap, need to switch models, or just want to archive a project's history without losing a single thought, ThreadLink is the tool you reach for. It's built for a single, seamless workflow:
                      </p>
                      <p>
                        <strong className="text-[var(--text-primary)]">Use it to:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Make a conversation with Claude seamlessly continue inside GPT.</li>
                        <li>Distill a 400,000-token project history into a briefing you can actually read.</li>
                        <li>Archive the complete context of a feature build.</li>
                        <li>Turn any messy data dump into actionable intelligence.</li>
                      </ul>
                      <p>
                        It's not just a summarizer. <strong className="text-[var(--text-primary)]">It's a memory implant for your work.</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 2: How to Use ThreadLink */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('howto')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Copy size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">How to Use ThreadLink</h3>
                      <p className="text-sm text-[var(--text-secondary)] cursor-default">Garbage In, Garbage Out.</p>
                    </div>
                    {expandedSections.howto ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>

                  {expandedSections.howto && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3 cursor-default">
                      <p>
                        The quality of your context card depends entirely on the quality of the text you provide. For best results, follow this simple process to capture a clean, complete session log.
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">Prepare the Interface</h4>
                            <p className="text-sm">Before copying, collapse any sidebars or panels in your AI chat application to minimize UI clutter.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">Load the Full History</h4>
                            <p className="text-sm">Most chat apps use lazy loading. Scroll all the way to the top of the conversation to ensure the entire history is loaded into the page.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">Select All</h4>
                            <p className="text-sm">Use your keyboard (<strong>Ctrl+A</strong> on Windows, <strong>Cmd+A</strong> on Mac) to select the entire conversation from top to bottom.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">4</span>
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">Copy and Paste</h4>
                            <p className="text-sm">Copy the selected text (<strong>Ctrl+C</strong> / <strong>Cmd+C</strong>), paste it into ThreadLink, and you're ready to condense.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Understanding Compression */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('compression')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Package size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">Understanding Compression</h3>
                      <p className="text-sm text-[var(--text-secondary)]">The Suitcase Analogy: Pillows vs. Gold Bricks</p>
                    </div>
                    {expandedSections.compression ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  {expandedSections.compression && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                      <p>
                        The effectiveness of condensation is a direct function of the source text's information density. The compression level you choose sets a target ratio, but the final output is determined by the content itself.
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li><strong className="text-[var(--text-primary)]">Low-Density Text (Pillows):</strong> Rambling conversations or marketing copy can be compressed heavily (20:1 or more). There is a lot of "air" (redundancy) to squeeze out.</li>
                        <li><strong className="text-[var(--text-primary)]">High-Density Text (Gold Bricks):</strong> Source code or technical specifications resist aggressive compression. The system will prioritize preserving critical information over hitting an arbitrary ratio.</li>
                      </ul>
                      
                      <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                        <h4 className="font-medium text-[var(--text-primary)]">Compression Level Settings</h4>
                        <p className="text-sm">
                          This setting controls the summarization pressure your drones will apply.
                        </p>
                      </div>
                      
                      <ul className="space-y-2 ml-4">
                        <li><strong className="text-[var(--text-primary)]">Light:</strong> Preserves nuance and detail. Best for content where every word matters.</li>
                        <li><strong className="text-[var(--text-primary)]">Balanced:</strong> Default setting. Optimal trade-off between brevity and completeness.</li>
                        <li><strong className="text-[var(--text-primary)]">Aggressive:</strong> Maximum compression. Ideal for extracting key points from verbose content.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Section 4: Context Card Strategy */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('strategy')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Scale size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">Context Card Strategy</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Precision vs. Focus: The Core Trade-off</p>
                    </div>
                    {expandedSections.strategy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  {expandedSections.strategy && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                      <p>
                        The size of your final context card is a strategic choice. There is no single "best" size; it's a trade-off between the richness of the context and the cost and focus of the next LLM session.
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong className="text-[var(--text-primary)]">Large Context Cards (e.g., 15k+ tokens):</strong> These act as <strong>high-fidelity archives</strong>. They are excellent for deep analysis or creating a comprehensive project bible, but can sometimes cause the receiving LLM to get lost in less relevant details.</li>
                        <li><strong className="text-[var(--text-primary)]">Small Context Cards (e.g., &lt; 5k tokens):</strong> These act as <strong>high-signal tactical briefings</strong>. They are cheaper, faster, and force the summary to focus only on the most critical information. The trade-off is that nuance and secondary context are deliberately sacrificed.</li>
                      </ul>
                      
                      <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                        <h4 className="font-medium text-[var(--text-primary)]">The Reality of "Soft Targets"</h4>
                        <p className="text-sm">
                          It is critical to understand that the compression level you set is a <strong>strong suggestion</strong>, not a hard command. Our testing has shown that models, especially on dense technical text, will <strong>exceed the target if they determine it's necessary to preserve critical context</strong>. This is a feature of the system's "context-first" philosophy.
                        </p>
                      </div>
                      
                      <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                        <h4 className="font-medium text-[var(--text-primary)]">How to Achieve Higher Compression</h4>
                        <p className="text-sm">
                          If your first context card is larger than desired, you have two primary strategies for achieving a more aggressive condensation:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                          <li><strong className="text-[var(--text-primary)]">Pre-Filter Your Input (Manual):</strong> The most effective method. Before you click "Condense," manually delete sections of the source text that you know are less important—conversational filler, redundant examples, off-topic tangents. This focuses the drones' attention only on what truly matters.</li>
                          <li><strong className="text-[var(--text-primary)]">Recursive Condensation (The Two-Pass Method):</strong> For maximum compression, you can run ThreadLink on its own output. Take the first context card you generated, paste it back into ThreadLink as a new input, and condense it again.</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 5: Meet Your Drones */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('drones')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Bot size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">Meet Your Drones</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Every Model Has a Personality. Choose the Right Specialist.</p>
                    </div>
                    {expandedSections.drones ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  {expandedSections.drones && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm">
                          Different AI models have distinct personalities and operational limits. Choosing the right one—and understanding how ThreadLink handles it—is critical for getting the result you want.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                          <h4 className="font-medium text-[var(--text-primary)] mb-2">Google Gemini</h4>
                          <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                            <li><strong>Personality:</strong> Tends to be verbose. Excels at preserving narrative flow but will often exceed its token target to provide rich, descriptive summaries.</li>
                            <li><strong>Speed:</strong> Very fast</li>
                          </ul>
                        </div>
                        
                        <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                          <h4 className="font-medium text-[var(--text-primary)] mb-2">OpenAI GPT</h4>
                          <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                            <li><strong>Personality:</strong> Generally the most balanced approach. Follows instructions and constraints reliably, offering a good middle ground for most tasks.</li>
                            <li><strong>Speed:</strong> Fast</li>
                          </ul>
                        </div>
                        
                        <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                          <h4 className="font-medium text-[var(--text-primary)] mb-2">Anthropic Claude</h4>
                          <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                            <li><strong>Personality:</strong> Precise and ruthlessly concise. It adheres well to token limits and will aggressively cut text to meet its target. Ideal for summaries where brevity is key.</li>
                            <li><strong>Speed:</strong> Slow</li>
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                        <h4 className="font-medium text-[var(--text-primary)]">Processing Speed</h4>
                        <p className="text-sm">This setting controls how many drones are dispatched to work in parallel.</p>
                        
                        <div className="space-y-2">
                          <div className="ml-4">
                            <p className="text-sm"><strong className="text-[var(--text-primary)]">Normal:</strong> The default, safe setting (e.g., 3 concurrent jobs). It's a balance of speed and reliability.</p>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm"><strong className="text-[var(--text-primary)]">Fast:</strong> A more aggressive setting (e.g., 6 concurrent jobs). It can significantly speed up processing on large sessions but increases the risk of hitting API rate limits.</p>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm"><strong className="text-[var(--text-primary)]">A Note on Anthropic:</strong> Claude's API has very strict rate limits. To ensure your job completes successfully, ThreadLink automatically disables the "Fast" setting and processes jobs one at a time.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 6: Recency Mode */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('recency')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Focus size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">Recency Mode: The Temporal Zoom Lens</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Focus on What Matters Now.</p>
                    </div>
                    {expandedSections.recency ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  {expandedSections.recency && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                      <p>
                        Recency Mode creates a temporally weighted briefing that automatically adjusts summary resolution based on when information appeared in your conversation. Think of it as a zoom lens that focuses sharper on recent events while maintaining a wide-angle view of the overall context.
                      </p>
                      
                      <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3 space-y-2">
                        <p className="font-medium text-[var(--text-primary)]">How It Works: Temporal Bands</p>
                        <p className="text-sm">
                          Recency Mode divides your conversation into three distinct chronological bands and changes how it processes each one by adjusting the "drone density" (the number of summarization jobs per chunk of text).
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                          <li><strong className="text-[var(--text-primary)]">Recent (Last 20%):</strong> Processed at High Resolution.<br/>
                          <span className="text-sm">The system deploys more, smaller drone jobs. This captures fine-grained details and specific facts from the end of the conversation.</span></li>
                          
                          <li><strong className="text-[var(--text-primary)]">Mid (Middle 50%):</strong> Processed at Standard Resolution.<br/>
                          <span className="text-sm">This section receives normal processing, providing a balanced summary of the core discussion.</span></li>
                          
                          <li><strong className="text-[var(--text-primary)]">Oldest (First 30%):</strong> Processed at Low Resolution.<br/>
                          <span className="text-sm">The system uses fewer, larger drone jobs. This forces it to create a high-level, thematic overview while discarding less critical early details.</span></li>
                        </ul>
                      </div>
                      <p className="font-medium text-[var(--text-primary)]">The Result:</p>
                      <p>
                        Your context card begins with a high-level overview of earlier discussion, gradually increasing in detail as it approaches the present. This creates a natural narrative flow that mirrors how human memory works – general impressions of the past, vivid details of the present.
                      </p>
                      <p className="font-medium text-[var(--text-primary)]">Recency Strength Settings:</p>
                      <ul className="space-y-2 ml-4">
                        <li><strong className="text-[var(--text-primary)]">Subtle:</strong> Gentle gradient. Maintains more detail throughout.</li>
                        <li><strong className="text-[var(--text-primary)]">Balanced:</strong> Standard temporal weighting. Ideal for most projects.</li>
                        <li><strong className="text-[var(--text-primary)]">Strong:</strong> Aggressive recency bias. Heavily focuses on latest developments.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Section 7: Advanced Controls */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('advanced')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Settings size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">Advanced Controls</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Fine-tuning the engine for specific missions.</p>
                    </div>
                    {expandedSections.advanced ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  {expandedSections.advanced && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-4">
                      <p>
                        These settings provide direct control over the cost, performance, and granularity of the condensation pipeline. Adjust them only if you understand the trade-offs.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-[var(--text-primary)]">LLM Temperature</h4>
                          <p className="text-sm">
                            Temperature controls the "randomness" or "creativity" of the drone's output. It's a value between 0.0 and 2.0.
                          </p>
                          <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                            <li><strong className="text-[var(--text-primary)]">Low Temperature (e.g., 0.2 - 0.5):</strong> The drone will be more focused, deterministic, and predictable. Its summaries will be more like a factual report, sticking very closely to the source text.</li>
                            <li><strong className="text-[var(--text-primary)]">High Temperature (e.g., 0.8 - 1.2):</strong> The drone will take more creative risks. Its summaries may be more narrative, making interpretive leaps to connect ideas. This can result in a more readable, story-like output, but carries a higher risk of losing precision or introducing subtle inaccuracies.</li>
                          </ul>
                          <p className="text-sm italic">
                            For most technical summarization, a lower temperature is recommended.
                          </p>
                        </div>
                        
                        <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                          <h4 className="font-medium text-[var(--text-primary)]">Drone Density</h4>
                          <p className="text-sm">
                            This setting controls the "resolution" of the condensation process by defining how many drones are assigned per 10,000 tokens of source text.
                          </p>
                          <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                            <li><strong className="text-[var(--text-primary)]">Low Density (e.g., 1-2):</strong> Each drone gets a large chunk of text. This is cheaper and results in a more high-level, thematic summary.</li>
                            <li><strong className="text-[var(--text-primary)]">High Density (e.g., 4-5):</strong> Each drone gets a smaller, more focused chunk. This is more expensive but results in a more detailed and granular context card.</li>
                          </ul>
                          <p className="text-sm italic">
                            <strong>Note:</strong> This setting is disabled when Recency Mode is active. Recency Mode uses its own dynamic logic to vary the drone density automatically.
                          </p>
                        </div>
                        
                        <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                          <h4 className="font-medium text-[var(--text-primary)]">Runaway Cost Protection (Max Drones)</h4>
                          <p className="text-sm">
                            This is a hard safety limit on the total number of drones a single job can create. Its primary purpose is to prevent accidental, runaway API costs when processing extremely large documents with a high Drone Density setting.
                          </p>
                          <p className="text-sm italic">
                            <strong className="text-[var(--text-primary)]">Recommendation:</strong> Only increase this limit if you are intentionally processing a massive session (e.g., 500k+ tokens) and have accepted the potential cost implications.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 8: Privacy & The Project */}
                <div className="border border-[var(--divider)] rounded-lg">
                  <button
                    onClick={() => toggleSection('privacy')}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
                  >
                    <Shield size={20} className="text-[var(--highlight-blue)]" />
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">Privacy & The Project</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Your Keys, Your Data.</p>
                    </div>
                    {expandedSections.privacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  {expandedSections.privacy && (
                    <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                      <p>
                        ThreadLink is built with a privacy-first, BYOK, open-source philosophy. Your conversations and API keys remain exclusively yours.
                      </p>
                      <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3 space-y-2">
                        <p className="font-medium text-[var(--text-primary)]">BYOK (Bring Your Own Key) Architecture:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Your API keys are never seen or stored by our servers</li>
                          <li>All API calls go directly from your browser to the LLM provider</li>
                          <li>No intermediary servers handle your sensitive data</li>
                          <li>Complete transparency in how your data flows</li>
                        </ul>
                      </div>
                      <p>
                        The complete ThreadLink source code is available on GitHub for review. You can see exactly how every feature works, verify our privacy claims, and even run your own instance if desired.
                      </p>
                      
                      <div className="bg-blue-500 bg-opacity-10 border border-blue-500 rounded p-3 mt-4">
                        <p className="text-blue-400">
                          <a 
                            href="https://github.com/skragus/threadlink" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-300 transition-colors"
                          >
                            <strong>GitHub:</strong> github.com/skragus/threadlink - yes, I'd like a star
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-[var(--divider)]">
                <button
                  onClick={() => setShowInfo(false)}
                  className="w-full px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none hover:bg-opacity-90 transition-colors cursor-pointer"
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-12 pt-6 pb-4 border-b border-[var(--divider)] ">
          <div className="flex items-center gap-8 read-only:cursor-default disabled:cursor-default">
            <h1 className="text-3xl font-outfit leading-none flex items-center select-none cursor-default">
              <span className="text-[#736C9E] tracking-[0.01em] font-normal">Thread</span>
              <span className="text-[#505C88] tracking-[-0.03em] font-medium">Link</span>
            </h1>
            <p className="text-sm font-outfit font-normal text-[#7D87AD] opacity-75 whitespace-nowrap hidden md:block select-none read-only:pointer-events-none disabled:pointer-events-none">
              Condense, copy, continue — without breaking flow.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={openInfo}
              aria-label="Open help documentation"
              className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none cursor-pointer"
            >
              <Info size={20} className="opacity-50" />
            </button>
            <button 
              onClick={openAPIKeys}
              aria-label="Manage API keys"
              className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none cursor-pointer"
            >
              <Key size={20} className="opacity-50" />
            </button>
            <button 
              onClick={openSettings}
              aria-label="Open settings"
              className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none cursor-pointer"
            >
              <Settings size={20} className="opacity-50" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div ref={errorRef} className="mx-12 mt-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm select-none cursor-default">
            {error}
          </div>
        )}

        {/* Stats Display */}
        {stats && (
          <div ref={statsRef} className="mx-12 mt-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 rounded text-green-400 text-sm select-none cursor-default">
            Processed in {stats.executionTime}s • {stats.compressionRatio}:1 compression • {stats.successfulDrones}/{stats.totalDrones} drones successful
          </div>
        )}

        {/* Main content area */}
        <div className="flex-grow flex flex-col justify-center px-12 py-4 relative resize-none">
          <textarea
            ref={outputTextareaRef}
            className={`w-full flex-grow bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg p-4 resize-none focus:border-[var(--highlight-blue)] focus:outline-none ${isLoading ? 'blur-sm' : ''} ${isProcessed || isLoading ? 'cursor-default' : 'cursor-text'}`}
            placeholder="Paste your AI conversation here..."
            value={displayText}
            onChange={handleTextChange}
            readOnly={isProcessed || isLoading}
          />

          {/* Floating Badge */}
          <a 
            href="https://bolt.new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute bottom-7 right-14 z-10"
          >
            <img 
              src="src/assets/bolt-badge.png"
              alt="Powered by Bolt.new" 
              className="w-20 h-auto opacity-10 hover:opacity-50 transition-opacity"
            />
          </a>
          
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
                      </div>                      <div className="w-full bg-[var(--divider)] rounded-full h-2">
                        <div 
                          ref={progressBarRef}
                          className="bg-[var(--highlight-blue)] h-2 rounded-full transition-all duration-300 ease-out"
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
                    className="h-[38px] bg-gray-700 text-gray-300 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm select-none"
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
              <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)] select-none cursor-default">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono w-32">{formatTokenCount(tokenCount)}</span>
                  <span className="mx-2">•</span>
                  <label htmlFor="compression-ratio-select" className="whitespace-nowrap cursor-default">Compression level:</label>                  <select
                    id="compression-ratio-select"
                    value={compressionRatio}
                    onChange={handleCompressionChange}
                    className="px-2 py-1 bg-[var(--card-bg)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm cursor-pointer min-w-[120px]"
                  >
                    <option value="light" className="cursor-pointer">Light</option>
                    <option value="balanced" className="cursor-pointer">Balanced</option>
                    <option value="aggressive" className="cursor-pointer">Aggressive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 shrink-0">
                {inputText && !isProcessed && (
                  <button 
                    onClick={handleCondense}
                    disabled={isLoading}
                    className={`h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg min-w-[120px] whitespace-nowrap select-none ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isLoading ? 'Processing...' : 'Condense'}
                  </button>
                )}
                {isProcessed && (
                  <>
                    <button 
                      onClick={handleCopy}
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
                      onClick={handleReset}
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
      </div>
    </>
  );
}

export default ThreadLink;