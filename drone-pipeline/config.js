// config.js - MVP Smart Defaults (Draft 1)
require('dotenv').config();

// === CORE USER-FACING SETTINGS ===
const TARGET_CONTEXT_CARD_TOKENS = 3000;   // What the user actually wants
const DRONES_PER_10K_TOKENS = 2;           // 2 drones per 10k input tokens
const MAX_TOTAL_DRONES = 100;              // Hard cap to prevent runaway costs

// === NEW QUALITY & COMPRESSION GUARDRAILS ===
const MAX_COMPRESSION_RATIO = 25; // Default cap at 25:1
const MINIMUM_OUTPUT_PER_DRONE = 50; // Hard floor for any single drone's output


// === DERIVED DRONE SETTINGS ===
const DRONE_INPUT_TOKEN_MAX = 6000;                                    // Good for Flash efficiency
const DRONE_INPUT_TOKEN_MIN = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.5); // 3000 - flexibility
const DRONE_IDEAL_TARGET_TOKENS = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.75); // 4500

// === SEGMENTATION SETTINGS (derived from drone settings) ===

// Stage 3: Tiny Orphan Rescue (batcher.js / orphanRescuer.js)
const MIN_ORPHAN_TOKEN_THRESHOLD = 50; // Paragraphs below this token count are considered orphans

// Stage 4: Segment Consolidation (batcher.js / segmentProcessor.js)
const MIN_SEGMENT_TARGET_TOKENS = 250;  // Soft minimum token size for consolidated segments
const AGGREGATOR_CEILING_TOKENS = Math.floor(DRONE_INPUT_TOKEN_MAX * 0.8); // 4800 - leave room for separators

// Stage 5: Drone Batching (batcher.js)
const DRONE_TARGET_TOKEN_WINDOW_LOWER_PERCENT = 0.60; // 60% of ideal = 2700
const DRONE_TARGET_TOKEN_WINDOW_UPPER_PERCENT = 1.00; // 100% of ideal = 4500

// "Last Two Drone Rebalance" specific settings (droneBatcher.js)
const REBALANCE_LOWER_THRESHOLD_PERCENT = 0.85; // If last batch is below 85% of DRONE_IDEAL_TARGET_TOKENS
const REBALANCE_UPPER_THRESHOLD_PERCENT = 1.05; // If second-to-last batch is above 105% of DRONE_IDEAL_TARGET_TOKENS

// "Last Drone Scraps" policy (droneBatcher.js)
const ABSOLUTE_MIN_VIABLE_DRONE_TOKENS = 100; // Smallest payload to send, even if below DRONE_INPUT_TOKEN_MIN

// Stage 6: Final Drone Input String Preparation (batcher.js)
const SEGMENT_TEXT_SEPARATOR = "\n\n"; // Separator used to join segment texts for a drone
const RECENT_CONVERSATION_MIN_TOKENS = 600;

// Drone Operation Specifics (used when dispatching, but good to keep with configs)
const DEFAULT_DRONE_PROMPT = `You are an AI conversation condensation specialist. Your mission is to distill conversation segments into ultra-dense, context-rich summaries.

CRITICAL OBJECTIVES:
- NO HALLUCINATION: Do not invent or assume information not present in the input.
- PRESERVE MAXIMUM CONTEXT: Keep all key decisions, technical details, code snippets, and actionable insights
- CONDENSE RUTHLESSLY: Remove redundancy, filler, and verbose explanations while retaining substance
- MAINTAIN FLOW: Preserve chronological flow, decisions, and cause-effect relationships
- FOCUS ON VALUE: Prioritize information that would be essential for understanding this conversation later

OUTPUT REQUIREMENTS:
- Aim for approximately {TARGET_TOKENS} tokens. DO NOT EXCEED THIS UNLESS NECESSARY FOR COHERENCE. 
- YOUR RESPONSE MUST START WITH THE FIRST WORD OF THE SUMMARY. DO NOT under any circumstances include a preamble, introduction, or meta-commentary like "Here is a summary...".
- Use information-dense prose with technical precision
- Retain commands, configs, and code verbatim where relevant
- Preserve important URLs, names, and numerical values
- Connect ideas with concise transitions
- ALWAYS finish your thoughts completely - no mid-sentence cutoffs

Your condensed segment will join others to create a comprehensive context card for future AI assistants. Every token must earn its place.`;

// Default output target (used by batcher for initial planning)
const DEFAULT_DRONE_OUTPUT_TOKEN_TARGET = Math.ceil(TARGET_CONTEXT_CARD_TOKENS / Math.ceil(10000 / 10000 * DRONES_PER_10K_TOKENS));

// === DYNAMIC CALCULATION FUNCTIONS ===
const MAX_FINAL_OUTPUT_TOKENS = Math.max(TARGET_CONTEXT_CARD_TOKENS, 6000); // Use user target or minimum viable

/**
 * Calculates the optimal drone output target, respecting quality and compression guardrails.
 * @param {number} inputTokens - Total tokens in the session
 * @returns {number} Target tokens per drone output
 */
// The upgraded function from our last discussion, now with customTargetTokens
function calculateDroneOutputTarget(inputTokens, customTargetTokens = TARGET_CONTEXT_CARD_TOKENS) {
    const estimatedDrones = calculateEstimatedDrones(inputTokens);

    const targetFromCompressionCap = Math.ceil(inputTokens / MAX_COMPRESSION_RATIO);

    // Use the custom target if provided, otherwise use the default from config
    const userRequestedTarget = customTargetTokens;

    const effectiveTotalTarget = Math.max(userRequestedTarget, targetFromCompressionCap);
    const calculatedPerDroneTarget = Math.ceil(effectiveTotalTarget / estimatedDrones);
    const finalPerDroneTarget = Math.max(calculatedPerDroneTarget, MINIMUM_OUTPUT_PER_DRONE);

    return finalPerDroneTarget;
}

/**
 * Calculate estimated number of drones for a session
 * @param {number} inputTokens - Total tokens in the session
 * @returns {number} Estimated number of drones needed
 */
function calculateEstimatedDrones(inputTokens) {
    return Math.min(
        Math.ceil(inputTokens / 10000 * DRONES_PER_10K_TOKENS),
        MAX_TOTAL_DRONES
    );
}

/**
 * Get optimal drone input size based on session size
 * @param {number} inputTokens - Total tokens in the session
 * @returns {number} Optimal tokens per drone input
 */
function calculateOptimalDroneInputSize(inputTokens) {
    const estimatedDrones = calculateEstimatedDrones(inputTokens);
    const optimalSize = Math.ceil(inputTokens / estimatedDrones);
    
    // Clamp to our min/max bounds
    return Math.min(Math.max(optimalSize, DRONE_INPUT_TOKEN_MIN), DRONE_INPUT_TOKEN_MAX);
}

// === SANITY CHECKS ===
if (AGGREGATOR_CEILING_TOKENS > DRONE_INPUT_TOKEN_MAX) {
    console.warn(`CONFIG WARNING: AGGREGATOR_CEILING_TOKENS (${AGGREGATOR_CEILING_TOKENS}) should not exceed DRONE_INPUT_TOKEN_MAX (${DRONE_INPUT_TOKEN_MAX}). Input to drones might be too large.`);
}

if (DRONE_INPUT_TOKEN_MIN > DRONE_IDEAL_TARGET_TOKENS || DRONE_IDEAL_TARGET_TOKENS > DRONE_INPUT_TOKEN_MAX) {
    console.warn(`CONFIG WARNING: DRONE_IDEAL_TARGET_TOKENS (${DRONE_IDEAL_TARGET_TOKENS}) is outside the DRONE_INPUT_TOKEN_MIN/MAX range.`);
}

// Calculate effective compression ratio from user settings
const EFFECTIVE_COMPRESSION_RATIO = 10; // Default assumption for validation
if (EFFECTIVE_COMPRESSION_RATIO < 5) {
    console.warn(`CONFIG WARNING: Effective compression ratio (${EFFECTIVE_COMPRESSION_RATIO}) might be too aggressive. Consider 5:1 or higher.`);
}

if (DRONES_PER_10K_TOKENS > 5) {
    console.warn(`CONFIG WARNING: DRONES_PER_10K_TOKENS (${DRONES_PER_10K_TOKENS}) might create too many drones. Consider 2-3 per 10k.`);
}

// Validation for minimum viable compression
const minViableCompressionCheck = DRONE_INPUT_TOKEN_MIN / calculateDroneOutputTarget(10000);
if (minViableCompressionCheck < 3) {
    console.error(`CONFIGURATION ERROR: Compression ratio too low. Each drone needs at least 3:1 compression.`);
    console.error(`Current minimum: ${minViableCompressionCheck.toFixed(1)}:1`);
}

module.exports = {
    // Core user-facing settings
    TARGET_CONTEXT_CARD_TOKENS,
    DRONES_PER_10K_TOKENS,
    MAX_TOTAL_DRONES,
    MAX_FINAL_OUTPUT_TOKENS,
    
    // Stage 3
    MIN_ORPHAN_TOKEN_THRESHOLD,
    
    // Stage 4
    MIN_SEGMENT_TARGET_TOKENS,
    AGGREGATOR_CEILING_TOKENS,
    
    // Stage 5
    DRONE_INPUT_TOKEN_MIN,
    DRONE_INPUT_TOKEN_MAX,
    DRONE_IDEAL_TARGET_TOKENS,
    DRONE_TARGET_TOKEN_WINDOW_LOWER_PERCENT,
    DRONE_TARGET_TOKEN_WINDOW_UPPER_PERCENT,
    REBALANCE_LOWER_THRESHOLD_PERCENT,
    REBALANCE_UPPER_THRESHOLD_PERCENT,
    ABSOLUTE_MIN_VIABLE_DRONE_TOKENS,
    
    // Stage 6
    SEGMENT_TEXT_SEPARATOR,
    
    // Drone Ops
    RECENT_CONVERSATION_MIN_TOKENS,
    DEFAULT_DRONE_PROMPT,
    DEFAULT_DRONE_OUTPUT_TOKEN_TARGET,
    
    // Dynamic calculation functions
    calculateDroneOutputTarget,
    calculateEstimatedDrones,
    calculateOptimalDroneInputSize,
};