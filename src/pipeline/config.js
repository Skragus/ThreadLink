/**
 * Configuration module for ThreadLink
 * All pipeline configuration constants and utility functions
 * Browser-compatible ES Module version
 */

// === CORE USER-FACING SETTINGS ===
export const TARGET_CONTEXT_CARD_TOKENS = 3000;   // What the user actually wants
export const DRONES_PER_10K_TOKENS = 2;           // 2 drones per 10k input tokens (updated from 10)
export const MAX_TOTAL_DRONES = 50;               // Hard cap to prevent runaway costs (updated from 100)

// === NEW QUALITY & COMPRESSION GUARDRAILS ===
export const MAX_COMPRESSION_RATIO = 30;  // Maximum compression ratio allowed
export const MINIMUM_OUTPUT_PER_DRONE = 50; // Hard floor for any single drone's output

// === DERIVED DRONE SETTINGS ===
export const DRONE_INPUT_TOKEN_MAX = 6000;                                    // Good for Flash efficiency
export const DRONE_INPUT_TOKEN_MIN = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.5); // 3000 - flexibility
export const DRONE_IDEAL_TARGET_TOKENS = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.75); // 4500

// === SEGMENTATION SETTINGS (derived from drone settings) ===

// Stage 3: Tiny Orphan Rescue (batcher.js)
export const MIN_ORPHAN_TOKEN_THRESHOLD = 50; // Paragraphs below this token count are considered orphans

// Stage 4: Segment Consolidation (batcher.js)
export const MIN_SEGMENT_TARGET_TOKENS = 250;  // Soft minimum token size for consolidated segments
export const AGGREGATOR_CEILING_TOKENS = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.8); // 4800 - leave room for separators

// Stage 5: Drone Batching (batcher.js)
export const DRONE_TARGET_TOKEN_WINDOW_LOWER_PERCENT = 0.60; // 60% of ideal = 2700
export const DRONE_TARGET_TOKEN_WINDOW_UPPER_PERCENT = 1.00; // 100% of ideal = 4500

// "Last Two Drone Rebalance" specific settings (batcher.js)
export const REBALANCE_LOWER_THRESHOLD_PERCENT = 0.85; // If last batch is below 85% of DRONE_IDEAL_TARGET_TOKENS
export const REBALANCE_UPPER_THRESHOLD_PERCENT = 1.05; // If second-to-last batch is above 105% of DRONE_IDEAL_TARGET_TOKENS

// "Last Drone Scraps" policy (droneBatcher.js)
export const ABSOLUTE_MIN_VIABLE_DRONE_TOKENS = 100; // Smallest payload to send, even if below DRONE_INPUT_TOKEN_MIN

// Stage 6: Final Drone Input String Preparation (batcher.js)
export const RECENT_CONVERSATION_MIN_TOKENS = 600;

// === QUALITY CONTROL SETTINGS ===
export const QUALITY_MIN_TOKEN_ABSOLUTE = 25;           // Absolute minimum tokens for quality check
export const QUALITY_MIN_TOKEN_PERCENTAGE = 0.1;       // Minimum percentage of target tokens
export const QUALITY_MIN_CHAR_COUNT = 50;               // Minimum character count for quality

// === OUTPUT SAFETY SETTINGS ===
export const MAX_OUTPUT_TOKENS_SAFETY = 2048;           // Hard limit safety net for output tokens
export const MAX_FINAL_OUTPUT_TOKENS = Math.max(TARGET_CONTEXT_CARD_TOKENS, 6000); // Use user target or minimum viable

// Default output target (used by batcher for initial planning)
export const DEFAULT_DRONE_OUTPUT_TOKEN_TARGET = Math.ceil(TARGET_CONTEXT_CARD_TOKENS / Math.ceil(10000 / 10000 * DRONES_PER_10K_TOKENS));
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1000;
export const DEFAULT_RATE_LIMIT_BACKOFF_MS = 60000;
export const CLAUDE_RATE_LIMIT_BACKOFF_MS = 300000;
export const GEMINI_RATE_LIMIT_BACKOFF_MS = 60000;
export const GPT4_RATE_LIMIT_BACKOFF_MS = 60000;
export const DEFAULT_CONSERVATIVE_CONCURRENCY = 5;
export const DEFAULT_STANDARD_CONCURRENCY = 10;
export const CONSOLE_SPECIAL_CHAR_THRESHOLD_PERCENT = 0.1;

// Processing speed presets
export const PROCESSING_SPEED_FAST = 'fast';
export const PROCESSING_SPEED_BALANCED = 'balanced';

// Recency strength presets
export const RECENCY_STRENGTH_OFF = 0;
export const RECENCY_STRENGTH_SUBTLE = 25;
export const RECENCY_STRENGTH_BALANCED = 50;
export const RECENCY_STRENGTH_STRONG = 100;

// Text separators and formatting
export const CONSOLIDATION_SEPARATOR = '\n\n';
export const ORPHAN_MERGE_SEPARATOR = '\n\n';
export const SEGMENT_TEXT_SEPARATOR = '\n\n---\n\n';

// Default drone prompt template
export const DEFAULT_DRONE_PROMPT = `You are an AI conversation condensation specialist. Your mission is to distill conversation segments into ultra-dense, context-rich summaries.

CRITICAL OBJECTIVES:
- NO HALLUCINATION: Do not invent or assume information not present in the input.
- PRESERVE MAXIMUM CONTEXT: Keep all key decisions, technical details, code snippets, and actionable insights
- CONDENSE RUTHLESSLY: Remove redundancy, filler, and verbose explanations while retaining substance
- MAINTAIN FLOW: Preserve chronological flow, decisions, and cause-effect relationships
- FOCUS ON VALUE: Prioritize information that would be essential for understanding this conversation later

OUTPUT REQUIREMENTS:
- You have a strict token budget of approximately {TARGET_TOKENS} tokens. All CRITICAL OBJECTIVES must be met within this budget.
- YOUR RESPONSE MUST START WITH THE FIRST WORD OF THE SUMMARY. DO NOT include any preamble or meta-commentary.
- Use information-dense prose with technical precision
- Retain commands, configs, and code verbatim where relevant
- Preserve important URLs, names, and numerical values
- Connect ideas with concise transitions
- ALWAYS finish your thoughts completely - no mid-sentence cutoffs

Your condensed segment will join others to create a comprehensive context card for future AI assistants. Every token must earn its place.`;


// === MODEL CONFIGURATIONS ===
export const MODEL_CONFIGS = {
    'claude-3-5-haiku-20241022': { 
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY, 
        rateLimitBackoff: DEFAULT_RATE_LIMIT_BACKOFF_MS,  // 1 minute conservative wait
        maxRetries: 3,
        aggressive: false
    },
    'gemini-1.5-flash': { 
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY, 
        rateLimitBackoff: GEMINI_RATE_LIMIT_BACKOFF_MS,  // 30 seconds
        maxRetries: 2,
        aggressive: true
    },
    'gemini-1.5-pro': {
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY,
        rateLimitBackoff: GEMINI_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 2,
        aggressive: false
    },
    'gemini-pro': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: GEMINI_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    },
    'gpt-4.1-nano': { 
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY, 
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,  // 45 seconds
        maxRetries: 2,
        aggressive: true
    },
    'gpt-4.1-mini': { 
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY, 
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,  // 45 seconds
        maxRetries: 2,
        aggressive: true
    },
    'gpt-4': {
        safeConcurrency: DEFAULT_CONSERVATIVE_CONCURRENCY,
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: false
    },
    'gpt-4o': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    },
    'gpt-4o-mini': {
        safeConcurrency: DEFAULT_STANDARD_CONCURRENCY,
        rateLimitBackoff: GPT4_RATE_LIMIT_BACKOFF_MS,
        maxRetries: 3,
        aggressive: true
    }
};

/**
 * Calculates the optimal drone output target, respecting quality and compression guardrails.
 * @param {number} inputTokens - Total tokens in the session
 * @param {number} customTargetTokens - Custom target tokens (overrides default)
 * @param {number} customDroneDensity - Custom drone density (overrides default)
 * @returns {number} Target tokens per drone output
 */
export function calculateDroneOutputTarget(inputTokens, customTargetTokens = TARGET_CONTEXT_CARD_TOKENS, customDroneDensity = null) {
    const droneDensity = customDroneDensity !== null ? customDroneDensity : DRONES_PER_10K_TOKENS;
    const estimatedDrones = calculateEstimatedDrones(inputTokens, droneDensity);

    const targetFromCompressionCap = Math.ceil(inputTokens / MAX_COMPRESSION_RATIO);
    const userRequestedTarget = customTargetTokens || TARGET_CONTEXT_CARD_TOKENS;
    const effectiveTotalTarget = Math.max(userRequestedTarget, targetFromCompressionCap);
    const calculatedPerDroneTarget = Math.ceil(effectiveTotalTarget / estimatedDrones);
    const finalPerDroneTarget = Math.max(calculatedPerDroneTarget, MINIMUM_OUTPUT_PER_DRONE);

    return finalPerDroneTarget;
}

/**
 * Calculate estimated number of drones for a session
 * @param {number} inputTokens - Total tokens in the session
 * @param {number} customDroneDensity - Custom drone density (overrides default)
 * @param {number} customMaxDrones - Custom max drones (overrides default)
 * @returns {number} Estimated number of drones needed
 */
export function calculateEstimatedDrones(inputTokens, customDroneDensity = null, customMaxDrones = null) {
    const droneDensity = customDroneDensity !== null ? customDroneDensity : DRONES_PER_10K_TOKENS;
    const maxDrones = customMaxDrones !== null ? customMaxDrones : MAX_TOTAL_DRONES;
    
    return Math.min(
        Math.ceil(inputTokens / 10000 * droneDensity),
        maxDrones
    );
}

/**
 * Get optimal drone input size based on session size - FIXED for high density
 * @param {number} inputTokens - Total tokens in the session
 * @param {number} customDroneDensity - Custom drone density
 * @param {number} customMaxDrones - Custom max drones
 * @returns {number} Optimal tokens per drone input
 */
export function calculateOptimalDroneInputSize(inputTokens, customDroneDensity = null, customMaxDrones = null) {
    const estimatedDrones = calculateEstimatedDrones(inputTokens, customDroneDensity, customMaxDrones);
    const optimalSize = Math.ceil(inputTokens / estimatedDrones);
    
    // For high drone density (≥3), allow much smaller optimal sizes
    if (customDroneDensity && customDroneDensity >= 3) {
        // High density mode: allow down to 500 tokens, up to normal max
        const minSize = 500;
        const maxSize = DRONE_INPUT_TOKEN_MAX;
        return Math.min(Math.max(optimalSize, minSize), maxSize);
    }
    
    // Normal density mode: use standard clamps
    return Math.min(Math.max(optimalSize, DRONE_INPUT_TOKEN_MIN), DRONE_INPUT_TOKEN_MAX);
}

/**
 * Get processing speed adjustments
 * @param {string} processingSpeed - 'balanced' or 'fast'
 * @returns {object} Adjustments for retries and other parameters
 */
export function getProcessingSpeedAdjustments(processingSpeed) {
    if (processingSpeed === PROCESSING_SPEED_FAST) {
        return {
            maxRetries: 1,  // Fewer retries for speed
            qualityCheckLevel: 'basic',  // Less stringent quality checks
            rateLimitBackoffMultiplier: 0.5  // Shorter waits
        };
    }
    return {
        maxRetries: 3,  // Normal retries
        qualityCheckLevel: 'standard',
        rateLimitBackoffMultiplier: 1.0
    };
}