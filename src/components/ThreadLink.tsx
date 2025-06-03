import React, { useState } from 'react';

function ThreadLink() {
  const [inputText, setInputText] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [targetTokens, setTargetTokens] = useState(500);

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

  return (
    <div className="app-container">
      <div className="header-text mb-6" style={{ fontFamily: 'Racing Sans One' }}>
        <span className="text-[var(--text-primary)] text-3xl">ThreadLink</span>
        <span className="text-[var(--text-secondary)]"> - Bridge your AI sessions with focused summaries, not forgotten context.</span>
      </div>

      <main>
        <textarea
          placeholder="Paste your AI conversation here..."
          value={inputText}
          onChange={handleTextChange}
        />

        <div className="info-row">
          <span>{tokenCount === 0 ? '0 tokens detected' : `~${tokenCount} tokens detected`}</span>
          <div className="target-section">
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

        <div className="actions">
          {inputText && !isProcessed && (
            <button onClick={() => setIsProcessed(true)}>
              Condense
            </button>
          )}
          {isProcessed && (
            <>
              <button onClick={() => navigator.clipboard.writeText(inputText)}>
                Copy
              </button>
              <button onClick={() => {
                setInputText('');
                setIsProcessed(false);
                setTokenCount(0);
              }}>
                Reset
              </button>
            </>
          )}
        </div>
      </main>

      <div className="settings-icon">
        ⚙️
      </div>
    </div>
  );
}

export default ThreadLink;