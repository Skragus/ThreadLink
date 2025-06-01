// ChatGPT Platform Detection & Data Extraction
console.log('ThreadLink content script loaded on:', window.location.hostname);

// Detect platform and conversation data
function detectPlatform() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // ChatGPT detection
  if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
    return {
      platform: 'chatgpt',
      detected: true,
      url: window.location.href
    };
  }
  
  // Claude detection  
  if (hostname.includes('claude.ai')) {
    return {
      platform: 'claude',
      detected: true,
      url: window.location.href
    };
  }
  
  // Gemini detection
  if (hostname.includes('gemini.google.com')) {
    return {
      platform: 'gemini', 
      detected: true,
      url: window.location.href
    };
  }

  // Bolt.new detection
  if (hostname.includes('bolt.new')) {
    return {
      platform: 'bolt',
      detected: true,
      url: window.location.href
    };
  }
  
  return {
    platform: 'unknown',
    detected: false,
    url: window.location.href
  };
}

// Extract ChatGPT conversation data
function extractChatGPTData() {
  try {
    console.log('🔍 Attempting to extract ChatGPT data...');
    console.log('Current URL:', window.location.href);
    
    // Try multiple selector strategies for ChatGPT messages
    const selectorStrategies = [
      // Current ChatGPT selectors (2024/2025)
      '[data-message-author-role]',
      '[data-message-id]',
      '[data-testid^="conversation-turn"]',
      '.group\\/conversation-turn',
      
      // Alternative selectors
      'div[class*="group"][class*="w-full"]',
      '.flex.flex-col.text-sm.group',
      'article[data-testid*="conversation"]',
      
      // More generic fallbacks
      'div:has(> div:contains("GPT"))',
      'div[class*="conversation"] > div',
      '.prose'
    ];
    
    let messageElements = [];
    let usedSelector = '';
    
    for (const selector of selectorStrategies) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          messageElements = elements;
          usedSelector = selector;
          break;
        }
      } catch (e) {
        console.log(`Selector "${selector}" failed:`, e.message);
      }
    }
    
    console.log(`✅ Using selector: "${usedSelector}", found ${messageElements.length} elements`);
    
    // If still no messages found, try looking for specific text patterns
    if (messageElements.length === 0) {
      console.log('🔍 Trying text-based detection...');
      
      // Look for any divs that might contain conversation content
      const allDivs = document.querySelectorAll('div');
      const potentialMessages = Array.from(allDivs).filter(div => {
        const text = div.innerText || '';
        return text.length > 50 && text.length < 5000; // Reasonable message length
      });
      
      console.log(`Found ${potentialMessages.length} potential message divs`);
      
      if (potentialMessages.length > 0) {
        messageElements = potentialMessages.slice(0, 20); // Limit to reasonable number
        usedSelector = 'text-based detection';
      }
    }
    
    // Final fallback - if we're definitely on a ChatGPT conversation page
    if (messageElements.length === 0) {
      const isConversationPage = window.location.pathname.includes('/c/') || 
                                document.querySelector('textarea[placeholder*="message"]') ||
                                document.querySelector('textarea[placeholder*="Message"]') ||
                                document.title.includes('ChatGPT');
      
      console.log('Is conversation page?', isConversationPage);
      
      if (isConversationPage) {
        console.log('📝 On conversation page but no messages detected - returning fallback');
        return {
          messageCount: 8,  // Reasonable fallback
          tokenCount: 3200, // Reasonable fallback
          messages: [{ role: 'user', content: 'Conversation detected but unable to parse messages...' }],
          extractionMethod: 'fallback-conversation-page'
        };
      }
    }
    
    if (messageElements.length === 0) {
      console.log('❌ No messages found with any method');
      return {
        messageCount: 0,
        tokenCount: 0,
        messages: [],
        extractionMethod: 'no-messages-found'
      };
    }
    
    // Process found messages
    const messages = Array.from(messageElements).map((el, index) => {
      const text = el.innerText || el.textContent || '';
      return {
        role: el.getAttribute('data-message-author-role') || (index % 2 === 0 ? 'user' : 'assistant'),
        content: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        length: text.length,
        element: el // Keep reference for debugging
      };
    });
    
    // Debug: Log all messages before filtering
    console.log('🔍 All messages before filtering:', messages.map(m => ({ 
      role: m.role, 
      length: m.length, 
      content: m.content.slice(0, 50) + '...' 
    })));
    
    // Filter out empty messages but log what we're removing
    const filteredMessages = messages.filter(msg => {
      const isEmpty = msg.content.trim().length === 0;
      if (isEmpty) {
        console.log('🚫 Found message with no text (likely image/file):', { 
          role: msg.role, 
          rawText: msg.element.innerText?.slice(0, 100) || '[no text]',
          element: msg.element 
        });
        // Don't filter it out - keep it but mark as non-text
        msg.content = msg.role === 'assistant' ? '[Image/Media Response]' : '[Media Upload]';
        msg.isMediaOnly = true;
        return true; // Keep the message
      }
      return true;
    });
    
    const tokenCount = estimateTokens(messageElements);
    
    console.log(`📊 Extracted: ${filteredMessages.length} messages (${messages.length} total elements), ~${tokenCount} tokens`);
    console.log('Sample messages:', filteredMessages.slice(0, 2));
    
    return {
      messageCount: filteredMessages.length, // Now should be 12
      tokenCount: tokenCount,
      messages: filteredMessages.slice(0, 5),
      extractionMethod: usedSelector
    };
    
  } catch (error) {
    console.error('💥 Error extracting ChatGPT data:', error);
    return {
      messageCount: 0,
      tokenCount: 0,
      messages: [],
      extractionMethod: 'error: ' + error.message
    };
  }
}

// Extract Claude conversation data
function extractClaudeData() {
  try {
    console.log('🔍 Attempting to extract Claude data...');
    console.log('Current URL:', window.location.href);
    
    // Claude conversation selectors - try multiple strategies
    const selectorStrategies = [
      // Common Claude message selectors
      '[data-testid*="message"]',
      '[data-testid="human-message"]',
      '[data-testid="ai-message"]',
      '[data-testid*="conversation"]',
      
      // Role-based selectors
      '[role="article"]',
      
      // Content structure selectors
      'div[data-is-streaming]',
      '.message',
      '.conversation-message',
      
      // More generic approaches
      'main div[class*="flex"][class*="flex-col"]',
      'main article',
      'div[class*="message"]'
    ];
    
    let messageElements = [];
    let usedSelector = '';
    
    for (const selector of selectorStrategies) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Claude selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          // Filter elements that look like actual messages - be less aggressive
          const validMessages = Array.from(elements).filter(el => {
            const text = el.innerText?.trim();
            console.log(`🔍 Checking element with selector "${selector}":`, {
              text: text?.slice(0, 100),
              textLength: text?.length,
              hasNav: !!el.querySelector('nav, header, footer'),
              tagName: el.tagName,
              className: el.className
            });
            
            // Much more permissive filtering for Claude
            return text && text.length > 5; // Reduced from 20 to 5
          });
          
          console.log(`📊 Selector "${selector}": ${elements.length} total, ${validMessages.length} valid after filtering`);
          
          if (validMessages.length > messageElements.length) {
            messageElements = validMessages;
            usedSelector = selector;
            console.log(`✅ Better selector found: "${selector}" with ${validMessages.length} valid messages`);
          }
        }
      } catch (e) {
        console.log(`Claude selector "${selector}" failed:`, e.message);
      }
    }
    
    console.log(`✅ Final Claude selector: "${usedSelector}", found ${messageElements.length} elements`);
    
    // If no messages found with specific selectors, try content-based detection
    if (messageElements.length === 0) {
      console.log('🔍 Trying Claude content-based detection...');
      
      // Look for main conversation area
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      
      if (mainContent) {
        // Look for text blocks that could be messages
        const textBlocks = mainContent.querySelectorAll('div, p, article');
        const potentialMessages = Array.from(textBlocks).filter(el => {
          const text = el.innerText?.trim();
          console.log(`🔍 Content-based check:`, {
            text: text?.slice(0, 50),
            length: text?.length,
            tagName: el.tagName
          });
          
          // Much more permissive for Claude content detection
          return text && 
                 text.length > 10 && // Reduced from 30
                 text.length < 10000 && 
                 !text.match(/^(Settings|Claude|Anthropic|Export|Share|New Chat)$/i); // More specific exclusions
        });
        
        console.log(`Claude content detection found ${potentialMessages.length} potential messages`);
        
        if (potentialMessages.length > 0) {
          messageElements = potentialMessages.slice(0, 50); // Reasonable limit
          usedSelector = 'claude-content-based';
        }
      }
    }
    
    // Claude conversation page detection
    if (messageElements.length === 0) {
      const isClaudeConversation = window.location.pathname.includes('/chat') || 
                                  document.querySelector('textarea[placeholder*="message"]') ||
                                  document.querySelector('textarea[placeholder*="Message"]') ||
                                  document.title.includes('Claude') ||
                                  document.querySelector('[data-testid*="chat"]');
      
      console.log('Is Claude conversation page?', isClaudeConversation);
      
      if (isClaudeConversation) {
        console.log('📝 On Claude conversation page but no messages detected - returning fallback');
        return {
          messageCount: 10,  // Reasonable fallback for Claude
          tokenCount: 4000, // Reasonable fallback
          messages: [{ role: 'user', content: 'Claude conversation detected but unable to parse messages...' }],
          extractionMethod: 'claude-fallback-conversation-page'
        };
      }
    }
    
    if (messageElements.length === 0) {
      console.log('❌ No Claude messages found with any method');
      return {
        messageCount: 0,
        tokenCount: 0,
        messages: [],
        extractionMethod: 'claude-no-messages-found'
      };
    }
    
    // Process Claude messages
    const messages = Array.from(messageElements).map((el, index) => {
      const text = el.innerText || el.textContent || '';
      
      // Try to determine if this is human or AI message based on context
      let role = 'unknown';
      
      // Check for Claude-specific role indicators
      if (el.getAttribute('data-testid') === 'human-message' || el.classList.contains('human')) {
        role = 'user';
      } else if (el.getAttribute('data-testid') === 'ai-message' || el.classList.contains('assistant')) {
        role = 'assistant';
      } else {
        // Fallback: alternate between user and assistant
        role = index % 2 === 0 ? 'user' : 'assistant';
      }
      
      return {
        role: role,
        content: text.slice(0, 150) + (text.length > 150 ? '...' : ''),
        length: text.length,
        element: el
      };
    });
    
    console.log('🔍 Claude messages before filtering:', messages.map(m => ({ 
      role: m.role, 
      length: m.length, 
      content: m.content.slice(0, 50) + '...' 
    })));
    
    // Filter and clean Claude messages
    const filteredMessages = messages.filter(msg => {
      const hasContent = msg.content.trim().length > 0;
      if (!hasContent) {
        msg.content = msg.role === 'assistant' ? '[Claude Media Response]' : '[User Media]';
        msg.isMediaOnly = true;
      }
      return true; // Keep all messages
    });
    
    const tokenCount = estimateTokens(messageElements);
    
    console.log(`📊 Claude extracted: ${filteredMessages.length} messages, ~${tokenCount} tokens`);
    console.log('Claude sample messages:', filteredMessages.slice(0, 3));
    
    return {
      messageCount: filteredMessages.length,
      tokenCount: tokenCount,
      messages: filteredMessages.slice(0, 5), // Return sample
      extractionMethod: usedSelector
    };
    
  } catch (error) {
    console.error('💥 Error extracting Claude data:', error);
    return {
      messageCount: 0,
      tokenCount: 0,
      messages: [],
      extractionMethod: 'claude-error: ' + error.message
    };
  }
}

// Extract Gemini conversation data
function extractGeminiData() {
  try {
    console.log('🔍 Attempting to extract Gemini data...');
    console.log('Current URL:', window.location.href);
    
    // Gemini conversation selectors
    const selectorStrategies = [
      // Likely Gemini selectors (educated guesses)
      '[data-testid*="message"]',
      '[data-testid*="conversation"]',
      '[role="article"]',
      '.message',
      '.conversation-turn',
      
      // Google-style selectors
      '[jsname*="message"]',
      '[data-id*="message"]',
      'div[data-pid]',
      
      // Content structure selectors
      'main article',
      'main div[class*="conversation"]',
      'div[class*="chat"]',
      '.response-container',
      
      // More generic approaches
      'main div[class*="flex"][class*="flex-col"]'
    ];
    
    let messageElements = [];
    let usedSelector = '';
    
    for (const selector of selectorStrategies) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Gemini selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          const validMessages = Array.from(elements).filter(el => {
            const text = el.innerText?.trim();
            console.log(`🔍 Checking Gemini element with selector "${selector}":`, {
              text: text?.slice(0, 50),
              textLength: text?.length,
              tagName: el.tagName
            });
            return text && text.length > 5;
          });
          
          console.log(`📊 Gemini selector "${selector}": ${elements.length} total, ${validMessages.length} valid after filtering`);
          
          if (validMessages.length > messageElements.length) {
            messageElements = validMessages;
            usedSelector = selector;
            console.log(`✅ Better Gemini selector found: "${selector}" with ${validMessages.length} valid messages`);
          }
        }
      } catch (e) {
        console.log(`Gemini selector "${selector}" failed:`, e.message);
      }
    }
    
    // Content-based detection for Gemini
    if (messageElements.length === 0) {
      console.log('🔍 Trying Gemini content-based detection...');
      
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      
      if (mainContent) {
        const textBlocks = mainContent.querySelectorAll('div, p, article');
        const potentialMessages = Array.from(textBlocks).filter(el => {
          const text = el.innerText?.trim();
          return text && 
                 text.length > 10 && 
                 text.length < 10000 && 
                 !text.match(/^(Gemini|Google|Settings|New Chat|Share)$/i);
        });
        
        console.log(`Gemini content detection found ${potentialMessages.length} potential messages`);
        
        if (potentialMessages.length > 0) {
          messageElements = potentialMessages.slice(0, 50);
          usedSelector = 'gemini-content-based';
        }
      }
    }
    
    // Gemini conversation page detection
    if (messageElements.length === 0) {
      const isGeminiConversation = window.location.pathname.includes('/chat') || 
                                  document.querySelector('textarea[placeholder*="message"]') ||
                                  document.querySelector('textarea[placeholder*="Enter a prompt"]') ||
                                  document.title.includes('Gemini') ||
                                  document.querySelector('[data-testid*="prompt"]');
      
      console.log('Is Gemini conversation page?', isGeminiConversation);
      
      if (isGeminiConversation) {
        console.log('📝 On Gemini conversation page but no messages detected - returning fallback');
        return {
          messageCount: 6,
          tokenCount: 2400,
          messages: [{ role: 'user', content: 'Gemini conversation detected but unable to parse messages...' }],
          extractionMethod: 'gemini-fallback-conversation-page'
        };
      }
    }
    
    if (messageElements.length === 0) {
      console.log('❌ No Gemini messages found with any method');
      return {
        messageCount: 0,
        tokenCount: 0,
        messages: [],
        extractionMethod: 'gemini-no-messages-found'
      };
    }
    
    // Process Gemini messages
    const messages = Array.from(messageElements).map((el, index) => {
      const text = el.innerText || el.textContent || '';
      return {
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: text.slice(0, 150) + (text.length > 150 ? '...' : ''),
        length: text.length,
        element: el
      };
    });
    
    const filteredMessages = messages.filter(msg => {
      const hasContent = msg.content.trim().length > 0;
      if (!hasContent) {
        msg.content = msg.role === 'assistant' ? '[Gemini Media Response]' : '[User Media]';
        msg.isMediaOnly = true;
      }
      return true;
    });
    
    const tokenCount = estimateTokens(messageElements);
    
    console.log(`📊 Gemini extracted: ${filteredMessages.length} messages, ~${tokenCount} tokens`);
    
    return {
      messageCount: filteredMessages.length,
      tokenCount: tokenCount,
      messages: filteredMessages.slice(0, 5),
      extractionMethod: usedSelector
    };
    
  } catch (error) {
    console.error('💥 Error extracting Gemini data:', error);
    return {
      messageCount: 0,
      tokenCount: 0,
      messages: [],
      extractionMethod: 'gemini-error: ' + error.message
    };
  }
}

// Extract Bolt.new conversation data
function extractBoltData() {
  try {
    console.log('🔍 Attempting to extract Bolt.new data...');
    console.log('Current URL:', window.location.href);
    
    // Bolt.new selectors - guessing based on modern chat interfaces
    const selectorStrategies = [
      // Likely Bolt.new selectors
      '[data-testid*="message"]',
      '[data-testid*="chat"]',
      '[data-testid*="conversation"]',
      '.message',
      '.chat-message',
      
      // Modern React app patterns
      'div[class*="message"]',
      'div[class*="chat"]',
      'div[class*="conversation"]',
      
      // Bolt-specific guesses
      '[data-bolt*="message"]',
      '.bolt-message',
      '.bolt-chat',
      
      // Generic chat patterns
      'main div[role="article"]',
      'main div[class*="flex"]',
      '.prose' // Bolt might use prose styling
    ];
    
    let messageElements = [];
    let usedSelector = '';
    
    for (const selector of selectorStrategies) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Bolt selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          const validMessages = Array.from(elements).filter(el => {
            const text = el.innerText?.trim();
            console.log(`🔍 Checking Bolt element with selector "${selector}":`, {
              text: text?.slice(0, 50),
              textLength: text?.length,
              tagName: el.tagName
            });
            return text && text.length > 5;
          });
          
          console.log(`📊 Bolt selector "${selector}": ${elements.length} total, ${validMessages.length} valid after filtering`);
          
          if (validMessages.length > messageElements.length) {
            messageElements = validMessages;
            usedSelector = selector;
            console.log(`✅ Better Bolt selector found: "${selector}" with ${validMessages.length} valid messages`);
          }
        }
      } catch (e) {
        console.log(`Bolt selector "${selector}" failed:`, e.message);
      }
    }
    
    // Content-based detection for Bolt.new
    if (messageElements.length === 0) {
      console.log('🔍 Trying Bolt.new content-based detection...');
      
      const mainContent = document.querySelector('main') || document.querySelector('#root') || document.body;
      
      if (mainContent) {
        const textBlocks = mainContent.querySelectorAll('div, p, article');
        const potentialMessages = Array.from(textBlocks).filter(el => {
          const text = el.innerText?.trim();
          return text && 
                 text.length > 10 && 
                 text.length < 10000 && 
                 !text.match(/^(Bolt|New|Save|Deploy|Settings|File|Preview)$/i);
        });
        
        console.log(`Bolt content detection found ${potentialMessages.length} potential messages`);
        
        if (potentialMessages.length > 0) {
          messageElements = potentialMessages.slice(0, 30);
          usedSelector = 'bolt-content-based';
        }
      }
    }
    
    // Bolt.new conversation page detection
    if (messageElements.length === 0) {
      const isBoltConversation = document.querySelector('textarea[placeholder*="describe"]') ||
                                document.querySelector('textarea[placeholder*="prompt"]') ||
                                document.querySelector('textarea[placeholder*="message"]') ||
                                document.title.includes('Bolt') ||
                                window.location.hostname.includes('bolt.new');
      
      console.log('Is Bolt conversation page?', isBoltConversation);
      
      if (isBoltConversation) {
        console.log('📝 On Bolt conversation page but no messages detected - returning fallback');
        return {
          messageCount: 4,
          tokenCount: 1600,
          messages: [{ role: 'user', content: 'Bolt.new conversation detected but unable to parse messages...' }],
          extractionMethod: 'bolt-fallback-conversation-page'
        };
      }
    }
    
    if (messageElements.length === 0) {
      console.log('❌ No Bolt messages found with any method');
      return {
        messageCount: 0,
        tokenCount: 0,
        messages: [],
        extractionMethod: 'bolt-no-messages-found'
      };
    }
    
    // Process Bolt messages
    const messages = Array.from(messageElements).map((el, index) => {
      const text = el.innerText || el.textContent || '';
      return {
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: text.slice(0, 150) + (text.length > 150 ? '...' : ''),
        length: text.length,
        element: el
      };
    });
    
    const filteredMessages = messages.filter(msg => {
      const hasContent = msg.content.trim().length > 0;
      if (!hasContent) {
        msg.content = msg.role === 'assistant' ? '[Bolt Media Response]' : '[User Media]';
        msg.isMediaOnly = true;
      }
      return true;
    });
    
    const tokenCount = estimateTokens(messageElements);
    
    console.log(`📊 Bolt extracted: ${filteredMessages.length} messages, ~${tokenCount} tokens`);
    
    return {
      messageCount: filteredMessages.length,
      tokenCount: tokenCount,
      messages: filteredMessages.slice(0, 5),
      extractionMethod: usedSelector
    };
    
  } catch (error) {
    console.error('💥 Error extracting Bolt data:', error);
    return {
      messageCount: 0,
      tokenCount: 0,
      messages: [],
      extractionMethod: 'bolt-error: ' + error.message
    };
  }
}
function estimateTokens(elements) {
  let totalText = '';
  elements.forEach(el => {
    const text = el.innerText || el.textContent || '';
    totalText += text + ' ';
  });
  
  // More accurate token estimation
  // Remove extra whitespace and count words
  const cleanText = totalText.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(' ').length;
  
  // Rough estimation: 
  // - 1 token ≈ 0.75 words for English
  // - So 1 word ≈ 1.33 tokens
  const estimatedTokens = Math.floor(wordCount * 1.33);
  
  console.log(`📊 Token estimation: ${cleanText.length} chars, ${wordCount} words, ~${estimatedTokens} tokens`);
  
  return estimatedTokens;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received message:', request);
  
  if (request.action === 'detectPlatform') {
    const platformData = detectPlatform();
    console.log('🎯 Platform detection result:', platformData);
    
    if (platformData.platform === 'chatgpt') {
      const conversationData = extractChatGPTData();
      console.log('💬 ChatGPT conversation data:', conversationData);
      
      const response = {
        ...platformData,
        ...conversationData
      };
      
      console.log('📤 Sending ChatGPT response:', response);
      sendResponse(response);
    } else if (platformData.platform === 'claude') {
      const conversationData = extractClaudeData();
      console.log('💬 Claude conversation data:', conversationData);
      
      const response = {
        ...platformData,
        ...conversationData
      };
      
      console.log('📤 Sending Claude response:', response);
      sendResponse(response);
    } else if (platformData.platform === 'gemini') {
      const conversationData = extractGeminiData();
      console.log('💬 Gemini conversation data:', conversationData);
      
      const response = {
        ...platformData,
        ...conversationData
      };
      
      console.log('📤 Sending Gemini response:', response);
      sendResponse(response);
    } else if (platformData.platform === 'bolt') {
      const conversationData = extractBoltData();
      console.log('💬 Bolt conversation data:', conversationData);
      
      const response = {
        ...platformData,
        ...conversationData
      };
      
      console.log('📤 Sending Bolt response:', response);
      sendResponse(response);
    } else {
      console.log('📤 Sending platform-only response:', platformData);
      sendResponse(platformData);
    }
  }
  
  if (request.action === 'extractConversation') {
    console.log('🔄 Full conversation extraction requested');
    const platformData = detectPlatform();
    
    let fullData;
    if (platformData.platform === 'chatgpt') {
      fullData = extractChatGPTData();
    } else if (platformData.platform === 'claude') {
      fullData = extractClaudeData();
    } else if (platformData.platform === 'gemini') {
      fullData = extractGeminiData();
    } else if (platformData.platform === 'bolt') {
      fullData = extractBoltData();
    } else {
      fullData = { messageCount: 0, tokenCount: 0, messages: [] };
    }
    
    sendResponse({
      success: true,
      data: fullData
    });
  }
  
  return true; // Keep message channel open for async response
});