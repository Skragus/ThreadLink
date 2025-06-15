import React, { useState } from 'react';

function ThreadLink() {
  const [inputText, setInputText] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [targetTokens, setTargetTokens] = useState(500);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    // Simple token count estimation (words * 1.33)
    const words = text.trim().split(/\s+/).length;
    setTokenCount(Math.floor(words * 1.33));
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setTargetTokens(value);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>ThreadLink</h1>
        <p>Save, summarize, and continue your AI chats — anywhere.</p>
      </header>

      <main>
        <textarea
          placeholder="Paste your AI conversation here..."
          value={inputText}
          onChange={handleTextChange}
        />

        <div className="info-row">
          <span>{tokenCount} tokens detected</span>
          <div className="target-section">
            <label>Target:</label>
            <input
              type="number"
              value={targetTokens}
              onChange={handleTargetChange}
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