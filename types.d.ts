// Global type declarations for JavaScript modules

declare module './src/pipeline/orchestrator.js' {
  export interface CondensationOptions {
    inputText: string;
    model: string;
    apiKey: string;
    compressionRatio: string;
    temperature: number;
    options?: {
      recencyStrength?: number;
      droneDensity?: number;
      maxDrones?: number;
    };
    onProgress?: (update: ProgressUpdate) => void;
    cancelled?: () => boolean;
  }

  export interface ProgressUpdate {
    phase?: 'preparing' | 'launching' | 'processing' | 'finalizing';
    message?: string;
    completedDrones?: number;
    totalDrones?: number;
    progress?: number;
  }

  export interface CondensationResult {
    outputText: string;
    executionTime?: string | number;
    stats?: {
      compressionRatio?: string | number;
      successfulDrones?: number;
      totalDrones?: number;
      initialTokens?: number;
      finalTokens?: number;
    };
    sessionStats?: {
      compressionRatio?: string | number;
    };
  }

  export function runCondensationPipeline(options: CondensationOptions): Promise<CondensationResult>;
}

declare module './src/lib/storage.js' {
  export function getAPIKey(provider: string): string | null;
  export function saveAPIKey(provider: string, key: string): void;
  export function removeAPIKey(provider: string): void;
  export function getSettings(): Record<string, any>;
  export function saveSettings(settings: Record<string, any>): void;
}

declare module './src/lib/client-api.js' {
  export const MODEL_PROVIDERS: Record<string, any>;
  export function estimateTokens(text: string): number;
}

// Export types globally for use in components
export interface ProgressUpdate {
  phase?: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message?: string;
  completedDrones?: number;
  totalDrones?: number;
  progress?: number;
}
