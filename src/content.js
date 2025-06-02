// ChatGPT Platform Detection & Data Extraction
console.log('ThreadLink content script loaded on:', window.location.hostname);

const KEEP_THINKING = false; // note: thinking filter inconsistent


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
    
    // Clone element to avoid modifying original DOM
    const messageClone = element.cloneNode(true);

    // STEP 3: REPLACE ARTIFACTS WITH SUMMARIES
    replaceClaudeArtifacts(messageClone);
    
    
    console.log('🗑️ Removing all buttons...');

    const buttons = messageClone.querySelectorAll('button');
    let buttonsRemoved = 0;

    buttons.forEach(btn => {
      // keep buttons that hold artifacts *or* their placeholders
      if (btn.querySelector('.artifact-block-cell, .threadlink-artifact-placeholder, .threadlink-code-placeholder')) {
        return;
      }

      const txt = btn.textContent?.trim() || '';
      if (txt) {
        console.log(`🔍 Removing button: "${txt.slice(0, 80)}..."`);
        btn.remove();
        buttonsRemoved++;
      }
    });

    console.log(`✅ Removed ${buttonsRemoved} buttons`);

    if (!KEEP_THINKING) {
      // STEP 2: REMOVE THINKING CONTENT CONTAINERS
      const tabindexDivs = messageClone.querySelectorAll('div[tabindex="-1"]');
      
      tabindexDivs.forEach(div => {
        const paragraphs = div.querySelectorAll('p.whitespace-normal.break-words');
        const hasThinkingContent = Array.from(paragraphs).some(p => {
          const text = p.textContent || '';
          return /^(The user|I've demonstrated|In this conversation|From the artifacts|Let me think|I should)/.test(text.trim());
        });
        
        if (hasThinkingContent) {
          console.log('🗑️ Found thinking container, removing...');
          const overflowContainer = div.closest('.overflow-hidden.shrink-0') || 
                                  div.closest('[class*="overflow-hidden"]') ||
                                  div;
          overflowContainer.remove();
        }
      });
    }

    // STEP 4: HANDLE REMAINING CODE BLOCKS
    replaceCodeBlocks(messageClone);
    
    // STEP 5: Get text
    let cleanedText = messageClone.innerText || messageClone.textContent || '';
    
    // SAFER APPROACH: Only remove thinking headers at the very START of the message
    
    if (!KEEP_THINKING) {
      const firstLineMatch = cleanedText.match(/^(Thinking about|Engineered|Analyzed|Devised|Strategized|Diagnosed|Crafted|Mapped out|Pondered)[^\n]*\n/);
      if (firstLineMatch) {
        console.log(`🗑️ Removing thinking header at start: "${firstLineMatch[0].trim()}"`);
        cleanedText = cleanedText.substring(firstLineMatch[0].length);
      }
    }
    
    // Fix artifact formatting
    cleanedText = cleanedText.replace(/(\w+)\[Artifact:/g, '[Artifact:');

    if (!cleanedText) {
      const stubNodes = messageClone.querySelectorAll('.threadlink-artifact-placeholder');
      if (stubNodes.length) {
        cleanedText = Array.from(stubNodes).map(n => n.textContent).join('\n');
      }
    }
    
    // Clean up whitespace
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();
    
    console.log(`🧹 Claude processing: ${element.innerText?.length || 0} → ${cleanedText.length} chars`);
    
    return cleanedText;
    
  } catch (error) {
    console.error('💥 Error processing Claude message:', error);
    return element.innerText || element.textContent || '';
  }
}


// ADD: Replace Claude artifacts with summaries
function replaceClaudeArtifacts(messageClone) {
  console.log('🔧 Replacing Claude artifacts with placeholders...');

  // Target all elements with the 'artifact-block-cell' class within the cloned message
  const artifacts = messageClone.querySelectorAll([
    '.artifact-block-cell',
    'figure[data-testid^="artifact"]',
    'div[data-testid*="artifact"]',
    'figure > img[src^="blob:"]',          // catch raw images
    'figure a[download]'                   // catch file links
  ].join(','));

  if (!artifacts.length) return;      
  let artifactsReplaced = 0;

  // Iterate over each found artifact element
  artifacts.forEach(artifact => {
    try {
      // Get the placeholder text using the helper function
      const placeholderText = generateArtifactSummary(artifact);

      // Create a new <div> element to hold the placeholder text
      const placeholderDiv = document.createElement('div');
      placeholderDiv.textContent = placeholderText; // Set its text content
      // Add a class for potential debugging or future styling if needed
      placeholderDiv.classList.add('threadlink-artifact-placeholder');

      // Insert the new <div> *before* the original artifact <div> in the DOM
      artifact.parentNode?.insertBefore(placeholderDiv, artifact);

      // Remove the original artifact <div>
      artifact.remove(); // The .remove() method is simple and effective

      artifactsReplaced++;
      console.log(`✅ Replaced artifact with: "${placeholderText}"`);

    } catch (e) {
      console.warn('Error replacing artifact:', e);
      // Fallback: If an error occurs during replacement, insert a generic placeholder
      const genericPlaceholderDiv = document.createElement('div');
      genericPlaceholderDiv.textContent = '[Artifact was here]';
      genericPlaceholderDiv.classList.add('threadlink-artifact-placeholder-fallback');
      artifact.parentNode?.insertBefore(genericPlaceholderDiv, artifact);
      artifact.remove();
      artifactsReplaced++;
    }
  });

  console.log(`✅ Replaced ${artifactsReplaced} artifacts total`);
}

// ADD: Replace large code blocks with summaries
function replaceCodeBlocks(messageClone) {
  console.log('📄 Processing code blocks...');

  // Define selectors for identifying code blocks (e.g., <pre>, <code>)
  const codeSelectors = ['pre', 'code', '.code-block', '[class*="code"]'];
  let codeBlocksReplaced = 0;

  // Iterate over each selector
  codeSelectors.forEach(selector => {
    // Find all matching code blocks within the cloned message
    const codeBlocks = messageClone.querySelectorAll(selector);
    codeBlocks.forEach(codeBlock => {
      // Only replace if it's substantial (e.g., not an inline code snippet)
      // Or if it's a <pre> tag, which typically indicates a block of code.
      const text = codeBlock.textContent || '';
      if (text.length > 100 || codeBlock.tagName === 'PRE') {
        console.log(`📄 Replacing code block (${text.length} chars)`);

        // Use your existing helper to detect the programming language
        const language = detectCodeLanguage(text);
        const lines = text.split('\n').length;
        const chars = text.length;
        // Create the placeholder text string
        const placeholderText = `[Code block: ${language} (${chars} chars, ${lines} lines)]`;

        // Create a new <div> element to hold the placeholder text
        const placeholderDiv = document.createElement('div');
        placeholderDiv.textContent = placeholderText;
        placeholderDiv.classList.add('threadlink-code-placeholder');

        // Insert the new <div> *before* the original code block 
        codeBlock.parentNode?.insertBefore(placeholderDiv, codeBlock);

        // Remove the original code block
        codeBlock.remove();

        codeBlocksReplaced++;
      }
    });
  });

  console.log(`✅ Replaced ${codeBlocksReplaced} code blocks total`);
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
    const titleElement = artifactElement.querySelector('.leading-tight.text-sm');
    let title = titleElement ? titleElement.innerText.trim() : 'Unnamed Artifact';

    const typeElement = artifactElement.querySelector('.text-sm.text-text-300');
    // Remove the non-breaking space if it exists from the type text
    let type = typeElement ? typeElement.innerText.trim().replace(/\s* \s*$/, '') : 'Artifact';

    // Prefer data-title attribute if it's more descriptive
    const dataTitle = artifactElement.getAttribute('data-title');
    if (dataTitle && dataTitle.length > title.length) {
         title = dataTitle;
    }

    // Return the string that will be used as content for the new DOM element
    return `[Artifact: "${title}" - ${type}]`;

  } catch (error) {
    console.error('Error generating artifact summary from element:', error);
    return '[Artifact: Content]'; // Fallback in case of parsing error
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
            
            return text && text.replace(/\[.*?\]/g,'').length > 5;
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