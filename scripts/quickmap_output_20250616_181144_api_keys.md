

================================================================================// FILE: src/App.tsx
function App() {
  return (
    <>
      <ThreadLink />
    </>
  )
}
App

// FILE: src/ThreadLink.tsx
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
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    phase: 'preparing',
    message: 'Preparing drone batches'
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelRef = useRef<boolean>(false);
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
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideModalData, setOverrideModalData] = useState({ 
    calculatedDrones: 0, 
    maxDrones: 0 
  });
  const [googleAPIKey, setGoogleAPIKey] = useState('');
  const [openaiAPIKey, setOpenaiAPIKey] = useState('');
  const [anthropicAPIKey, setAnthropicAPIKey] = useState('');
  const [googleCacheEnabled, setGoogleCacheEnabled] = useState(false);
  const [openaiCacheEnabled, setOpenaiCacheEnabled] = useState(false);
  const [anthropicCacheEnabled, setAnthropicCacheEnabled] = useState(false);
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
  const errorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingStartTime = useRef<number>(0);
  const isAnthropicModel = model.includes('claude');
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
  useEffect(() => {
    const loadedGoogleKey = getAPIKey('google');
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
    const loadedUseCustomPrompt = getUseCustomPrompt();
    const loadedCustomPrompt = getCustomPrompt();
    if (loadedUseCustomPrompt) setUseCustomPrompt(loadedUseCustomPrompt);
    if (loadedCustomPrompt) setCustomPrompt(loadedCustomPrompt);
    const savedSettings = getSettings();
    if (savedSettings) {
      if (savedSettings.model) setModel(savedSettings.model);
      if (savedSettings.temperature !== undefined) setAdv_temperature(savedSettings.temperature);
      if (savedSettings.processingSpeed) setProcessingSpeed(savedSettings.processingSpeed);
      if (savedSettings.recencyMode !== undefined) setRecencyMode(savedSettings.recencyMode);
      if (savedSettings.recencyStrength !== undefined) setRecencyStrength(savedSettings.recencyStrength);
      if (savedSettings.droneDensity !== undefined) setAdv_droneDensity(savedSettings.droneDensity);
      if (savedSettings.maxDrones !== undefined) setAdv_maxDrones(savedSettings.maxDrones);
    }
  }, []);
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
  useEffect(() => {
    setTokenCount(estimateTokens(displayText));
  }, [displayText]);
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
  };  const saveAPIKeys = () => {
    if (googleAPIKey && googleCacheEnabled) {
      saveAPIKey('google', googleAPIKey);
    } else {
      removeAPIKey('google');
    }
    if (openaiAPIKey && openaiCacheEnabled) {
      saveAPIKey('openai', openaiAPIKey);
    } else {
      removeAPIKey('openai');
    }
    if (anthropicAPIKey && anthropicCacheEnabled) {
      saveAPIKey('anthropic', anthropicAPIKey);
    } else {
      removeAPIKey('anthropic');
    }
    saveUseCustomPrompt(useCustomPrompt);
    if (customPrompt) {
      saveCustomPrompt(customPrompt);
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
    const inputTokens = estimateTokens(inputText);
    let calculatedDrones;
    if (recencyMode) {
      calculatedDrones = Math.ceil(inputTokens / 3000);
    } else {
      calculatedDrones = calculateEstimatedDrones(inputTokens, adv_droneDensity, null);
    }
    if (calculatedDrones > adv_maxDrones) {
      setOverrideModalData({
        calculatedDrones,
        maxDrones: adv_maxDrones
      });
      setShowOverrideModal(true);
      return;
    }
    proceedWithCondensation();
  };
  const proceedWithCondensation = async () => {
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
        useCustomPrompt: useCustomPrompt,
        customPrompt: useCustomPrompt ? customPrompt : undefined
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
        'UNKNOWN'
      );
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsCancelling(false);
    }
  };
  const handleOverrideProceed = () => {
    setShowOverrideModal(false);
    proceedWithCondensation();
  };
  const handleOverrideCancel = () => {
    setShowOverrideModal(false);
    setShowSettings(true);
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
      <div>        <SettingsModal
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
          useCustomPrompt={useCustomPrompt}
          setUseCustomPrompt={setUseCustomPrompt}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
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
        />        <InfoPanel
          isOpen={showInfo}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onClose={() => setShowInfo(false)}
        />
        <ConfigurationOverrideModal
          isOpen={showOverrideModal}
          calculatedDrones={overrideModalData.calculatedDrones}
          maxDrones={overrideModalData.maxDrones}
          onProceed={handleOverrideProceed}
          onCancel={handleOverrideCancel}
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
ThreadLink;

// FILE: src/components/APIKeysModal.tsx
const APIKeysModal: React.FC<APIKeysModalProps> = ({
  isOpen,
  googleAPIKey,
  openaiAPIKey,
  anthropicAPIKey,
  googleCacheEnabled,
  openaiCacheEnabled,
  anthropicCacheEnabled,
  setGoogleAPIKey,
  setOpenaiAPIKey,
  setAnthropicAPIKey,
  setGoogleCacheEnabled,
  setOpenaiCacheEnabled,
  setAnthropicCacheEnabled,
  onSave,
  onClose,
  onDeleteKey
}) => {
  if (!isOpen) return null;
  const renderAPIKeySection = (
    provider: 'google' | 'openai' | 'anthropic',
    label: string,
    placeholder: string,
    value: string,
    setValue: (key: string) => void,
    cacheEnabled: boolean,
    setCacheEnabled: (enabled: boolean) => void
  ) => (
    <div>
      <div>
        <label htmlFor={`${provider}-api-key`}>
          {label}
        </label>
        <div>
          <span>Save to Browser</span>
          <button
            onClick={() => setCacheEnabled(!cacheEnabled)}
            title={`Toggle browser storage for ${label}`}`}
          >
            <span`} />
          </button>
        </div>
      </div>
      <div>
        <input
          id={`${provider}-api-key`}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          onClick={() => onDeleteKey(provider)}
          title={`Clear ${label}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
  return (
    <div>
      <div role="dialog" aria-labelledby="api-keys-title">
        <h3 id="api-keys-title">API Key Management</h3>
        <div>
          {renderAPIKeySection(
            'google',
            'Google API Key',
            'AIza...',
            googleAPIKey,
            setGoogleAPIKey,
            googleCacheEnabled,
            setGoogleCacheEnabled
          )}
          {renderAPIKeySection(
            'openai',
            'OpenAI API Key',
            'sk-...',
            openaiAPIKey,
            setOpenaiAPIKey,
            openaiCacheEnabled,
            setOpenaiCacheEnabled
          )}
          {renderAPIKeySection(
            'anthropic',
            'Anthropic API Key',
            'sk-ant-...',
            anthropicAPIKey,
            setAnthropicAPIKey,
            anthropicCacheEnabled,
            setAnthropicCacheEnabled
          )}
        </div>
        <div>
          <button
            onClick={onSave || onClose}
          >
            Save
          </button>
          <button
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
APIKeysModal;

// FILE: src/components/ConfigurationOverrideModal.tsx
const ConfigurationOverrideModal: React.FC<ConfigurationOverrideModalProps> = ({
  isOpen,
  calculatedDrones,
  maxDrones,
  onProceed,
  onCancel
}) => {
  if (!isOpen) return null;
  return (
    <div>
      <div>
        {}
        <div>
          <div>
            <div>
              <AlertTriangle />
            </div>
          </div>
          <h3>
            Settings Conflict Detected
          </h3>
        </div>
        {}
        <div>
          <p>
            Your <span>'Drone Density'</span> setting 
            calculated a need for <span>{calculatedDrones}</span> drones.
          </p>
          <p>
            However, your <span>'Max Drones'</span> safety 
            limit is set to <span>{maxDrones}</span>.
          </p>
          <p>
            Processing will proceed using only <span>{maxDrones}</span> drones. 
            This may result in a less detailed summary than you intended.
          </p>
        </div>
        {}
        <div>
          <div>
            <span>Requested:</span>
            <span>{calculatedDrones} drones</span>
          </div>
          <div>
            <span>Will use:</span>
            <span>{maxDrones} drones</span>
          </div>
        </div>
        {}
        <div>
          <button
            onClick={onProceed}
          >
            Proceed Anyway
          </button>
          <button
            onClick={onCancel}
          >
            Cancel & Edit Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// FILE: src/components/CustomPromptEditor.tsx
const CustomPromptEditor: React.FC<CustomPromptEditorProps> = ({
  isOpen,
  customPrompt,
  onSave,
  onBack
}) => {  const [promptText, setPromptText] = useState(customPrompt);
  const [showInitialWarning, setShowInitialWarning] = useState(true);
  useEffect(() => {
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
    if (promptText !== customPrompt) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to go back?');
      if (!confirmed) return;
    }
    onBack();
  };
  return (
    <div>
      <div>
        {}
        {showInitialWarning && (
          <div>
            <div>
              <div>
                <AlertTriangle size={32} />
                <h3>FIRST TIME WARNING</h3>
                <AlertTriangle size={32} />
              </div>
              <div>
                <p>
                  You are about to access <strong>ADVANCED SYSTEM PROMPT EDITING</strong>.
                </p>
                <div>
                  <p>
                    <strong>⚠️ RISKS:</strong>
                  </p>
                  <ul>
                    <li>Complete processing failure</li>
                    <li>Dramatically increased API costs</li>
                    <li>Unpredictable or corrupted output</li>
                    <li>No technical support for custom prompts</li>
                  </ul>
                </div>
                <p>
                  This will override the core logic that makes ThreadLink work. Only proceed if you understand prompt engineering and accept full responsibility for any issues.
                </p>
              </div>
              <div>
                <button
                  onClick={() => setShowInitialWarning(false)}
                >
                  I Accept All Risks
                </button>
                <button
                  onClick={onBack}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {}
        <div>
          <div>
            <button
              onClick={handleBack}
            >
              <ChevronLeft size={20} />
              <span>Back</span>
            </button>
            <div>
              <AlertTriangle size={20} />
              <span>DANGER ZONE</span>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <h2>
              <AlertTriangle size={24} />
              <span>WARNING: CORE LOGIC OVERRIDE</span>
            </h2>
            <p>
              You are changing the fundamental instructions for the AI. Unstable results, higher costs, and processing failures are likely.
            </p>
            <div>
              <p>
                <strong>Core Logic:</strong> This prompt is sent to EVERY drone that processes your text. 
                The <code>{'{TARGET_TOKENS}'}</code> variable 
                will be replaced with the calculated token budget for each drone based on your compression settings.
              </p>
            </div>
          </div>
        </div>
        {}
        <div>
          <div>
            <label>
              System Prompt (sent to every drone):
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter your custom prompt..."
              spellCheck={false}
            />
            <div>
              {promptText.length} characters | ~{Math.ceil(promptText.length / 4)} tokens (estimate)
            </div>
          </div>
        </div>
        {}
        <div>
          <div>
            <p>
              By applying this custom prompt, you accept full responsibility for any unexpected behavior, increased costs, or processing failures.
            </p>
            <button
              onClick={handleApplyAndClose}
            >
              Apply & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// FILE: src/components/Footer.tsx
const Footer: React.FC<FooterProps> = ({
  tokenCount,
  compressionRatio,
  onCompressionChange,
  inputText,
  isProcessed,
  isLoading,
  isCopied,
  onCondense,
  onCopy,
  onReset
}) => {
  return (
    <>
      <div>
        <div>
          <div>
            <div>
              <div>
                <span>{formatTokenCount(tokenCount)}</span>
                <span>•</span>
                <label htmlFor="compression-ratio-select">
                  Compression level:
                </label>
                <select
                  id="compression-ratio-select"
                  value={compressionRatio}
                  onChange={onCompressionChange}
                >
                  <option value="light">Light</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>
            <div>
              {inputText && !isProcessed && (
                <button 
                  onClick={onCondense}
                  disabled={isLoading}`}
                >
                  {isLoading ? 'Processing...' : 'Condense'}
                </button>
              )}
              {isProcessed && (
                <>
                  <button 
                    onClick={onCopy}
                  >
                    <span>Copy</span>
                    {isCopied && (
                      <span>
                        ✓
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={onReset}
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {}
      <div>
        <p>
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
Footer;

// FILE: src/components/Header.tsx
const Header: React.FC<HeaderProps> = ({ 
  onInfoClick, 
  onAPIKeysClick, 
  onSettingsClick 
}) => {
  return (
    <div>
      <div>
        <h1>
          <span>Thread</span>
          <span>Link</span>
        </h1>
        <p>
          Condense, copy, continue — without breaking flow.
        </p>
      </div>
      <div>
        <button 
          onClick={onInfoClick}
          aria-label="Open help documentation"
        >
          <Info size={20} />
        </button>
        <button 
          onClick={onAPIKeysClick}
          aria-label="Manage API keys"
        >
          <Key size={20} />
        </button>
        <button 
          onClick={onSettingsClick}
          aria-label="Open settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
Header;

// FILE: src/components/InfoPanel.tsx
const InfoPanel: React.FC<InfoPanelProps> = ({
  isOpen,
  expandedSections,
  onToggleSection,
  onClose
}) => {
  if (!isOpen) return null;
  return (
    <div>
      <div>
        {}
        <div>
          <h2>ThreadLink User Guide</h2>
          <button
            onClick={onClose}
            aria-label="Close info panel"
          >
            <X size={20} />
          </button>
        </div>
        {}
        <div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('what')}
            >
              <Sparkles size={20} />
              <div>
                <h3>What is ThreadLink?</h3>
                <p>LLMs forget. ThreadLink doesn't.</p>
              </div>
              {expandedSections.what ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.what && (
              <div>
                <p>
                  Modern AI is powerful but fundamentally amnesiac. ThreadLink is the antidote. It's a high-signal engine that turns sprawling chat logs and raw text into a clean, portable context card.
                </p>
                <p>
                  Its purpose is to preserve your momentum. The moment you hit a session cap, need to switch models, or just want to archive a project's history without losing a single thought, ThreadLink is the tool you reach for. It's built for a single, seamless workflow:
                </p>
                <p>
                  <strong>Use it to:</strong>
                </p>
                <ul>
                  <li>Make a conversation with Claude seamlessly continue inside GPT.</li>
                  <li>Distill a 400,000-token project history into a briefing you can actually read.</li>
                  <li>Archive the complete context of a feature build.</li>
                  <li>Turn any messy data dump into actionable intelligence.</li>
                </ul>
                <p>
                  It's not just a summarizer. <strong>It's a memory implant for your work.</strong>
                </p>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('howto')}
            >
              <Copy size={20} />
              <div>
                <h3>How to Use ThreadLink</h3>
                <p>Garbage In, Garbage Out.</p>
              </div>
              {expandedSections.howto ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.howto && (
              <div>
                <p>
                  The quality of your context card depends entirely on the quality of the text you provide. For best results, follow this simple process to capture a clean, complete session log.
                </p>
                <div>
                  <div>
                    <span>1</span>
                    <div>
                      <h4>Prepare the Interface</h4>
                      <p>Before copying, collapse any sidebars or panels in your AI chat application to minimize UI clutter.</p>
                    </div>
                  </div>
                  <div>
                    <span>2</span>
                    <div>
                      <h4>Load the Full History</h4>
                      <p>Most chat apps use lazy loading. Scroll all the way to the top of the conversation to ensure the entire history is loaded into the page.</p>
                    </div>
                  </div>
                  <div>
                    <span>3</span>
                    <div>
                      <h4>Select All</h4>
                      <p>Use your keyboard (<strong>Ctrl+A</strong> on Windows, <strong>Cmd+A</strong> on Mac) to select the entire conversation from top to bottom.</p>
                    </div>
                  </div>
                  <div>
                    <span>4</span>
                    <div>
                      <h4>Copy and Paste</h4>
                      <p>Copy the selected text (<strong>Ctrl+C</strong> / <strong>Cmd+C</strong>), paste it into ThreadLink, and you're ready to condense.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('compression')}
            >
              <Package size={20} />
              <div>
                <h3>Understanding Compression</h3>
                <p>The Suitcase Analogy: Pillows vs. Gold Bricks</p>
              </div>
              {expandedSections.compression ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.compression && (
              <div>
                <p>
                  The effectiveness of condensation is a direct function of the source text's information density. The compression level you choose sets a target ratio, but the final output is determined by the content itself.
                </p>
                <ul>
                  <li><strong>Low-Density Text (Pillows):</strong> Rambling conversations or marketing copy can be compressed heavily (20:1 or more). There is a lot of "air" (redundancy) to squeeze out.</li>
                  <li><strong>High-Density Text (Gold Bricks):</strong> Source code or technical specifications resist aggressive compression. The system will prioritize preserving critical information over hitting an arbitrary ratio.</li>
                </ul>
                <div>
                  <h4>Compression Level Settings</h4>
                  <p>
                    This setting controls the summarization pressure your drones will apply.
                  </p>
                </div>
                <ul>
                  <li><strong>Light:</strong> Preserves nuance and detail. Best for content where every word matters.</li>
                  <li><strong>Balanced:</strong> Default setting. Optimal trade-off between brevity and completeness.</li>
                  <li><strong>Aggressive:</strong> Maximum compression. Ideal for extracting key points from verbose content.</li>
                </ul>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('strategy')}
            >
              <Scale size={20} />
              <div>
                <h3>Context Card Strategy</h3>
                <p>Precision vs. Focus: The Core Trade-off</p>
              </div>
              {expandedSections.strategy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.strategy && (
              <div>
                <p>
                  The size of your final context card is a strategic choice. There is no single "best" size; it's a trade-off between the richness of the context and the cost and focus of the next LLM session.
                </p>
                <ul>
                  <li><strong>Large Context Cards (e.g., 15k+ tokens):</strong> These act as <strong>high-fidelity archives</strong>. They are excellent for deep analysis or creating a comprehensive project bible, but can sometimes cause the receiving LLM to get lost in less relevant details.</li>
                  <li><strong>Small Context Cards (e.g., &lt; 5k tokens):</strong> These act as <strong>high-signal tactical briefings</strong>. They are cheaper, faster, and force the summary to focus only on the most critical information. The trade-off is that nuance and secondary context are deliberately sacrificed.</li>
                </ul>
                <div>
                  <h4>The Reality of "Soft Targets"</h4>
                  <p>
                    It is critical to understand that the compression level you set is a <strong>strong suggestion</strong>, not a hard command. Our testing has shown that models, especially on dense technical text, will <strong>exceed the target if they determine it's necessary to preserve critical context</strong>. This is a feature of the system's "context-first" philosophy.
                  </p>
                </div>
                <div>
                  <h4>How to Achieve Higher Compression</h4>
                  <p>
                    If your first context card is larger than desired, you have two primary strategies for achieving a more aggressive condensation:
                  </p>
                  <ol>
                    <li><strong>Pre-Filter Your Input (Manual):</strong> The most effective method. Before you click "Condense," manually delete sections of the source text that you know are less important—conversational filler, redundant examples, off-topic tangents. This focuses the drones' attention only on what truly matters.</li>
                    <li><strong>Recursive Condensation (The Two-Pass Method):</strong> For maximum compression, you can run ThreadLink on its own output. Take the first context card you generated, paste it back into ThreadLink as a new input, and condense it again.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('drones')}
            >
              <Bot size={20} />
              <div>
                <h3>Meet Your Drones</h3>
                <p>Every Model Has a Personality. Choose the Right Specialist.</p>
              </div>
              {expandedSections.drones ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.drones && (
              <div>
                <div>
                  <p>
                    Different AI models have distinct personalities and operational limits. Choosing the right one—and understanding how ThreadLink handles it—is critical for getting the result you want.
                  </p>
                </div>
                <div>
                  <div>
                    <h4>Google Gemini</h4>
                    <ul>
                      <li><strong>Personality:</strong> Tends to be verbose. Excels at preserving narrative flow but will often exceed its token target to provide rich, descriptive summaries.</li>
                      <li><strong>Speed:</strong> Very fast</li>
                    </ul>
                  </div>
                  <div>
                    <h4>OpenAI GPT</h4>
                    <ul>
                      <li><strong>Personality:</strong> Generally the most balanced approach. Follows instructions and constraints reliably, offering a good middle ground for most tasks.</li>
                      <li><strong>Speed:</strong> Fast</li>
                    </ul>
                  </div>
                  <div>
                    <h4>Anthropic Claude</h4>
                    <ul>
                      <li><strong>Personality:</strong> Precise and ruthlessly concise. It adheres well to token limits and will aggressively cut text to meet its target. Ideal for summaries where brevity is key.</li>
                      <li><strong>Speed:</strong> Slow</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h4>Processing Speed</h4>
                  <p>This setting controls how many drones are dispatched to work in parallel.</p>
                  <div>
                    <div>
                      <p><strong>Normal:</strong> The default, safe setting (e.g., 3 concurrent jobs). It's a balance of speed and reliability.</p>
                    </div>
                    <div>
                      <p><strong>Fast:</strong> A more aggressive setting (e.g., 6 concurrent jobs). It can significantly speed up processing on large sessions but increases the risk of hitting API rate limits.</p>
                    </div>
                    <div>
                      <p><strong>A Note on Anthropic:</strong> Claude's API has very strict rate limits. To ensure your job completes successfully, ThreadLink automatically disables the "Fast" setting and processes jobs one at a time.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('recency')}
            >
              <Focus size={20} />
              <div>
                <h3>Recency Mode: The Temporal Zoom Lens</h3>
                <p>Focus on What Matters Now.</p>
              </div>
              {expandedSections.recency ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.recency && (
              <div>
                <p>
                  Recency Mode creates a temporally weighted briefing that automatically adjusts summary resolution based on when information appeared in your conversation. Think of it as a zoom lens that focuses sharper on recent events while maintaining a wide-angle view of the overall context.
                </p>
                <div>
                  <p>How It Works: Temporal Bands</p>
                  <p>
                    Recency Mode divides your conversation into three distinct chronological bands and changes how it processes each one by adjusting the "drone density" (the number of summarization jobs per chunk of text).
                  </p>
                  <ul>
                    <li><strong>Recent (Last 20%):</strong> Processed at High Resolution.<br/>
                    <span>The system deploys more, smaller drone jobs. This captures fine-grained details and specific facts from the end of the conversation.</span></li>
                    <li><strong>Mid (Middle 50%):</strong> Processed at Standard Resolution.<br/>
                    <span>This section receives normal processing, providing a balanced summary of the core discussion.</span></li>
                    <li><strong>Oldest (First 30%):</strong> Processed at Low Resolution.<br/>
                    <span>The system uses fewer, larger drone jobs. This forces it to create a high-level, thematic overview while discarding less critical early details.</span></li>
                  </ul>
                </div>
                <p>The Result:</p>
                <p>
                  Your context card begins with a high-level overview of earlier discussion, gradually increasing in detail as it approaches the present. This creates a natural narrative flow that mirrors how human memory works – general impressions of the past, vivid details of the present.
                </p>
                <p>Recency Strength Settings:</p>
                <ul>
                  <li><strong>Subtle:</strong> Gentle gradient. Maintains more detail throughout.</li>
                  <li><strong>Balanced:</strong> Standard temporal weighting. Ideal for most projects.</li>
                  <li><strong>Strong:</strong> Aggressive recency bias. Heavily focuses on latest developments.</li>
                </ul>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('advanced')}
            >
              <Settings size={20} />
              <div>
                <h3>Advanced Controls</h3>
                <p>Fine-tuning the engine for specific missions.</p>
              </div>
              {expandedSections.advanced ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.advanced && (
              <div>
                <p>
                  These settings provide direct control over the cost, performance, and granularity of the condensation pipeline. Adjust them only if you understand the trade-offs.
                </p>
                <div>
                  <div>
                    <h4>LLM Temperature</h4>
                    <p>
                      Temperature controls the "randomness" or "creativity" of the drone's output. It's a value between 0.0 and 2.0.
                    </p>
                    <ul>
                      <li><strong>Low Temperature (e.g., 0.2 - 0.5):</strong> The drone will be more focused, deterministic, and predictable. Its summaries will be more like a factual report, sticking very closely to the source text.</li>
                      <li><strong>High Temperature (e.g., 0.8 - 1.2):</strong> The drone will take more creative risks. Its summaries may be more narrative, making interpretive leaps to connect ideas. This can result in a more readable, story-like output, but carries a higher risk of losing precision or introducing subtle inaccuracies.</li>
                    </ul>
                    <p>
                      For most technical summarization, a lower temperature is recommended.
                    </p>
                  </div>
                  <div>
                    <h4>Drone Density</h4>
                    <p>
                      This setting controls the "resolution" of the condensation process by defining how many drones are assigned per 10,000 tokens of source text.
                    </p>
                    <ul>
                      <li><strong>Low Density (e.g., 1-2):</strong> Each drone gets a large chunk of text. This is cheaper and results in a more high-level, thematic summary.</li>
                      <li><strong>High Density (e.g., 4-5):</strong> Each drone gets a smaller, more focused chunk. This is more expensive but results in a more detailed and granular context card.</li>
                    </ul>
                    <p>
                      <strong>Note:</strong> This setting is disabled when Recency Mode is active. Recency Mode uses its own dynamic logic to vary the drone density automatically.
                    </p>
                  </div>
                  <div>
                    <h4>Runaway Cost Protection (Max Drones)</h4>
                    <p>
                      This is a hard safety limit on the total number of drones a single job can create. Its primary purpose is to prevent accidental, runaway API costs when processing extremely large documents with a high Drone Density setting.
                    </p>
                    <p>
                      <strong>Recommendation:</strong> Only increase this limit if you are intentionally processing a massive session (e.g., 500k+ tokens) and have accepted the potential cost implications.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {}
          <div>
            <button
              onClick={() => onToggleSection('privacy')}
            >
              <Shield size={20} />
              <div>
                <h3>Privacy & The Project</h3>
                <p>Your Keys, Your Data.</p>
              </div>
              {expandedSections.privacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {expandedSections.privacy && (
              <div>
                <p>
                  ThreadLink is built with a privacy-first, BYOK, open-source philosophy. Your conversations and API keys remain exclusively yours.
                </p>
                <div>
                  <p>BYOK (Bring Your Own Key) Architecture:</p>
                  <ul>
                    <li>Your API keys are never seen or stored by our servers</li>
                    <li>All API calls go directly from your browser to the LLM provider</li>
                    <li>No intermediary servers handle your sensitive data</li>
                    <li>Complete transparency in how your data flows</li>
                  </ul>
                </div>
                <p>
                  The complete ThreadLink source code is available on GitHub for review. You can see exactly how every feature works, verify our privacy claims, and even run your own instance if desired.
                </p>
                <div>
                  <p>
                    <a 
                      href="https:
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <strong>GitHub:</strong> github.com/skragus/threadlink - yes, I'd like a star
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        {}
        <div>
          <button
            onClick={onClose}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
InfoPanel;

// FILE: src/components/LoadingOverlay.tsx
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loadingProgress,
  isCancelling,
  onCancel
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (progressBarRef.current && loadingProgress.totalDrones && loadingProgress.totalDrones > 0) {
      const progressPercent = Math.min(100, ((loadingProgress.completedDrones || 0) / loadingProgress.totalDrones) * 100);
      progressBarRef.current.style.width = `${progressPercent}%`;
    }
  }, [loadingProgress.completedDrones, loadingProgress.totalDrones]);
  return (
    <div>
      <div>
        <div>
          {}
          <div>
            <div>
              {loadingProgress.message}
            </div>
            {loadingProgress.elapsedTime !== undefined && (
              <div>
                {loadingProgress.elapsedTime.toFixed(1)}s elapsed
              </div>
            )}
          </div>
          {}
          {loadingProgress.phase === 'processing' && loadingProgress.totalDrones && (
            <div>
              <div>
                <span>Progress: {loadingProgress.completedDrones || 0}/{loadingProgress.totalDrones} drones</span>
                <span>{Math.round(((loadingProgress.completedDrones || 0) / loadingProgress.totalDrones) * 100)}%</span>
              </div>
              <div>
                <div 
                  ref={progressBarRef}
                />
              </div>
            </div>
          )}
          {}
          {loadingProgress.phase !== 'processing' && (
            <div>
              <Loader2 size={24} />
            </div>
          )}
          {}
          <button
            onClick={onCancel}
            disabled={isCancelling || loadingProgress.phase === 'finalizing'}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
LoadingOverlay;

// FILE: src/components/SettingModal.tsx
const SettingsModal: React.FC<SettingsModalProps> = ({
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
  useCustomPrompt,
  setUseCustomPrompt,
  customPrompt,
  setCustomPrompt,
  onClose
}) => {
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  if (!isOpen) return null;
  const isAnthropicModel = model.includes('claude');
  const showProcessingSpeed = !isAnthropicModel;
  const handleCustomPromptToggle = () => {
    if (!useCustomPrompt) {
      setShowPromptEditor(true);
    } else {
      setUseCustomPrompt(false);
    }
  };
  const handlePromptEditorClose = (saved: boolean) => {
    if (saved) {
      setUseCustomPrompt(true);
    }
    setShowPromptEditor(false);
  };
  return (
    <>
      <div>
        <div>
          <h3>Settings</h3>
          <div>
            {}
            <div>
              <div>
                <label htmlFor="model-select">
                  Model
                </label>
              </div>
              <select
                id="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
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
            {}
            {showProcessingSpeed && (
              <div>
                <div>
                  <label>
                    Processing Speed
                  </label>
                  <div>
                    <div>
                      i
                    </div>
                    <div>
                      Fast mode uses higher concurrency for faster processing
                    </div>
                  </div>
                </div>
                <div>
                  <span`}>
                    Normal
                  </span>
                  <button
                    onClick={() => setProcessingSpeed(processingSpeed === 'balanced' ? 'fast' : 'balanced')}
                    title={`Switch to ${processingSpeed === 'balanced' ? 'fast' : 'balanced'} processing`}`}
                  >
                    <span`}
                    />
                  </button>
                  <span`}>
                    Fast
                  </span>
                </div>
              </div>
            )}
            {}
            <div>
              <div>
                <label>
                  Recency Mode
                </label>
                <div>
                  <div>
                    i
                  </div>
                  <div>
                    Prioritizes more recent content in conversations
                  </div>
                </div>
              </div>
              <div>
                <span`}>
                  Off
                </span>
                <button
                  onClick={() => setRecencyMode(!recencyMode)}
                  title={`${recencyMode ? 'Disable' : 'Enable'} recency mode`}`}
                >
                  <span`}
                  />
                </button>
                <span`}>
                  On
                </span>
              </div>
            </div>
            {}
            {recencyMode && (
              <div>
                <div>
                  <label>
                    Recency Strength
                  </label>
                  <div>
                    <div>
                      i
                    </div>
                    <div>
                      How strongly to weight recent vs older content
                    </div>
                  </div>
                </div>
                <div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={recencyStrength}
                    onChange={(e) => setRecencyStrength(parseInt(e.target.value))}
                    title="Adjust recency strength"
                  />
                  <div>
                    <span>Subtle</span>
                    <span>Balanced</span>
                    <span>Strong</span>
                  </div>
                </div>
              </div>
            )}
            {}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>Advanced Settings</span>
              </button>
              {showAdvanced && (
                <div>
                  {}
                  <div>
                    <div>
                      <label htmlFor="adv-temperature">
                        LLM Temperature
                      </label>
                      <div>
                        <div>
                          i
                        </div>
                        <div>
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
                    />
                  </div>
                  {}
                  {!recencyMode && (
                    <div>
                      <div>
                        <label htmlFor="adv-drone-density">
                          Drone Density
                        </label>
                        <div>
                          <div>
                            i
                          </div>
                          <div>
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
                      />
                    </div>
                  )}                  {}
                  <div>
                    <h4>
                      <AlertTriangle size={16} />
                      <span>DANGER ZONE</span>
                    </h4>
                    {}
                    <div>
                      <div>
                        <label htmlFor="adv-max-drones">
                          Max Drones Limit
                        </label>
                        <div>
                          <div>
                            i
                          </div>
                          <div>
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
                      />
                    </div>
                    {}
                    <div>
                      <div>
                        <label>
                          Custom System Prompt
                        </label>
                        {useCustomPrompt && (
                          <AlertTriangle size={14} />
                        )}
                        <div>
                          <div>
                            !
                          </div>
                          <div>
                            Override ALL drone system prompts - USE WITH EXTREME CAUTION
                          </div>
                        </div>
                      </div>
                      <div>
                        <span`}>
                          Off
                        </span>
                        <button
                          onClick={handleCustomPromptToggle}
                          title={`${useCustomPrompt ? 'Disable' : 'Enable'} custom system prompt`}`}
                        >
                          <span`}
                          />
                        </button>
                        <span`}>
                          On
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <button
              onClick={onClose}
            >
              Save
            </button>
          </div>
        </div>
      </div>      {}
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

// FILE: src/components/TextEditor.tsx
const TextEditor: React.FC<TextEditorProps> = ({
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
      {}
      {error && (
        <div ref={errorRef}>
          {error}
        </div>
      )}
      {}
      {stats && (
        <div ref={statsRef}>
          Processed in {stats.executionTime}s • {stats.compressionRatio}:1 compression • {stats.successfulDrones}/{stats.totalDrones} drones successful
        </div>
      )}
      {}
      <div>
        <textarea
          ref={outputTextareaRef} ${isProcessed || isLoading ? 'cursor-default' : 'cursor-text'}`}
          placeholder="Paste your AI conversation here..."
          value={displayText}
          onChange={onTextChange}
          readOnly={isProcessed || isLoading}
        />
        {}
        <a 
          href="https:
          target="_blank" 
          rel="noopener noreferrer"
        >
          <img 
            src="src/assets/bolt-badge.png"
            alt="Powered by Bolt.new"
          />
        </a>
        {}
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
TextEditor;

// FILE: src/lib/client-api.js
const MODEL_PROVIDERS = {
    "gpt-4o-mini": "openai",
    "gpt-4.1-mini": "openai",
    "gpt-4.1-nano": "openai",
    "claude-3-5-haiku-20241022": "anthropic",
    "claude-3-haiku-20240307": "anthropic",
    "gemini-1.5-flash": "google",
};
const API_ENDPOINTS = {
    openai: 'https:
    anthropic: 'https:
    google: 'https:
};
function estimateTokens(text) {
    return Math.floor((text || "").length / 4);
}
function getProviderForModel(model) {
    if (!model) {
        throw new Error("Model name is required");
    }
    if (!(model in MODEL_PROVIDERS)) {
        const availableModels = Object.keys(MODEL_PROVIDERS);
        throw new Error(`Unknown model: ${model}. Available models: ${availableModels.slice(0, 5).join(", ")}...`);
    }
    return MODEL_PROVIDERS[model];
}
async function generateOpenAIResponse(
    systemInstructions,
    userPrompt,
    model,
    apiKey,
    temperature = 0.7,
    maxTokens = 4096
) {
    const response = await fetch(API_ENDPOINTS.openai, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens
        })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const err = new Error(error.error?.message || `OpenAI API error: ${response.status}`);
        err.status = response.status;
        err.response = response;
        throw err;
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}
async function generateAnthropicResponse(
    systemInstructions,
    userPrompt,
    model,
    apiKey,
    temperature = 0.7,
    maxTokens = 4096
) {
    const response = await fetch(API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemInstructions,
            messages: [{ role: "user", content: userPrompt }]
        })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const err = new Error(error.error?.message || `Anthropic API error: ${response.status}`);
        err.status = response.status;
        err.response = response;
        err.headers = Object.fromEntries(response.headers.entries());
        throw err;
    }
    const data = await response.json();
    return data.content[0]?.text || "";
}
async function generateGoogleResponse(
    systemInstructions,
    userPrompt,
    model,
    apiKey,
    temperature = 0.7,
    maxTokens = null
) {
    const endpoint = API_ENDPOINTS.google.replace('{model}', model);
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `${systemInstructions}\n\n${userPrompt}`
                }]
            }],
            generationConfig: {
                temperature,
                candidateCount: 1
            }
        })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const err = new Error(error.error?.message || `Google AI API error: ${response.status}`);
        err.status = response.status;
        err.response = response;
        throw err;
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
export async function generateResponse(
    systemInstructions,
    userPrompt,
    model = "gpt-4o",
    apiKey,
    temperature = 0.7,
    maxTokens = null
) {
    if (!systemInstructions || !userPrompt) {
        console.error("Missing required parameters: systemInstructions and userPrompt");
        return "";
    }
    if (!apiKey) {
        throw new Error("API key is required");
    }
    try {
        const provider = getProviderForModel(model);
        console.log(`🚀 Generating response with ${model} via ${provider}`);
        switch (provider) {
            case "openai":
                return await generateOpenAIResponse(
                    systemInstructions, userPrompt, model, apiKey, temperature, maxTokens
                );
            case "anthropic":
                return await generateAnthropicResponse(
                    systemInstructions, userPrompt, model, apiKey, temperature, maxTokens
                );
            case "google":
                return await generateGoogleResponse(
                    systemInstructions, userPrompt, model, apiKey, temperature, maxTokens
                );
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    } catch (error) {
        console.error(`❌ Error generating response with ${model}:`, error.message);
        throw error;
    }
}
function cleanAnthropicIntros(text, options = {}) {
    if (!text || typeof text !== 'string') return text;
    const { debug = false } = options;
    const originalLength = text.length;
    let cleaned = text.trim();
    let patternMatched = null;
    let method = null;
    const lines = cleaned.split('\n');
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.endsWith(':')) {
        const summaryKeywords = [
            'summary', 'condensed', 'conversation', 'context', 'card', 'token',
            'segment', 'analysis', 'overview', 'breakdown', 'insights',
            'highlights', 'key', 'core', 'essential', 'focus', 'recap', 
            'implementation', 'strategy'
        ];
        const hasKeyword = summaryKeywords.some(keyword => 
            firstLine.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasKeyword) {
            patternMatched = firstLine + ':';
            method = 'keyword-based';
            cleaned = lines.slice(1).join('\n').trim();
        }
    }
    if (!patternMatched) {
        const specificPatterns = [
            /^Here's [^:]*:\s*/i,
            /^I'll analyze [^.]*\.\s*/i,
            /^I'll condense [^:]*:\s*/i,
            /^I'll [^.]*\.\s*/i,
            /^I'll [^.]*\.\s*Let's [^:]*:\s*/i,
            /^[🔬📊💡🚀📈📄🧪🎉💥⚠️✅❌⭐️🔍]+ [^:]*:\s*/i,
            /^[A-Z][a-z]+ [A-Z][^:]*Summary[^:]*:\s*/i,
            /^This is [^:]*:\s*/i,
            /^The following is [^:]*:\s*/i,
            /^Below is [^:]*:\s*/i,
        ];
        for (const pattern of specificPatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                patternMatched = match[0];
                method = 'pattern-based';
                cleaned = cleaned.replace(pattern, '').trim();
                break;
            }
        }
    }
    if (patternMatched && debug) {
        const trimmedChars = originalLength - cleaned.length;
        console.log(`🧹 Cleaned intro (${method}): "${patternMatched.trim()}" (removed ${trimmedChars} chars)`);
    }
    return cleaned;
}
export async function testProviderConnection(provider, apiKey) {
    if (!apiKey) {
        return {
            provider,
            success: false,
            error: "API key not provided"
        };
    }
    try {
        const testPrompt = "Hello";
        const testSystem = "You are a helpful assistant. Respond with 'OK'.";
        let result;
        const testModels = {
            openai: "gpt-3.5-turbo",
            anthropic: "claude-3-haiku-20240307", 
            google: "gemini-1.5-flash"
        };
        const model = testModels[provider];
        if (!model) {
            return {
                provider,
                success: false,
                error: "Unknown provider"
            };
        }
        result = await generateResponse(
            testSystem, 
            testPrompt, 
            model, 
            apiKey, 
            0.0, 
            5
        );
        return {
            provider,
            success: Boolean(result),
            responseLength: result ? result.length : 0,
        };
    } catch (error) {
        return {
            provider,
            success: false,
            error: error.message
        };
    }
}
function getModelInfo(model) {
    if (!(model in MODEL_PROVIDERS)) {
        return {
            model,
            exists: false,
            error: "Model not found in registry"
        };
    }
    const provider = MODEL_PROVIDERS[model];
    return {
        model,
        provider,
        exists: true
    };
}

// FILE: src/lib/storage.js
const STORAGE_KEYS = {
    OPENAI_KEY: 'threadlink_openai_api_key',
    ANTHROPIC_KEY: 'threadlink_anthropic_api_key',
    GOOGLE_KEY: 'threadlink_google_api_key',
    SETTINGS: 'threadlink_settings',
    LAST_USED_MODEL: 'threadlink_last_model',
    CUSTOM_PROMPT: 'threadlink_custom_prompt',
    USE_CUSTOM_PROMPT: 'threadlink_use_custom_prompt'
};
function saveAPIKey(provider, key) {
    if (!provider || !key) return;
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY
    }[provider];
    if (storageKey) {
        try {
            localStorage.setItem(storageKey, key);
            console.log(`✅ Saved ${provider} API key`);
        } catch (error) {
            console.error(`Failed to save ${provider} API key:`, error);
        }
    }
}
function getAPIKey(provider) {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY
    }[provider];
    if (!storageKey) return null;
    try {
        return localStorage.getItem(storageKey);
    } catch (error) {
        console.error(`Failed to get ${provider} API key:`, error);
        return null;
    }
}
function removeAPIKey(provider) {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY
    }[provider];
    if (storageKey) {
        try {
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Removed ${provider} API key`);
        } catch (error) {
            console.error(`Failed to remove ${provider} API key:`, error);
        }
    }
}
function getAllAPIKeys() {
    return {
        openai: getAPIKey('openai'),
        anthropic: getAPIKey('anthropic'),
        google: getAPIKey('google')
    };
}
function getAvailableProviders() {
    return {
        openai: !!getAPIKey('openai'),
        anthropic: !!getAPIKey('anthropic'),
        google: !!getAPIKey('google')
    };
}
function saveCustomPrompt(prompt) {
    try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPT, prompt);
        console.log('✅ Custom prompt saved');
    } catch (error) {
        console.error('Failed to save custom prompt:', error);
    }
}
function getCustomPrompt() {
    try {
        return localStorage.getItem(STORAGE_KEYS.CUSTOM_PROMPT);
    } catch (error) {
        console.error('Failed to get custom prompt:', error);
        return null;
    }
}
function saveUseCustomPrompt(enabled) {
    try {
        localStorage.setItem(STORAGE_KEYS.USE_CUSTOM_PROMPT, enabled ? 'true' : 'false');
        console.log(`✅ Custom prompt ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Failed to save custom prompt state:', error);
    }
}
function getUseCustomPrompt() {
    try {
        return localStorage.getItem(STORAGE_KEYS.USE_CUSTOM_PROMPT) === 'true';
    } catch (error) {
        console.error('Failed to get custom prompt state:', error);
        return false;
    }
}
function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        console.log('✅ Settings saved');
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}
function getSettings() {
    try {
        const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return settings ? JSON.parse(settings) : getDefaultSettings();
    } catch (error) {
        console.error('Failed to get settings:', error);
        return getDefaultSettings();
    }
}
function getDefaultSettings() {
    return {
        model: 'gemini-1.5-flash',
        temperature: 0.3,
        processingSpeed: 'balanced',
        recencyMode: false,
        recencyStrength: 0,
        droneDensity: 10,
        maxDrones: 100,
        targetTokens: null,
        useCustomPrompt: false,
        customPrompt: null
    };
}
function saveLastUsedModel(model) {
    try {
        localStorage.setItem(STORAGE_KEYS.LAST_USED_MODEL, model);
    } catch (error) {
        console.error('Failed to save last used model:', error);
    }
}
function getLastUsedModel() {
    try {
        return localStorage.getItem(STORAGE_KEYS.LAST_USED_MODEL);
    } catch (error) {
        console.error('Failed to get last used model:', error);
        return null;
    }
}
function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove ${key}:`, error);
        }
    });
    console.log('🧹 Cleared all ThreadLink data');
}
function exportData() {
    return {
        apiKeys: getAllAPIKeys(),
        settings: getSettings(),
        lastUsedModel: getLastUsedModel(),
        customPrompt: getCustomPrompt(),
        useCustomPrompt: getUseCustomPrompt()
    };
}
function importData(data) {
    if (data.apiKeys) {
        Object.entries(data.apiKeys).forEach(([provider, key]) => {
            if (key) saveAPIKey(provider, key);
        });
    }
    if (data.settings) {
        saveSettings(data.settings);
    }
    if (data.lastUsedModel) {
        saveLastUsedModel(data.lastUsedModel);
    }
    if (data.customPrompt !== undefined) {
        saveCustomPrompt(data.customPrompt);
    }
    if (data.useCustomPrompt !== undefined) {
        saveUseCustomPrompt(data.useCustomPrompt);
    }
    console.log('✅ Data imported successfully');
}

// FILE: src/lib/utils.js
function formatNumber(n) {
    return typeof n === 'number' ? n.toLocaleString() : '???';
}
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}
function safeJSONParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}
function downloadTextFile(text, filename, type = 'text/plain') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
export async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}
function calculatePercentage(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
}
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
export async function waitForCondition(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

// FILE: src/main.tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// FILE: src/pipeline/batcher.js
function rescueTinyOrphans(paragraphs, minThreshold = config.MIN_ORPHAN_TOKEN_THRESHOLD) {
    if (!Array.isArray(paragraphs) || paragraphs.length < 2) {
        return paragraphs;
    }
    const rescued = [paragraphs[0]];
    for (let i = 1; i < paragraphs.length; i++) {
        const current = paragraphs[i];
        const previous = rescued[rescued.length - 1];
        if (current.token_count < minThreshold || previous.token_count < minThreshold) {
            previous.id = `${previous.id}+${current.id}`;
            previous.text = `${previous.text || ''}${config.ORPHAN_MERGE_SEPARATOR}${current.text || ''}`;
            previous.token_count += (current.token_count || 0);
            const currentOriginals = Array.isArray(current.merged_from) ? current.merged_from : [current.id];
            const previousOriginals = Array.isArray(previous.merged_from) ? previous.merged_from : [previous.id];
            previous.merged_from = previousOriginals.concat(currentOriginals);
        } else {
            rescued.push(current);
        }
    }
    console.log(`🏁 Orphan rescue complete: ${paragraphs.length} → ${rescued.length} paragraphs`);
    return rescued;
}
function consolidateSegments(paragraphs, customSettings = {}) {
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
        console.warn("⚠️ No paragraphs to consolidate.");
        return [];
    }
    const { customDroneDensity, totalInputTokens } = customSettings;
    let dynamicCeiling = config.AGGREGATOR_CEILING_TOKENS;
    if (customDroneDensity && customDroneDensity >= 3 && totalInputTokens > 0) {
        const targetDroneSize = Math.floor(totalInputTokens / config.calculateEstimatedDrones(totalInputTokens, customDroneDensity));
        dynamicCeiling = Math.min(config.AGGREGATOR_CEILING_TOKENS, Math.max(1000, targetDroneSize * 0.8));
        console.log(`🎯 High drone density: Dynamically reducing aggregator ceiling to ${dynamicCeiling} tokens.`);
    }
    const tokenCounts = paragraphs.map(p => p.token_count);
    console.log(`📊 Input paragraph sizes: min=${Math.min(...tokenCounts)}, max=${Math.max(...tokenCounts)}, avg=${Math.round(tokenCounts.reduce((a,b) => a+b, 0) / tokenCounts.length)}`);
    const consolidated = [];
    const needsSplitting = [];
    for (const para of paragraphs) {
        if (para.token_count > dynamicCeiling) {
            needsSplitting.push(para);
        } else {
            consolidated.push(para);
        }
    }
    if (needsSplitting.length > 0) {
        console.log(`📋 ${needsSplitting.length} paragraphs exceed the ${dynamicCeiling} token ceiling and will be split.`);
        for (const oversizedPara of needsSplitting) {
            const splits = splitOversizedParagraph(oversizedPara, dynamicCeiling);
            console.log(`   Split paragraph (${oversizedPara.token_count} tokens) into ${splits.length} segments`);
            consolidated.push(...splits);
        }
    } else {
        console.log(`📋 No paragraphs needed splitting (all under ${dynamicCeiling} tokens)`);
    }
    const finalSegments = [];
    let currentSegment = null;
    for (const segment of consolidated) {
        if (!currentSegment) {
            currentSegment = {
                text: segment.text,
                token_count: segment.token_count,
                segment_indices: [segment.segment_index || consolidated.indexOf(segment)]
            };
        } else if (currentSegment.token_count + segment.token_count <= dynamicCeiling) {
            currentSegment.text += config.CONSOLIDATION_SEPARATOR + segment.text;
            currentSegment.token_count += segment.token_count;
            currentSegment.segment_indices.push(segment.segment_index || consolidated.indexOf(segment));
        } else {
            if (currentSegment.token_count >= config.MIN_SEGMENT_TARGET_TOKENS) {
                finalSegments.push(currentSegment);
            } else {
                currentSegment.text += config.CONSOLIDATION_SEPARATOR + segment.text;
                currentSegment.token_count += segment.token_count;
                currentSegment.segment_indices.push(segment.segment_index || consolidated.indexOf(segment));
                finalSegments.push(currentSegment);
                currentSegment = null;
                continue;
            }
            currentSegment = {
                text: segment.text,
                token_count: segment.token_count,
                segment_indices: [segment.segment_index || consolidated.indexOf(segment)]
            };
        }
    }
    if (currentSegment && currentSegment.token_count > 0) {
        finalSegments.push(currentSegment);
    }
    console.log(`✅ Segment consolidation complete. Final count: ${finalSegments.length} consolidated segments.`);
    const finalSizes = finalSegments.map(s => s.token_count);
    console.log(`📊 Consolidated segment sizes: [${finalSizes.slice(0, 30).join(', ')}${finalSizes.length > 30 ? '...' : ''}]`);
    return finalSegments;
}
function splitOversizedParagraph(paragraph, maxTokens) {
    const splits = [];
    const sentences = paragraph.text.match(/[^.!?]+[.!?]+/g) || [paragraph.text];
    let currentSplit = {
        text: '',
        token_count: 0,
        segment_index: paragraph.segment_index
    };
    for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        if (currentSplit.token_count + sentenceTokens > maxTokens && currentSplit.text.length > 0) {
            splits.push({...currentSplit});
            currentSplit = {
                text: sentence,
                token_count: sentenceTokens,
                segment_index: paragraph.segment_index
            };
        } else {
            currentSplit.text += (currentSplit.text ? ' ' : '') + sentence;
            currentSplit.token_count += sentenceTokens;
        }
    }
    if (currentSplit.text) {
        splits.push(currentSplit);
    }
    if (splits.length === 0) {
        const targetCharsPerSplit = Math.floor(paragraph.text.length * (maxTokens / paragraph.token_count));
        let remainingText = paragraph.text;
        while (remainingText.length > 0) {
            const splitText = remainingText.substring(0, targetCharsPerSplit);
            splits.push({
                text: splitText,
                token_count: estimateTokens(splitText),
                segment_index: paragraph.segment_index
            });
            remainingText = remainingText.substring(targetCharsPerSplit);
        }
    }
    return splits;
}
function splitBySizeLimit(text, maxTokens, baseId, startIndex) {
    const chunks = [];
    const lines = text.split('\n');
    if (lines.length > 1) {
        let currentChunk = {
            id: `${baseId}_chunk_${String(startIndex).padStart(3, '0')}`,
            text: '',
            token_count: 0,
            original_ids: [baseId]
        };
        let chunkIndex = startIndex;
        for (const line of lines) {
            const lineTokens = estimateTokens(line);
            if (lineTokens > maxTokens) {
                if (currentChunk.text.length > 0) {
                    chunks.push(currentChunk);
                    chunkIndex++;
                }
                const charChunks = splitByCharacterLimit(line, maxTokens, baseId, chunkIndex);
                chunks.push(...charChunks);
                chunkIndex += charChunks.length;
                currentChunk = {
                    id: `${baseId}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                    text: '',
                    token_count: 0,
                    original_ids: [baseId]
                };
            } else if (currentChunk.token_count + lineTokens > maxTokens && currentChunk.text.length > 0) {
                chunks.push(currentChunk);
                chunkIndex++;
                currentChunk = {
                    id: `${baseId}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                    text: line,
                    token_count: lineTokens,
                    original_ids: [baseId]
                };
            } else {
                currentChunk.text += (currentChunk.text ? '\n' : '') + line;
                currentChunk.token_count += lineTokens;
            }
        }
        if (currentChunk.text.length > 0) {
            chunks.push(currentChunk);
        }
    } else {
        chunks.push(...splitByCharacterLimit(text, maxTokens, baseId, startIndex));
    }
    return chunks;
}
function splitByCharacterLimit(text, maxTokens, baseId, startIndex) {
    const chunks = [];
    const approxCharsPerToken = 4;
    const maxChars = maxTokens * approxCharsPerToken;
    let chunkIndex = startIndex;
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxChars, text.length);
        if (end < text.length) {
            let breakPoint = end;
            for (let i = end; i > start + maxChars * 0.5; i--) {
                if (text[i] === ' ' || text[i] === '\n' || /[.!?,;:]/.test(text[i])) {
                    breakPoint = i + 1;
                    break;
                }
            }
            end = breakPoint;
        }
        const chunkText = text.substring(start, end).trim();
        if (chunkText) {
            chunks.push({
                id: `${baseId}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                text: chunkText,
                token_count: estimateTokens(chunkText),
                original_ids: [baseId]
            });
            chunkIndex++;
        }
        start = end;
    }
    return chunks;
}
function createDroneBatches(consolidatedSegments, customSettings = {}) {
    if (!Array.isArray(consolidatedSegments) || consolidatedSegments.length === 0) {
        return [];
    }
    const { 
        customDroneDensity, 
        totalInputTokens, 
        customMaxDrones, 
        customTargetTokens,
        recencyMode = false,
        recencyStrength = 0
    } = customSettings;
    const maxDrones = customMaxDrones;
    if (recencyMode && recencyStrength > 0) {
        console.log(`\n🕐 RECENCY MODE ACTIVE: strength=${recencyStrength}`);
        const totalSegments = consolidatedSegments.length;
        const oldestEnd = Math.floor(totalSegments * 0.3);
        const midEnd = Math.floor(totalSegments * 0.8);
        const oldestBand = consolidatedSegments.slice(0, oldestEnd);
        const midBand = consolidatedSegments.slice(oldestEnd, midEnd);
        const recentBand = consolidatedSegments.slice(midEnd);
        console.log(`📊 Temporal bands: Oldest=${oldestBand.length}, Mid=${midBand.length}, Recent=${recentBand.length} segments`);
        const strength = recencyStrength / 100;
        const oldestMultiplier = 1 - (0.75 * strength);
        const midMultiplier = 1 - (0.25 * strength);
        const recentMultiplier = 1 + (1.5 * strength);
        const baseDensity = customDroneDensity || config.DRONES_PER_10K_TOKENS;
        const oldestDensity = baseDensity * oldestMultiplier;
        const midDensity = baseDensity * midMultiplier;
        const recentDensity = baseDensity * recentMultiplier;
        console.log(`🎯 Density multipliers: Oldest=${oldestMultiplier.toFixed(2)}x, Mid=${midMultiplier.toFixed(2)}x, Recent=${recentMultiplier.toFixed(2)}x`);
        console.log(`🎯 Effective densities: Oldest=${oldestDensity.toFixed(2)}, Mid=${midDensity.toFixed(2)}, Recent=${recentDensity.toFixed(2)} drones/10k`);
        const allBatches = [];
        if (oldestBand.length > 0) {
            console.log(`\n📦 Processing OLDEST band (${oldestBand.length} segments)...`);
            const oldestBatches = processBandWithDensity(oldestBand, {
                customDroneDensity: oldestDensity,
                totalInputTokens: oldestBand.reduce((sum, seg) => sum + seg.token_count, 0),
                bandName: 'oldest'
            });
            allBatches.push(...oldestBatches);
        }
        if (midBand.length > 0) {
            console.log(`\n📦 Processing MID band (${midBand.length} segments)...`);
            const midBatches = processBandWithDensity(midBand, {
                customDroneDensity: midDensity,
                totalInputTokens: midBand.reduce((sum, seg) => sum + seg.token_count, 0),
                bandName: 'mid'
            });
            allBatches.push(...midBatches);
        }
        if (recentBand.length > 0) {
            console.log(`\n📦 Processing RECENT band (${recentBand.length} segments)...`);
            const recentBatches = processBandWithDensity(recentBand, {
                customDroneDensity: recentDensity,
                totalInputTokens: recentBand.reduce((sum, seg) => sum + seg.token_count, 0),
                bandName: 'recent'
            });
            allBatches.push(...recentBatches);
        }
        console.log(`\n✅ Recency mode batching complete: ${allBatches.length} total batches`);
        let finalBatches = allBatches;
        if (maxDrones && allBatches.length > maxDrones) {
            console.log(`⚠️ Combined batch count (${allBatches.length}) exceeds maxDrones limit (${maxDrones}). Consolidating...`);
            finalBatches = consolidateBatchesToLimit(allBatches, consolidatedSegments, maxDrones);
        }
        return finalBatches.map((batch, index) => ({
            batch_id: `drone_batch_${String(index + 1).padStart(3, '0')}`,
            ...batch
        }));
    }
    let droneIdealTarget, droneInputMin, droneInputMax;
    if (customDroneDensity && totalInputTokens > 0) {
        const optimalInputSize = config.calculateOptimalDroneInputSize(totalInputTokens, customDroneDensity);
        droneIdealTarget = optimalInputSize;
        droneInputMin = Math.max(config.ABSOLUTE_MIN_VIABLE_DRONE_TOKENS, Math.floor(optimalInputSize * 0.5));
        droneInputMax = Math.min(config.DRONE_INPUT_TOKEN_MAX, Math.ceil(optimalInputSize * 1.5));
        console.log(`🎯 Custom drone sizing active: density=${customDroneDensity}, ideal=${droneIdealTarget}, min=${droneInputMin}, max=${droneInputMax}`);
    } else {
        droneIdealTarget = config.DRONE_IDEAL_TARGET_TOKENS;
        droneInputMin = config.DRONE_INPUT_TOKEN_MIN;
        droneInputMax = config.DRONE_INPUT_TOKEN_MAX;
    }
    if (maxDrones) {
        console.log(`🚨 Max drones limit: ${maxDrones}`);
    }
    console.log(`📦 Creating Drone Batches: Min=${droneInputMin}, Max=${droneInputMax}, IdealTarget=${droneIdealTarget}`);
    const batches = [];
    let currentBatch = { segments: [], total_tokens: 0 };
    for (const segment of consolidatedSegments) {
        if (segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) batches.push(currentBatch);
            batches.push({ segments: [segment], total_tokens: segment.token_count, oversized: true });
            currentBatch = { segments: [], total_tokens: 0 };
            continue;
        }
        if (currentBatch.total_tokens + segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) {
                if (currentBatch.total_tokens < droneInputMin) {
                    console.warn(`⚠️ Force-fitting to prevent orphan batch. Creating oversized batch.`);
                    currentBatch.segments.push(segment);
                    currentBatch.total_tokens += segment.token_count;
                    batches.push(currentBatch);
                    currentBatch = { segments: [], total_tokens: 0 };
                } else {
                    batches.push(currentBatch);
                    currentBatch = { segments: [segment], total_tokens: segment.token_count };
                }
            } else {
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            }
        } else {
            currentBatch.segments.push(segment);
            currentBatch.total_tokens += segment.token_count;
        }
    }
    if (currentBatch.segments.length > 0) {
        batches.push(currentBatch);
    }
    let finalBatches = batches;
    if (maxDrones && batches.length > maxDrones) {
        console.log(`⚠️ Initial batch count (${batches.length}) exceeds maxDrones limit (${maxDrones}). Reconsolidating...`);
        finalBatches = consolidateBatchesToLimit(batches, consolidatedSegments, maxDrones);
    }
    console.log(`✅ Final batch count: ${finalBatches.length}${maxDrones ? ` (maxDrones: ${maxDrones})` : ''}`);
    return finalBatches.map((batch, index) => ({
        batch_id: `drone_batch_${String(index + 1).padStart(3, '0')}`,
        ...batch
    }));
}
function processBandWithDensity(bandSegments, settings) {
    const { customDroneDensity, totalInputTokens, bandName } = settings;
    const optimalInputSize = config.calculateOptimalDroneInputSize(totalInputTokens, customDroneDensity);
    const droneIdealTarget = optimalInputSize;
    const droneInputMin = Math.max(config.ABSOLUTE_MIN_VIABLE_DRONE_TOKENS, Math.floor(optimalInputSize * 0.5));
    const droneInputMax = Math.min(config.DRONE_INPUT_TOKEN_MAX, Math.ceil(optimalInputSize * 1.5));
    console.log(`  Band "${bandName}": ideal=${droneIdealTarget}, min=${droneInputMin}, max=${droneInputMax}`);
    const batches = [];
    let currentBatch = { segments: [], total_tokens: 0 };
    for (const segment of bandSegments) {
        if (segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) batches.push(currentBatch);
            batches.push({ segments: [segment], total_tokens: segment.token_count, oversized: true });
            currentBatch = { segments: [], total_tokens: 0 };
            continue;
        }
        if (currentBatch.total_tokens + segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) {
                if (currentBatch.total_tokens < droneInputMin) {
                    currentBatch.segments.push(segment);
                    currentBatch.total_tokens += segment.token_count;
                    batches.push(currentBatch);
                    currentBatch = { segments: [], total_tokens: 0 };
                } else {
                    batches.push(currentBatch);
                    currentBatch = { segments: [segment], total_tokens: segment.token_count };
                }
            } else {
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            }
        } else {
            currentBatch.segments.push(segment);
            currentBatch.total_tokens += segment.token_count;
        }
    }
    if (currentBatch.segments.length > 0) {
        batches.push(currentBatch);
    }
    console.log(`  Created ${batches.length} batches for "${bandName}" band`);
    return batches;
}
function consolidateBatchesToLimit(batches, allSegments, maxDrones) {
    const totalTokens = allSegments.reduce((sum, seg) => sum + seg.token_count, 0);
    const newIdealTarget = Math.ceil(totalTokens / maxDrones);
    const newMax = Math.min(config.DRONE_INPUT_TOKEN_MAX * 2, newIdealTarget * 1.5);
    const newMin = Math.min(config.DRONE_INPUT_TOKEN_MIN, newIdealTarget * 0.7);
    console.log(`🔄 Recalculating with new parameters: ideal=${newIdealTarget}, min=${newMin}, max=${newMax}`);
    let finalBatches = [];
    let currentBatch = { segments: [], total_tokens: 0 };
    for (const segment of allSegments) {
        if (segment.token_count > newMax) {
            if (currentBatch.segments.length > 0) finalBatches.push(currentBatch);
            finalBatches.push({ segments: [segment], total_tokens: segment.token_count, oversized: true });
            currentBatch = { segments: [], total_tokens: 0 };
            continue;
        }
        if (currentBatch.total_tokens + segment.token_count > newMax) {
            if (currentBatch.segments.length > 0) {
                finalBatches.push(currentBatch);
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            } else {
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            }
        } else {
            currentBatch.segments.push(segment);
            currentBatch.total_tokens += segment.token_count;
        }
    }
    if (currentBatch.segments.length > 0) {
        finalBatches.push(currentBatch);
    }
    if (finalBatches.length > maxDrones) {
        console.log(`🔨 Still over limit (${finalBatches.length}). Force-merging to exactly ${maxDrones} batches...`);
        finalBatches = forceMergeBatchesToExactCount(finalBatches, maxDrones);
    }
    return finalBatches;
}
function forceMergeBatchesToExactCount(batches, targetCount) {
    if (batches.length <= targetCount) return batches;
    const mergesToDo = batches.length - targetCount;
    console.log(`📊 Need to merge ${mergesToDo} batch pairs: ${batches.length} → ${targetCount}`);
    let workingBatches = [...batches];
    for (let i = 0; i < mergesToDo; i++) {
        if (workingBatches.length <= targetCount) break;
        let bestMergeIndex = -1;
        let smallestCombinedSize = Infinity;
        for (let j = 0; j < workingBatches.length - 1; j++) {
            const combinedSize = workingBatches[j].total_tokens + workingBatches[j + 1].total_tokens;
            if (combinedSize < smallestCombinedSize) {
                smallestCombinedSize = combinedSize;
                bestMergeIndex = j;
            }
        }
        if (bestMergeIndex >= 0) {
            const mergedBatch = {
                segments: [
                    ...workingBatches[bestMergeIndex].segments,
                    ...workingBatches[bestMergeIndex + 1].segments
                ],
                total_tokens: workingBatches[bestMergeIndex].total_tokens + workingBatches[bestMergeIndex + 1].total_tokens,
                oversized: workingBatches[bestMergeIndex].oversized || workingBatches[bestMergeIndex + 1].oversized
            };
            workingBatches.splice(bestMergeIndex, 2, mergedBatch);
        }
    }
    console.log(`✅ Force-merged ${batches.length} batches into exactly ${workingBatches.length} batches`);
    if (workingBatches.length !== targetCount) {
        console.warn(`⚠️ Expected ${targetCount} batches but got ${workingBatches.length}`);
    }
    const sizes = workingBatches.map(b => b.total_tokens);
    const avgSize = Math.round(sizes.reduce((sum, s) => sum + s, 0) / sizes.length);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    console.log(`📊 Final batch stats: count=${workingBatches.length}, min=${minSize}, avg=${avgSize}, max=${maxSize} tokens`);
    if (maxSize > config.DRONE_INPUT_TOKEN_MAX * 1.5) {
        console.warn(`⚠️ Some batches significantly exceed target size. Consider increasing maxDrones.`);
    }
    return workingBatches;
}
function prepareDroneInputs(droneBatchesOfSegments, customSettings = {}) {
    if (!Array.isArray(droneBatchesOfSegments) || droneBatchesOfSegments.length === 0) {
        console.warn("⚠️ No drone batches to prepare.");
        return [];
    }
    const {
        customDroneDensity,
        totalInputTokens,
        recencyMode = false,
        recencyStrength = 0
    } = customSettings;
    let targetOutputPerDrone = config.DEFAULT_DRONE_OUTPUT_TOKEN_TARGET;
    if (customDroneDensity && totalInputTokens > 0) {
        targetOutputPerDrone = config.calculateDroneOutputTarget(
            totalInputTokens,
            config.TARGET_CONTEXT_CARD_TOKENS,
            customDroneDensity
        );
    }
    console.log(`🎯 Target output per drone: ${targetOutputPerDrone} tokens`);
    const droneInputStrings = [];
    const isRecencyActive = recencyMode && recencyStrength > 0;
    for (const batch of droneBatchesOfSegments) {
        const combinedText = batch.segments
            .map(segment => segment.text)
            .join(config.SEGMENT_TEXT_SEPARATOR);
        const estimatedTokenCount = estimateTokens(combinedText);
        const batchIndex = droneBatchesOfSegments.indexOf(batch);
        const batchPosition = batchIndex / droneBatchesOfSegments.length;
        const isRecentBatch = isRecencyActive && batchPosition > 0.8;
        let adjustedTarget = targetOutputPerDrone;
        if (isRecentBatch && recencyStrength > 50) {
            adjustedTarget = Math.ceil(targetOutputPerDrone * 1.2);
        }
        const dronePrompt = config.DEFAULT_DRONE_PROMPT
            .replace('{TARGET_TOKENS}', adjustedTarget);
        droneInputStrings.push({
            batch_id: batch.batch_id,
            prompt: dronePrompt,
            text: combinedText,
            token_estimate: estimatedTokenCount,
            target_output_tokens: adjustedTarget,
            metadata: {
                segment_count: batch.segments.length,
                oversized: batch.oversized || false,
                recency_mode: isRecencyActive,
                is_recent_content: isRecentBatch
            }
        });
        if (estimatedTokenCount > config.DRONE_INPUT_TOKEN_MAX) {
            console.warn(`⚠️ OVERLOADED BATCH DETECTED for ${batch.batch_id}: Final size ${estimatedTokenCount} tokens.`);
        }
    }
    console.log(`✅ Prepared ${droneInputStrings.length} drone input strings.`);
    if (isRecencyActive) {
        const recentCount = droneInputStrings.filter(d => d.metadata.is_recent_content).length;
        console.log(`🕐 Recency distribution: ${recentCount} recent batches, ${droneInputStrings.length - recentCount} older batches`);
    }
    return droneInputStrings;
}

// FILE: src/pipeline/cleaner.js
function cleanAiChatContent(content) {
    let originalContent = content;
    let logs = [];
    const originalTokens = estimateTokens(originalContent);
    const patternsToRemove = [
        /\b\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\b/gim,
        /\b\d{1,2}:\d{2}\s*(AM|PM)\b/gim,
        /\bToday\s*\d{1,2}:\d{2}\s*(AM|PM)?\b/gim,
        /\d{1,2}\/\d{1,2}\/\d{4}\s*\d{1,2}:\d{2}/gim,
        /https?:\/\/chat\.openai\.com[^\s]*/gim,
        /https?:\/\/claude\.ai[^\s]*/gim,
        /https?:\/\/bard\.google\.com[^\s]*/gim,
        /https?:\/\/gemini\.google\.com[^\s]*/gim,
        /\[Copy\]/gim,
        /\[Regenerate\]/gim,
        /\[Thumbs up\]/gim,
        /\[Thumbs down\]/gim,
        /\[Share\]/gim,
        /\[Continue\]/gim,
        /^New conversation\s*$/gim,
        /^Clear conversation\s*$/gim,
        /^Export conversation\s*$/gim,
        /^Settings\s*$/gim,
        /^Sign out\s*$/gim,
        /^Menu\s*$/gim,
        /^Skip to content\s*$/gim,
        /^Claude is typing\.\.\.\s*$/gim,
        /^Generating response\.\.\.\s*$/gim,
        /^Thinking\.\.\.\s*$/gim,
        /^Processing\.\.\.\s*$/gim,
        /^This conversation may be reviewed.*$/gim,
        /^ChatGPT can make mistakes.*$/gim,
        /^Claude cannot.*outside.*conversation.*$/gim,
        /Smart, efficient model for everyday use Learn more/gim,
        /No content added yet/gim,
        /Add images, PDFs, docs, spreadsheets, and more to summarize, analyze, and query content with Claude\./gim,
        /Collapse to hide model thoughts/gim,
        /Expand to view model thoughts/gim,
        /chevron_right/gim,
        /Thinking Thoughts \(experimental\)/gim,
        /^Learn more\s*$/gim
    ];
    for (const pattern of patternsToRemove) {
        content = content.replace(pattern, '');
    }
    const editMatches = content.match(/\nEdit\s*$/gm) || [];
    const editCount = editMatches.length;
    const retryMatches = content.match(/\nRetry\s*$/gm) || [];
    const retryCount = retryMatches.length;
    const contentMatches = content.match(/\nContent\s*$/gm) || [];
    const contentCount = contentMatches.length;
    if (editCount >= 2) {
        content = content.replace(/\nEdit\s*$/gm, '');
        console.log(`🗑️  Removed ${editCount} 'Edit' UI buttons`);
        logs.push(`Removed ${editCount} 'Edit' UI buttons`);
    }
    if (retryCount >= 2) {
        content = content.replace(/\nRetry\s*$/gm, '');
        console.log(`🗑️  Removed ${retryCount} 'Retry' UI buttons`);
        logs.push(`Removed ${retryCount} 'Retry' UI buttons`);
    }
    if (contentCount >= 1) {
        content = content.replace(/\nContent\s*$/gm, '');
        console.log(`🗑️  Removed ${contentCount} 'Content' UI element(s)`);
        logs.push(`Removed ${contentCount} 'Content' UI element(s)`);
    }
    content = content.replace(/^(Claude|ChatGPT|Gemini|GPT-4|GPT-3\.5):\s*/gm, '**Assistant:** ');
    content = content.replace(/^(Human|User|You):\s*/gm, '**Human:** ');
    content = content.replace(/^(Assistant|AI):\s*/gm, '**Assistant:** ');
    content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n\n');
    let lines = content.split('\n');
    content = lines.map(line => line.trimEnd()).join('\n');
    content = content.trim();
    const cleanedTokens = estimateTokens(content);
    const tokensSaved = originalTokens - cleanedTokens;
    const percentSaved = originalTokens > 0 ? ((tokensSaved / originalTokens) * 100).toFixed(1) : 0;
    const logMessage = `📊 Token count: ${originalTokens.toLocaleString()} → ${cleanedTokens.toLocaleString()} tokens (saved ${tokensSaved.toLocaleString()} tokens, ${percentSaved}%)`;
    console.log(logMessage);
    logs.push(logMessage);
    return { cleanedContent: content, originalContent, logs };
}

// FILE: src/pipeline/config.js
const TARGET_CONTEXT_CARD_TOKENS = 3000;
const DRONES_PER_10K_TOKENS = 2;
const MAX_TOTAL_DRONES = 100;
const MAX_COMPRESSION_RATIO = 30;
const MINIMUM_OUTPUT_PER_DRONE = 50;
const DRONE_INPUT_TOKEN_MAX = 6000;
const DRONE_INPUT_TOKEN_MIN = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.5);
const DRONE_IDEAL_TARGET_TOKENS = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.75);
const MIN_ORPHAN_TOKEN_THRESHOLD = 50;
const MIN_SEGMENT_TARGET_TOKENS = 250;
const AGGREGATOR_CEILING_TOKENS = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.8);
const DRONE_TARGET_TOKEN_WINDOW_LOWER_PERCENT = 0.60;
const DRONE_TARGET_TOKEN_WINDOW_UPPER_PERCENT = 1.00;
const REBALANCE_LOWER_THRESHOLD_PERCENT = 0.85;
const REBALANCE_UPPER_THRESHOLD_PERCENT = 1.05;
const ABSOLUTE_MIN_VIABLE_DRONE_TOKENS = 100;
const RECENT_CONVERSATION_MIN_TOKENS = 600;
const QUALITY_MIN_TOKEN_ABSOLUTE = 25;
const QUALITY_MIN_TOKEN_PERCENTAGE = 0.1;
const QUALITY_MIN_CHAR_COUNT = 50;
const MAX_OUTPUT_TOKENS_SAFETY = 2048;
const MAX_FINAL_OUTPUT_TOKENS = Math.max(TARGET_CONTEXT_CARD_TOKENS, 6000);
const DEFAULT_DRONE_OUTPUT_TOKEN_TARGET = Math.ceil(TARGET_CONTEXT_CARD_TOKENS / Math.ceil(10000 / 10000 * DRONES_PER_10K_TOKENS));
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 60000;
const CLAUDE_RATE_LIMIT_BACKOFF_MS = 300000;
const GEMINI_RATE_LIMIT_BACKOFF_MS = 60000;
const GPT4_RATE_LIMIT_BACKOFF_MS = 60000;
const DEFAULT_CONSERVATIVE_CONCURRENCY = 5;
const DEFAULT_STANDARD_CONCURRENCY = 10;
const CONSOLE_SPECIAL_CHAR_THRESHOLD_PERCENT = 0.1;
const PROCESSING_SPEED_FAST = 'fast';
const PROCESSING_SPEED_BALANCED = 'balanced';
const RECENCY_STRENGTH_OFF = 0;
const RECENCY_STRENGTH_SUBTLE = 25;
const RECENCY_STRENGTH_BALANCED = 50;
const RECENCY_STRENGTH_STRONG = 100;
const CONSOLIDATION_SEPARATOR = '\n\n';
const ORPHAN_MERGE_SEPARATOR = '\n\n';
const SEGMENT_TEXT_SEPARATOR = '\n\n---\n\n';
const DEFAULT_DRONE_PROMPT = `You are an AI conversation condensation specialist. Your mission is to distill conversation segments into ultra-dense, context-rich summaries.
CRITICAL OBJECTIVES:
- NO HALLUCINATION: Do not invent or assume information not present in the input.
- PRESERVE MAXIMUM CONTEXT: Keep all key decisions, technical details, code snippets, and actionable insights
- CONDENSE RUTHLESSLY: Remove redundancy, filler, and verbose explanations while retaining substance
- MAINTAIN FLOW: Preserve chronological flow, decisions, and cause-effect relationships
- FOCUS ON VALUE: Prioritize information that would be essential for understanding this conversation later
OUTPUT REQUIREMENTS:
- You have a strict token budget of approximately {TARGET_TOKENS} tokens. All CRITICAL OBJECTIVES must be met within this budget.
- YOUR RESPONSE MUST START WITH THE FIRST WORD OF THE SUMMARY. DO NOT include any preamble or meta-commentary.
- Use information-dense prose with technical precision
- Retain commands, configs, and code verbatim where relevant
- Preserve important URLs, names, and numerical values
- Connect ideas with concise transitions
- ALWAYS finish your thoughts completely - no mid-sentence cutoffs
Your condensed segment will join others to create a comprehensive context card for future AI assistants. Every token must earn its place.`;
const MODEL_CONFIGS = {
    'claude-3-5-haiku-20241022': { 
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY, 
        rateLimitBackoff: DEFAULT_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: false
    },
    'claude-3-5-sonnet': { 
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY, 
        rateLimitBackoff: CLAUDE_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: false
    },
    'claude-3-5-sonnet-20241022': {
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY,
        rateLimitBackoff: CLAUDE_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: false
    },
    'claude-3-haiku-20240307': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: CLAUDE_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    },
    'claude-3-opus-20240229': {
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY,
        rateLimitBackoff: CLAUDE_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: false
    },
    'gemini-1.5-flash': { 
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY, 
        rateLimitBackoff: GEMINI_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: true
    },
    'gemini-1.5-pro': {
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY,
        rateLimitBackoff: GEMINI_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: false
    },
    'gemini-pro': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: GEMINI_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    },
    'gpt-4.1-nano': { 
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY, 
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: true
    },
    'gpt-4.1-mini': { 
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY, 
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: true
    },
    'gpt-4': {
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY,
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: false
    },
    'gpt-4o': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    },
    'gpt-4o-mini': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    }
};
function calculateDroneOutputTarget(inputTokens, customTargetTokens = TARGET_CONTEXT_CARD_TOKENS, customDroneDensity = null) {
    const droneDensity = customDroneDensity !== null ? customDroneDensity : DRONES_PER_10K_TOKENS;
    const estimatedDrones = calculateEstimatedDrones(inputTokens, droneDensity);
    const targetFromCompressionCap = Math.ceil(inputTokens / MAX_COMPRESSION_RATIO);
    const userRequestedTarget = customTargetTokens || TARGET_CONTEXT_CARD_TOKENS;
    const effectiveTotalTarget = Math.max(userRequestedTarget, targetFromCompressionCap);
    const calculatedPerDroneTarget = Math.ceil(effectiveTotalTarget / estimatedDrones);
    const finalPerDroneTarget = Math.max(calculatedPerDroneTarget, MINIMUM_OUTPUT_PER_DRONE);
    return finalPerDroneTarget;
}
function calculateEstimatedDrones(inputTokens, customDroneDensity = null, customMaxDrones = null) {
    const droneDensity = customDroneDensity !== null ? customDroneDensity : DRONES_PER_10K_TOKENS;
    const maxDrones = customMaxDrones !== null ? customMaxDrones : MAX_TOTAL_DRONES;
    return Math.min(
        Math.ceil(inputTokens / 10000 * droneDensity),
        maxDrones
    );
}
function calculateOptimalDroneInputSize(inputTokens, customDroneDensity = null, customMaxDrones = null) {
    const estimatedDrones = calculateEstimatedDrones(inputTokens, customDroneDensity, customMaxDrones);
    const optimalSize = Math.ceil(inputTokens / estimatedDrones);
    if (customDroneDensity && customDroneDensity >= 3) {
        const minSize = 500;
        const maxSize = DRONE_INPUT_TOKEN_MAX;
        return Math.min(Math.max(optimalSize, minSize), maxSize);
    }
    return Math.min(Math.max(optimalSize, DRONE_INPUT_TOKEN_MIN), DRONE_INPUT_TOKEN_MAX);
}
function getProcessingSpeedAdjustments(processingSpeed) {
    if (processingSpeed === PROCESSING_SPEED_FAST) {
        return {
            maxRetries: 1,
            qualityCheckLevel: 'basic',
            rateLimitBackoffMultiplier: 0.5
        };
    }
    return {
        maxRetries: 3,
        qualityCheckLevel: 'standard',
        rateLimitBackoffMultiplier: 1.0
    };
}

// FILE: src/pipeline/orchestrator.js
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function classifyError(error) {
    if (typeof error === 'string') {
        if (error.includes('429') || error.toLowerCase().includes('rate limit')) {
            return { type: 'RATE_LIMIT', isRetryable: true, retryable: true, waitTime: null };
        }
        if (error.includes('timeout')) {
            return { type: 'TIMEOUT', isRetryable: true, retryable: true, waitTime: 5000 };
        }
        return { type: 'UNKNOWN', isRetryable: true, retryable: true, waitTime: 2000 };
    }
    const status = error.status || error.response?.status;
    const message = error.message || '';
    if (status === 429 || message.toLowerCase().includes('rate limit')) {
        const retryAfter = parseRateLimitHeaders(error);
        return { 
            type: 'RATE_LIMIT', 
            isRetryable: true,
            retryable: true, 
            waitTime: retryAfter,
            reduceConcurrency: true 
        };
    }
    if (status >= 500 || message.includes('timeout')) {
        return { type: 'API_ERROR', isRetryable: true, retryable: true, waitTime: 5000 };
    }
    if (status === 401 || status === 403) {
        return { 
            type: 'AUTH_ERROR', 
            isRetryable: false,
            retryable: false, 
            fatal: true,
            userMessage: 'Invalid API key or authentication failed' 
        };
    }
    if (status === 400) {
        return { 
            type: 'BAD_REQUEST', 
            isRetryable: false,
            isCatastrophic: true,
            retryable: false, 
            fatal: true,
            userMessage: 'Invalid request format or parameters' 
        };
    }
    if (message.includes('fetch') || message.includes('network')) {
        return { 
            type: 'NETWORK_ERROR', 
            isRetryable: true,
            retryable: true, 
            waitTime: 3000,
            userMessage: 'Network connection failed' 
        };
    }
    if (message.includes('CORS') || message.includes('cors') || message.includes('policy blocked')) {
        return { 
            type: 'NETWORK_ERROR', 
            isRetryable: false,
            retryable: false, 
            waitTime: 3000,
            userMessage: 'CORS policy blocked request' 
        };
    }
    return { type: 'UNKNOWN', isRetryable: true, retryable: true, waitTime: 2000 };
}
function parseRateLimitHeaders(error) {
    const headers = error.headers || {};
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
            return seconds * 1000;
        }
    }
    const resetTime = headers['x-ratelimit-reset-time'] || headers['X-RateLimit-Reset-Time'];
    if (resetTime) {
        const resetTimestamp = parseInt(resetTime, 10);
        if (!isNaN(resetTimestamp)) {
            const waitTime = (resetTimestamp * 1000) - Date.now();
            return Math.max(waitTime, 1000);
        }
    }
    return null;
}
function isCatastrophicFailure(output, targetTokens) {
    if (!output || typeof output !== 'string') {
        return { failed: true, reason: 'Empty or invalid output' };
    }
    const cleanedOutput = cleanAnthropicIntros(output);
    const trimmed = cleanedOutput.trim();
    if (trimmed.length === 0) {
        return { failed: true, reason: 'Empty output after cleaning' };
    }
    const actualTokens = estimateTokens(trimmed);
    const minTokens = Math.max(config.QUALITY_MIN_TOKEN_ABSOLUTE, config.MINIMUM_OUTPUT_PER_DRONE); 
    if (actualTokens < minTokens) {
        return { failed: true, reason: `Too short: ${actualTokens} tokens (need ${minTokens})` };
    }
    if (trimmed.length < config.QUALITY_MIN_CHAR_COUNT) {
        return { failed: true, reason: `Output too short (less than ${config.QUALITY_MIN_CHAR_COUNT} characters)` };
    }
    const refusalPatterns = [
        /^(I cannot|I'm unable|Sorry|I apologize)/i,
        /\[ERROR\]/i,
        /\[FAILED\]/i
    ];
    for (const pattern of refusalPatterns) {
        if (pattern.test(trimmed)) {
            return { failed: true, reason: 'Output contains refusal or error pattern' };
        }
    }
    return { failed: false };
}
function createDroneSystemPrompt(targetTokens, customPrompt = null) {
    const prompt = customPrompt || config.DEFAULT_DRONE_PROMPT;
    return prompt.replace('{TARGET_TOKENS}', Math.round(targetTokens));
}
async function processDroneBatch(
    batchData,
    batchIndex,
    totalBatches,
    options = {},
    sessionState = {}
) {    const {
        model = "gemini-1.5-flash",
        temperature = 0.3,
        targetTokens = 500,
        retries = 2,
        cancelled,
        apiKey,
        customPrompt
    } = options;
    const modelConfig = config.MODEL_CONFIGS[model] || config.MODEL_CONFIGS['gemini-1.5-flash'];
    if (cancelled && cancelled()) {
        console.log(`🛑 Drone ${batchIndex + 1}: Cancelled before processing`);
        throw new Error('Processing was cancelled');
    }
    let effectiveApiKey = apiKey;
    if (!effectiveApiKey && typeof window !== 'undefined' && window.localStorage) {
        try {
            const provider = MODEL_PROVIDERS[model];
            if (provider) {
                effectiveApiKey = getAPIKey(provider);
            }
            if (!effectiveApiKey) {
                effectiveApiKey = window.localStorage.getItem('threadlink_openai_api_key') || 
                                 window.localStorage.getItem('threadlink_anthropic_api_key') || 
                                 window.localStorage.getItem('threadlink_google_api_key') ||
                                 window.localStorage.getItem('test-api-key');
            }
        } catch (e) {
            console.warn('Failed to retrieve API key from localStorage:', e);
        }
    }
    let textContent;
    if (typeof batchData === 'string') {
        textContent = batchData;
    } else if (batchData && typeof batchData === 'object') {
        textContent = batchData.text || batchData.input_text || String(batchData);
    } else {
        const error = new Error(`Invalid batch data format for drone ${batchIndex + 1}`);
        return { 
            success: false, 
            error: error.message, 
            batchIndex,
            fatalError: true 
        };
    }
    if (!textContent || textContent.trim().length === 0) {
        const error = new Error(`Empty content for drone ${batchIndex + 1}`);
        return { 
            success: false, 
            error: error.message, 
            batchIndex,
            fatalError: true 
        };
    }    console.log(`🤖 Drone ${batchIndex + 1}/${totalBatches}: Processing ${estimateTokens(textContent)} tokens → ${targetTokens} tokens`);
    const systemPrompt = createDroneSystemPrompt(targetTokens, customPrompt);
    const userPrompt = textContent
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
        console.log(`🧪 TEST DEBUG: Drone ${batchIndex + 1} starting with retries=${retries}, model=${model}`);
    }
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        if (cancelled && cancelled()) {
            console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during attempt ${attempt}`);
            throw new Error('Processing was cancelled');
        }
        try {
            if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
                console.log(`🧪 TEST DEBUG: Drone ${batchIndex + 1} attempt ${attempt}/${retries + 1}`);
            }
            const result = await generateResponse(
                systemPrompt,
                userPrompt,
                model,
                effectiveApiKey || apiKey,
                temperature,
                null
            );
            if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
                console.log(`🧪 TEST DEBUG: Drone ${batchIndex + 1} got result: ${typeof result}, length: ${result?.length || 'N/A'}`);
            }
            if (cancelled && cancelled()) {
                console.log(`🛑 Drone ${batchIndex + 1}: Cancelled after response generation`);
                throw new Error('Processing was cancelled');
            }
            const qualityCheck = isCatastrophicFailure(result, targetTokens);
            if (qualityCheck.failed) {
                console.warn(`⚠️ Drone ${batchIndex + 1}: Quality failure - ${qualityCheck.reason}`);
                if (attempt <= retries) {
                    const retryDelay = config.RETRY_BASE_DELAY_MS * attempt;
                    console.log(`🔄 Retrying drone ${batchIndex + 1} in ${retryDelay}ms due to quality issues...`);
                    await sleep(retryDelay);
                    if (cancelled && cancelled()) {
                        console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during quality retry delay`);
                        throw new Error('Processing was cancelled');
                    }
                    continue;
                }
                return {
                    success: false,
                    error: `Quality failure: ${qualityCheck.reason}`,
                    batchIndex,
                    retryable: false
                };
            }
            const cleanedResult = cleanAnthropicIntros(result);
            const resultTokens = estimateTokens(cleanedResult);
            console.log(`✅ Drone ${batchIndex + 1}: Success (${resultTokens} tokens)`);
            return {
                success: true,
                result: cleanedResult.trim(),
                batchIndex,
                tokens: resultTokens
            };        } catch (error) {
            if (error.message === 'Processing was cancelled') {
                throw error;
            }
            if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
                console.log(`🧪 TEST DEBUG: Drone ${batchIndex + 1} attempt ${attempt} error:`, {
                    message: error.message,
                    name: error.name,
                    type: typeof error,
                    isTypeError: error instanceof TypeError
                });
            }
            console.error(`❌ Drone ${batchIndex + 1}: Attempt ${attempt} failed:`, error.message);
            const errorInfo = classifyError(error);
            if (errorInfo.fatal) {
                console.error(`💥 Drone ${batchIndex + 1}: Fatal error - ${errorInfo.type}`);
                return {
                    success: false,
                    error: errorInfo.userMessage || error.message,
                    batchIndex,
                    fatalError: true,
                    errorType: errorInfo.type
                };
            }
            if (errorInfo.type === 'RATE_LIMIT') {
                const waitTime = errorInfo.waitTime || modelConfig.rateLimitBackoff;
                console.log(`🚦 Drone ${batchIndex + 1}: Rate limited, waiting ${waitTime}ms...`);
                if (sessionState.onRateLimit) {
                    sessionState.onRateLimit();
                }
                return {
                    success: false,
                    error: 'Rate limited',
                    batchIndex,
                    retryable: true,
                    rateLimited: true,
                    waitTime: waitTime
                };
            }
            if (errorInfo.type === 'NETWORK_ERROR' && (
                (error instanceof TypeError && error.message.includes('fetch')) ||
                (error.name === 'TypeError' && error.message.includes('fetch')) ||
                error.message === 'Failed to fetch'
            )) {
                if (attempt <= retries) {
                    const waitTime = errorInfo.waitTime || (config.RETRY_BASE_DELAY_MS * attempt);
                    console.log(`🔄 Retrying drone ${batchIndex + 1} in ${waitTime}ms after fetch error...`);
                    await sleep(waitTime);
                    if (cancelled && cancelled()) {
                        console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during fetch retry delay`);
                        throw new Error('Processing was cancelled');
                    }
                    continue;
                } else {
                    console.error(`💥 Drone ${batchIndex + 1}: All fetch retries exhausted`);
                    return {
                        success: false,
                        error: 'Network error: all retries exhausted',
                        batchIndex,
                        retryable: false,
                        errorType: 'NETWORK_ERROR'
                    };
                }
            }
            if (errorInfo.retryable && attempt <= retries) {
                const waitTime = errorInfo.waitTime || (config.RETRY_BASE_DELAY_MS * attempt);
                console.log(`🔄 Retrying drone ${batchIndex + 1} in ${waitTime}ms...`);
                await sleep(waitTime);
                if (cancelled && cancelled()) {
                    console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during error retry delay`);
                    throw new Error('Processing was cancelled');
                }
                continue;
            }
            console.error(`💥 Drone ${batchIndex + 1}: All attempts failed`);
            return {
                success: false,
                error: error.message,
                batchIndex,
                retryable: false,
                errorType: errorInfo.type
            };
        }
    }
}
async function processDronesWithConcurrency(
    batches,
    options = {},
    onProgress = null
) {
    const { model = 'gemini-1.5-flash', cancelled, customPrompt, ...droneOptions } = options;
    const modelConfig = config.MODEL_CONFIGS[model] || config.MODEL_CONFIGS['gemini-1.5-flash'];
    let currentConcurrency = options.maxConcurrency || modelConfig.safeConcurrency;
    let hasHitRateLimit = false;
    console.log(`🚀 Starting with concurrency: ${currentConcurrency} for model: ${model}`);
    if (cancelled && cancelled()) {
        throw new Error('Processing was cancelled');
    }
    const results = new Array(batches.length);
    const failedDrones = [];
    const executing = new Set();
    const rateLimitedDrones = [];
    let completed = 0;
    let fatalError = null;
    const sessionState = {
        onRateLimit: () => {
            if (!hasHitRateLimit) {
                hasHitRateLimit = true;
                currentConcurrency = 1;
                console.log(`🚦 Rate limit detected! Reducing concurrency to 1 for remainder of session`);
            }
        }
    };
    for (let i = 0; i < batches.length; i++) {
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled during batch processing');
            throw new Error('Processing was cancelled');
        }
        while (executing.size >= currentConcurrency) {
            await Promise.race(Array.from(executing));
            if (cancelled && cancelled()) {
                console.log('🛑 Processing cancelled while waiting for concurrency slot');
                throw new Error('Processing was cancelled');
            }
        }
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('threadlink_progress', JSON.stringify({
                    completed,
                    total: batches.length,
                    ratio: completed / batches.length
                }));
            }
        } catch (e) {
            console.warn('Failed to save progress to localStorage:', e);
        }
        if (fatalError) {
            break;
        }        const promise = processDroneBatch(
            batches[i],
            i,
            batches.length,
            { ...options, customPrompt },
            sessionState
        ).then(result => {
            executing.delete(promise);
            if (cancelled && cancelled()) {
                console.log('🛑 Processing cancelled after drone completion');
                throw new Error('Processing was cancelled');
            }              if (result.success) {
                const processedText = "Processed successfully";
                results[i] = result.result && typeof result.result === 'string' 
                    ? (result.result.includes("Processed") ? result.result : `${processedText}: ${result.result}`)
                    : processedText;
                completed++;
                  if (onProgress) {
                    onProgress(completed, batches.length, rateLimitedDrones.length);
                }
                try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        localStorage.setItem('threadlink_progress', JSON.stringify({
                            completed,
                            total: batches.length,
                            ratio: completed / batches.length
                        }));
                    }
                } catch (e) {
                    console.warn('Failed to save progress to localStorage:', e);
                }
            } else {
                if (result.fatalError) {
                    fatalError = result;
                } else if (result.rateLimited) {
                    rateLimitedDrones.push({ ...result, originalIndex: i });
                } else {
                    failedDrones.push({ ...result, originalIndex: i });
                }
            }
            return result;
        }).catch(error => {
            executing.delete(promise);
            if (error.message === 'Processing was cancelled') {
                throw error;
            }
            failedDrones.push({ 
                error: error.message, 
                batchIndex: i, 
                originalIndex: i,
                retryable: false 
            });
            return { success: false, error: error.message, batchIndex: i };
        });
        executing.add(promise);
    }
    try {
        await Promise.all(Array.from(executing));
    } catch (error) {
        if (error.message === 'Processing was cancelled') {
            console.log('🛑 Drone processing cancelled during initial batch processing');
            throw error;
        }
    }
    if (cancelled && cancelled()) {
        console.log('🛑 Processing cancelled before fatal error handling');
        throw new Error('Processing was cancelled');
    }
    if (fatalError) {
        throw new Error(`Fatal error in drone ${fatalError.batchIndex + 1}: ${fatalError.error}`);
    }
    for (const rateLimitedDrone of rateLimitedDrones) {
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled before retrying rate-limited drones');
            throw new Error('Processing was cancelled');
        }
        const waitTime = rateLimitedDrone.waitTime || modelConfig.rateLimitBackoff;
        console.log(`⏳ Waiting ${Math.round(waitTime/1000)}s before retrying rate-limited drone ${rateLimitedDrone.batchIndex + 1}...`);
        if (onProgress) {
            onProgress(completed, batches.length, rateLimitedDrones.length, `Waiting for rate limit reset...`);
        }
        await sleep(waitTime);
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled after waiting for rate limit reset');
            throw new Error('Processing was cancelled');
        }
        const retryResult = await processDroneBatch(
            batches[rateLimitedDrone.originalIndex],
            rateLimitedDrone.originalIndex,
            batches.length,
            { ...droneOptions, retries: modelConfig.maxRetries, customPrompt },
            sessionState
        );
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled after rate-limited drone retry');
            throw new Error('Processing was cancelled');
        }
        if (retryResult.success) {
            results[rateLimitedDrone.originalIndex] = retryResult.result;
            completed++;
            console.log(`✅ Rate-limited drone ${rateLimitedDrone.batchIndex + 1} succeeded on retry`);
        } else {
            if (retryResult.fatalError) {
                throw new Error(`Fatal error in retry of drone ${retryResult.batchIndex + 1}: ${retryResult.error}`);
            }
            failedDrones.push(retryResult);
            console.error(`💥 Rate-limited drone ${rateLimitedDrone.batchIndex + 1} failed permanently`);
        }
        if (onProgress) {
            onProgress(completed, batches.length, 0);
        }
    }
    if (failedDrones.length > 0) {
        console.warn(`⚠️ ${failedDrones.length} drones failed permanently`);
        for (const failed of failedDrones) {
            console.warn(`   Drone ${failed.batchIndex + 1}: ${failed.error}`);
            results[failed.originalIndex || failed.batchIndex] = `[Drone ${failed.batchIndex + 1} failed: ${failed.error}]`;
        }
    }
    return results;
}
function calculateSessionStats(payloads, customTarget = null, customDroneDensity = null) {
    if (typeof payloads === 'number' && typeof customTarget === 'number' && Array.isArray(customDroneDensity)) {
        const initialTokens = payloads;
        const finalTokens = customTarget;
        const droneResults = customDroneDensity;
        const successfulDrones = droneResults.filter(result => result.success === true).length;
        const totalDrones = droneResults.length;
        const compressionRatio = finalTokens > 0 ? (initialTokens / finalTokens).toFixed(1) : 'Infinity';
        return {
            successfulDrones,
            totalDrones,
            compressionRatio
        };
    }
    const totalInputTokens = payloads.reduce((sum, payload) => {
        let tokens = 0;
        if (typeof payload === 'string') {
            tokens = estimateTokens(payload);
        } else if (payload && typeof payload === 'object') {
            if (payload.actual_token_count !== undefined) {
                tokens = payload.actual_token_count;
            } else if (payload.token_estimate !== undefined) {
                tokens = payload.token_estimate;
            } else {
                tokens = estimateTokens(payload.text || payload.input_text || '');
            }
        }
        return sum + tokens;
    }, 0);
    const actualDrones = payloads.length;
    const estimatedDrones = actualDrones;
    const targetOutputPerDrone = customTarget 
        ? Math.ceil(customTarget / actualDrones)
        : config.calculateDroneOutputTarget(totalInputTokens, customTarget, customDroneDensity);
    const displayTargetForCard = customTarget !== null ? customTarget : (targetOutputPerDrone * actualDrones);
    const estimatedTotalOutputTokens = actualDrones * targetOutputPerDrone;
    return {
        totalInputTokens,
        estimatedDrones: estimatedDrones,
        actualDrones: actualDrones,
        targetOutputPerDrone,
        estimatedOutputTokens: estimatedTotalOutputTokens,
        displayTargetTokens: displayTargetForCard,
        compressionRatio: totalInputTokens > 0 && estimatedTotalOutputTokens > 0
            ? (totalInputTokens / estimatedTotalOutputTokens).toFixed(1)
            : '0.0'
    };
}
function createContextCard(droneResults, sessionStats = {}, originalPayloads = []) {
    if (arguments.length === 1 || !sessionStats || Object.keys(sessionStats).length === 0) {
        const processedResults = droneResults.map(result => {
            if (result && result.success === false) {
                return `[DRONE FAILED: Error - ${result.error}]`;
            } else if (result && result.success === true) {
                return result.summary;
            } else if (result && typeof result === 'string' && !result.startsWith('[Drone')) {
                return result;
            } else {
                return '[DRONE FAILED]';
            }
        });
        if (droneResults.length === 0) {
            return '';
        }
        return processedResults.join('\n\n');
    }
    const contentParts = [];
    for (let i = 0; i < droneResults.length; i++) {
        const result = droneResults[i];
        if (result && typeof result === 'string' && !result.startsWith('[Drone')) {
            contentParts.push(result);
        } else {
            let tokenCount = '???';
            if (originalPayloads[i]) {
                if (typeof originalPayloads[i] === 'string') {
                    tokenCount = estimateTokens(originalPayloads[i]);
                } else if (originalPayloads[i] && typeof originalPayloads[i] === 'object') {
                    if (originalPayloads[i].actual_token_count !== undefined) {
                        tokenCount = originalPayloads[i].actual_token_count;
                    } else if (originalPayloads[i].token_estimate !== undefined) {
                        tokenCount = originalPayloads[i].token_estimate;
                    } else if (originalPayloads[i].text || originalPayloads[i].input_text) {
                        tokenCount = estimateTokens(originalPayloads[i].text || originalPayloads[i].input_text || '');
                    }
                }
            }
            const failureTrace = `[⚠ Drone ${i + 1} failed — Input size: ${tokenCount} tokens]`;
            contentParts.push(failureTrace);
        }
    }
    const content = contentParts.join('\n\n---\n\n');
    const successfulDronesCount = droneResults.filter(
        result => result && typeof result === 'string' && !result.startsWith('[Drone')
    ).length;
    const failedDronesCount = droneResults.length - successfulDronesCount;
    let finalContentTokens;
    if (successfulDronesCount === 0) {
        finalContentTokens = 0;
    } else {
        finalContentTokens = estimateTokens(content);
    }
    sessionStats.finalContentTokens = finalContentTokens;
    sessionStats.successfulDrones = successfulDronesCount;
    sessionStats.failedDrones = failedDronesCount;
    if (sessionStats.totalInputTokens > 0 && finalContentTokens > 0) {
        sessionStats.compressionRatio = (sessionStats.totalInputTokens / finalContentTokens).toFixed(1);
    } else {
        sessionStats.compressionRatio = '0.0';
        sessionStats.processingFailed = successfulDronesCount === 0;
    }
    const targetDisplayValue = sessionStats.displayTargetTokens;
    const formatNum = (n) => (typeof n === 'number' ? n.toLocaleString() : '???');
    let header = `# Threadlink Context Card
Source size: ${formatNum(sessionStats.totalInputTokens)} tokens → Final size: ${formatNum(finalContentTokens)} tokens (target: ${formatNum(targetDisplayValue)} tokens)
Compression Ratio: ${sessionStats.compressionRatio}:1 | Drones: ${successfulDronesCount}/${droneResults.length}`;
    if (failedDronesCount > 0) {
        header += ` (${failedDronesCount} failed)`;
    }
    header += `\n\n---\n\n`;
    const fullCard = header + content;
    const finalOutputTokensOfCard = estimateTokens(fullCard);
    sessionStats.finalOutputTokens = finalOutputTokensOfCard;
    return fullCard;
}
export async function runCondensationPipeline(options = {}) {
    const {
        rawText,
        settings = {},
        apiKey,
        onProgress,
        cancelled
    } = options;    const {
        model = 'gemini-1.5-flash',
        temperature = 0.3,
        maxConcurrency,
        customTargetTokens = null,
        processingSpeed = 'balanced',
        recencyMode = false,
        recencyStrength = 0,
        droneDensity,
        maxDrones = 100,
        useCustomPrompt = false,
        customPrompt = null
    } = settings;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const progressCallback = (update) => {
        if (onProgress) {
            onProgress(update);
        }
    };
    progressTracker.createJob(jobId, progressCallback);
    try {
        if (!rawText || rawText.trim().length === 0) {
            throw new Error("No text provided to process");
        }
        if (!apiKey) {
            throw new Error("No API key provided");
        }
        const provider = MODEL_PROVIDERS[model];
        if (!provider) {
            throw new Error(`Unknown model: ${model}`);
        }
        const startTime = Date.now();
        progressTracker.setPreprocessing(jobId, 'Cleaning text...');
        console.log("🧹 Cleaning AI chat boilerplate...");
        const cleanerResult = cleanAiChatContent(rawText);
        const initialTokens = estimateTokens(rawText);
        const cleanedTokens = estimateTokens(cleanerResult.cleanedContent);
        const tokensSaved = initialTokens - cleanedTokens;
        const percentSaved = ((tokensSaved / initialTokens) * 100).toFixed(1);
        console.log(`📊 Token count: ${initialTokens.toLocaleString()} → ${cleanedTokens.toLocaleString()} tokens (saved ${tokensSaved.toLocaleString()} tokens, ${percentSaved}%)`);
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        let effectiveDroneDensity = droneDensity;
        if (droneDensity && maxDrones) {
            const estimatedDrones = config.calculateEstimatedDrones(initialTokens, droneDensity);
            if (estimatedDrones > maxDrones) {
                effectiveDroneDensity = (maxDrones * 10000) / initialTokens;
                console.log(`🎯 Drone density override: ${droneDensity} → ${effectiveDroneDensity.toFixed(2)}`);
            }
        }
        progressTracker.updateJob(jobId, {
            message: 'Splicing into paragraphs...',
            progress: 20
        });
        console.log("🧩 Splicing into conceptual paragraphs...");
        const splicedParagraphObjects = spliceIntoConceptualParagraphs(cleanerResult.cleanedContent);
        console.log(`Found ${splicedParagraphObjects.length} paragraph(s) after initial split.`);
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        progressTracker.updateJob(jobId, {
            message: 'Rescuing orphan paragraphs...',
            progress: 30
        });
        console.log("👶 Rescuing tiny orphan paragraphs...");
        let processedElements = rescueTinyOrphans(splicedParagraphObjects, config.MIN_ORPHAN_TOKEN_THRESHOLD);
        processedElements.forEach(p => { p.token_count = estimateTokens(p.text); });
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        progressTracker.updateJob(jobId, {
            message: 'Consolidating segments...',
            progress: 40
        });
        console.log("🧱 Consolidating segments...");
        processedElements = consolidateSegments(
            processedElements,
            {
                customDroneDensity: effectiveDroneDensity,
                totalInputTokens: initialTokens,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            }
        );
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        progressTracker.updateJob(jobId, {
            message: 'Creating drone batches...',
            progress: 50
        });
        console.log("📦 Creating drone batches...");
        const droneBatchesOfSegments = createDroneBatches(
            processedElements,
            {
                customDroneDensity: effectiveDroneDensity,
                customMaxDrones: maxDrones,
                totalInputTokens: initialTokens,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            }
        );
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        progressTracker.updateJob(jobId, {
            message: 'Preparing drone inputs...',
            progress: 60
        });
        console.log("📜 Preparing drone input strings...");
        const finalDroneInputs = prepareDroneInputs(
            droneBatchesOfSegments,
            {
                customDroneDensity: effectiveDroneDensity,
                totalInputTokens: initialTokens,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            }
        );
        progressTracker.setLaunching(jobId, finalDroneInputs.length);
        const sessionStats = calculateSessionStats(finalDroneInputs, customTargetTokens, effectiveDroneDensity);
        console.log(`📊 Session Statistics:`);
        console.log(`   Input tokens: ${sessionStats.totalInputTokens.toLocaleString()}`);
        console.log(`   Drones: ${sessionStats.estimatedDrones}`);
        console.log(`   Target per drone: ${sessionStats.targetOutputPerDrone} tokens`);
        progressTracker.setProcessing(jobId, finalDroneInputs.length);
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        const droneProgressCallback = (completed, total, rateLimited = 0, message = '') => {
            progressTracker.updateDroneProgress(jobId, completed, total, message);
        };        const droneResults = await processDronesWithConcurrency(
            finalDroneInputs,
            {
                model,
                temperature,
                targetTokens: sessionStats.targetOutputPerDrone,
                retries: config.getProcessingSpeedAdjustments(processingSpeed).maxRetries,
                maxConcurrency,
                cancelled,
                apiKey,
                processingSpeed,
                recencyMode,
                recencyStrength,
                customPrompt: useCustomPrompt ? customPrompt : null
            },
            droneProgressCallback
        );
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        progressTracker.setFinalizing(jobId);
        const contextCard = createContextCard(droneResults, sessionStats, finalDroneInputs);
        if (sessionStats.successfulDrones === 0) {
            progressTracker.setError(jobId, 'All drones failed - unable to process content');
            return {
                success: false,
                error: 'All drones failed - unable to process content',
                errorType: 'PROCESSING_FAILURE',
                stats: {
                    totalDrones: sessionStats.estimatedDrones || droneResults.length,
                    successfulDrones: 0,
                    failedDrones: sessionStats.estimatedDrones || droneResults.length,
                    compressionRatio: '0.0',
                    executionTime: ((Date.now() - startTime) / 1000).toFixed(1)
                }
            };
        }
        const endTime = Date.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(1);
        console.log(`\n✅ All drones completed in ${totalTime}s`);
        console.log(`📄 Context Card Complete:`);
        console.log(`   Final content: ${sessionStats.finalContentTokens.toLocaleString()} tokens`);
        console.log(`   Compression: ${sessionStats.compressionRatio}:1`);
        console.log(`   Success: ${sessionStats.successfulDrones}/${droneResults.length} drones`);
        progressTracker.setComplete(jobId, contextCard);
        return {
            success: true,
            contextCard,
            droneResults,
            sessionStats,
            executionTime: totalTime,
            stats: {
                initialTokens,
                cleanedTokens,
                finalTokens: sessionStats.finalContentTokens,
                compressionRatio: sessionStats.compressionRatio,
                totalDrones: droneResults.length,
                successfulDrones: sessionStats.successfulDrones,
                executionTime: totalTime
            }
        };
    } catch (error) {
        console.error('\n💥 PIPELINE FAILED');
        console.error('====================');
        console.error(error.message);
        progressTracker.setError(jobId, error.message);
        const errorInfo = classifyError(error);
        return {
            success: false,
            error: errorInfo.userMessage || error.message,
            errorType: errorInfo.type,
            fatal: errorInfo.fatal,
            cancelled: error.message === 'Processing was cancelled'
        };
    } finally {
        setTimeout(() => {
            progressTracker.removeJob(jobId);
        }, 60000);
    }
}

// FILE: src/pipeline/progressTracker.js
class ProgressTracker {
    constructor() {
        this.jobs = new Map();
        this.listeners = new Map();
    }
    createJob(jobId, onUpdate = null) {
        const job = {
            id: jobId,
            status: 'created',
            progress: 0,
            totalDrones: 0,
            completedDrones: 0,
            message: 'Initializing...',
            startTime: Date.now(),
            lastUpdate: Date.now(),
            error: null
        };
        this.jobs.set(jobId, job);
        if (onUpdate) {
            this.listeners.set(jobId, onUpdate);
        }
        this._notifyUpdate(jobId);
        return jobId;
    }
    updateJob(jobId, updates) {
        const job = this.jobs.get(jobId);
        if (!job) return;
        Object.assign(job, updates, {
            lastUpdate: Date.now()
        });
        if (job.totalDrones > 0 && job.completedDrones >= 0) {
            job.progress = Math.round((job.completedDrones / job.totalDrones) * 100);
        }
        this._notifyUpdate(jobId);
    }
    setPreprocessing(jobId, message = 'Processing text...') {
        this.updateJob(jobId, {
            status: 'preprocessing',
            message,
            progress: 10
        });
    }
    setLaunching(jobId, totalDrones) {
        this.updateJob(jobId, {
            status: 'launching',
            message: `Launching ${totalDrones} drones...`,
            totalDrones,
            completedDrones: 0,
            progress: 20
        });
    }
    setProcessing(jobId, totalDrones) {
        this.updateJob(jobId, {
            status: 'processing',
            message: `Processing with ${totalDrones} drones...`,
            totalDrones,
            completedDrones: 0,
            progress: 30
        });
    }
    updateDroneProgress(jobId, completedDrones, totalDrones, message = null) {
        const updates = {
            completedDrones,
            totalDrones
        };
        if (message) {
            updates.message = message;
        } else {
            const percent = totalDrones > 0 ? Math.round((completedDrones / totalDrones) * 100) : 0;
            updates.message = `Processing: ${completedDrones}/${totalDrones} drones (${percent}%)`;
        }
        this.updateJob(jobId, updates);
    }
    setFinalizing(jobId) {
        this.updateJob(jobId, {
            status: 'finalizing',
            message: 'Creating context card...',
            progress: 90
        });
    }
    setComplete(jobId, result = null) {
        const job = this.jobs.get(jobId);
        if (!job) return;
        this.updateJob(jobId, {
            status: 'complete',
            message: 'Complete!',
            progress: 100,
            result,
            endTime: Date.now(),
            duration: Date.now() - job.startTime
        });
    }
    setError(jobId, error) {
        const job = this.jobs.get(jobId);
        if (!job) return;
        const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
        this.updateJob(jobId, {
            status: 'error',
            message: `Error: ${errorMessage}`,
            error: errorMessage,
            progress: 0,
            endTime: Date.now(),
            duration: Date.now() - job.startTime
        });
    }
    setCancelled(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;
        this.updateJob(jobId, {
            status: 'cancelled',
            message: 'Processing cancelled',
            progress: 0,
            endTime: Date.now(),
            duration: Date.now() - job.startTime
        });
    }
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    removeJob(jobId) {
        this.jobs.delete(jobId);
        this.listeners.delete(jobId);
    }
    cleanupOldJobs(maxAge = 3600000) {
        const now = Date.now();
        const jobsToRemove = [];
        for (const [jobId, job] of this.jobs.entries()) {
            if (now - job.lastUpdate > maxAge) {
                jobsToRemove.push(jobId);
            }
        }
        jobsToRemove.forEach(jobId => this.removeJob(jobId));
        return jobsToRemove.length;
    }
    _notifyUpdate(jobId) {
        const job = this.jobs.get(jobId);
        const listener = this.listeners.get(jobId);
        if (job && listener) {
            setTimeout(() => {
                try {
                    listener({...job});
                } catch (error) {
                    console.error(`Error in progress listener for job ${jobId}:`, error);
                }
            }, 0);
        }
    }
    getActiveJobs() {
        const activeJobs = [];
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.status === 'processing' || job.status === 'preprocessing' || job.status === 'launching') {
                activeJobs.push({...job});
            }
        }
        return activeJobs;
    }
    isJobActive(jobId) {
        const job = this.jobs.get(jobId);
        return job && ['processing', 'preprocessing', 'launching', 'finalizing'].includes(job.status);
    }
}
const progressTracker = new ProgressTracker();
function createJob(jobId, onUpdate) {
    return progressTracker.createJob(jobId, onUpdate);
}
function updateJob(jobId, updates) {
    return progressTracker.updateJob(jobId, updates);
}
function setPreprocessing(jobId, message) {
    return progressTracker.setPreprocessing(jobId, message);
}
function setLaunching(jobId, totalDrones) {
    return progressTracker.setLaunching(jobId, totalDrones);
}
function setProcessing(jobId, totalDrones) {
    return progressTracker.setProcessing(jobId, totalDrones);
}
function updateDroneProgress(jobId, completedDrones, totalDrones, message) {
    return progressTracker.updateDroneProgress(jobId, completedDrones, totalDrones, message);
}
function setFinalizing(jobId) {
    return progressTracker.setFinalizing(jobId);
}
function setComplete(jobId, result) {
    return progressTracker.setComplete(jobId, result);
}
function setError(jobId, error) {
    return progressTracker.setError(jobId, error);
}
function setCancelled(jobId) {
    return progressTracker.setCancelled(jobId);
}
function getJob(jobId) {
    return progressTracker.getJob(jobId);
}
function removeJob(jobId) {
    return progressTracker.removeJob(jobId);
}
function cleanupOldJobs(maxAge) {
    return progressTracker.cleanupOldJobs(maxAge);
}
function getActiveJobs() {
    return progressTracker.getActiveJobs();
}
function isJobActive(jobId) {
    return progressTracker.isJobActive(jobId);
}

// FILE: src/pipeline/splicer.js
const CODE_LANGUAGES = new Set([
    'javascript', 'python', 'java', 'typescript', 'html', 'css', 'json',
    'yaml', 'sql', 'code', 'jsx', 'tsx', 'php', 'ruby', 'go', 'rust',
    'c', 'cpp', 'c++', 'csharp', 'c#', 'bash', 'shell', 'sh', 'xml',
    'markdown', 'md', 'swift', 'kotlin', 'r', 'scala', 'perl',
    'powershell', 'cmd'
]);
const SHELL_LIKE_LANGUAGES = new Set(['bash', 'shell', 'sh', 'powershell', 'cmd']);
const CODE_CHARS_STRING = '{}[]();<>/=+-*';
const COMMAND_KEYWORDS = new Set([
    'install', 'update', 'remove', 'get', 'set', 'run', 'exec', 'start', 'stop',
    'build', 'deploy', 'test', 'config', 'init', 'clone', 'commit', 'push',
    'pull', 'merge', 'checkout', 'add', 'status', 'log', 'diff', 'grep', 'find',
    'cat', 'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'sudo', 'docker', 'npm', 'pip',
    'git', 'apt', 'yum', 'choco', 'brew', 'python', 'node', 'java', 'go', 'ruby', 'perl'
]);
const COMMAND_FILE_EXTENSIONS = new Set([
    '.py', '.js', '.sh', '.bat', '.ps1', '.rb', '.pl', '.jar', '.json', '.yaml', '.yml', '.xml', '.conf', '.ini', '.md', '.txt'
]);
const NUMBERED_LIST_PATTERN = /^(\s*)\d+\.\s/;
const HIERARCHICAL_LIST_PATTERN = /^(\s*)\d+\.\d+\s/;
const BULLET_LIST_PATTERN = /^(\s*)[-*•]\s/;
const CONTINUED_LIST_PATTERN = /^(\s*)[a-zA-Z]\.\s/;
const EMOJI_PATTERN_START = /^[🔍🎯📝💡🚀✅❌⚡️🔧📌🎨🕵️‍♂️🕵️‍♀️]/;
const EMOJI_CHARS_FOR_LIST_CHECK = '🔍🎯📝💡🚀✅❌⚡️🔧📌🎨🕵️‍♂️🕵️‍♀️';
const OUTPUT_INDICATORS = [
    'example output:', 'output:', 'console output:', 'terminal output:',
    'result:', 'results:', 'produces:', 'shows:', 'displays:'
];
const CONSOLE_PATTERNS = [
    /^[=\-─━]+/,
    /^[\*=\-─━]{3,}/,
    /^[📊📈📋🚀🔄✅❌⏰📁🗜️🎯💡🔍]/,
    /^\s*\w+\.(md|py|txt|js|html|css):\s*[✅❌]/,
    /^\s*→\s*/,
    /^[\s\-\*]*\d+\s*(tokens?|chars?|lines?|bytes?)/,
];
const CONSOLE_SPECIAL_CHARS_STRING = '═─━┌┐└┘│├┤┬┴┼*=|-+→←↑↓✅❌📊📈📋🚀🔄⏰📁';
const UI_ELEMENTS_SET = new Set(['retry', 'edit', 'copy', 'close', 'cancel', 'ok', 'yes', 'no']);
const TIMESTAMP_PATTERN = /^\d+s$/i;
function splitIntoParagraphsInternal(content) {
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = content.split('\n');
    let paragraphs = [];
    let currentParagraphLines = [];
    let inBlankLines = false;
    let pendingColon = false;
    let blankLineBuffer = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
            inBlankLines = true;
            blankLineBuffer.push(line);
            if (currentParagraphLines.length > 0) {
                for (let j = currentParagraphLines.length - 1; j >= 0; j--) {
                    const pLine = currentParagraphLines[j];
                    if (pLine.trim()) {
                        if (pLine.trimEnd().endsWith(':')) {
                            pendingColon = true;
                        } else {
                            pendingColon = false;
                        }
                        break;
                    }
                }
            }
        } else {
            let shouldContinuePrevious = false;
            if (inBlankLines) {
                if (pendingColon) {
                    shouldContinuePrevious = true;
                    if (!CODE_LANGUAGES.has(line.trim().toLowerCase())) {
                        pendingColon = false;
                    }
                } else if (line.length > 0 && (line[0] === ' ' || line[0] === '\t')) {
                    shouldContinuePrevious = true;
                }
            } else {
                if (currentParagraphLines.length > 0 && CODE_LANGUAGES.has(line.trim().toLowerCase())) {
                    for (let j = currentParagraphLines.length - 1; j >= 0; j--) {
                        const pLine = currentParagraphLines[j];
                        if (pLine.trim()) {
                            if (pLine.trimEnd().endsWith(':')) {
                                shouldContinuePrevious = true;
                            }
                            break;
                        }
                    }
                }
            }
            if (shouldContinuePrevious && currentParagraphLines.length > 0) {
                if (blankLineBuffer.length > 0) {
                    currentParagraphLines.push(...blankLineBuffer);
                }
                currentParagraphLines.push(line);
            } else {
                if (inBlankLines && currentParagraphLines.length > 0) {
                    paragraphs.push(currentParagraphLines.join('\n'));
                    currentParagraphLines = [];
                    pendingColon = false;
                }
                currentParagraphLines.push(line);
            }
            inBlankLines = false;
            blankLineBuffer = [];
        }
    }
    if (currentParagraphLines.length > 0) {
        paragraphs.push(currentParagraphLines.join('\n'));
    }
    return paragraphs.filter(p => p.trim() !== '');
}
function mergeCodeLabelsInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        const currentPara = paragraphs[i];
        const lines = currentPara.split('\n');
        let isOnlyLanguage = false;
        let actualLanguageLabel = "";
        const nonEmptyLinesInCurrent = lines.map(l => l.trim()).filter(l => l);
        if (nonEmptyLinesInCurrent.length === 1 && CODE_LANGUAGES.has(nonEmptyLinesInCurrent[0].toLowerCase())) {
            isOnlyLanguage = true;
            actualLanguageLabel = nonEmptyLinesInCurrent[0].toLowerCase();
        }
        let endsWithLanguage = false;
        if (!isOnlyLanguage && nonEmptyLinesInCurrent.length > 0) {
            const lastContentLineStrippedLower = nonEmptyLinesInCurrent[nonEmptyLinesInCurrent.length - 1].toLowerCase();
            if (CODE_LANGUAGES.has(lastContentLineStrippedLower)) {
                endsWithLanguage = true;
                actualLanguageLabel = lastContentLineStrippedLower;
            }
        }
        if ((i + 1 < paragraphs.length) && (isOnlyLanguage || endsWithLanguage)) {
            const nextPara = paragraphs[i+1];
            const nextParaLines = nextPara.split('\n');
            let firstLineNextParaContent = "";
            for (const lNext of nextParaLines) {
                if (lNext.trim()) {
                    firstLineNextParaContent = lNext;
                    break;
                }
            }
            if (!firstLineNextParaContent) {
                mergedParagraphs.push(currentPara);
                i++;
                continue;
            }
            let shouldMerge = false;
            if (firstLineNextParaContent.startsWith('\t') || (firstLineNextParaContent.length >= 2 && firstLineNextParaContent.startsWith('  '))) {
                shouldMerge = true;
            } else if (Array.from(CODE_CHARS_STRING).some(char => nextPara.includes(char))) {
                shouldMerge = true;
            }
            if (!shouldMerge && actualLanguageLabel) {
                const nextParaFirstLineStrippedLower = firstLineNextParaContent.trim().toLowerCase();
                if (CODE_LANGUAGES.has(nextParaFirstLineStrippedLower)) {
                } else {
                    if (SHELL_LIKE_LANGUAGES.has(actualLanguageLabel)) {
                        let isCommandLike = false;
                        if (COMMAND_KEYWORDS.has(nextParaFirstLineStrippedLower.split(' ')[0])) isCommandLike = true;
                        if (!isCommandLike && /(?:^|\s)-(?:[a-zA-Z]|[a-zA-Z0-9-]+)(?:$|\s|=)/.test(firstLineNextParaContent)) isCommandLike = true;
                        if (!isCommandLike && Array.from(COMMAND_FILE_EXTENSIONS).some(ext => nextParaFirstLineStrippedLower.includes(ext))) isCommandLike = true;
                        if (!isCommandLike && (nextParaFirstLineStrippedLower.startsWith('./') || nextParaFirstLineStrippedLower.startsWith('../'))) isCommandLike = true;
                        if (!isCommandLike && nextPara.trim().split('\n').length === 1 && nextPara.trim().length < 80 && nextPara.trim() === nextPara.trim().toLowerCase()) {
                            if (/[a-zA-Z]/.test(nextPara.trim())) isCommandLike = true;
                        }
                        if (isCommandLike) shouldMerge = true;
                    } else {
                        shouldMerge = true;
                    }
                }
            }
            if (shouldMerge) {
                mergedParagraphs.push(currentPara + '\n' + nextPara);
                i += 2;
                continue;
            }
        }
        mergedParagraphs.push(currentPara);
        i++;
    }
    return mergedParagraphs;
}
function mergeSplitCodeBlocksInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        let currentPara = paragraphs[i];
        const lines = currentPara.split('\n');
        let isCodeBlock = false;
        if (lines.length > 0) {
            let indentedLines = 0;
            let codeLikeLines = 0;
            const nonEmptyLines = lines.filter(line => line.trim());
            if (nonEmptyLines.length > 0) {
                for (const line of nonEmptyLines) {
                    if (line.startsWith('\t') || (line.length >=2 && line.startsWith('  '))) {
                        indentedLines++;
                    }
                    if (Array.from(CODE_CHARS_STRING).some(char => line.includes(char))) {
                        codeLikeLines++;
                    }
                }
                if (indentedLines / nonEmptyLines.length > 0.5 || codeLikeLines / nonEmptyLines.length > 0.5) {
                    isCodeBlock = true;
                }
            }
        }
        if (isCodeBlock) {
            let j = i + 1;
            while (j < paragraphs.length) {
                const nextPara = paragraphs[j];
                const nextLines = nextPara.split('\n');
                let isNextCode = false;
                if (nextLines.length > 0) {
                    const firstLine = nextLines[0];
                     if (firstLine && (firstLine.startsWith('\t') || (firstLine.length >=2 && firstLine.startsWith('  ')) || Array.from(CODE_CHARS_STRING).some(char => nextPara.includes(char)))) {
                        isNextCode = true;
                    }
                }
                if (isNextCode) {
                    currentPara += '\n\n' + nextPara;
                    j++;
                } else {
                    break;
                }
            }
            mergedParagraphs.push(currentPara);
            i = j;
        } else {
            mergedParagraphs.push(currentPara);
            i++;
        }
    }
    return mergedParagraphs;
}
function mergeSplitListsInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        let currentPara = paragraphs[i];
        const lines = currentPara.split('\n');
        let hasList = false;
        let hasHierarchical = false;
        let hasEmojiStart = false;
        for (const line of lines) {
            if (NUMBERED_LIST_PATTERN.test(line) || HIERARCHICAL_LIST_PATTERN.test(line) ||
                BULLET_LIST_PATTERN.test(line) || CONTINUED_LIST_PATTERN.test(line)) {
                hasList = true;
                if (HIERARCHICAL_LIST_PATTERN.test(line)) hasHierarchical = true;
                break;
            }
            if (EMOJI_PATTERN_START.test(line.trim())) {
                hasEmojiStart = true;
                hasList = true;
                break;
            }
        }
        if (hasList) {
            let j = i + 1;
            while (j < paragraphs.length) {
                const nextPara = paragraphs[j];
                const nextLines = nextPara.split('\n');
                let isListContinuation = false;
                let shouldMergeCode = false;
                const firstLineNext = nextLines.find(line => line.trim()) || "";
                if (firstLineNext) {
                    if (NUMBERED_LIST_PATTERN.test(firstLineNext) || HIERARCHICAL_LIST_PATTERN.test(firstLineNext) ||
                        BULLET_LIST_PATTERN.test(firstLineNext) || CONTINUED_LIST_PATTERN.test(firstLineNext) ||
                        EMOJI_PATTERN_START.test(firstLineNext.trim())) {
                        isListContinuation = true;
                    }
                    if (hasHierarchical && NUMBERED_LIST_PATTERN.test(firstLineNext)) {
                        const currentNumsMatch = currentPara.match(/\d+/g);
                        const nextNumMatch = firstLineNext.match(/^\s*(\d+)\./);
                        if (currentNumsMatch && currentNumsMatch.length > 0 && nextNumMatch && nextNumMatch[1]) {
                            const currentMain = parseInt(currentNumsMatch[0], 10);
                            const nextMain = parseInt(nextNumMatch[1], 10);
                            if (Math.abs(nextMain - currentMain) <= 2) isListContinuation = true;
                        }
                    }
                    if (!isListContinuation && firstLineNext.startsWith('    ')) isListContinuation = true;
                }
                if (!isListContinuation && CODE_LANGUAGES.has(nextPara.trim().toLowerCase())) {
                    if (j + 1 < paragraphs.length) {
                        const followingPara = paragraphs[j + 1];
                        if (followingPara) {
                            const firstCodeLine = (followingPara.split('\n')[0] || "").trimStart();
                            const codeCharsWithHash = CODE_CHARS_STRING + '#';
                             if (firstCodeLine && (firstCodeLine.startsWith('\t') || (firstCodeLine.length >=2 && firstCodeLine.startsWith('  ')) || Array.from(codeCharsWithHash).some(char => firstCodeLine.includes(char)))) {
                                currentPara += '\n' + nextPara + '\n' + followingPara;
                                j += 2;
                                continue;
                            }
                        }
                    }
                }
                if (!isListContinuation && firstLineNext) {
                    if (firstLineNext.startsWith('\t') || (firstLineNext.length >=2 && firstLineNext.startsWith('  ')) || (firstLineNext.startsWith('#') && firstLineNext.includes('Check'))) {
                        shouldMergeCode = true;
                    }
                }
                if (isListContinuation || shouldMergeCode) {
                    currentPara += '\n' + nextPara;
                    j++;
                } else {
                    break;
                }
            }
            mergedParagraphs.push(currentPara);
            i = j;
        } else {
            mergedParagraphs.push(currentPara);
            i++;
        }
    }
    return mergedParagraphs;
}
function mergeConsoleOutputInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        let currentPara = paragraphs[i];
        let endsWithOutputIndicator = false;
        const lines = currentPara.split('\n');
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim().toLowerCase();
            if (OUTPUT_INDICATORS.some(indicator => lastLine.endsWith(indicator))) {
                endsWithOutputIndicator = true;
            }
        }
        let looksLikeConsole = false;
        for (const line of lines) {
            if (CONSOLE_PATTERNS.some(pattern => pattern.test(line.trim()))) {
                looksLikeConsole = true;
                break;
            }
        }
        if (endsWithOutputIndicator || looksLikeConsole) {
            let j = i + 1;
            while (j < paragraphs.length) {
                const nextPara = paragraphs[j];
                const nextLines = nextPara.split('\n');
                let isConsoleContinuation = false;
                for (const line of nextLines.slice(0, 5)) {
                    if (CONSOLE_PATTERNS.some(pattern => pattern.test(line.trim()))) {
                        isConsoleContinuation = true;
                        break;
                    }
                }
                if (!isConsoleContinuation) {
                    const specialCharCount = Array.from(nextPara).filter(c => CONSOLE_SPECIAL_CHARS_STRING.includes(c)).length;
                    if (nextPara.length > 0 && specialCharCount / nextPara.length > config.CONSOLE_SPECIAL_CHAR_THRESHOLD_PERCENT) {
                        isConsoleContinuation = true;
                    }
                }
                if (isConsoleContinuation) {
                    currentPara += '\n\n' + nextPara;
                    j++;
                } else {
                    break;
                }
            }
            mergedParagraphs.push(currentPara);
            i = j;
        } else {
            mergedParagraphs.push(currentPara);
            i++;
        }
    }
    return mergedParagraphs;
}
function mergeUiElementsInternal(paragraphs) {
    const mergedParagraphs = [];
    for (let i = 0; i < paragraphs.length; i++) {
        const currentPara = paragraphs[i];
        const currentStrippedLower = currentPara.trim().toLowerCase();
        const isUiElement = UI_ELEMENTS_SET.has(currentStrippedLower) || TIMESTAMP_PATTERN.test(currentStrippedLower);
        if (isUiElement && i > 0 && mergedParagraphs.length > 0) {
            mergedParagraphs[mergedParagraphs.length - 1] += ' ' + currentPara;
        } else {
            mergedParagraphs.push(currentPara);
        }
    }
    return mergedParagraphs;
}
function spliceIntoConceptualParagraphs(cleanedSessionText) {
    if (!cleanedSessionText || typeof cleanedSessionText !== 'string') return [];
    if (cleanedSessionText.trim() === '') return [];
    if (typeof cleanedSessionText !== 'string') {
        throw new Error('Input must be a string.');
    }
    console.log("Initial splitting into paragraphs...");
    let paragraphs = splitIntoParagraphsInternal(cleanedSessionText);
    console.log(`Found ${paragraphs.length} paragraph(s) after initial split.`);
    console.log("Merging code language labels...");
    paragraphs = mergeCodeLabelsInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging code labels.`);
    console.log("Merging split lists...");
    paragraphs = mergeSplitListsInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging split lists.`);
    console.log("Merging split code blocks...");
    paragraphs = mergeSplitCodeBlocksInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging split code blocks.`);
    console.log("Merging console output...");
    paragraphs = mergeConsoleOutputInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging console output.`);
    console.log("Merging short UI elements...");
    paragraphs = mergeUiElementsInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging UI elements.`);
    const result = paragraphs.map((paraText, index) => {
        const text = paraText.trim();
        return {
            id: `paragraph_${String(index + 1).padStart(3, '0')}`,
            text: text,
            token_count: estimateTokens(text),
            char_count: text.length,
            line_count: text.split('\n').length
        };
    });
    return result.filter(p => p.text);
}

// FILE: src/test/setup.ts
// Test setup file for Vitest
import { vi, beforeEach } from 'vitest';
// Mock window APIs that might not be available in test environment
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
  writable: true,
});
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
  writable: true,
});
// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
// Mock fetch API
global.fetch = vi.fn();
// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// FILE: src/types/index.ts
// types/index.ts - Shared TypeScript Types
export interface ProgressUpdate {
  phase?: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message?: string;
  completedDrones?: number;
  totalDrones?: number;
  progress?: number;
}
export interface Stats {
  executionTime: string | number;
  compressionRatio: string | number;
  successfulDrones: number;
  totalDrones: number;
  initialTokens?: number;
  finalTokens?: number;
}
export interface LoadingProgress {
  phase: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message: string;
  completedDrones?: number;
  totalDrones?: number;
  elapsedTime?: number;
  progress?: number;
}
export interface ExpandedSections {
  what: boolean;
  howto: boolean;
  compression: boolean;
  strategy: boolean;
  drones: boolean;
  recency: boolean;
  advanced: boolean;
  privacy: boolean;
}
export interface PipelineSettings {
  model: string;
  temperature: number;
  maxConcurrency: number;
  customTargetTokens: number | null;
  processingSpeed: string;
  recencyMode: boolean;
  recencyStrength: number;
  droneDensity?: number;
  maxDrones?: number;
  // Add custom prompt fields
  useCustomPrompt?: boolean;
  customPrompt?: string;
}
export interface PipelineResult {
  success: boolean;
  contextCard?: string;
  error?: string;
  errorType?: string;
  executionTime?: number;
  stats?: any;
  sessionStats?: any;
}

// FILE: src/utils/textProcessing.ts
// utils/textProcessing.ts - Text Processing Utilities
// Import from the browser module
// @ts-ignore - JavaScript module without TypeScript declarations
import { estimateTokens as estimateTokensFromAPI } from '../lib/client-api.js';
export const estimateTokens = estimateTokensFromAPI;
export const roundTokenCount = (count: number): number => {
  if (count === 0) return 0;
  if (count < 1000) {
    return Math.round(count / 10) * 10;
  } else if (count < 5000) {
    return Math.round(count / 50) * 50;
  } else {
    return Math.round(count / 100) * 100;
  }
};
export const formatTokenCount = (count: number): string => {
  const rounded = roundTokenCount(count);
  return `${count === 0 ? '' : '~'}${rounded.toLocaleString()} tokens`;
};
export const calculateTargetTokens = (tokenCount: number, compressionRatio: string): number => {
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
export const getErrorDisplay = (errorMessage: string, errorType?: string): string => {
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