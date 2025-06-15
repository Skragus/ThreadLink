// ThreadLink.tsx - Refactored Main Component

import React, { useState, useEffect, useRef } from 'react';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';
import TextEditor from './components/TextEditor';
import APIKeysModal from './components/APIKeysModal';
import { SettingsModal } from './components/SettingModal';
import InfoPanel from './components/InfoPanel';

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
import { getAPIKey, saveAPIKey, removeAPIKey } from '../src/lib/storage.js';
// @ts-ignore - JavaScript modules without TypeScript declarations
import { MODEL_PROVIDERS } from '../src/lib/client-api.js';

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
  const [recencyMode, setRecencyMode] = useState(false);
  const [recencyStrength, setRecencyStrength] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [adv_temperature, setAdv_temperature] = useState(0.5);
  const [adv_droneDensity, setAdv_droneDensity] = useState(2);
  const [adv_maxDrones, setAdv_maxDrones] = useState(50);

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

  // Refs
  const errorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingStartTime = useRef<number>(0);

  // Processing Speed logic
  const isAnthropicModel = model.includes('claude');

  // Initialize API keys from storage on mount
  useEffect(() => {
    const loadedGoogleKey = getAPIKey('google');
    const loadedOpenAIKey = getAPIKey('openai');
    const loadedAnthropicKey = getAPIKey('anthropic');
    
    if (loadedGoogleKey) setGoogleAPIKey(loadedGoogleKey);
    if (loadedOpenAIKey) setOpenaiAPIKey(loadedOpenAIKey);
    if (loadedAnthropicKey) setAnthropicAPIKey(loadedAnthropicKey);
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
          if (statsRef.current) {
            statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  };

  const handleCancel = () => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    cancelRef.current = true;
    setError('Processing was cancelled');
  };

  const saveAPIKeys = () => {
    if (googleAPIKey) {
      saveAPIKey('google', googleAPIKey);
    } else {
      removeAPIKey('google');
    }
    
    if (openaiAPIKey) {
      saveAPIKey('openai', openaiAPIKey);
    } else {
      removeAPIKey('openai');
    }
    
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
    
    const targetTokens = calculateTargetTokens(tokenCount, compressionRatio);
    const calculatedConcurrency = calculateConcurrency();
    loadingStartTime.current = Date.now();
    
    const recencyStrengthValue = recencyMode ? 
      (recencyStrength === 0 ? 25 : recencyStrength === 1 ? 50 : 90) : 0;
    
    try {
      const settings: PipelineSettings = {
        model: model,
        temperature: adv_temperature,
        maxConcurrency: calculatedConcurrency,
        customTargetTokens: targetTokens,
        processingSpeed: processingSpeed,
        recencyMode: recencyMode,
        recencyStrength: recencyStrengthValue,
        droneDensity: recencyMode ? undefined : adv_droneDensity,
        maxDrones: adv_maxDrones
      };

      const result: PipelineResult = await runCondensationPipeline({
        rawText: inputText,
        apiKey: apiKey,
        settings: settings,
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
      } as any);

      if (result.success && result.contextCard) {
        setOutputText(result.contextCard);
        setStats({
          executionTime: result.executionTime || '0',
          compressionRatio: result.sessionStats?.compressionRatio || result.stats?.compressionRatio || '0',
          successfulDrones: result.sessionStats?.successfulDrones || result.stats?.successfulDrones || 0,
          totalDrones: result.sessionStats?.totalDrones || result.stats?.totalDrones || 0,
          initialTokens: result.stats?.initialTokens,
          finalTokens: result.stats?.finalTokens || result.sessionStats?.finalContentTokens
        });
        setIsProcessed(true);
        console.log('✅ Processing complete:', result.stats);
      } else {
        const errorInfo = getErrorDisplay(result.error || 'Processing failed', result.errorType);
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

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDeleteKey = (provider: 'google' | 'openai' | 'anthropic') => {
    switch (provider) {
      case 'google':
        setGoogleAPIKey('');
        setGoogleCacheEnabled(false);
        removeAPIKey('google');
        break;
      case 'openai':
        setOpenaiAPIKey('');
        setOpenaiCacheEnabled(false);
        removeAPIKey('openai');
        break;
      case 'anthropic':
        setAnthropicAPIKey('');
        setAnthropicCacheEnabled(false);
        removeAPIKey('anthropic');
        break;
    }
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
      
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <SettingsModal
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
          onClose={() => setShowSettings(false)}
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
          setAnthropicAPIKey={setAnthropicAPIKey}
          setGoogleCacheEnabled={setGoogleCacheEnabled}
          setOpenaiCacheEnabled={setOpenaiCacheEnabled}
          setAnthropicCacheEnabled={setAnthropicCacheEnabled}
          onSave={() => {
            saveAPIKeys();
            setShowAPIKeys(false);
          }}
          onClose={() => setShowAPIKeys(false)}
          onDeleteKey={handleDeleteKey}
        />

        <InfoPanel
          isOpen={showInfo}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onClose={() => setShowInfo(false)}
        />

        <Header
          onInfoClick={() => setShowInfo(true)}
          onAPIKeysClick={() => setShowAPIKeys(true)}
          onSettingsClick={() => setShowSettings(true)}
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

        <Footer
          tokenCount={tokenCount}
          compressionRatio={compressionRatio}
          onCompressionChange={handleCompressionChange}
          inputText={inputText}
          isProcessed={isProcessed}
          isLoading={isLoading}
          isCopied={isCopied}
          onCondense={handleCondense}
          onCopy={handleCopy}
          onReset={handleReset}
        />
      </div>
    </>
  );
}

export default ThreadLink;