// utils/textProcessing.ts - Text Processing Utilities

// Import from the browser module
// @ts-ignore - JavaScript module without TypeScript declarations
import { estimateTokens as estimateTokensFromAPI } from '../lib/client-api.js';

export const estimateTokens = estimateTokensFromAPI;

export const roundTokenCount = (count: number): number => {
  if (count === 0) return 0;
  if (count < 1000) {
    return Math.round(count / 10) * 10;
  } else if (count < 5000) {
    return Math.round(count / 50) * 50;
  } else {
    return Math.round(count / 100) * 100;
  }
};

export const formatTokenCount = (count: number): string => {
  const rounded = roundTokenCount(count);
  return `${count === 0 ? '' : '~'}${rounded.toLocaleString()} tokens`;
};

export const calculateTargetTokens = (tokenCount: number, compressionRatio: string): number => {
  if (tokenCount === 0) return 100;
  
  switch (compressionRatio) {
    case 'light':
      return Math.max(50, Math.round(tokenCount / 5));
    case 'balanced':
      return Math.max(50, Math.round(tokenCount / 15));
    case 'aggressive':
      return Math.max(50, Math.round(tokenCount / 30));
    default:
      return Math.max(50, Math.round(tokenCount / 15));
  }
};

export const getErrorDisplay = (errorMessage: string, errorType?: string): string => {
  if (errorType === 'AUTH_ERROR' || errorMessage.includes('Invalid API key')) {
    return 'Authentication failed. Please check your API key configuration.';
  }
  if (errorType === 'NETWORK_ERROR' || errorMessage.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  if (errorType === 'RATE_LIMIT') {
    return 'API rate limit reached. The system is handling this automatically.';
  }
  if (errorType === 'PROCESSING_FAILURE') {
    return 'Processing failed - no content could be generated. All drones encountered errors.';
  }
  if (errorType === 'CANCELLED') {
    return 'Processing was cancelled.';
  }
  return errorMessage;
};