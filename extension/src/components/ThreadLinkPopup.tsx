import React, { useState, useEffect } from 'react';
import settingsIcon from '../assets/settings-icon.png';
import refreshIcon from '../assets/refresh-icon.png';

type ThreadLinkState = 'ready' | 'extracting' | 'condensing' | 'success' | 'error';
type Platform = 'chatgpt' | 'claude' | 'gemini' | 'unknown';

interface PlatformData {
  platform: Platform;
  detected: boolean;
  messageCount?: number;
  tokenCount?: number;
  url?: string;
}

export default function ThreadLinkPopup() {
  const [state, setState] = useState<ThreadLinkState>('ready');
  const [platformData, setPlatformData] = useState<PlatformData>({
    platform: 'unknown',
    detected: false,
    messageCount: 0,
    tokenCount: 0
  });
  const [targetTokens, setTargetTokens] = useState(500);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detect platform on component mount
  useEffect(() => {
    detectCurrentPlatform();
  }, []);

  const detectCurrentPlatform = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      console.log('🔄 Manual refresh triggered');
    }
    
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id || !tab.url) {
        setPlatformData({ 
          platform: 'unknown', 
          detected: false
        });
        setLoading(false);
        return;
      }

      // Check URL first
      const url = tab.url;
      let expectedPlatform = 'unknown';
      
      if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        expectedPlatform = 'chatgpt';
      } else if (url.includes('claude.ai')) {
        expectedPlatform = 'claude';
      } else if (url.includes('gemini.google.com')) {
        expectedPlatform = 'gemini';
      }

      // Try to communicate with content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectPlatform' });
        
        if (response && response.detected) {
          setPlatformData({
            platform: response.platform || 'unknown',
            detected: true,
            messageCount: response.messageCount || 0,
            tokenCount: response.tokenCount || 0,
            url: response.url
          });
        } else {
          setPlatformData({
            platform: 'unknown',
            detected: false,
            url: tab.url
          });
        }
      } catch (contentScriptError) {
        // Only set as detected if we're actually on a supported platform
        if (expectedPlatform !== 'unknown') {
          setPlatformData({
            platform: expectedPlatform as Platform,
            detected: true,
            url: tab.url,
            messageCount: 0,
            tokenCount: 0
          });
        } else {
          setPlatformData({
            platform: 'unknown',
            detected: false,
            url: tab.url
          });
        }
      }
    } catch (error) {
      setPlatformData({
        platform: 'unknown',
        detected: false
      });
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
        console.log('✅ Manual refresh complete');
      }
    }
  };

  const handleExtract = async () => {
    setState('extracting');
    setProgress(0);
    
    // Simulate extraction process
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          setState('condensing');
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  useEffect(() => {
    if (state === 'condensing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setState('success');
            return 100;
          }
          return prev + 15;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [state]);

  const handleDownload = () => {
    const content = `# ThreadLink Export - ${platformData.platform}\n\nExtracted from: ${platformData.url}\nMessages: ${platformData.messageCount}\nTokens: ${platformData.tokenCount}\n\n[Conversation content would go here]`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadlink-${platformData.platform}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const content = `ThreadLink Export - ${platformData.platform}\n\nExtracted from: ${platformData.url}\nMessages: ${platformData.messageCount}\nTokens: ${platformData.tokenCount}`;
    navigator.clipboard.writeText(content);
  };

  const handleReset = () => {
    setState('ready');
    setProgress(0);
    setError(null);
  };

  const statusContent = {
    ready: { color: '#3A468F', text: 'Ready to extract' },
    extracting: { color: '#FFA500', text: 'Extracting messages...' },
    condensing: { color: '#4B5CC4', text: 'Condensing with AI...' },
    success: { color: '#22C55E', text: 'Ready to transfer!' },
    error: { color: '#EF4444', text: error || 'An error occurred' },
  };

  if (loading) {
    return (
      <div className="w-80 bg-[#0D0D12] p-4">
        <div className="text-center text-white">Detecting platform...</div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#0D0D12] overflow-hidden rounded-xl">
      {/* Header */}
      <div className="bg-[#2E3053] p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#C7D0FF]">ThreadLink</h1>
          <p className="text-sm text-[#7D87AD]">"Save, summarize, and continue your AI chats — anywhere."</p>
        </div>
        <button 
          className="w-12 h-12 flex items-center justify-center border border-[#1C1E2B] rounded bg-[#30355A] text-[#C7D0FF] hover:opacity-80 transition-opacity"
          onClick={() => {/* Settings handler */}}
        >
          <img src={settingsIcon} alt="Settings" className="w-8 h-8 opacity-60" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Platform Detection */}
        <div className="bg-[#1C1E2B] border border-[#181920] rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  platformData.detected ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-[#C7D0FF] text-sm">
                {platformData.detected ? 'Platform detected' : 'No platform detected'}
              </span>
            </div>
            <button 
              onClick={() => detectCurrentPlatform(true)}
              disabled={refreshing}
              className={`w-8 h-8 flex items-center justify-center border border-[#1C1E2B] rounded bg-[#323762] transition-all ${
                refreshing 
                  ? 'text-[#4B5CC4]' 
                  : 'text-[#C7D0FF] hover:opacity-80'
              }`}
              title="Refresh detection"
            >
              <img 
                src={refreshIcon} 
                alt="Refresh" 
                className={`w-5 h-5 opacity-60 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          <div className="text-sm text-[#7D87AD]">
            {platformData.detected ? platformData.platform : 'Unknown'}
          </div>
        </div>

        {/* Message Stats */}
        {platformData.detected && (
          <div className="bg-[#1C1E2B] border border-[#181920] rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 text-center gap-4">
              <div>
                <div className="text-2xl font-bold text-[#C7D0FF] mb-1">{platformData.messageCount}</div>
                <div className="text-sm text-[#7D87AD]">Messages</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4B5CC4] mb-1">
                  {platformData.tokenCount > 1000 
                    ? `${(platformData.tokenCount / 1000).toFixed(1)}k`
                    : platformData.tokenCount
                  }
                </div>
                <div className="text-sm text-[#7D87AD]">Tokens</div>
              </div>
            </div>
          </div>
        )}

        {/* Target Tokens */}
        <div className="flex items-center gap-2 mb-4 px-3">
          <span className="text-sm text-[#C7D0FF]">Target:</span>
          <input
            type="number"
            value={targetTokens}
            onChange={(e) => setTargetTokens(Number(e.target.value))}
            className="w-16 px-2 py-1 text-center text-sm border border-[#1C1E2B] rounded bg-[#393A6B] text-[#C7D0FF] focus:outline-none focus:border-[#4B5CC4]"
          />
          <span className="text-sm text-[#C7D0FF]">tokens</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 mb-4 px-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: statusContent[state].color }}
          ></div>
          <span className="text-sm text-[#C7D0FF]">{statusContent[state].text}</span>
        </div>

        {/* Scroll Warning for Chat Platforms */}
        {platformData.detected && ['chatgpt', 'claude', 'gemini'].includes(platformData.platform) && (
          <div className="bg-[#2A2F5A] border border-[#3A4178] rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-xs">⚠️</span>
              <div>
                <p className="text-xs text-[#C7D0FF] font-medium mb-1">Scroll to load all messages</p>
                <p className="text-xs text-[#7D87AD]">
                  Chat platforms lazy-load messages. Scroll through your entire conversation first to ensure all messages are detected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(state === 'extracting' || state === 'condensing') && (
          <div className="mb-4">
            <div className="h-1.5 bg-[#1C1E2B] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(to right, #4B5CC4, #6E7FFF)'
                }}
              ></div>
            </div>
            <div className="text-center text-sm mt-2 text-[#C7D0FF]">{progress}%</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {state === 'ready' && (
            <button
              onClick={handleExtract}
              disabled={!platformData.detected}
              className={`w-full py-3 px-4 rounded-lg font-medium transition duration-200 ${
                platformData.detected 
                  ? 'bg-[#323D78] text-[#C7D0FF] hover:bg-[#4B5CC4]' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Extract & Condense
            </button>
          )}

          {state === 'success' && (
            <>
              <button
                onClick={handleDownload}
                className="w-full py-3 px-4 rounded-lg font-medium bg-[#323D78] text-[#C7D0FF] hover:bg-[#4B5CC4] transition duration-200"
              >
                Download .md File
              </button>
              <button
                onClick={handleCopy}
                className="w-full py-3 px-4 rounded-lg font-medium bg-[#2E3053] text-[#C7D0FF] hover:bg-[#4B5CC4] transition duration-200"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleReset}
                className="w-full py-3 px-4 rounded-lg font-medium bg-[#1C1E2B] text-[#C7D0FF] hover:bg-[#4B5CC4] transition duration-200"
              >
                Extract Another
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#181920] pt-3 mt-4">
          <p className="text-xs text-center text-[#7D87AD]">
            Open source • BYOK • Privacy-first
          </p>
        </div>
      </div>
    </div>
  );
}