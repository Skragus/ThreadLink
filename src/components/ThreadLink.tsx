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

  return (
    <div className="app-container relative">
      <div className="absolute top-6 right-6">
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          ⚙️
        </button>
      </div>

      <div className="header-text mb-8 mt-6" style={{ fontFamily: 'Racing Sans One' }}>
        <span className="text-[var(--text-primary)] text-3xl">ThreadLink</span>
        <span className="text-[var(--text-secondary)]"> - Bridge your AI sessions with focused summaries, not forgotten context.</span>
      </div>

      <div className="my-8">
        <textarea
          className={`w-full h-[70vh] bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg p-4 resize-none focus:border-[var(--highlight-blue)] focus:outline-none ${isLoading ? 'blur-sm' : ''}`}
          placeholder="Paste your AI conversation here..."
          value={inputText}
          onChange={handleTextChange}
          readOnly={isProcessed}
        />
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-12">
          <div className="w-36">
            <span className="text-[var(--text-secondary)]">
              {tokenCount === 0 ? '0 tokens detected' : `~${tokenCount} tokens`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <label>Target:</label>
            <input
              type="number"
              value={targetTokens}
              onChange={handleTargetChange}
              step="100"
              min="100"
              className="target-input"
            />
            <span>tokens</span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {inputText && !isProcessed && (
            <button 
              onClick={handleCondense}
              disabled={isLoading}
              className="bg-[var(--highlight-blue)] text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
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
                className="bg-[var(--highlight-blue)] text-white px-6 py-2 rounded-lg relative"
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
                className="bg-[var(--text-secondary)] text-white px-6 py-2 rounded-lg"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThreadLink;