/* ================================================================
   GLOBAL TOGGLES
   ================================================================ */
export const KEEP_THINKING = false;      // flip to true to keep COT

/* ================================================================
   SELECTOR ARRAYS
   ================================================================ */
export const CLAUDE_SELECTORS = [
  '[data-testid*="message"]',
  '[data-testid="human-message"]',
  '[data-testid="ai-message"]',
  '[data-testid*="conversation"]',
  '[role="article"]',
  'div[data-is-streaming]',
  '.message',
  '.conversation-message',
  'main div[class*="flex"][class*="flex-col"]',
  'main article',
  'div[class*="message"]'
];

export const CHATGPT_SELECTORS = [
  '[data-message-author-role]',
  '[data-message-id]',
  '[data-testid^="conversation-turn"]',
  '.group\\/conversation-turn',
  'div[class*="group"][class*="w-full"]',
  '.flex.flex-col.text-sm.group',
  'article[data-testid*="conversation"]',
  'div:has(> div:contains("GPT"))',
  'div[class*="conversation"] > div',
  '.prose'
];

/* ================================================================
   BOILER-PLATE MATCHERS
   ================================================================ */
export const CHATGPT_IGNORE = [
  /^What's on the agenda today\?$/i,
  /^Ask anything$/i,
  /^How can I help you today\?$/i,
  /^Tools$/i,
  /^Welcome back$/i,
  /^Start a new chat$/i,
  /^ChatGPT can make mistakes$/i,
  /^What's on the agenda today\? Tools$/i
];

export const CLAUDE_IGNORE = [
  /^Hello! I'm Claude$/i,
  /^How can I help you today\?$/i,
  /^I'm Claude, an AI assistant$/i,
  /^What would you like to work on\?$/i,
  /^Start a new chat$/i,
  /^Claude can make mistakes$/i
];
