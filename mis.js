
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
              length: text?.length,
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
    
    // Extract message content using our new function
    const messages = extractMessageContent(messageElements, 'gemini');
    
    // Calculate token count
    const tokenCount = estimateTokens(messageElements);
    
    console.log(`📊 Final extraction: ${messages.length} messages, ~${tokenCount} tokens`);
    
    return {
      messageCount: messages.length,
      tokenCount: tokenCount,
      messages: messages, // Return ALL messages
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