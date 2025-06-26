// utils/progressNormalizer.ts - Centralized progress state normalization

import { ProgressUpdate, LoadingProgress } from '../types';

/**
 * Creates a safe, normalized LoadingProgress object with proper defaults
 */
export function createSafeLoadingProgress(
  update: Partial<ProgressUpdate> = {},
  elapsedTime: number = 0
): LoadingProgress {
  const phase = update.phase || 'preparing';
  const message = update.message || getDefaultMessage(phase);
  const completedDrones = Math.max(0, update.completedDrones || 0);
  const totalDrones = Math.max(0, update.totalDrones || 0);
  const progress = calculateProgress(update.progress, completedDrones, totalDrones, phase);
  
  return {
    phase,
    message,
    completedDrones,
    totalDrones,
    elapsedTime: Math.max(0, elapsedTime),
    progress: Math.max(0, Math.min(100, progress)),
    isReady: true // Always ready now - modal visibility controlled by isLoading in parent
  };
}

/**
 * Gets a default message for each phase
 */
function getDefaultMessage(phase: string): string {
  switch (phase) {
    case 'preparing':
      return 'Preparing processing pipeline...';
    case 'launching':
      return 'Initializing drones...';
    case 'processing':
      return 'Processing content...';
    case 'finalizing':
      return 'Creating context card...';
    case 'cancelled':
      return 'Processing cancelled';
    default:
      return 'Processing...';
  }
}

/**
 * Calculates progress percentage with fallbacks and validation
 */
function calculateProgress(
  explicitProgress?: number,
  completedDrones?: number,
  totalDrones?: number,
  phase?: string
): number {
  // Use explicit progress if provided and valid
  if (typeof explicitProgress === 'number' && !isNaN(explicitProgress)) {
    return Math.max(0, Math.min(100, explicitProgress));
  }
  
  // Calculate from drone counts if available
  if (totalDrones && totalDrones > 0 && completedDrones !== undefined) {
    return Math.round((completedDrones / totalDrones) * 100);
  }
  
  // Fallback to phase-based progress
  switch (phase) {
    case 'preparing':
      return 5;
    case 'launching':
      return 15;
    case 'processing':
      return 30; // Will be updated as drones complete
    case 'finalizing':
      return 90;
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

/**
 * Validates and sanitizes a progress update before processing
 */
export function validateProgressUpdate(update: any): ProgressUpdate {
  if (!update || typeof update !== 'object') {
    return {};
  }
  
  const validated: ProgressUpdate = {};
  
  // Validate phase
  const validPhases = ['preparing', 'launching', 'processing', 'finalizing', 'cancelled'];
  if (typeof update.phase === 'string' && validPhases.includes(update.phase)) {
    validated.phase = update.phase as any;
  }
  
  // Validate message
  if (typeof update.message === 'string') {
    validated.message = update.message;
  }
  
  // Validate numeric fields
  if (typeof update.completedDrones === 'number' && !isNaN(update.completedDrones)) {
    validated.completedDrones = Math.max(0, Math.floor(update.completedDrones));
  }
  
  if (typeof update.totalDrones === 'number' && !isNaN(update.totalDrones)) {
    validated.totalDrones = Math.max(0, Math.floor(update.totalDrones));
  }
  
  if (typeof update.progress === 'number' && !isNaN(update.progress)) {
    validated.progress = Math.max(0, Math.min(100, update.progress));
  }
  
  return validated;
}

/**
 * Type guard to check if an object is a valid LoadingProgress
 */
export function isValidLoadingProgress(obj: any): obj is LoadingProgress {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.phase === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.completedDrones === 'number' &&
    typeof obj.totalDrones === 'number' &&
    typeof obj.elapsedTime === 'number' &&
    typeof obj.progress === 'number' &&
    typeof obj.isReady === 'boolean'
  );
}
