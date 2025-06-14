/**
 * Enhanced drone dispatch system with intelligent rate limiting and error handling.
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { generateResponse, estimateTokens, cleanAnthropicIntros } = require('./utils');
const {
    calculateDroneOutputTarget,
    calculateEstimatedDrones,
    DEFAULT_DRONE_PROMPT,
    MAX_FINAL_OUTPUT_TOKENS,
    MAX_TOTAL_DRONES,
    QUALITY_MIN_TOKEN_ABSOLUTE,
    QUALITY_MIN_TOKEN_PERCENTAGE,
    QUALITY_MIN_CHAR_COUNT,
    MINIMUM_OUTPUT_PER_DRONE,
    RETRY_BASE_DELAY_MS,
    DEFAULT_RATE_LIMIT_BACKOFF_MS,
    CLAUDE_RATE_LIMIT_BACKOFF_MS,
    GEMINI_RATE_LIMIT_BACKOFF_MS,
    GPT4_RATE_LIMIT_BACKOFF_MS,
    DEFAULT_CONSERVATIVE_CONCURRENCY,
    DEFAULT_STANDARD_CONCURRENCY,
    MODEL_CONFIGS
} = require('./config');

/**
 * Error classification for intelligent handling
 */
function classifyError(error) {
    // Handle string errors
    if (typeof error === 'string') {
        if (error.includes('429') || error.toLowerCase().includes('rate limit')) {
            return { type: 'RATE_LIMIT', retryable: true, waitTime: null };
        }
        if (error.includes('timeout')) {
            return { type: 'TIMEOUT', retryable: true, waitTime: 5000 };
        }
        return { type: 'UNKNOWN', retryable: true, waitTime: 2000 };
    }

    // Handle error objects
    const status = error.status || error.response?.status;
    const message = error.message || '';

    if (status === 429 || message.toLowerCase().includes('rate limit')) {
        const retryAfter = parseRateLimitHeaders(error);
        return { 
            type: 'RATE_LIMIT', 
            retryable: true, 
            waitTime: retryAfter,
            reduceConcurrency: true 
        };
    }
    
    if (status >= 500 || message.includes('timeout')) {
        return { type: 'SERVER_ERROR', retryable: true, waitTime: 5000 };
    }
    
    if (status === 401 || status === 403) {
        return { 
            type: 'AUTH_ERROR', 
            retryable: false, 
            fatal: true,
            userMessage: 'Invalid API key or authentication failed' 
        };
    }
    
    if (status === 400) {
        return { 
            type: 'BAD_REQUEST', 
            retryable: false, 
            fatal: true,
            userMessage: 'Invalid request format or parameters' 
        };
    }

    // Network/connection errors
    if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
        return { 
            type: 'NETWORK_ERROR', 
            retryable: true, 
            waitTime: 3000,
            userMessage: 'Network connection failed' 
        };
    }

    return { type: 'UNKNOWN', retryable: true, waitTime: 2000 };
}

/**
 * Parse rate limit headers to get exact wait time
 */
function parseRateLimitHeaders(error) {
    const headers = error.response?.headers || error.headers || {};
    
    // Check for retry-after header (in seconds)
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
            return seconds * 1000; // Convert to milliseconds
        }
    }

    // Check for x-ratelimit-reset-time (Unix timestamp)
    const resetTime = headers['x-ratelimit-reset-time'] || headers['X-RateLimit-Reset-Time'];
    if (resetTime) {
        const resetTimestamp = parseInt(resetTime, 10);
        if (!isNaN(resetTimestamp)) {
            const waitTime = (resetTimestamp * 1000) - Date.now();
            return Math.max(waitTime, 1000); // At least 1 second
        }
    }

    // Check for x-ratelimit-reset (seconds until reset)
    const resetSeconds = headers['x-ratelimit-reset'] || headers['X-RateLimit-Reset'];
    if (resetSeconds) {
        const seconds = parseInt(resetSeconds, 10);
        if (!isNaN(seconds)) {
            return seconds * 1000;
        }
    }

    // Fallback: no headers found, use model-specific default
    return null;
}

/**
 * Check if drone output is catastrophically bad
 */
function isCatastrophicFailure(output, targetTokens) {
    if (!output || typeof output !== 'string') {
        return { failed: true, reason: 'Empty or invalid output' };
    }

    const cleanedOutput = cleanAnthropicIntros(output);
    const trimmed = cleanedOutput.trim();
    
    if (trimmed.length === 0) {
        return { failed: true, reason: 'Empty output after cleaning' };
    }    const actualTokens = estimateTokens(trimmed);
    const minTokens = Math.max(QUALITY_MIN_TOKEN_ABSOLUTE, MINIMUM_OUTPUT_PER_DRONE ); 
    
    if (actualTokens < minTokens) {
        return { failed: true, reason: `Too short: ${actualTokens} tokens (need ${minTokens})` };
    }

    if (trimmed.length < QUALITY_MIN_CHAR_COUNT) {
        return { failed: true, reason: `Output too short (less than ${QUALITY_MIN_CHAR_COUNT} characters)` };
    }

    // Check for refusal patterns
    const refusalPatterns = [
        /^(I cannot|I'm unable|Sorry|I apologize)/i,
        /\[ERROR\]/i,
        /\[FAILED\]/i
    ];
    
    for (const pattern of refusalPatterns) {
        if (pattern.test(trimmed)) {
            return { failed: true, reason: 'Output contains refusal or error pattern' };
        }
    }

    return { failed: false };
}

/**
 * Sleep utility for rate limiting and retries.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const formatNum = (n) => (typeof n === 'number' ? n.toLocaleString() : '???');

/**
 * Create system prompt for drone condensation.
 */
function createDroneSystemPrompt(targetTokens) {
    if (!DEFAULT_DRONE_PROMPT) {
        throw new Error("DEFAULT_DRONE_PROMPT is not defined or imported from config.js");
    }
    return DEFAULT_DRONE_PROMPT.replace('{TARGET_TOKENS}', Math.round(targetTokens));
}

/**
 * Enhanced drone batch processor with intelligent error handling
 */
async function processDroneBatch(
    batchData,
    batchIndex,
    totalBatches,
    options = {},
    sessionState = {}
) {
    const {
        model = "gemini-1.5-flash",
        temperature = 0.3,
        targetTokens = 500,
        retries = 2,
        cancelled
    } = options;

    // Check for cancellation at the start of processing each drone
    if (cancelled && cancelled()) {
        console.log(`🛑 Drone ${batchIndex + 1}: Cancelled before processing`);
        throw new Error('Processing was cancelled');
    }

    const modelConfig = MODEL_CONFIGS[model] || MODEL_CONFIGS['gemini-1.5-flash'];

    // Extract text content from batch data
    let textContent;
    if (typeof batchData === 'string') {
        textContent = batchData;
    } else if (batchData && typeof batchData === 'object') {
        if (batchData.input_text) {
            textContent = batchData.input_text;
        } else if (batchData.text) {
            textContent = batchData.text;
        } else if (Array.isArray(batchData)) {
            textContent = batchData.map(segment => 
                typeof segment === 'string' ? segment : (segment.text || segment.input_text || String(segment))
            ).join('\n\n');
        } else {
            textContent = String(batchData);
        }
    } else {
        const error = new Error(`Invalid batch data format for drone ${batchIndex + 1}`);
        return { 
            success: false, 
            error: error.message, 
            batchIndex,
            fatalError: true 
        };
    }

    if (!textContent || textContent.trim().length === 0) {
        const error = new Error(`Empty content for drone ${batchIndex + 1}`);
        return { 
            success: false, 
            error: error.message, 
            batchIndex,
            fatalError: true 
        };
    }

    console.log(`🤖 Drone ${batchIndex + 1}/${totalBatches}: Processing ${estimateTokens(textContent)} tokens -> ${targetTokens} tokens`);

    const systemPrompt = createDroneSystemPrompt(targetTokens);
    const userPrompt = `Please condense the following text segment.

    --- BEGIN TEXT SEGMENT ---
    ${textContent}
    --- END TEXT SEGMENT ---

    CRITICAL OUTPUT REQUIREMENTS:
    1.  Your final output must NOT EXCEED ${targetTokens} tokens.
    2.  Your response MUST start with the first word of the summary itself. DO NOT include any preamble or meta-commentary.
    3.  Ensure your final sentence is complete.`;    // Retry loop with intelligent error handling
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        // Check for cancellation before each attempt
        if (cancelled && cancelled()) {
            console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during attempt ${attempt}`);
            throw new Error('Processing was cancelled');
        }

        try {
            const result = await generateResponse(
                systemPrompt,
                userPrompt,
                model,
                temperature,
                null
            );

            // Check for cancellation after generating response
            if (cancelled && cancelled()) {
                console.log(`🛑 Drone ${batchIndex + 1}: Cancelled after response generation`);
                throw new Error('Processing was cancelled');
            }

            // Check for catastrophic failure in output quality
            const qualityCheck = isCatastrophicFailure(result, targetTokens);
            if (qualityCheck.failed) {
                console.warn(`⚠️ Drone ${batchIndex + 1}: Quality failure - ${qualityCheck.reason}`);
                if (attempt <= retries) {
                    const retryDelay = RETRY_BASE_DELAY_MS * attempt;
                    console.log(`🔄 Retrying drone ${batchIndex + 1} in ${retryDelay}ms due to quality issues...`);
                    await sleep(retryDelay);
                    
                    // Check for cancellation after sleeping
                    if (cancelled && cancelled()) {
                        console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during quality retry delay`);
                        throw new Error('Processing was cancelled');
                    }
                    
                    continue;
                }
                return {
                    success: false,
                    error: `Quality failure: ${qualityCheck.reason}`,
                    batchIndex,
                    retryable: false
                };
            }

            const cleanedResult = cleanAnthropicIntros(result);
            const resultTokens = estimateTokens(cleanedResult);
            
            console.log(`✅ Drone ${batchIndex + 1}: Success (${resultTokens} tokens)`);
            
            return {
                success: true,
                result: cleanedResult.trim(),
                batchIndex,
                tokens: resultTokens
            };

        } catch (error) {
            // Re-throw cancellation errors immediately
            if (error.message === 'Processing was cancelled') {
                throw error;
            }

            console.error(`❌ Drone ${batchIndex + 1}: Attempt ${attempt} failed:`, error.message);
            
            const errorInfo = classifyError(error);
            
            // Handle fatal errors immediately
            if (errorInfo.fatal) {
                console.error(`💥 Drone ${batchIndex + 1}: Fatal error - ${errorInfo.type}`);
                return {
                    success: false,
                    error: errorInfo.userMessage || error.message,
                    batchIndex,
                    fatalError: true,
                    errorType: errorInfo.type
                };
            }

            // Handle rate limits specially
            if (errorInfo.type === 'RATE_LIMIT') {
                const waitTime = errorInfo.waitTime || modelConfig.rateLimitBackoff;
                console.log(`🚦 Drone ${batchIndex + 1}: Rate limited, waiting ${waitTime}ms...`);
                
                // Signal that concurrency should be reduced
                if (sessionState.onRateLimit) {
                    sessionState.onRateLimit();
                }
                
                return {
                    success: false,
                    error: 'Rate limited',
                    batchIndex,
                    retryable: true,
                    rateLimited: true,
                    waitTime: waitTime
                };
            }            // For other retryable errors, continue with retry logic
            if (errorInfo.retryable && attempt <= retries) {
                const waitTime = errorInfo.waitTime || (RETRY_BASE_DELAY_MS * attempt);
                console.log(`🔄 Retrying drone ${batchIndex + 1} in ${waitTime}ms...`);
                await sleep(waitTime);
                
                // Check for cancellation after retry delay
                if (cancelled && cancelled()) {
                    console.log(`🛑 Drone ${batchIndex + 1}: Cancelled during error retry delay`);
                    throw new Error('Processing was cancelled');
                }
                
                continue;
            }

            // All retries exhausted
            console.error(`💥 Drone ${batchIndex + 1}: All attempts failed`);
            return {
                success: false,
                error: error.message,
                batchIndex,
                retryable: false,
                errorType: errorInfo.type
            };
        }
    }
}

/**
 * Enhanced concurrency processor with dynamic adjustment and rate limit handling
 */
async function processDronesWithConcurrency(
    batches,
    options = {},
    onProgress = null
) {
    const { model = 'gemini-1.5-flash', cancelled, ...droneOptions } = options;
    const modelConfig = MODEL_CONFIGS[model] || MODEL_CONFIGS['gemini-1.5-flash'];
    
    console.log('🔍 Backend processDronesWithConcurrency Debug:', {
        'options.maxConcurrency': options.maxConcurrency,
        'modelConfig.safeConcurrency': modelConfig.safeConcurrency,
        'model': model
    });
    
    // Use frontend-provided concurrency if available, otherwise fall back to model config
    let currentConcurrency = options.maxConcurrency || modelConfig.safeConcurrency;
    let hasHitRateLimit = false;
    
    console.log(`🚀 Starting with concurrency: ${currentConcurrency} for model: ${model} (frontend: ${options.maxConcurrency}, config: ${modelConfig.safeConcurrency})`);

    // Check for cancellation before starting
    if (cancelled && cancelled()) {
        throw new Error('Processing was cancelled');
    }

    const results = new Array(batches.length);
    const failedDrones = [];
    const executing = new Set();
    const rateLimitedDrones = [];
    let completed = 0;
    let fatalError = null;

    // Session state for handling rate limits
    const sessionState = {
        onRateLimit: () => {
            if (!hasHitRateLimit) {
                hasHitRateLimit = true;
                currentConcurrency = 1;
                console.log(`🚦 Rate limit detected! Reducing concurrency to 1 for remainder of session`);
            }
        }
    };    // Process initial batches
    for (let i = 0; i < batches.length; i++) {
        // Check for cancellation before processing each batch
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled during batch processing');
            throw new Error('Processing was cancelled');
        }

        // Wait if we're at concurrency limit
        while (executing.size >= currentConcurrency) {
            await Promise.race(Array.from(executing));
            
            // Check for cancellation after waiting for concurrency slots
            if (cancelled && cancelled()) {
                console.log('🛑 Processing cancelled while waiting for concurrency slot');
                throw new Error('Processing was cancelled');
            }
        }

        // Stop processing if we hit a fatal error
        if (fatalError) {
            break;
        }

        const promise = processDroneBatch(
            batches[i],
            i,
            batches.length,
            options, // Pass the original options object that includes the model
            sessionState
        ).then(result => {
            executing.delete(promise);
            
            // Check for cancellation after each drone completes
            if (cancelled && cancelled()) {
                console.log('🛑 Processing cancelled after drone completion');
                throw new Error('Processing was cancelled');
            }
            
            if (result.success) {
                results[i] = result.result;
                completed++;
                
                if (onProgress) {
                    onProgress(completed, batches.length, rateLimitedDrones.length);
                }
            } else {
                if (result.fatalError) {
                    fatalError = result;
                } else if (result.rateLimited) {
                    rateLimitedDrones.push({ ...result, originalIndex: i });
                } else {
                    failedDrones.push({ ...result, originalIndex: i });
                }
            }
            
            return result;
        }).catch(error => {
            executing.delete(promise);
            
            // Re-throw cancellation errors immediately
            if (error.message === 'Processing was cancelled') {
                throw error;
            }
            
            // Handle other errors
            failedDrones.push({ 
                error: error.message, 
                batchIndex: i, 
                originalIndex: i,
                retryable: false 
            });
            
            return { success: false, error: error.message, batchIndex: i };
        });

        executing.add(promise);
    }    // Wait for all initial processing to complete
    try {
        await Promise.all(Array.from(executing));
    } catch (error) {
        // If it's a cancellation error, clean up and re-throw
        if (error.message === 'Processing was cancelled') {
            console.log('🛑 Drone processing cancelled during initial batch processing');
            throw error;
        }
        // For other errors, continue with normal error handling
    }

    // Check for cancellation before handling fatal errors
    if (cancelled && cancelled()) {
        console.log('🛑 Processing cancelled before fatal error handling');
        throw new Error('Processing was cancelled');
    }

    // Handle fatal errors
    if (fatalError) {
        throw new Error(`Fatal error in drone ${fatalError.batchIndex + 1}: ${fatalError.error}`);
    }

    // Process rate-limited drones with proper delays
    for (const rateLimitedDrone of rateLimitedDrones) {
        // Check for cancellation before processing rate-limited drones
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled before retrying rate-limited drones');
            throw new Error('Processing was cancelled');
        }

        const waitTime = rateLimitedDrone.waitTime || modelConfig.rateLimitBackoff;
        
        console.log(`⏳ Waiting ${Math.round(waitTime/1000)}s before retrying rate-limited drone ${rateLimitedDrone.batchIndex + 1}...`);
        
        if (onProgress) {
            onProgress(completed, batches.length, rateLimitedDrones.length, `Waiting for rate limit reset...`);
        }
        
        await sleep(waitTime);

        // Check for cancellation after sleeping
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled after waiting for rate limit reset');
            throw new Error('Processing was cancelled');
        }

        // Retry the rate-limited drone
        const retryResult = await processDroneBatch(
            batches[rateLimitedDrone.originalIndex],
            rateLimitedDrone.originalIndex,
            batches.length,
            { ...droneOptions, retries: modelConfig.maxRetries },
            sessionState
        );

        // Check for cancellation after retry
        if (cancelled && cancelled()) {
            console.log('🛑 Processing cancelled after rate-limited drone retry');
            throw new Error('Processing was cancelled');
        }

        if (retryResult.success) {
            results[rateLimitedDrone.originalIndex] = retryResult.result;
            completed++;
            console.log(`✅ Rate-limited drone ${rateLimitedDrone.batchIndex + 1} succeeded on retry`);
        } else {
            if (retryResult.fatalError) {
                throw new Error(`Fatal error in retry of drone ${retryResult.batchIndex + 1}: ${retryResult.error}`);
            }
            failedDrones.push(retryResult);
            console.error(`💥 Rate-limited drone ${rateLimitedDrone.batchIndex + 1} failed permanently`);
        }

        if (onProgress) {
            onProgress(completed, batches.length, 0);
        }
    }

    // Report any remaining failures
    if (failedDrones.length > 0) {
        console.warn(`⚠️ ${failedDrones.length} drones failed permanently`);
        for (const failed of failedDrones) {
            console.warn(`   Drone ${failed.batchIndex + 1}: ${failed.error}`);
            results[failed.originalIndex || failed.batchIndex] = `[Drone ${failed.batchIndex + 1} failed: ${failed.error}]`;
        }
    }

    return results;
}

/**
 * Load drone payloads from JSON file.
 */
function loadDronePayloads(filePath = 'drone_payloads.json') {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Drone payloads file not found: ${filePath}`);
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const payloads = JSON.parse(data);
        
        if (!Array.isArray(payloads)) {
            throw new Error('Drone payloads must be an array');
        }

        console.log(`📁 Loaded ${payloads.length} drone payloads from ${filePath}`);
        return payloads;
    } catch (error) {
        throw new Error(`Failed to load drone payloads: ${error.message}`);
    }
}

/**
 * Calculate session statistics with custom drone density support.
 */
function calculateSessionStats(payloads, customTarget = null, customDroneDensity = null) {
    const totalInputTokens = payloads.reduce((sum, payload) => {
        let tokens = 0;
        if (typeof payload === 'string') {
            tokens = estimateTokens(payload);
        } else if (payload && typeof payload === 'object') {
            if (payload.actual_token_count) {
                tokens = payload.actual_token_count;
            } else if (payload.input_text) {
                tokens = estimateTokens(payload.input_text);
            } else if (payload.text) {
                tokens = estimateTokens(payload.text);
            } else {
                tokens = estimateTokens(String(payload));
            }
        }
        return sum + tokens;
    }, 0);
    
    // Use actual number of payloads, not estimated drones
    const actualDrones = payloads.length;
    
    // For display purposes, if we have both density and actual drones,
    // show the actual count
    const estimatedDrones = actualDrones;  // Use actual, not estimated!
        
    const targetOutputPerDrone = customTarget 
        ? Math.ceil(customTarget / actualDrones)  // Divide target by actual drones
        : calculateDroneOutputTarget(totalInputTokens, customTarget, customDroneDensity);
        
    const displayTargetForCard = customTarget !== null ? customTarget : (targetOutputPerDrone * actualDrones);
    const estimatedTotalOutputTokens = actualDrones * targetOutputPerDrone;

    return {
        totalInputTokens,
        estimatedDrones: estimatedDrones,
        actualDrones: actualDrones,
        targetOutputPerDrone,
        estimatedOutputTokens: estimatedTotalOutputTokens,
        displayTargetTokens: displayTargetForCard,
        compressionRatio: totalInputTokens > 0 && estimatedTotalOutputTokens > 0
            ? (totalInputTokens / estimatedTotalOutputTokens).toFixed(1)
            : '0.0'
    };
}

/**
 * Create final context card from drone results.
 */
function createContextCard(droneResults, sessionStats) {
    const successfulDroneOutputs = droneResults.filter(result => result && !result.startsWith('[Drone'));
    const content = successfulDroneOutputs.join('\n\n---\n\n');
    
    const finalContentTokens = estimateTokens(content);
    const successfulDronesCount = successfulDroneOutputs.length;

    sessionStats.finalContentTokens = finalContentTokens;
    sessionStats.successfulDrones = successfulDronesCount;
    
    if (sessionStats.totalInputTokens > 0 && finalContentTokens > 0) {
        sessionStats.compressionRatio = (sessionStats.totalInputTokens / finalContentTokens).toFixed(1);
    } else {
        sessionStats.compressionRatio = '0.0';
        sessionStats.processingFailed = true;  // Add this flag!
    }

    const targetDisplayValue = sessionStats.displayTargetTokens;

    const header = `# Threadlink Context Card
Source size: ${formatNum(sessionStats.totalInputTokens)} tokens → Final size: ${formatNum(finalContentTokens)} tokens (target: ${formatNum(targetDisplayValue)} tokens)
Compression Ratio: ${sessionStats.compressionRatio}:1 | Drones: ${successfulDronesCount}

---

`;

    const fullCard = header + content;
    const finalOutputTokensOfCard = estimateTokens(fullCard);
    sessionStats.finalOutputTokens = finalOutputTokensOfCard;

    return fullCard;
}

/**
 * Save results to file.
 */
function saveResults(contextCard, droneResults, sessionStats, outputDir = './output') {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const contextPath = path.join(outputDir, `context-card-${timestamp}.md`);
    fs.writeFileSync(contextPath, contextCard, 'utf8');
    console.log(`📝 Context card saved to: ${contextPath}`);

    const detailsPath = path.join(outputDir, `drone-results-${timestamp}.json`);
    const details = {
        timestamp: new Date().toISOString(),
        sessionStats,
        droneResults,
        contextCard
    };
    fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
    console.log(`📊 Detailed results saved to: ${detailsPath}`);

    return { contextPath, detailsPath };
}

/**
 * Main drone dispatch function with enhanced error handling, new settings support, and progress tracking
 */
async function dispatchDrones(options = {}) {
    const {
        payloadsFile = 'drone_payloads.json',
        model = 'gemini-1.5-flash',
        temperature = 0.3,
        maxConcurrency,
        retries = 2,
        saveOutput = true,
        onProgress = null,
        customTargetTokens = null,
        jobId = null, // NEW: Accept jobId for progress tracking
        cancelled = null, // NEW: Accept cancellation checker
        
        // Settings
        processingSpeed = 'balanced',
        recencyMode = false,
        recencyStrength = 0,
        droneDensity,
        maxDrones = 100
    } = options;

    const progressTracker = require('./progressTracker');
    const { MODEL_CONFIGS } = require('./config');
    const modelConfig = MODEL_CONFIGS[model] || MODEL_CONFIGS['gemini-1.5-flash'];
    const effectiveConcurrency = maxConcurrency || modelConfig.safeConcurrency;
    const effectiveMaxDrones = maxDrones;
    const effectiveDroneDensity = droneDensity;

    console.log('\n🚀 DRONE DISPATCH INITIATED');
    console.log('================================\n');
    console.log(`📋 Model: ${model}`);
    console.log(`⚡ Concurrency: ${effectiveConcurrency} (${modelConfig.aggressive ? 'aggressive' : 'conservative'} model)`);
    console.log(`🔧 Settings: ${processingSpeed} speed, recency=${recencyStrength}, temp=${temperature}, maxDrones=${effectiveMaxDrones}`);

    try {
        const payloads = loadDronePayloads(payloadsFile);
        
        if (payloads.length === 0) {
            throw new Error('No drone payloads found');
        }        if (payloads.length > effectiveMaxDrones) {
            console.error(`⚠️ CRITICAL ERROR: Batching created ${payloads.length} drones but maxDrones=${effectiveMaxDrones}`);
            console.error(`   This indicates the density override failed. Check the preprocessing logic.`);
            
            // Calculate what we're about to lose
            const totalTokensInPayloads = payloads.reduce((sum, p) => {
                return sum + (p.actual_token_count || estimateTokens(p.input_text || p.text || ''));
            }, 0);
            const tokensInFirstN = payloads.slice(0, effectiveMaxDrones).reduce((sum, p) => {
                return sum + (p.actual_token_count || estimateTokens(p.input_text || p.text || ''));
            }, 0);
            const contentLossPercent = ((totalTokensInPayloads - tokensInFirstN) / totalTokensInPayloads * 100).toFixed(1);
            
            console.error(`   WARNING: Truncating would lose ${contentLossPercent}% of content!`);
            console.error(`   Processing all ${payloads.length} drones to preserve content.`);

        }

        // Update progress: launching drones
        if (jobId) {
            progressTracker.setLaunching(jobId, payloads.length);
        }

        const sessionStats = calculateSessionStats(payloads, customTargetTokens, effectiveDroneDensity);
        console.log(`📊 Session Statistics:`);
        console.log(`   Input tokens: ${formatNum(sessionStats.totalInputTokens)}`);
        console.log(`   Drones: ${sessionStats.estimatedDrones}`);
        console.log(`   Target per drone: ${formatNum(sessionStats.targetOutputPerDrone)} tokens`);
        console.log(`   Overall Target: ${formatNum(sessionStats.displayTargetTokens)} tokens`);
        console.log(`   Estimated Compression: ${sessionStats.compressionRatio}:1\n`);

        // Update progress: start processing
        if (jobId) {
            progressTracker.setProcessing(jobId, payloads.length);
        }

        const startTime = Date.now();
        
        // Check for cancellation before starting
        if (cancelled && cancelled()) {
            throw new Error('Processing was cancelled');
        }
        
        const progressCallback = (completed, total, rateLimited = 0, message = '') => {
            // Check for cancellation
            if (cancelled && cancelled()) {
                console.log('🛑 Processing cancelled during drone execution');
                throw new Error('Processing was cancelled');
            }
            
            const percent = ((completed / total) * 100).toFixed(1);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            let progressMsg = `📈 Progress: ${completed}/${total} drones (${percent}%) - ${elapsed}s elapsed`;
            
            if (rateLimited > 0) {
                progressMsg += ` | ${rateLimited} waiting for rate limits`;
            }
            
            if (message) {
                progressMsg += ` | ${message}`;
            }
            
            console.log(progressMsg);
            
            // Update progress tracker
            if (jobId) {
                progressTracker.updateJob(jobId, {
                    completedDrones: completed,
                    message: `Progress: ${completed}/${total} drones (${percent}%)`
                });
            }
        };

        // Apply processing speed adjustments to retries
        const config = require('./config');
        const speedAdjustments = config.getProcessingSpeedAdjustments(processingSpeed);
        const effectiveRetries = speedAdjustments.maxRetries;

        const droneResults = await processDronesWithConcurrency(
            payloads,
            {
                model,
                temperature,
                targetTokens: sessionStats.targetOutputPerDrone,
                retries: effectiveRetries,
                maxConcurrency: effectiveConcurrency,
                cancelled: cancelled, // Pass cancellation checker
                
                // Pass through new settings
                processingSpeed: processingSpeed,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            },
            onProgress || progressCallback
        );

        const endTime = Date.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(1);

        console.log(`\n✅ All drones completed in ${totalTime}s`);

        // Update progress: finalizing
        if (jobId) {
            progressTracker.setFinalizing(jobId);
        }

        const contextCard = createContextCard(droneResults, sessionStats);
        
        // Check for total processing failure
        if (sessionStats.successfulDrones === 0) {
            console.error(`💥 All drones failed. Processing unsuccessful.`);
            
            if (jobId) {
                progressTracker.setError(jobId, 'All drones failed - unable to process content');
            }
            
            return {
                success: false,
                error: 'All drones failed - unable to process content',
                errorType: 'PROCESSING_FAILURE',
                stats: {
                    totalDrones: sessionStats.estimatedDrones || droneResults.length,
                    successfulDrones: 0,
                    failedDrones: sessionStats.estimatedDrones || droneResults.length,
                    compressionRatio: '0.0',
                    executionTime: totalTime
                }
            };
        }

        let filePaths = null;
        if (saveOutput) {
            filePaths = saveResults(contextCard, droneResults, sessionStats);
        }

        console.log(`\n📄 Context Card Complete:`);
        console.log(`   Final content: ${formatNum(sessionStats.finalContentTokens)} tokens (target: ${formatNum(sessionStats.displayTargetTokens)} tokens)`);
        console.log(`   Compression: ${sessionStats.compressionRatio}:1`);
        console.log(`   Success: ${sessionStats.successfulDrones}/${droneResults.length} drones`);

        // Progress will be marked as complete by the server after successful response
        
        return {
            success: true,
            contextCard,
            droneResults,
            sessionStats,
            executionTime: totalTime,
            filePaths
        };

    } catch (error) {
        console.error('\n💥 DRONE DISPATCH FAILED');
        console.error('==========================');
        console.error(error.message);
        
        if (jobId) {
            progressTracker.setError(jobId, error.message);
        }
        
        // Classify the error for UI display
        const errorInfo = classifyError(error);
        const enhancedError = new Error(errorInfo.userMessage || error.message);
        enhancedError.type = errorInfo.type;
        enhancedError.fatal = errorInfo.fatal;
        
        throw enhancedError;
    }
}
/**
 * CLI interface for running drones.
 */
async function runDronesCLI() {
    const args = process.argv.slice(2);
    const model = args.find(arg => arg.startsWith('--model='))?.split('=')[1] || 'gemini-1.5-flash';
    const concurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1]) || undefined;
    
    try {
        const result = await dispatchDrones({
            model,
            maxConcurrency: concurrency
        });

        console.log('\n🎉 SUCCESS! Context card ready.');
        console.log(`📁 Files: ${result.filePaths?.contextPath}`);
        
    } catch (error) {
        console.error('\n💥 Mission failed:', error.message);
        process.exit(1);
    }
}

// CLI execution
if (require.main === module) {
    runDronesCLI();
}

module.exports = {
    dispatchDrones,
    loadDronePayloads,
    calculateSessionStats,
    createContextCard,
    processDroneBatch,
    estimateTokens,
    classifyError,
    processDronesWithConcurrency,     
    MODEL_CONFIGS
};