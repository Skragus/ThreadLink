// tests/e2e/helpers/test-data.ts

// Generate sample conversations
function generateConversation(exchanges: number): string {
  const topics = ['AI', 'science', 'coding', 'philosophy', 'history'];
  let conversation = '';
  
  for (let i = 0; i < exchanges; i++) {
    const topic = topics[i % topics.length];
    conversation += `User: Tell me about ${topic} topic ${i + 1}\n\n`;
    conversation += `Assistant: Here's information about ${topic}. `.repeat(20);
    conversation += `This is exchange ${i + 1} of ${exchanges}.\n\n`;
  }
  
  return conversation;
}

export const TEST_DATA = {
  tiny: {
    text: "Hello, how are you?\n\nI'm doing great, thanks!",
    tokens: 15,
    expectedOutputPattern: /doing great/i
  },
  
  small: {
    text: generateConversation(50),
    tokens: 1000,
    expectedRatio: { min: 5, max: 15 },
    expectedDrones: 3
  },
  
  medium: {
    text: generateConversation(500),
    tokens: 10000,
    expectedRatio: { min: 10, max: 20 },
    expectedDrones: 8
  },

  large: {
    text: generateConversation(1000),
    tokens: 20000,
    expectedRatio: { min: 15, max: 25 },
    expectedDrones: 15
  },
  
  unicode: {
    text: "测试 🚀 Test → café • Mathematics: ∑∫∂∇ π=3.14",
    tokens: 20,
    preserveChars: ['测试', '🚀', '→', 'café', '∑', 'π']
  }
};

export const TEST_KEYS = {
  valid: {
    google: 'AIzaSyD-valid-test-key-xxxxx',
    openai: 'sk-proj-valid-test-key-xxxxx',
    anthropic: 'sk-ant-api03-valid-test-xxxxx'
  },
  
  invalid: {
    google: 'invalid-google-key',
    openai: 'wrong-prefix-xxxxx',
    anthropic: 'sk-ant-malformed'
  }
};