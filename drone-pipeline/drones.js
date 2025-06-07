/**
 * Drone dispatch and coordination system.
 * Processes batched conversation segments into condensed summaries.
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { generateResponse } = require('./utils');
const {
    calculateDroneOutputTarget,
    calculateEstimatedDrones,
    DEFAULT_DRONE_PROMPT,
    MAX_FINAL_OUTPUT_TOKENS,
    MAX_TOTAL_DRONES
} = require('./config');

/**
 * Sleep utility for rate limiting and retries.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate estimated tokens in text (rough approximation).
 */
function estimateTokens(text) {
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text to approximately target token count.
 */
function truncateToTokens(text, maxTokens) {
    const estimatedTokens = estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
        return text;
    }
    
    // Truncate to approximately the right length
    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(text.length * ratio);
    
    // Try to break at sentence boundaries
    const truncated = text.substring(0, targetLength);
    const lastSentence = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const breakPoint = Math.max(lastSentence, lastNewline);
    if (breakPoint > targetLength * 0.8) {
        return truncated.substring(0, breakPoint + 1);
    }
    
    return truncated + "...";
}

/**
 * Create system prompt for drone condensation.
 */
function createDroneSystemPrompt(targetTokens) {
    return `You are an AI conversation condensation specialist. Your mission is to distill conversation segments into ultra-dense, context-rich summaries.

CRITICAL OBJECTIVES:
• PRESERVE MAXIMUM CONTEXT: Keep all key decisions, technical details, code snippets, and actionable insights
• CONDENSE RUTHLESSLY: Remove redundancy, filler, and verbose explanations while retaining substance
• MAINTAIN FLOW: Preserve chronological progression and cause-effect relationships
• FOCUS ON VALUE: Prioritize information that would be essential for understanding this conversation later

OUTPUT REQUIREMENTS:
• Target exactly ${targetTokens} tokens (approximately ${Math.floor(targetTokens * 4)} characters)
• Use information-dense prose with technical precision
• Include specific commands, configurations, or code when mentioned
• Preserve important URLs, names, and numerical values
• Connect ideas with concise transitions

Your condensed segment will join others to create a comprehensive context card for future AI assistants. Every token must earn its place.`;
}

/**
 * Process a single drone batch.
 */
async function processDroneBatch(
    batchData,
    batchIndex,
    totalBatches,
    options = {}
) {
    const {
        model = "gemini-1.5-flash",
        temperature = 0.3,
        targetTokens = 500,
        retries = 2,
        retryDelay = 1000
    } = options;

    // Ensure batchData is a string
    let textContent;
    if (typeof batchData === 'string') {
        textContent = batchData;
    } else if (batchData && typeof batchData === 'object') {
        // Handle the specific format from prepareDroneInputs()
        if (batchData.input_text) {
            textContent = batchData.input_text;
        } else if (batchData.text) {
            textContent = batchData.text;
        } else if (Array.isArray(batchData)) {
            // Handle array of segments
            textContent = batchData.map(segment => 
                typeof segment === 'string' ? segment : (segment.text || segment.input_text || String(segment))
            ).join('\n\n');
        } else {
            console.warn(`⚠️ Drone ${batchIndex + 1}: Unexpected data format, converting to string`);
            console.warn(`   Object keys: ${Object.keys(batchData).join(', ')}`);
            textContent = String(batchData);
        }
    } else {
        console.error(`❌ Drone ${batchIndex + 1}: Invalid batch data type:`, typeof batchData);
        return `[Drone ${batchIndex + 1} failed: Invalid data format]`;
    }

    if (!textContent || textContent.trim().length === 0) {
        console.error(`❌ Drone ${batchIndex + 1}: Empty text content`);
        return `[Drone ${batchIndex + 1} failed: Empty content]`;
    }

    console.log(`🤖 Drone ${batchIndex + 1}/${totalBatches}: Processing ${estimateTokens(textContent)} tokens -> ${targetTokens} tokens`);

    const systemPrompt = createDroneSystemPrompt(targetTokens);
    const userPrompt = `Please condense the following conversation segment while preserving maximum context and technical detail:\n\n${textContent}`;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const result = await generateResponse(
                systemPrompt,
                userPrompt,
                model,
                temperature,
                targetTokens * 1.2 // Give some buffer for LLM to work with
            );

            if (!result || result.trim().length === 0) {
                console.warn(`⚠️ Drone ${batchIndex + 1}: Empty response on attempt ${attempt}`);
                if (attempt <= retries) {
                    await sleep(retryDelay * attempt);
                    continue;
                }
                return `[Drone ${batchIndex + 1} failed: Empty response]`;
            }

            const resultTokens = estimateTokens(result);
            console.log(`✅ Drone ${batchIndex + 1}: Success (${resultTokens} tokens)`);
            
            return result.trim();

        } catch (error) {
            console.error(`❌ Drone ${batchIndex + 1}: Attempt ${attempt} failed:`, error.message);
            
            if (attempt <= retries) {
                console.log(`🔄 Retrying in ${retryDelay * attempt}ms...`);
                await sleep(retryDelay * attempt);
            } else {
                console.error(`💥 Drone ${batchIndex + 1}: All attempts failed`);
                return `[Drone ${batchIndex + 1} failed after ${retries + 1} attempts: ${error.message}]`;
            }
        }
    }
}

/**
 * Process drones with concurrency control.
 */
async function processDronesWithConcurrency(
    batches,
    options = {},
    onProgress = null
) {
    const {
        maxConcurrency = 3,
        ...droneOptions
    } = options;

    const results = new Array(batches.length);
    const executing = [];
    let completed = 0;

    for (let i = 0; i < batches.length; i++) {
        const promise = processDroneBatch(
            batches[i],
            i,
            batches.length,
            droneOptions
        ).then(result => {
            results[i] = result;
            completed++;
            if (onProgress) {
                onProgress(completed, batches.length);
            }
            return result;
        });

        executing.push(promise);

        // Control concurrency
        if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
            // Remove completed promises
            for (let j = executing.length - 1; j >= 0; j--) {
                if (executing[j].isFulfilled || executing[j].isRejected) {
                    executing.splice(j, 1);
                }
            }
        }
    }

    // Wait for all remaining promises
    await Promise.all(executing);

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
 * Calculate session statistics.
 */
function calculateSessionStats(payloads) {
    // Handle both string payloads and object payloads with input_text
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
    
    const estimatedDrones = Math.min(payloads.length, MAX_TOTAL_DRONES);
    const dynamicTarget = calculateDroneOutputTarget(totalInputTokens);
    const minTargetPerDrone = 150; // Same minimum as dispatch
    const targetOutputPerDrone = Math.max(dynamicTarget, minTargetPerDrone);
    const estimatedOutputTokens = estimatedDrones * targetOutputPerDrone;

    return {
        totalInputTokens,
        estimatedDrones,
        targetOutputPerDrone,
        estimatedOutputTokens,
        compressionRatio: totalInputTokens > 0 ? (totalInputTokens / estimatedOutputTokens).toFixed(1) : '0.0'
    };
}

/**
 * Create final context card from drone results.
 */
function createContextCard(droneResults, sessionStats) {
    const header = `# Conversation Context Card
Generated from ${sessionStats.totalInputTokens.toLocaleString()} tokens (${sessionStats.compressionRatio}:1 compression)
Processed by ${droneResults.length} AI drones

---

`;

    const content = droneResults
        .filter(result => result && !result.startsWith('[Drone'))
        .join('\n\n---\n\n');

    const fullCard = header + content;
    const finalTokens = estimateTokens(fullCard);

    if (finalTokens > MAX_FINAL_OUTPUT_TOKENS) {
        console.log(`⚠️ Context card too long (${finalTokens} tokens), truncating to ${MAX_FINAL_OUTPUT_TOKENS} tokens`);
        return truncateToTokens(fullCard, MAX_FINAL_OUTPUT_TOKENS);
    }

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
    
    // Save final context card
    const contextPath = path.join(outputDir, `context-card-${timestamp}.md`);
    fs.writeFileSync(contextPath, contextCard, 'utf8');
    console.log(`📝 Context card saved to: ${contextPath}`);

    // Save detailed results
    const detailsPath = path.join(outputDir, `drone-results-${timestamp}.json`);
    const details = {
        timestamp: new Date().toISOString(),
        sessionStats,
        droneResults,
        contextCard
    };
    fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
    console.log(`📊 Detailed results saved to: ${detailsPath}`);

    return {
        contextPath,
        detailsPath
    };
}

/**
 * Main drone dispatch function.
 */
async function dispatchDrones(options = {}) {
    const {
        payloadsFile = 'drone_payloads.json',
        model = 'gemini-1.5-flash',
        temperature = 0.3,
        maxConcurrency = 3,
        retries = 2,
        saveOutput = true,
        onProgress = null
    } = options;

    console.log('\n🚀 DRONE DISPATCH INITIATED');
    console.log('================================\n');

    try {
        // Load payloads
        const payloads = loadDronePayloads(payloadsFile);
        
        if (payloads.length === 0) {
            throw new Error('No drone payloads found');
        }

        if (payloads.length > MAX_TOTAL_DRONES) {
            console.warn(`⚠️ Too many payloads (${payloads.length}), limiting to ${MAX_TOTAL_DRONES} drones`);
            payloads.splice(MAX_TOTAL_DRONES);
        }

        // Calculate session statistics
        const sessionStats = calculateSessionStats(payloads);
        
        console.log(`📊 Session Statistics:`);
        console.log(`   Input tokens: ${sessionStats.totalInputTokens.toLocaleString()}`);
        console.log(`   Drones: ${sessionStats.estimatedDrones}`);
        console.log(`   Target per drone: ${sessionStats.targetOutputPerDrone} tokens`);
        console.log(`   Estimated output: ${sessionStats.estimatedOutputTokens.toLocaleString()} tokens`);
        console.log(`   Final output: ${sessionStats.finalOutputTokens.toLocaleString()} tokens`);
        console.log(`   Compression: ${sessionStats.compressionRatio}:1`);
        console.log(`   Model: ${model}\n`);

        // Process drones
        const startTime = Date.now();
        
        const defaultProgress = (completed, total) => {
            const percent = ((completed / total) * 100).toFixed(1);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`📈 Progress: ${completed}/${total} drones (${percent}%) - ${elapsed}s elapsed`);
        };

        const droneResults = await processDronesWithConcurrency(
            payloads,
            {
                model,
                temperature,
                targetTokens: sessionStats.targetOutputPerDrone,
                retries,
                maxConcurrency
            },
            onProgress || defaultProgress
        );

        const endTime = Date.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(1);

        console.log(`\n✅ All drones completed in ${totalTime}s`);

        // Create context card
        const contextCard = createContextCard(droneResults, sessionStats);
        const finalTokens = estimateTokens(contextCard);

        console.log(`\n📄 Context Card Complete:`);
        console.log(`   Final size: ${finalTokens.toLocaleString()} tokens`);
        console.log(`   Successful drones: ${droneResults.filter(r => r && !r.startsWith('[Drone')).length}/${droneResults.length}`);

        // Save results
        let filePaths = null;
        if (saveOutput) {
            filePaths = saveResults(contextCard, droneResults, sessionStats);
        }

        return {
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
        throw error;
    }
}

/**
 * CLI interface for running drones.
 */
async function runDronesCLI() {
    const args = process.argv.slice(2);
    const model = args.find(arg => arg.startsWith('--model='))?.split('=')[1] || 'gemini-1.5-flash';
    const concurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1]) || 3;
    
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
    truncateToTokens
};