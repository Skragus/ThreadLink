// ThreadLink.tsx - Refactored Main Component

import React, { useState, useEffect, useRef } from 'react';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';
import TextEditor from './components/TextEditor';
import APIKeysModal from './components/APIKeysModal';
import { SettingsModal } from './components/SettingModal';
import InfoPanel from './components/InfoPanel';
import { ConfigurationOverrideModal } from './components/ConfigurationOverrideModal';
import WelcomeBanner from './components/WelcomeBanner';

// Import types
import { 
  ProgressUpdate, 
  Stats, 
  LoadingProgress, 
  ExpandedSections,
  PipelineResult,
  PipelineSettings
} from './types';

// Import utilities
import { 
  estimateTokens, 
  calculateTargetTokens, 
  getErrorDisplay 
} from './utils/textProcessing';

// Import browser-based modules
// @ts-ignore - JavaScript modules without TypeScript declarations
import { runCondensationPipeline } from '../src/pipeline/orchestrator.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { getAPIKey, saveAPIKey, removeAPIKey, getCustomPrompt, saveCustomPrompt, getUseCustomPrompt, saveUseCustomPrompt, getSettings, saveSettings } from '../src/lib/storage.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { MODEL_PROVIDERS } from '../src/lib/client-api.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { calculateEstimatedDrones } from '../src/pipeline/config.js';

function ThreadLink() {
  // Main app state
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [outputTokenCount, setOutputTokenCount] = useState(0);
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
  const [recencyMode, setRecencyMode] = useState(false);
  const [recencyStrength, setRecencyStrength] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);  const [adv_temperature, setAdv_temperature] = useState(0.5);
  const [adv_droneDensity, setAdv_droneDensity] = useState(2);
  const [adv_maxDrones, setAdv_maxDrones] = useState(50);
  // Custom prompt state
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Configuration override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideModalData, setOverrideModalData] = useState({ 
    calculatedDrones: 0, 
    maxDrones: 0 
  });

  // API Keys state
  const [googleAPIKey, setGoogleAPIKey] = useState('');
  const [openaiAPIKey, setOpenaiAPIKey] = useState('');
  const [anthropicAPIKey, setAnthropicAPIKey] = useState('');
  
  // Cache toggle states
  const [googleCacheEnabled, setGoogleCacheEnabled] = useState(false);
  const [openaiCacheEnabled, setOpenaiCacheEnabled] = useState(false);
  const [anthropicCacheEnabled, setAnthropicCacheEnabled] = useState(false);
  // Info Panel expandable sections state
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    what: false,
    howto: false,
    compression: false,
    strategy: false,
    drones: false,
    recency: false,
    advanced: false,
    privacy: false
  });

  // Welcome banner state
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // Refs
  const errorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingStartTime = useRef<number>(0);
  // Processing Speed logic
  const isAnthropicModel = model.toLowerCase().includes('claude');

  // Function to save current settings to localStorage
  const saveCurrentSettings = () => {
    const currentSettings = {
      model,
      temperature: adv_temperature,
      processingSpeed,
      recencyMode,
      recencyStrength,
      droneDensity: adv_droneDensity,
      maxDrones: adv_maxDrones
    };
    saveSettings(currentSettings);
  };
  // Initialize API keys from storage on mount
  useEffect(() => {    const loadedGoogleKey = getAPIKey('google');
    const loadedOpenAIKey = getAPIKey('openai');
    const loadedAnthropicKey = getAPIKey('anthropic');
    
    if (loadedGoogleKey) {
      setGoogleAPIKey(loadedGoogleKey);
      setGoogleCacheEnabled(true);
    }
    if (loadedOpenAIKey) {
      setOpenaiAPIKey(loadedOpenAIKey);
      setOpenaiCacheEnabled(true);
    }
    if (loadedAnthropicKey) {
      setAnthropicAPIKey(loadedAnthropicKey);
      setAnthropicCacheEnabled(true);
    }
    
    // Load custom prompt settings
    const loadedUseCustomPrompt = getUseCustomPrompt();
    const loadedCustomPrompt = getCustomPrompt();
    
    if (loadedUseCustomPrompt) setUseCustomPrompt(loadedUseCustomPrompt);
    if (loadedCustomPrompt) setCustomPrompt(loadedCustomPrompt);    // Load settings from localStorage
    const savedSettings = getSettings();
    if (savedSettings) {
      if (savedSettings.model) setModel(savedSettings.model);
      if (savedSettings.temperature !== undefined) setAdv_temperature(savedSettings.temperature);
      if (savedSettings.processingSpeed) setProcessingSpeed(savedSettings.processingSpeed);
      if (savedSettings.recencyMode !== undefined) setRecencyMode(savedSettings.recencyMode);
      if (savedSettings.recencyStrength !== undefined) setRecencyStrength(savedSettings.recencyStrength);
      if (savedSettings.droneDensity !== undefined) setAdv_droneDensity(savedSettings.droneDensity);
      if (savedSettings.maxDrones !== undefined) setAdv_maxDrones(savedSettings.maxDrones);
    }    // Check if this is a first-time visit and show welcome banner
    // Do this check after API keys are loaded
    setTimeout(() => {
      const hasVisitedBefore = localStorage.getItem('threadlink_has_visited');
      const hasAnyApiKeys = googleAPIKey || openaiAPIKey || anthropicAPIKey || 
                           getAPIKey('google') || getAPIKey('openai') || getAPIKey('anthropic');
      
      if (!hasVisitedBefore && !hasAnyApiKeys) {
        setShowWelcomeBanner(true);
      }
    }, 100);
  }, []);

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

  const displayText = isProcessed ? outputText : inputText;

  // Update token count based on displayed text
  useEffect(() => {
    setTokenCount(estimateTokens(displayText));
  }, [displayText]);
  // Scroll to stats after processing
  useEffect(() => {
    if (isProcessed && stats) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          if (statsRef.current && statsRef.current.scrollIntoView) {
            try {
              statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (error) {
              console.warn('Could not scroll to stats:', error);
            }
          }
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isProcessed, stats]);

  // Scroll textarea to top after processing
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    setError('');
    setTokenCount(estimateTokens(text));
  };

  const handleCompressionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompressionRatio(e.target.value);
  };  const handleCancel = () => {
    console.log('🛑 handleCancel called - checking if already cancelling');
    if (isCancelling) {
      console.log('⚠️ Already cancelling, ignoring redundant cancel request');
      return;
    }
    
    console.log('🛑 Setting cancellation flags: isCancelling=true, cancelRef.current=true');
    
    // Set both state flags immediately
    setIsCancelling(true);
    cancelRef.current = true;
    
    // Set error message to provide user feedback
    setError('Processing was cancelled');
    
    // Reset any progress indicators to avoid lingering progress states
    setLoadingProgress({
      phase: 'cancelled',
      message: 'Processing was cancelled',
      completedDrones: 0,
      totalDrones: 0,
      elapsedTime: 0,
      progress: 0
    });
    
    console.log('🛑 Cancel state set - UI will update and orchestrator will detect cancelRef.current flag');
    
    // Log cancellation state for debugging
    setTimeout(() => {
      console.log(`🛑 Cancellation state after 100ms: isCancelling=${isCancelling}, cancelRef.current=${cancelRef.current}`);
    }, 100);
    
    // Make sure the loading state is reset after a short delay
    // This helps ensure the UI resets properly even if there's an issue with the orchestrator
    setTimeout(() => {
      if (isCancelling) {
        console.log('🛑 Forcing loading state reset after delay');
        setIsLoading(false);
        setIsCancelling(false);
      }
    }, 5000);
  };const saveAPIKeys = () => {
    try {
      // Save or remove API keys based on cache settings (respects user privacy choice)
      if (googleAPIKey) {
        saveAPIKey('google', googleAPIKey, googleCacheEnabled);
      } else {
        removeAPIKey('google');
      }
      
      if (openaiAPIKey) {
        saveAPIKey('openai', openaiAPIKey, openaiCacheEnabled);
      } else {
        removeAPIKey('openai');
      }
      
      if (anthropicAPIKey) {
        saveAPIKey('anthropic', anthropicAPIKey, anthropicCacheEnabled);
      } else {
        removeAPIKey('anthropic');
      }
    } catch (error: any) {
      // Re-throw the error so the modal can catch it
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw error;
      }
      console.error("An unexpected error occurred while saving API keys:", error);
      throw error;
    }
      // Save custom prompt settings
    try {
      saveUseCustomPrompt(useCustomPrompt);
      if (customPrompt) {
        saveCustomPrompt(customPrompt);
      }
    } catch (error: any) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw error;
      }
      console.error("Error saving custom prompt settings:", error);
      throw error;
    }

    // Hide welcome banner when user saves API keys
    if (googleAPIKey || openaiAPIKey || anthropicAPIKey) {
      setShowWelcomeBanner(false);
      localStorage.setItem('threadlink_has_visited', 'true');
    }
  };const handleCondense = async () => {
    console.log('🔄 handleCondense called with:', { inputText: inputText?.length, model, useCustomPrompt, customPrompt: customPrompt?.length });
    
    // Validation checks
    if (!inputText.trim()) {
      console.log('❌ Validation failed: No input text');
      setError('Please paste some text to condense');
      return;
    }

    // Check if custom prompt is enabled but empty
    if (useCustomPrompt && (!customPrompt || !customPrompt.trim())) {
      console.log('❌ Validation failed: Empty custom prompt');
      setError('Custom prompt cannot be empty. Please configure your custom prompt or disable it in settings.');
      return;
    }

    const provider = MODEL_PROVIDERS[model];
    if (!provider) {
      console.log('❌ Validation failed: Unknown model', model);
      setError(`Unknown model: ${model}`);
      return;
    }

    const apiKey = getAPIKey(provider);
    if (!apiKey) {
      console.log('❌ Validation failed: No API key for provider', provider);
      setError(`Please configure your API key to get started`);
      setShowAPIKeys(true);
      return;
    }

    console.log('✅ Validation passed, calculating drones...');
    
    // Calculate the number of drones that would be created
    const inputTokens = estimateTokens(inputText);
    let calculatedDrones;
    
    if (recencyMode) {
      // In recency mode, drone count is calculated differently
      calculatedDrones = Math.ceil(inputTokens / 3000); // Example calculation
    } else {
      // Normal mode uses drone density
      calculatedDrones = calculateEstimatedDrones(inputTokens, adv_droneDensity, null);
    }

    console.log('🤖 Drone calculation:', { inputTokens, calculatedDrones, maxDrones: adv_maxDrones, recencyMode });

    // Check if we would exceed max drones
    if (calculatedDrones > adv_maxDrones) {
      console.log('⚠️ Drone count exceeds max, showing override modal');
      // Show the override confirmation modal
      setOverrideModalData({
        calculatedDrones,
        maxDrones: adv_maxDrones
      });
      setShowOverrideModal(true);
      return; // Don't proceed until user confirms
    }    console.log('🚀 Proceeding with condensation...');
    // If no override needed, proceed directly
    proceedWithCondensation();
  };
    
  const proceedWithCondensation = async () => {
    console.log('🚀 PROCEEDING WITH CONDENSATION - setIsLoading(true)');
    setIsLoading(true);
    setError('');
    setStats(null);
    cancelRef.current = false;
    setIsCancelling(false);
    
    const targetTokens = calculateTargetTokens(tokenCount, compressionRatio);
    const calculatedConcurrency = calculateConcurrency();
    loadingStartTime.current = Date.now();
    
    const recencyStrengthValue = recencyMode ? 
      (recencyStrength === 0 ? 25 : recencyStrength === 1 ? 50 : 90) : 0;
      try {
      const provider = MODEL_PROVIDERS[model];
      const apiKey = getAPIKey(provider);
      
      const settings: PipelineSettings = {
        model: model,
        temperature: adv_temperature,
        maxConcurrency: calculatedConcurrency,
        customTargetTokens: targetTokens,
        processingSpeed: processingSpeed,
        recencyMode: recencyMode,
        recencyStrength: recencyStrengthValue,
        droneDensity: recencyMode ? undefined : adv_droneDensity,
        maxDrones: adv_maxDrones,
        // Add custom prompt settings
        useCustomPrompt: useCustomPrompt,
        customPrompt: useCustomPrompt ? customPrompt : undefined
      };

      console.log('🚀 Starting condensation pipeline...', { settings, apiKey: apiKey ? 'SET' : 'NOT_SET' });
      
      const result: PipelineResult = await runCondensationPipeline({
        rawText: inputText,
        apiKey: apiKey,
        settings: settings,
        onProgress: (update: ProgressUpdate) => {
          const elapsedTime = (Date.now() - loadingStartTime.current) / 1000;
          console.log('📊 Progress update:', update);
          setLoadingProgress({
            phase: update.phase || 'processing',
            message: update.message || 'Processing...',
            completedDrones: update.completedDrones,
            totalDrones: update.totalDrones,
            elapsedTime: elapsedTime,
            progress: update.progress
          });
        },
        cancelled: () => {
          const isCancelled = cancelRef.current;
          if (isCancelled) {
            console.log('🛑 Cancellation check - returning TRUE - processing should stop');
          }
          return isCancelled;
        }
      } as any);

      console.log('🏁 Pipeline completed:', { success: result.success, hasContextCard: !!result.contextCard, result });if (result.success && result.contextCard) {
        setOutputText(result.contextCard);
        setOutputTokenCount(estimateTokens(result.contextCard));
        
        // Create stats object with fallbacks to ensure it's always set
        const defaultStats = {
          executionTime: result.executionTime || '0',
          compressionRatio: '1.0',
          successfulDrones: 1,
          totalDrones: 1,
          initialTokens: estimateTokens(inputText),
          finalTokens: estimateTokens(result.contextCard)
        };
        
        // Merge with actual stats if available - ensure we ALWAYS have stats
        const mergedStats = {
          executionTime: result.executionTime || defaultStats.executionTime,
          compressionRatio: result.sessionStats?.compressionRatio || result.stats?.compressionRatio || defaultStats.compressionRatio,
          successfulDrones: result.sessionStats?.successfulDrones || result.stats?.successfulDrones || defaultStats.successfulDrones,
          totalDrones: result.sessionStats?.totalDrones || result.stats?.totalDrones || defaultStats.totalDrones,
          initialTokens: result.stats?.initialTokens || defaultStats.initialTokens,
          finalTokens: result.stats?.finalTokens || result.sessionStats?.finalContentTokens || defaultStats.finalTokens
        };
        
        // CRITICAL: Always set stats for successful processing
        setStats(mergedStats);
        setIsProcessed(true);
        console.log('✅ Processing complete - Stats guaranteed:', { 
          hasSessionStats: !!result.sessionStats, 
          hasStats: !!result.stats, 
          mergedStats,
          statsSet: true,
          originalSessionStats: result.sessionStats,
          originalStats: result.stats 
        });
      } else {
        const errorInfo = getErrorDisplay(result.error || 'Processing failed', result.errorType);
        setError(errorInfo);
        console.error('❌ Processing Failed:', errorInfo);
      }
    } catch (err: any) {
      console.error('❌ Caught an exception during processing:', err);
      const errorInfo = getErrorDisplay(
        err.message || 'An unexpected error occurred.',
        'UNKNOWN'
      );
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsCancelling(false);
    }
  };

  // Add handlers for the override modal
  const handleOverrideProceed = () => {
    setShowOverrideModal(false);
    proceedWithCondensation();
  };

  const handleOverrideCancel = () => {
    setShowOverrideModal(false);
    setShowSettings(true); // Open settings so user can adjust
  };  const handleCopy = async () => {
    const textToCopy = isProcessed ? outputText : inputText;
    
    // Check if there's any text to copy
    if (!textToCopy || textToCopy.trim() === '') {
      setError('No content to copy.');
      setTimeout(() => {
        setError('');
      }, 3000);
      return;
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      console.log('✅ Content copied to clipboard successfully');
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      
      // Provide different errors based on the specific clipboard error
      let errorMessage = 'Failed to copy to clipboard. Please try again.';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Clipboard permission denied. Check your browser settings.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Clipboard access was blocked for security reasons.';
        }
      }
      
      setError(errorMessage);
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  const handleReset = () => {
    setInputText('');
    setOutputText('');
    setOutputTokenCount(0);
    setIsProcessed(false);
    setTokenCount(0);
    setError('');
    setStats(null);
    cancelRef.current = false;
  };
  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  // Welcome banner handlers
  const handleDismissWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    localStorage.setItem('threadlink_has_visited', 'true');
  };
  const handleDeleteKey = (provider: 'google' | 'openai' | 'anthropic') => {
    console.log(`🗑️ Deleting ${provider} API key - clearing input, disabling cache, removing from storage`);
    
    switch (provider) {
      case 'google':
        setGoogleAPIKey(''); // Clear the input field
        setGoogleCacheEnabled(false); // Toggle cache off
        removeAPIKey('google'); // Remove from browser storage
        break;
      case 'openai':
        setOpenaiAPIKey(''); // Clear the input field
        setOpenaiCacheEnabled(false); // Toggle cache off
        removeAPIKey('openai'); // Remove from browser storage
        break;
      case 'anthropic':
        setAnthropicAPIKey(''); // Clear the input field
        setAnthropicCacheEnabled(false); // Toggle cache off
        removeAPIKey('anthropic'); // Remove from browser storage
        break;
    }
    
    console.log(`✅ ${provider} API key deleted - input cleared, cache disabled, storage wiped`);
  };

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
      
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">        <SettingsModal
          isOpen={showSettings}
          model={model}
          setModel={setModel}
          processingSpeed={processingSpeed}
          setProcessingSpeed={setProcessingSpeed}
          recencyMode={recencyMode}
          setRecencyMode={setRecencyMode}
          recencyStrength={recencyStrength}
          setRecencyStrength={setRecencyStrength}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          advTemperature={adv_temperature}
          setAdvTemperature={setAdv_temperature}
          advDroneDensity={adv_droneDensity}
          setAdvDroneDensity={setAdv_droneDensity}
          advMaxDrones={adv_maxDrones}
          setAdvMaxDrones={setAdv_maxDrones}
          // Add custom prompt props
          useCustomPrompt={useCustomPrompt}
          setUseCustomPrompt={setUseCustomPrompt}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          // Pass current API key states for model filtering
          googleAPIKey={googleAPIKey}
          openaiAPIKey={openaiAPIKey}
          anthropicAPIKey={anthropicAPIKey}
          onClose={() => {
            saveCurrentSettings();
            setShowSettings(false);
          }}
        />

        <APIKeysModal
          isOpen={showAPIKeys}
          googleAPIKey={googleAPIKey}
          openaiAPIKey={openaiAPIKey}
          anthropicAPIKey={anthropicAPIKey}
          googleCacheEnabled={googleCacheEnabled}
          openaiCacheEnabled={openaiCacheEnabled}
          anthropicCacheEnabled={anthropicCacheEnabled}
          setGoogleAPIKey={setGoogleAPIKey}
          setOpenaiAPIKey={setOpenaiAPIKey}
          setAnthropicAPIKey={setAnthropicAPIKey}          setGoogleCacheEnabled={setGoogleCacheEnabled}
          setOpenaiCacheEnabled={setOpenaiCacheEnabled}
          setAnthropicCacheEnabled={setAnthropicCacheEnabled}
          onSave={saveAPIKeys} // Pass the function directly
          onClose={() => setShowAPIKeys(false)}
          onDeleteKey={handleDeleteKey}
        />        <InfoPanel
          isOpen={showInfo}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onClose={() => setShowInfo(false)}
        />        <ConfigurationOverrideModal
          isOpen={showOverrideModal}
          calculatedDrones={overrideModalData.calculatedDrones}
          maxDrones={overrideModalData.maxDrones}
          onProceed={handleOverrideProceed}
          onCancel={handleOverrideCancel}
        />

        {/* Header Navigation */}
        <header>
          <Header
            onInfoClick={() => setShowInfo(true)}
            onAPIKeysClick={() => setShowAPIKeys(true)}
            onSettingsClick={() => setShowSettings(true)}
          />
        </header>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col">
          <WelcomeBanner
            isVisible={showWelcomeBanner}
            onDismiss={handleDismissWelcomeBanner}
          />

          <TextEditor
            displayText={displayText}
            isLoading={isLoading}
            isProcessed={isProcessed}
            error={error}
            stats={stats}
            loadingProgress={loadingProgress}
            isCancelling={isCancelling}
            errorRef={errorRef}
            statsRef={statsRef}
            outputTextareaRef={outputTextareaRef}
            onTextChange={handleTextChange}
            onCancel={handleCancel}
          />
        </main>

        {/* Footer Controls */}
        <footer>
          <Footer
            tokenCount={tokenCount}
            outputTokenCount={outputTokenCount}
            compressionRatio={compressionRatio}
            onCompressionChange={handleCompressionChange}
            isProcessed={isProcessed}
            isLoading={isLoading}
            isCopied={isCopied}
            onCondense={handleCondense}
            onCopy={handleCopy}
            onReset={handleReset}
          />
        </footer>
      </div>
    </>
  );
}

export default ThreadLink;