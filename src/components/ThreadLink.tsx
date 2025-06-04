import React, { useState } from 'react';

function ThreadLink() {
  const [inputText, setInputText] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [targetTokens, setTargetTokens] = useState(500);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const roundTokenCount = (count: number) => {
    if (count === 0) return 0;
    if (count < 1000) {
      return Math.round(count / 10) * 10;
    } else if (count < 5000) {
      return Math.round(count / 50) * 50;
    } else {
      return Math.round(count / 100) * 100;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    // Simple token count estimation (words * 1.33)
    const words = text.trim().split(/\s+/).length;
    const rawTokens = Math.floor(words * 1.33);
    const roundedTokens = roundTokenCount(rawTokens);
    setTokenCount(roundedTokens);
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 100) {
      setTargetTokens(value);
    }
  };

  const handleCondense = async () => {
    setIsLoading(true);
    
    // Simulate API call with 3 second delay
    setTimeout(() => {
      setIsLoading(false);
      setIsProcessed(true);
      
      // Set dummy condensed output
      setInputText("This is a condensed summary of your AI conversation. The original content has been processed and summarized to meet your target token count while preserving key information and context.");
    }, 3000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inputText);
    setIsCopied(true);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleReset = () => {
    setInputText('');
    setIsProcessed(false);
    setTokenCount(0);
  };

  const openSettings = () => {
    // Settings handler placeholder
  };

  const openHelp = () => {
    // Help handler placeholder
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
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
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity p-2"
          >
            ❓
          </button>
          <button 
            onClick={openSettings}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity p-2"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-grow flex flex-col justify-center px-12 py-4">
        <textarea
          className={`w-full flex-grow bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg p-4 resize-none focus:border-[var(--highlight-blue)] focus:outline-none ${isLoading ? 'blur-sm' : ''}`}
          placeholder="Paste your AI conversation here..."
          value={inputText}
          onChange={handleTextChange}
          readOnly={isProcessed}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--divider)] bg-[var(--bg-primary)] pb-4">
        <div className="px-12 py-4">
          <div className="flex flex-wrap justify-between items-center gap-3 min-h-[48px]">
            <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono w-32">{tokenCount === 0 ? '0 tokens' : `~${tokenCount} tokens`}</span>
                <span className="mx-2">•</span>
                <label className="whitespace-nowrap">Target:</label>
                <input
                  type="number"
                  value={targetTokens}
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
                  className="h-[38px] bg-[var(--highlight-blue)] text-white px-4 rounded-lg disabled:opacity-50 min-w-[120px] whitespace-nowrap"
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
              {isProcessed && (
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
    </div>
  );
}

export default ThreadLink;