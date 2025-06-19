// types/index.ts - Shared TypeScript Types

export interface ProgressUpdate {
  phase?: 'preparing' | 'launching' | 'processing' | 'finalizing';
  message?: string;
  completedDrones?: number;
  totalDrones?: number;
  progress?: number;
}

export interface Stats {
  executionTime: string | number;
  compressionRatio: string | number;
  successfulDrones: number;
  totalDrones: number;
  initialTokens?: number;
  finalTokens?: number;
}

export interface LoadingProgress {
  phase: 'preparing' | 'launching' | 'processing' | 'finalizing' | 'cancelled';
  message: string;
  completedDrones?: number;
  totalDrones?: number;
  elapsedTime?: number;
  progress?: number;
}

export interface ExpandedSections {
  what: boolean;
  howto: boolean;
  compression: boolean;
  strategy: boolean;
  drones: boolean;
  recency: boolean;
  advanced: boolean;
  privacy: boolean;
}

export interface PipelineSettings {
  model: string;
  temperature: number;
  maxConcurrency: number;
  customTargetTokens: number | null;
  processingSpeed: string;
  recencyMode: boolean;
  recencyStrength: number;
  droneDensity?: number;
  maxDrones?: number;
  // Add custom prompt fields
  useCustomPrompt?: boolean;
  customPrompt?: string;
}

export interface PipelineResult {
  success: boolean;
  contextCard?: string;
  error?: string;
  errorType?: string;
  executionTime?: number;
  stats?: any;
  sessionStats?: any;
}