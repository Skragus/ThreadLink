import React, { useState, useEffect, useRef } from 'react';
import helpIcon from '../assets/circle-help.svg';
import settingsIcon from '../assets/settings.svg';

// API configuration
const API_BASE_URL = 'http://localhost:3001/api';

interface Stats {
  executionTime: string | number;
  compressionRatio: string | number;
  successfulDrones: number;
  totalDrones: number;
  // Add other potential stats properties if they exist
}

function ThreadLink() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [targetTokens, setTargetTokens] = useState(1500);
  const [isLoading, setIsLoading] = useState(false);  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);

  // Settings
  const [model, setModel] = useState('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState(false);

  // Refs for scrolling
  const errorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);

  const roundTokenCount = (count) => {
    if (count === 0) return 0;
    if (count < 1000) {
      return Math.round(count / 10) * 10;
    } else if (count < 5000) {
      return Math.round(count / 50) * 50;
    } else {
      return Math.round(count / 100) * 100;
    }
  };

  const formatTokenCount = (count) => {
    const rounded = roundTokenCount(count);
    return `${count === 0 ? '' : '~'}${rounded.toLocaleString()} tokens`;
  };

  const estimateTokens = (text) => {
      // Use the same standard approximation as the backend.
      // Rough approximation: ~4 characters per token
      return Math.ceil((text || "").length / 4);
  };

  

  const handleTextChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    setError('');
    setTokenCount(estimateTokens(text));
  };


  // Add this function before your component
  const getErrorDisplay = (errorMessage, errorType) => {
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

  const handleTargetChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setTargetTokens(value);
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
    
    try {
      console.log('🚀 Sending request to backend...');
      
      const response = await fetch(`${API_BASE_URL}/condense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          model: model,
          targetTokens: targetTokens
        })
      });

      const data = await response.json();

      // Update error handling
      if (!response.ok) {
        const errorInfo = getErrorDisplay(data.message || data.error || 'Processing failed', data.errorType);
        throw new Error(errorInfo);
      }

      // Check the success flag in the response body (for 200 OK responses that might still indicate logical failure)
      if (data.success) {
        setOutputText(data.contextCard);
        setStats(data.stats);
        setIsProcessed(true);
        console.log('✅ Processing complete:', data.stats);
      } else {
        const errorInfo = getErrorDisplay(data.message || 'Processing failed according to server.', data.errorType);
        setError(errorInfo.message);
        console.error('❌ Processing Failed (data.success is false):', errorInfo.message, '| Type:', errorInfo.type, '| Suggested Action:', errorInfo.action, '| Full Response:', data);
      }
      
    } catch (err: any) { // Catch network errors or other unexpected issues
      console.error('❌ Caught an exception during processing:', err);
      // Determine if it's a network-like error or a general one
      const isNetworkError = err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('NetworkError'));
      const errorInfo = getErrorDisplay(
        err.message || 'An unexpected client-side error occurred.',
        isNetworkError ? 'NETWORK_ERROR' : 'GENERAL_ERROR'
      );
      setError(errorInfo.message);
      console.error('❌ Exception Details:', errorInfo.message, '| Type:', errorInfo.type, '| Suggested Action:', errorInfo.action);
    } finally {
      setIsLoading(false);
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
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const openHelp = () => {
    window.open('https://github.com/skragus/threadlink', '_blank');
  };
  const displayText = isProcessed ? outputText : inputText;
  // Effect to scroll to the relevant section after processing
  useEffect(() => {
    // Only scroll if isProcessed is true and we have stats to show (not the textarea)
    if (isProcessed && stats) {
      // Delay to allow DOM to fully update after state changes
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          if (statsRef.current) {
            // Only scroll to stats, not the textarea
            statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isProcessed, stats]); // Removed outputText from dependencies

  // Add this new useEffect to control textarea scroll position:
  useEffect(() => {
    // Reset textarea scroll to top when content changes
    if (outputTextareaRef.current && isProcessed) {
      // Small delay to ensure the value has been updated
      const timer = setTimeout(() => {
        if (outputTextareaRef.current) {
          outputTextareaRef.current.scrollTop = 0;
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [outputText, isProcessed]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="model-select" className="block text-sm text-[var(--text-secondary)] mb-1">
                  Model
                </label>
                <select
                  id="model-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)]"
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
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg"
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
          <h1 className="text-3xl font-outfit leading-none flex items-center">
            <span className="text-[#736C9E] tracking-[0.01em] font-normal">Thread</span>
            <span className="text-[#505C88] tracking-[-0.03em] font-medium">Link</span>
          </h1>
          <p className="text-sm font-outfit font-normal text-[#7D87AD] opacity-75 whitespace-nowrap hidden sm:block">
            Condense, copy, continue — without breaking flow.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={openHelp}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity p-2"
          >
            <img src={helpIcon} alt="Help" className="w-10 h-10 opacity-50" />
          </button>
          <button 
            onClick={openSettings}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity p-2"
          >
            <img src={settingsIcon} alt="Settings" className="w-10 h-10 opacity-50" />
          </button>
        </div>
      </div>      {/* Error Display */}
      {error && (
        <div ref={errorRef} className="mx-12 mt-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Display */}
      {stats && (
        <div ref={statsRef} className="mx-12 mt-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 rounded text-green-400 text-sm">
          ✅ Processed in {stats.executionTime}s • {stats.compressionRatio}:1 compression • {stats.successfulDrones}/{stats.totalDrones} drones successful
        </div>
      )}      {/* Main content area */}
      <div className="flex-grow flex flex-col justify-center px-12 py-4">
        <textarea
          ref={outputTextareaRef}
          className={`w-full flex-grow bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg p-4 resize-none focus:border-[var(--highlight-blue)] focus:outline-none ${isLoading ? 'blur-sm' : ''}`}
          placeholder="Paste your AI conversation here..."
          value={displayText}
          onChange={handleTextChange}
          readOnly={isProcessed || isLoading}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-[#181920] bg-[var(--bg-primary)] pb-4">
        <div className="px-12 py-4">
          <div className="flex flex-wrap justify-between items-center gap-3 min-h-[48px]">
            <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono w-32">{formatTokenCount(tokenCount)}</span>
                <span className="mx-2">•</span>
                <label htmlFor="target-tokens-input" className="whitespace-nowrap">Target:</label>
                <input
                  type="number"
                  value={targetTokens}
                  id="target-tokens-input"
                  onChange={handleTargetChange}
                  step="100"
                  min="100"
                  className="w-16 px-2 py-1 text-center bg-[var(--card-bg)] border border-[var(--divider)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--highlight-blue)] shrink-0 font-mono"
                />
                <span className="whitespace-nowrap">tokens</span>
              </div>
            </div>
            
            <div className="flex gap-3 shrink-0">
              {inputText && !isProcessed && (
                <button 
                  onClick={handleCondense}
                  disabled={isLoading}
                  className={`h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg disabled:opacity-50 min-w-[120px] whitespace-nowrap`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    'Condense'
                  )}
                </button>
              )}
              {(isProcessed) && (
                <>
                  <button 
                    onClick={handleCopy}
                    className="h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg relative min-w-[100px] whitespace-nowrap"
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
                    className="h-[38px] bg-[var(--text-secondary)] text-white px-4 rounded-lg min-w-[100px] whitespace-nowrap"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] py-1">
        <p className="text-xs text-center text-[var(--text-secondary)] opacity-70 flex items-center justify-center flex-wrap gap-x-2">
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
  );
}

export default ThreadLink;