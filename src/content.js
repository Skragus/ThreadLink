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

function isActualConversationMessage(text, platform) {
  if (!text || text.trim().length < 3) return false;
  
  const trimmedText = text.trim();
  
  // ChatGPT welcome/interface text patterns to ignore
  const chatgptIgnorePatterns = [
    /^What's on the agenda today\?$/i,
    /^Ask anything$/i,
    /^How can I help you today\?$/i,
    /^Tools$/i,
    /^Welcome back$/i,
    /^Start a new chat$/i,
    /^ChatGPT can make mistakes$/i,
    /^What's on the agenda today\? Tools$/i
  ];
  
  if (platform === 'chatgpt') {
    // Check if it matches any ignore pattern exactly
    const shouldIgnore = chatgptIgnorePatterns.some(pattern => pattern.test(trimmedText));
    if (shouldIgnore) {
      console.log(`🚫 Ignoring welcome text: "${trimmedText}"`);
      return false;
    }
  }
  
  // Accept messages that are actual conversation content
  return trimmedText.length > 3;
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
    
    // Extract message content using our new function
    const messages = extractMessageContent(messageElements, 'chatgpt');
    
    // Filter out welcome screen messages but keep real conversation
    const filteredMessages = messages.filter(msg => {
      const isReal = isActualConversationMessage(msg.content, 'chatgpt');
      console.log(`🔍 Message check: "${msg.content.slice(0, 50)}..." → ${isReal ? 'KEEP' : 'FILTER'}`);
      return isReal;
    });
    
    console.log(`📊 Filtering: ${messages.length} raw → ${filteredMessages.length} filtered messages`);
    
    // If we filtered everything out but we're clearly on a conversation page, 
    // it might be a welcome screen - return 0 messages
    if (filteredMessages.length === 0) {
      const isConversationPage = window.location.pathname.includes('/c/') || 
                                document.querySelector('textarea[placeholder*="message"]') ||
                                document.querySelector('textarea[placeholder*="Message"]') ||
                                document.title.includes('ChatGPT');
      
      console.log('Is conversation page after filtering?', isConversationPage);
      
      if (isConversationPage && messages.length > 0) {
        console.log('🎯 Detected welcome screen - returning 0 messages');
        return {
          messageCount: 0,
          tokenCount: 0,
          messages: [],
          extractionMethod: 'welcome-screen-filtered'
        };
      }
      
      // If no conversation page detected either, try fallback
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
    
    if (filteredMessages.length === 0) {
      console.log('❌ No messages found with any method');
      return {
        messageCount: 0,
        tokenCount: 0,
        messages: [],
        extractionMethod: 'no-messages-found'
      };
    }
    
    // Calculate token count
    const tokenCount = estimateTokens(messageElements);
    
    console.log(`📊 Final extraction: ${filteredMessages.length} messages, ~${tokenCount} tokens`);
    
    return {
      messageCount: filteredMessages.length,
      tokenCount: tokenCount,
      messages: filteredMessages,
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

function isActualConversationMessage(text, platform) {
  if (!text || text.trim().length < 3) return false;
  
  const trimmedText = text.trim();
  
  // ChatGPT welcome/interface text patterns to ignore
  const chatgptIgnorePatterns = [
    /^What's on the agenda today\?$/i,
    /^Ask anything$/i,
    /^How can I help you today\?$/i,
    /^Tools$/i,
    /^Welcome back$/i,
    /^Start a new chat$/i,
    /^ChatGPT can make mistakes$/i,
    /^What's on the agenda today\? Tools$/i
  ];
  
  // Claude welcome/interface text patterns to ignore
  const claudeIgnorePatterns = [
    /^Hello! I'm Claude$/i,
    /^How can I help you today\?$/i,
    /^I'm Claude, an AI assistant$/i,
    /^What would you like to work on\?$/i,
    /^Start a new chat$/i,
    /^Claude can make mistakes$/i
  ];
  
  if (platform === 'chatgpt') {
    const shouldIgnore = chatgptIgnorePatterns.some(pattern => pattern.test(trimmedText));
    if (shouldIgnore) {
      console.log(`🚫 Ignoring ChatGPT welcome text: "${trimmedText}"`);
      return false;
    }
  } else if (platform === 'claude') {
    const shouldIgnore = claudeIgnorePatterns.some(pattern => pattern.test(trimmedText));
    if (shouldIgnore) {
      console.log(`🚫 Ignoring Claude welcome text: "${trimmedText}"`);
      return false;
    }
  }
  
  return trimmedText.length > 3;
}
// Helper function to generate artifact summaries
function generateArtifactSummary(artifactElement) {
  try {
    const content = artifactElement.textContent || artifactElement.innerText || '';
    
    if (content.length < 50) {
      return null; // Too small to be significant
    }
    
    // Try to get artifact title/type from attributes or content
    let title = 'Artifact';
    let type = 'Content';
    
    // Check for title in attributes
    const titleAttr = artifactElement.getAttribute('data-title') || 
                     artifactElement.getAttribute('title') ||
                     artifactElement.getAttribute('aria-label');
    
    if (titleAttr) {
      title = titleAttr;
    }
    
    // Detect type from content
    if (content.includes('function') || content.includes('const') || content.includes('let')) {
      type = 'JavaScript Code';
    } else if (content.includes('<div') || content.includes('<component')) {
      type = 'React Component';
    } else if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      type = 'HTML Document';
    } else if (content.includes('def ') || content.includes('import ')) {
      type = 'Python Code';
    } else if (content.includes('{') && content.includes('"')) {
      type = 'JSON/Config';
    } else if (content.includes('#') && content.includes('\n')) {
      type = 'Markdown';
    } else {
      type = 'Code';
    }
    
    const lines = content.split('\n').length;
    const chars = content.length;
    
    return `[Artifact: "${title}" - ${type} (${chars} chars, ${lines} lines)]`;
    
  } catch (error) {
    console.error('Error generating artifact summary:', error);
    return '[Artifact: Content]';
  }
}

// Helper function to detect code language
function detectCodeLanguage(code) {
  if (code.includes('function') || code.includes('const') || code.includes('=>')) {
    return 'JavaScript';
  }
  if (code.includes('def ') || code.includes('import ')) {
    return 'Python';
  }
  if (code.includes('<div') || code.includes('jsx')) {
    return 'React/JSX';
  }
  if (code.includes('<html') || code.includes('<!DOCTYPE')) {
    return 'HTML';
  }
  if (code.includes('SELECT') || code.includes('FROM')) {
    return 'SQL';
  }
  if (code.includes('```')) {
    return 'Markdown';
  }
  
  return 'Code';
}

// Helper function to get all text nodes
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// REPLACE: extractMessageContent function with this cleaner version
function extractMessageContent(messageElements, platform) {
  try {
    console.log(`🔍 Extracting messages for platform: ${platform}`);
    console.log(`📊 Starting with ${messageElements.length} message elements`);
    
    const messages = Array.from(messageElements).map((el, index) => {
      let rawText = '';
      
      // Platform-specific processing
      if (platform === 'claude') {
        rawText = processClaudeMessage(el);
      } else {
        rawText = el.innerText || el.textContent || '';
      }
      
      // Common text cleaning for all platforms
      let cleanText = rawText
        .replace(/Copy code|Copy|Regenerate|Edit|Share|Save|Like|Dislike/g, '')
        .replace(/\s+/g, ' ')
        .trim();
        
      // Handle empty or media-only messages
      if (!cleanText) {
        cleanText = index % 2 === 0 ? '[Media Upload]' : '[Media Response]';
      }
      
      // Determine message role
      const role = determineMessageRole(el, platform, index, cleanText);
      
      console.log(`📝 Message ${index}: ${role} - "${cleanText.slice(0, 100)}..."`);
      
      return {
        role,
        content: cleanText,
        index
      };
    });
    
    console.log(`✅ Successfully extracted ${messages.length} messages`);
    return messages;
    
  } catch (error) {
    console.error('💥 Error extracting message content:', error);
    return [];
  }
}

// ADD: Dedicated Claude message processing function
function processClaudeMessage(element) {
  try {
    console.log('🎯 Processing Claude message...');
    console.log('📍 Original element:', element);
    
    // Clone element to avoid modifying original DOM
    const messageClone = element.cloneNode(true);
    
    // Debug: Check what we're working with
    console.log('🔍 Cloned element classes:', messageClone.className);
    console.log('🔍 Cloned element HTML preview:', messageClone.innerHTML.slice(0, 200) + '...');
    
    // STEP 1: REMOVE THINKING PROCESS BUTTONS
    // Target buttons with the specific class pattern you showed
    const thinkingSelectors = [
      'button.group\\/row',  // Escaped forward slash
      'button[class*="group/row"]',  // Alternative selector
      'button:has(.text-text-300)',  // If :has() is supported
      'button',  // Fallback to all buttons
      '.text-text-300'  // Direct text class
    ];
    
    let totalRemoved = 0;
    
    thinkingSelectors.forEach(selector => {
      try {
        const elements = messageClone.querySelectorAll(selector);
        console.log(`🔍 Selector "${selector}" found ${elements.length} elements`);
        
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          // Check if this is thinking text (starts with time marker or thinking patterns)
          if (/^\d+s/.test(text) || text.includes('The user is asking') || text.includes('Looking at')) {
            console.log(`🗑️ Removing thinking element: "${text.slice(0, 50)}..."`);
            el.remove();
            totalRemoved++;
          } else if (selector === 'button' && text.length > 100) {
            // For generic button selector, remove long text that looks like thinking
            console.log(`🗑️ Removing suspicious button: "${text.slice(0, 50)}..."`);
            el.remove();
            totalRemoved++;
          }
        });
      } catch (e) {
        console.warn(`Selector ${selector} failed:`, e);
      }
    });
    
    console.log(`✅ Removed ${totalRemoved} thinking elements total`);
    
    // STEP 2: ADDITIONAL CLEANUP - Remove any remaining thinking text patterns
    const allTextNodes = getTextNodes(messageClone);
    allTextNodes.forEach(node => {
      const text = node.textContent || '';
      if (/^\d+s\s+The user/.test(text) || /^\d+s\s+Looking at/.test(text)) {
        console.log(`🗑️ Removing text node: "${text.slice(0, 50)}..."`);
        node.textContent = '';
      }
    });
    
    // STEP 3: REPLACE ARTIFACTS WITH SUMMARIES
    replaceClaudeArtifacts(messageClone);
    
    // STEP 4: HANDLE REMAINING CODE BLOCKS
    replaceCodeBlocks(messageClone);
    
    // STEP 5: POST-PROCESS THE TEXT
    let cleanedText = messageClone.innerText || messageClone.textContent || '';
    
    // Final cleanup - remove any thinking patterns that leaked through
    const thinkingPatterns = [
      /^\d+s\s+The user is asking.*$/gm,          // Time + "The user is asking"
      /^\d+s\s+Looking at the current.*$/gm,     // Time + "Looking at the current"  
      /^\d+s\s+I should point out.*$/gm,         // Time + "I should point out"
      /^\d+s\s+Let me think.*$/gm,               // Time + "Let me think"
      /^\d+s\s+I need to consider.*$/gm,         // Time + "I need to consider"
    ];
    
    thinkingPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '');
    });
    
    // Remove excessive newlines
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();
    
    console.log(`🧹 Claude processing complete: ${element.innerText?.length || 0} → ${cleanedText.length} chars`);
    
    return cleanedText;
    
  } catch (error) {
    console.error('💥 Error processing Claude message:', error);
    return element.innerText || element.textContent || '';
  }
}

// REPLACE: removeClaudeThinkingProcess function with this much simpler version
function removeClaudeThinkingProcess(messageClone) {
  console.log('🗑️ Removing Claude thinking process (button blacklist approach)...');
  
  // SIMPLE APPROACH: Remove all button elements
  // Since thinking process lives in buttons, just nuke all buttons
  const buttons = messageClone.querySelectorAll('button');
  buttons.forEach(button => {
    const buttonText = button.textContent?.trim() || '';
    
    // Log what we're removing for debugging
    if (buttonText.length > 10) {
      console.log(`🗑️ Removing button content: "${buttonText.slice(0, 50)}..."`);
    }
    
    // Remove the button entirely
    button.remove();
  });
  
  console.log(`✅ Removed ${buttons.length} buttons from Claude message`);
  
  // Optional: Clean up any remaining thinking text patterns as backup
  const textNodes = getTextNodes(messageClone);
  textNodes.forEach(textNode => {
    const text = textNode.textContent || '';
    if (/^\d+s\s+/.test(text) && text.length < 500) {
      console.log(`🗑️ Removing remaining thinking text: "${text.slice(0, 50)}..."`);
      textNode.remove();
    }
  });
}

// ADD: Replace Claude artifacts with summaries
function replaceClaudeArtifacts(messageClone) {
  console.log('🔧 Replacing Claude artifacts with summaries...');
  
  const artifactSelectors = [
    '[data-testid*="artifact"]',
    '.artifact-container', 
    '[class*="artifact"]',
    '.code-editor',
    '[data-type="artifact"]',
    '[class*="code-block"]',
    '.prose-code',
    '[data-artifact-id]',
    '.artifact-window',
    '.artifact-panel'
  ];
  
  artifactSelectors.forEach(selector => {
    try {
      messageClone.querySelectorAll(selector).forEach(artifact => {
        const artifactSummary = generateArtifactSummary(artifact);
        
        if (artifactSummary) {
          console.log(`🔧 Replacing artifact: ${artifactSummary}`);
          const summaryNode = document.createTextNode(artifactSummary);
          artifact.parentNode.replaceChild(summaryNode, artifact);
        } else {
          console.log(`🗑️ Removing empty artifact: ${selector}`);
          artifact.remove();
        }
      });
    } catch (e) {
      console.warn(`Artifact selector error for ${selector}:`, e);
    }
  });
}

// ADD: Replace large code blocks with summaries
function replaceCodeBlocks(messageClone) {
  console.log('📄 Processing code blocks...');
  
  const codeBlocks = messageClone.querySelectorAll('pre, code, .code-block, [class*="code"]');
  codeBlocks.forEach(codeBlock => {
    const codeText = codeBlock.textContent || '';
    
    if (codeText.length > 200) { // Substantial code
      const lines = codeText.split('\n').length;
      const language = detectCodeLanguage(codeText);
      const summary = `[Artifact: "${language} Code" (${codeText.length} chars, ${lines} lines)]`;
      
      console.log(`🔧 Replacing code block: ${summary}`);
      
      const summaryNode = document.createTextNode(summary);
      codeBlock.parentNode.replaceChild(summaryNode, codeBlock);
    }
  });
}

// ADD: Improved role detection
function determineMessageRole(element, platform, index, content) {
  if (platform === 'claude') {
    // Try multiple Claude-specific detection methods
    const isHuman = element.getAttribute('data-testid')?.includes('human-message') ||
                   element.getAttribute('data-testid')?.includes('user-message') ||
                   element.querySelector('[data-testid*="human"]') ||
                   element.closest('[data-testid*="human"]') ||
                   element.getAttribute('data-message-role') === 'user' ||
                   element.getAttribute('data-role') === 'user';
    
    const isAssistant = element.getAttribute('data-testid')?.includes('ai-message') ||
                       element.getAttribute('data-testid')?.includes('assistant-message') ||
                       element.querySelector('[data-testid*="ai"]') ||
                       element.closest('[data-testid*="ai"]') ||
                       element.getAttribute('data-message-role') === 'assistant' ||
                       element.getAttribute('data-role') === 'assistant';
    
    if (isHuman) {
      return 'user';
    } else if (isAssistant) {
      return 'assistant';
    } else {
      // Content-based detection as fallback
      const startsLikeUserMessage = /^(can you|could you|please|how do i|what|why|when|where|fix|help|create|make|show me|i need|i want|implement|okay|alright|yeah|nah|now|also)/i;
      const startsLikeAssistantMessage = /^(i'll|i can|here's|looking at|based on|let me|i've|certainly|of course|sure|absolutely)/i;
      
      if (startsLikeUserMessage.test(content)) {
        return 'user';
      } else if (startsLikeAssistantMessage.test(content)) {
        return 'assistant';
      } else {
        // Final fallback - alternating pattern
        return index % 2 === 0 ? 'user' : 'assistant';
      }
    }
  } else if (platform === 'chatgpt') {
    return element.getAttribute('data-message-author-role') || 
           (index % 2 === 0 ? 'user' : 'assistant');
  } else {
    // Default platforms
    return index % 2 === 0 ? 'user' : 'assistant';
  }
}

// ADD: Generate artifact summary from DOM element
function generateArtifactSummary(artifactElement) {
  try {
    const content = artifactElement.textContent || artifactElement.innerText || '';
    
    if (content.length < 50) {
      return null; // Too small to be significant
    }
    
    // Try to get artifact title/type from attributes
    let title = 'Content';
    let type = 'Artifact';
    
    const titleAttr = artifactElement.getAttribute('data-title') || 
                     artifactElement.getAttribute('title') ||
                     artifactElement.getAttribute('aria-label');
    
    if (titleAttr) {
      title = titleAttr;
    }
    
    // Detect type from content
    type = detectContentType(content);
    
    const lines = content.split('\n').length;
    const chars = content.length;
    
    return `[Artifact: "${title}" - ${type} (${chars} chars, ${lines} lines)]`;
    
  } catch (error) {
    console.error('Error generating artifact summary:', error);
    return '[Artifact: Content]';
  }
}

// ADD: Detect content type
function detectContentType(content) {
  if (content.includes('function') || content.includes('const') || content.includes('let')) {
    return 'JavaScript';
  }
  if (content.includes('<div') || content.includes('<component')) {
    return 'React/JSX';
  }
  if (content.includes('<html') || content.includes('<!DOCTYPE')) {
    return 'HTML';
  }
  if (content.includes('def ') || content.includes('import ')) {
    return 'Python';
  }
  if (content.includes('{') && content.includes('"')) {
    return 'JSON/Config';
  }
  if (content.includes('#') && content.includes('\n')) {
    return 'Markdown';
  }
  
  return 'Code';
}

// ADD: Detect programming language
function detectCodeLanguage(code) {
  if (code.includes('function') || code.includes('const') || code.includes('=>')) {
    return 'JavaScript';
  }
  if (code.includes('def ') || code.includes('import ')) {
    return 'Python';
  }
  if (code.includes('<div') || code.includes('jsx')) {
    return 'React/JSX';
  }
  if (code.includes('<html') || code.includes('<!DOCTYPE')) {
    return 'HTML';
  }
  if (code.includes('SELECT') || code.includes('FROM')) {
    return 'SQL';
  }
  if (code.includes('```')) {
    return 'Markdown';
  }
  
  return 'Code';
}

// ADD: Get all text nodes from element
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// ADD: Helper function to detect if content looks like an artifact
function isArtifactContent(text) {
  const artifactIndicators = [
    /```[\w]*\n[\s\S]*\n```/,           // Code blocks
    /function\s+\w+\s*\(/,              // Function definitions
    /class\s+\w+/,                      // Class definitions
    /import\s+.*from/,                  // Import statements
    /export\s+(default\s+)?/,           // Export statements
    /<\w+[^>]*>/,                       // HTML/JSX tags
    /\{\s*"[\w":\s,\[\]{}]*\}/,        // JSON objects
    /#!/,                               // Shebang lines
    /package\.json|tsconfig|webpack/    // Config files
  ];
  
  return artifactIndicators.some(pattern => pattern.test(text));
}

// ADD: Helper function to estimate content type from artifacts
function detectArtifactType(content) {
  if (content.includes('function') || content.includes('const') || content.includes('let')) {
    return 'JavaScript Code';
  }
  if (content.includes('<div') || content.includes('<component')) {
    return 'React Component';
  }
  if (content.includes('<html') || content.includes('<!DOCTYPE')) {
    return 'HTML Document';
  }
  if (content.includes('def ') || content.includes('import ')) {
    return 'Python Code';
  }
  if (content.includes('{') && content.includes('"')) {
    return 'JSON Data';
  }
  if (content.includes('---') && content.includes('#')) {
    return 'Markdown Document';
  }
  
  return 'Code Artifact';
}

// REPLACE: extractClaudeData function
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
          // Filter elements that look like actual messages
          const validMessages = Array.from(elements).filter(el => {
            const text = el.innerText?.trim();
            console.log(`🔍 Checking element with selector "${selector}":`, {
              text: text?.slice(0, 100),
              textLength: text?.length,
              hasNav: !!el.querySelector('nav, header, footer'),
              tagName: el.tagName,
              className: el.className
            });
            
            return text && text.length > 5;
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
      
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      
      if (mainContent) {
        const textBlocks = mainContent.querySelectorAll('div, p, article');
        const potentialMessages = Array.from(textBlocks).filter(el => {
          const text = el.innerText?.trim();
          console.log(`🔍 Content-based check:`, {
            text: text?.slice(0, 50),
            length: text?.length,
            tagName: el.tagName
          });
          
          return text && 
                 text.length > 10 && 
                 text.length < 10000 && 
                 !text.match(/^(Settings|Claude|Anthropic|Export|Share|New Chat)$/i);
        });
        
        console.log(`Claude content detection found ${potentialMessages.length} potential messages`);
        
        if (potentialMessages.length > 0) {
          messageElements = potentialMessages.slice(0, 50);
          usedSelector = 'claude-content-based';
        }
      }
    }
    
    // Extract message content using our improved DOM-filtering function
    const messages = extractMessageContent(messageElements, 'claude');
    
    // Filter out welcome screen messages but keep real conversation
    const filteredMessages = messages.filter(msg => {
      const isReal = isActualConversationMessage(msg.content, 'claude');
      console.log(`🔍 Claude message check: "${msg.content.slice(0, 50)}..." → ${isReal ? 'KEEP' : 'FILTER'}`);
      return isReal;
    });
    
    console.log(`📊 Claude filtering: ${messages.length} raw → ${filteredMessages.length} filtered messages`);
    
    // Apply minimal post-processing (now much simpler thanks to DOM filtering)
    const processedMessages = filteredMessages; // No post-processing needed, DOM handled it

    console.log(`🎨 No post-processing needed - DOM filtering handled everything`);

    // If we filtered everything out but we're on a conversation page
    if (processedMessages.length === 0) {
      const isClaudeConversation = window.location.pathname.includes('/chat') || 
                                  document.querySelector('textarea[placeholder*="message"]') ||
                                  document.querySelector('textarea[placeholder*="Message"]') ||
                                  document.title.includes('Claude') ||
                                  document.querySelector('[data-testid*="chat"]');
      
      console.log('Is Claude conversation page after filtering?', isClaudeConversation);
      
      if (isClaudeConversation && messages.length > 0) {
        console.log('🎯 Detected Claude welcome screen - returning 0 messages');
        return {
          messageCount: 0,
          tokenCount: 0,
          messages: [],
          extractionMethod: 'claude-welcome-screen-filtered'
        };
      }
      
      if (isClaudeConversation) {
        console.log('📝 On Claude conversation page but no messages detected - returning fallback');
        return {
          messageCount: 10,
          tokenCount: 4000,
          messages: [{ role: 'user', content: 'Claude conversation detected but unable to parse messages...' }],
          extractionMethod: 'claude-fallback-conversation-page'
        };
      }
    }
    
    if (processedMessages.length === 0) {
      console.log('❌ No Claude messages found with any method');
      return {
        messageCount: 0,
        tokenCount: 0,
        messages: [],
        extractionMethod: 'claude-no-messages-found'
      };
    }
    
    // Calculate token count AFTER processing (more accurate)
    const tokenCount = estimateTokensFromMessages(processedMessages);
    
    console.log(`📊 Final Claude extraction: ${processedMessages.length} messages, ~${tokenCount} tokens`);
    
    return {
      messageCount: processedMessages.length,
      tokenCount: tokenCount,
      messages: processedMessages,
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

// ADD: New token estimation function that works with processed messages
function estimateTokensFromMessages(messages) {
  let totalText = '';
  messages.forEach(msg => {
    totalText += msg.content + ' ';
  });
  
  // More accurate token estimation
  const cleanText = totalText.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(' ').length;
  
  // Estimation: 1 token ≈ 0.75 words for English
  const estimatedTokens = Math.floor(wordCount * 1.33);
  
  console.log(`📊 Message-based token estimation: ${cleanText.length} chars, ${wordCount} words, ~${estimatedTokens} tokens`);
  
  return estimatedTokens;
}


// **NEW: Artifact replacement function**
function replaceArtifactsWithPlaceholders(content) {
  console.log('🎨 Processing artifacts in content...');
  
  let processedContent = content;
  
  // 1. Remove Claude's internal thinking lines (time markers + reasoning)
  processedContent = processedContent.replace(
    /^\d+s\s+.*$/gm, 
    ''
  );
  
  // 2. Replace Claude's artifact headers (specific format)
  processedContent = processedContent.replace(
    /^(.*?)\s*(Code|Document|Text)\s*∙\s*Version\s*\d+\s*$/gm, 
    (match, title, type) => {
      console.log(`🔧 Found Claude artifact header: "${title.trim()}" - ${type}`);
      return `[Artifact: "${title.trim()}" - ${type}]`;
    }
  );
  
  // 3. Replace substantial code blocks (200+ chars)
  processedContent = processedContent.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, language, code) => {
    if (code.trim().length > 200) {
      const lines = code.split('\n').length;
      const chars = match.length;
      const lang = language || 'code';
      
      console.log(`🔧 Found substantial code artifact: ${lang} (${chars} chars, ${lines} lines)`);
      return `[Artifact: "${lang} Code" (${chars} chars, ${lines} lines)]`;
    }
    
    // Keep small code snippets as they're likely examples in conversation
    return match;
  });
  
  // 4. Clean up extra whitespace left by removed thinking lines
  processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Keep everything else as-is - preserve all conversation context
  return processedContent;
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
              length: text?.length,
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
    
    // Extract message content using our new function
    const messages = extractMessageContent(messageElements, 'bolt');
    
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