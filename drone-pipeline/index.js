// index.js (Updated with Progress Tracking)
const fs = require('fs');
const config = require('./config');
const { cleanAiChatContent } = require('./cleaner');
const { spliceIntoConceptualParagraphs } = require('./splicer');
const { rescueTinyOrphans, consolidateSegments, createDroneBatches, prepareDroneInputs } = require('./batcher');
const { estimateTokens } = require('./utils');
const { dispatchDrones } = require('./drones');
const progressTracker = require('./progressTracker');

async function main() {
    const rawFilePath = 'raw.md';
    const droneInputsOutputFilePath = 'drone_payloads.json';
      // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldRunDrones = args.includes('--run-drones') || args.includes('--dispatch');
    const droneModel = args.find(arg => arg.startsWith('--model='))?.split('=')[1] || 'gemini-1.5-flash';
    const droneConcurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1]) || 3;
    const skipSaving = args.includes('--no-save');
      // Parse density and maxDrones arguments
    const droneDensity = parseFloat(args.find(arg => arg.startsWith('--density='))?.split('=')[1]) || null;
    const maxDrones = parseInt(args.find(arg => arg.startsWith('--max-drones='))?.split('=')[1]) || null;
    
    // NEW: Parse recency mode arguments
    const recencyMode = args.includes('--recency') || args.includes('--recency-mode');
    const recencyStrength = parseInt(args.find(arg => arg.startsWith('--recency-strength='))?.split('=')[1]) || 50;
    
    // Validate recency strength
    if (recencyMode && (recencyStrength < 0 || recencyStrength > 100)) {
        console.error('❌ Error: --recency-strength must be between 0 and 100');
        process.exit(1);
    }
    
    // Log recency mode if active
    if (recencyMode) {
        console.log(`🕐 Recency mode enabled with strength: ${recencyStrength}`);
    }

    try {
        console.log("📖 Reading raw.md...");
        const rawContent = fs.readFileSync(rawFilePath, 'utf-8');
        
        if (!rawContent || rawContent.trim().length === 0) {
            throw new Error("raw.md is empty or does not exist.");
        }        // STAGE 1: Clean content
        console.log("🧹 Cleaning AI chat boilerplate...");
        const cleanerResult = cleanAiChatContent(rawContent);
        const initialTokens = estimateTokens(rawContent);
        const cleanedTokens = estimateTokens(cleanerResult.cleanedContent);
        const tokensSaved = initialTokens - cleanedTokens;
        const percentSaved = ((tokensSaved / initialTokens) * 100).toFixed(1);
        console.log(`📊 Token count: ${(initialTokens / 1000).toFixed(3)} → ${(cleanedTokens / 1000).toFixed(3)} tokens (saved ${(tokensSaved / 1000).toFixed(3)} tokens, ${percentSaved}%)`);

        // Calculate effective drone density considering maxDrones
        let effectiveDroneDensity = droneDensity;
        if (droneDensity && maxDrones) {
            const estimatedDrones = config.calculateEstimatedDrones(initialTokens, droneDensity);
            if (estimatedDrones > maxDrones) {
                // Override density to create exactly maxDrones
                effectiveDroneDensity = (maxDrones * 10000) / initialTokens;
                console.log(`🎯 Drone density override: ${droneDensity} → ${effectiveDroneDensity.toFixed(2)}`);
                console.log(`   Reason: Would create ${estimatedDrones} drones, but maxDrones=${maxDrones}`);
                console.log(`   Result: Will create exactly ${maxDrones} drones`);
            }
        }

        // STAGE 2: Splice into conceptual paragraphs
        console.log("\n" + "=".repeat(50) + "\n🧩 SPLICING INTO CONCEPTUAL PARAGRAPHS\n" + "=".repeat(50));
        const splicedParagraphObjects = spliceIntoConceptualParagraphs(cleanerResult.cleanedContent);
        console.log(`Found ${splicedParagraphObjects.length} paragraph(s) after initial split.`);

        // STAGE 3: Tiny Orphan Rescue
        console.log("\n" + "=".repeat(50) + "\n👶 RESCUING TINY ORPHAN PARAGRAPHS\n" + "=".repeat(50));
        let processedElements = rescueTinyOrphans(splicedParagraphObjects, config.MIN_ORPHAN_TOKEN_THRESHOLD);
        processedElements.forEach(p => { p.token_count = estimateTokens(p.text); });
        console.log(`\n✅ Orphan rescue complete. Now have ${processedElements.length} elements.`);        // STAGE 4: Segment Consolidation
        console.log("\n" + "=".repeat(50) + "\n🧱 CONSOLIDATING SEGMENTS\n" + "=".repeat(50));        processedElements = consolidateSegments(
            processedElements,
            effectiveDroneDensity ? {
                customDroneDensity: effectiveDroneDensity,
                totalInputTokens: initialTokens,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            } : {
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            } // Include recency settings even for default behavior
        );
        console.log(`\n✅ Segment consolidation complete. Final count: ${processedElements.length} consolidated segments.`);        // STAGE 5: Drone Batching
        console.log("\n" + "=".repeat(50) + "\n📦 CREATING DRONE BATCHES\n" + "=".repeat(50));        const droneBatchesOfSegments = createDroneBatches(
            processedElements,
            effectiveDroneDensity ? {
                customDroneDensity: effectiveDroneDensity,
                customMaxDrones: maxDrones,
                totalInputTokens: initialTokens,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            } : {
                recencyMode: recencyMode,
                recencyStrength: recencyStrength
            } // Include recency settings even for default behavior
        );
        console.log(`\n✅ Drone batching complete. Created ${droneBatchesOfSegments.length} batches.`);        // STAGE 6: Final Drone Input String Preparation
        console.log("\n" + "=".repeat(50) + "\n📜 PREPARING DRONE INPUT STRINGS\n" + "=".repeat(50));
        const finalDroneInputs = prepareDroneInputs(
            droneBatchesOfSegments,
            effectiveDroneDensity ? {
                customDroneDensity: effectiveDroneDensity,
                totalInputTokens: initialTokens
            } : undefined
        );
        console.log(`\n✅ Drone input preparation complete. Prepared ${finalDroneInputs.length} drone payloads.`);

        // Save drone payloads (always do this for debugging/inspection)
        fs.writeFileSync(droneInputsOutputFilePath, JSON.stringify(finalDroneInputs, null, 2), 'utf-8');
        console.log(`\n📄 Final drone input payloads saved to: ${droneInputsOutputFilePath}`);

        // STAGE 7: Drone Dispatch (Optional)
        if (shouldRunDrones) {
            console.log("\n" + "=".repeat(50) + "\n🚀 DISPATCHING DRONES\n" + "=".repeat(50));              const droneResult = await dispatchDrones({
                payloadsFile: droneInputsOutputFilePath,
                model: droneModel,
                maxConcurrency: droneConcurrency,
                saveOutput: !skipSaving,
                customDroneDensity: effectiveDroneDensity,
                maxDrones: maxDrones,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength,
                onProgress: (completed, total) => {
                    const percent = ((completed / total) * 100).toFixed(1);
                    console.log(`🤖 Drone Progress: ${completed}/${total} complete (${percent}%)`);
                }
            });

            console.log("\n" + "=".repeat(50) + "\n🎉 MISSION COMPLETE\n" + "=".repeat(50));
            console.log(`📊 Final Statistics:`);
            console.log(`   Original tokens: ${(initialTokens / 1000).toFixed(3)}k`);
            console.log(`   Final context: ${(estimateTokens(droneResult.contextCard) / 1000).toFixed(3)}k tokens`);
            console.log(`   Compression ratio: ${droneResult.sessionStats.compressionRatio}:1`);
            console.log(`   Processing time: ${droneResult.executionTime}s`);
            console.log(`   Successful drones: ${droneResult.droneResults.filter(r => r && !r.startsWith('[Drone')).length}/${droneResult.droneResults.length}`);
            
            if (droneResult.filePaths) {
                console.log(`\n📁 Output Files:`);
                console.log(`   Context Card: ${droneResult.filePaths.contextPath}`);
                console.log(`   Details: ${droneResult.filePaths.detailsPath}`);
            }

            // Also return the result for programmatic use
            return droneResult;
        } else {
            console.log("\n" + "=".repeat(50) + "\n✅ PREPROCESSING COMPLETE\n" + "=".repeat(50));
            console.log(`🎯 Ready for drone dispatch! Run with --run-drones to continue.`);
            console.log(`💡 Example: node index.js --run-drones --model=${droneModel} --concurrency=${droneConcurrency}`);
            
            return {
                stage: 'preprocessing',
                dronePayloads: finalDroneInputs,
                stats: {
                    initialTokens,
                    cleanedTokens,
                    finalSegments: processedElements.length,
                    droneBatches: droneBatchesOfSegments.length
                }
            };
        }

    } catch (e) {
        console.error(`\n💥 ERROR DURING PROCESSING\n${"=".repeat(30)}`);
        console.error(`❌ ${e.message}`);
        if (process.env.DEBUG) {
            console.error(e.stack);
        }
        process.exit(1);
    }
}

// Helper function to run preprocessing with custom settings
async function runPreprocessingWithCustomSettings(customSettings = {}) {
    const {
        droneDensity,
        maxDrones,
        customTargetTokens,
        recencyMode = false,        // NEW
        recencyStrength = 0         // NEW
    } = customSettings;

    const rawFilePath = 'raw.md';
    const droneInputsOutputFilePath = 'drone_payloads.json';
    
    console.log("📖 Reading raw.md...");
    const rawContent = fs.readFileSync(rawFilePath, 'utf-8');
    
    if (!rawContent || rawContent.trim().length === 0) {
        throw new Error("raw.md is empty or does not exist.");
    }    // STAGE 1: Clean content
    console.log("🧹 Cleaning AI chat boilerplate...");
    const cleanerResult = cleanAiChatContent(rawContent);
    const initialTokens = estimateTokens(rawContent);
    const cleanedTokens = estimateTokens(cleanerResult.cleanedContent);

    // Calculate effective drone density considering maxDrones
    let effectiveDroneDensity = droneDensity;
    if (droneDensity && maxDrones) {
        const estimatedDrones = config.calculateEstimatedDrones(initialTokens, droneDensity);
        if (estimatedDrones > maxDrones) {
            // Override density to create exactly maxDrones
            effectiveDroneDensity = (maxDrones * 10000) / initialTokens;
            console.log(`🎯 Drone density override: ${droneDensity} → ${effectiveDroneDensity.toFixed(2)}`);
            console.log(`   Reason: Would create ${estimatedDrones} drones, but maxDrones=${maxDrones}`);
            console.log(`   Result: Will create exactly ${maxDrones} drones`);
        }
    }

    // STAGE 2: Splice into conceptual paragraphs
    console.log("🧩 Splicing into conceptual paragraphs...");
    const splicedParagraphObjects = spliceIntoConceptualParagraphs(cleanerResult.cleanedContent);

    // STAGE 3: Tiny Orphan Rescue
    console.log("👶 Rescuing tiny orphan paragraphs...");
    let processedElements = rescueTinyOrphans(splicedParagraphObjects, config.MIN_ORPHAN_TOKEN_THRESHOLD);
    processedElements.forEach(p => { p.token_count = estimateTokens(p.text); });    // STAGE 4: Segment Consolidation WITH custom settings
    console.log("🧱 Consolidating segments...");
    
    // Calculate dynamic ceiling based on drone density
    let aggregatorCeiling = config.AGGREGATOR_CEILING_TOKENS;
    if (effectiveDroneDensity && effectiveDroneDensity >= 3) {
        // For high drone density, use much smaller ceiling
        const targetDroneSize = Math.floor(initialTokens / config.calculateEstimatedDrones(initialTokens, effectiveDroneDensity));
        aggregatorCeiling = Math.min(config.AGGREGATOR_CEILING_TOKENS, Math.max(1000, targetDroneSize * 0.8));
        console.log(`🎯 High drone density: Reducing aggregator ceiling from ${config.AGGREGATOR_CEILING_TOKENS} to ${aggregatorCeiling}`);
    }
    
    processedElements = consolidateSegments(
        processedElements,
        {
            customDroneDensity: effectiveDroneDensity,
            totalInputTokens: initialTokens,
            recencyMode: recencyMode,              // NEW
            recencyStrength: recencyStrength        // NEW
        }
    );    // STAGE 5: Drone Batching WITH custom settings
    console.log("📦 Creating drone batches with custom settings...");
    const droneBatchesOfSegments = createDroneBatches(processedElements, {
        customDroneDensity: effectiveDroneDensity,
        customMaxDrones: maxDrones,
        customTargetTokens: customTargetTokens,
        totalInputTokens: initialTokens,
        recencyMode: recencyMode,              // NEW
        recencyStrength: recencyStrength        // NEW
    });    // STAGE 6: Final Drone Input String Preparation WITH custom settings
    console.log("📜 Preparing drone input strings...");
    const finalDroneInputs = prepareDroneInputs(
        droneBatchesOfSegments,
        {
            customDroneDensity: effectiveDroneDensity,
            totalInputTokens: initialTokens
        }
    );

    // Save drone payloads
    fs.writeFileSync(droneInputsOutputFilePath, JSON.stringify(finalDroneInputs, null, 2), 'utf-8');
    console.log(`📄 Final drone input payloads saved to: ${droneInputsOutputFilePath}`);

    return {
        stage: 'preprocessing',
        dronePayloads: finalDroneInputs,
        stats: {
            initialTokens,
            cleanedTokens,
            finalSegments: processedElements.length,
            droneBatches: droneBatchesOfSegments.length
        }
    };
}

// Helper function for programmatic usage with progress tracking
async function processConversation(options = {}) {
    const {
        inputFile = 'raw.md',
        runDrones = false,
        model = 'gemini-1.5-flash',
        concurrency = 3,
        saveOutput = true,
        customTargetTokens = null,
        jobId = null, // NEW: Accept jobId for progress tracking
        cancelled = null, // NEW: Accept cancellation checker
        
        // Settings
        processingSpeed = 'balanced',
        recencyMode = false,
        recencyStrength = 0,
        temperature = 0.5,
        droneDensity,
        maxDrones = 100
    } = options;

    // Enhanced custom processing with progress tracking
    if (runDrones) {
        // Always run preprocessing first to generate payloads
        const originalArgv = process.argv;
        process.argv = ['node', 'index.js'];
        
        if (model !== 'gemini-1.5-flash') process.argv.push(`--model=${model}`);
        if (concurrency !== 3) process.argv.push(`--concurrency=${concurrency}`);
        if (!saveOutput) process.argv.push('--no-save');
        
        try {
            // Run preprocessing with custom settings
            const preprocessResult = await runPreprocessingWithCustomSettings({
                droneDensity,
                maxDrones,
                customTargetTokens,
                recencyMode,                    // NEW: pass it through
                recencyStrength                 // NEW: pass it through
            });
            
            // Update progress: transitioning to drone dispatch
            if (jobId) {
                progressTracker.setPhase(jobId, 'preparing', 'Preparing drone batches');
            }
            
            // Now dispatch drones with all custom settings and progress tracking
            const { dispatchDrones } = require('./drones');
            
            const droneOptions = {
                payloadsFile: 'drone_payloads.json',
                model: model,
                maxConcurrency: concurrency,
                saveOutput: saveOutput,
                temperature: temperature,
                jobId: jobId, // Pass jobId for progress tracking
                cancelled: cancelled, // Pass cancellation checker
                
                // Pass through all new settings
                customTargetTokens: customTargetTokens,
                processingSpeed: processingSpeed,
                recencyMode: recencyMode,
                recencyStrength: recencyStrength,
                droneDensity: droneDensity,
                maxDrones: maxDrones
            };
            
            console.log('🔧 Drone options:', droneOptions);
            
            const droneResult = await dispatchDrones(droneOptions);

            return droneResult;
        } finally {
            process.argv = originalArgv;
        }
    } else {
        // Normal flow for preprocessing only
        const originalArgv = process.argv;
        process.argv = ['node', 'index.js'];
        
        if (runDrones) process.argv.push('--run-drones');
        if (model !== 'gemini-1.5-flash') process.argv.push(`--model=${model}`);
        if (concurrency !== 3) process.argv.push(`--concurrency=${concurrency}`);
        if (!saveOutput) process.argv.push('--no-save');

        try {
            const result = await main();
            return result;
        } finally {
            process.argv = originalArgv;
        }
    }
}

// CLI help
function showHelp() {
    console.log(`
ThreadLink Drone Pipeline
========================

USAGE:
    node index.js [options]

OPTIONS:
    --run-drones, --dispatch    Run the full pipeline including drone dispatch
    --model=<model>            AI model to use for drones (default: gemini-1.5-flash)
    --concurrency=<n>          Number of concurrent drones (default: 3)
    --density=<n>              Drone density (1-10, affects number of drones)
    --max-drones=<n>           Maximum number of drones to create
    --no-save                  Don't save output files (drone dispatch only)
    
    RECENCY MODE OPTIONS:
    --recency                  Enable recency mode (process recent content at higher resolution)
    --recency-strength=<n>     Recency bias strength 0-100 (default: 50)
                               0 = uniform processing (same as --recency disabled)
                               25 = subtle bias toward recent content
                               50 = balanced bias (recommended)
                               90 = strong bias (aggressive compression of old content)
    
    --help, -h                 Show this help

EXAMPLES:
    # Just prepare drone payloads (default)
    node index.js

    # Run full pipeline with recency mode
    node index.js --run-drones --recency --recency-strength=50

    # High density with recency mode and max drone limit
    node index.js --run-drones --density=5 --max-drones=30 --recency --recency-strength=75

    # Subtle recency with GPT-4o
    node index.js --run-drones --model=gpt-4o --recency --recency-strength=25

    # Run full pipeline with Gemini Flash
    node index.js --run-drones

    # Use high density with max drone limit
    node index.js --run-drones --density=5 --max-drones=20

    # Use GPT-4o with 2 concurrent drones
    node index.js --run-drones --model=gpt-4o --concurrency=2

    # Use Claude Haiku with 5 concurrent drones
    node index.js --run-drones --model=claude-3-haiku-20240307 --concurrency=5

RECENCY MODE:
    Recency mode divides your conversation into three temporal bands:
    - Oldest 30%: Processed at lower resolution (fewer drones)
    - Middle 50%: Processed at medium resolution
    - Recent 20%: Processed at higher resolution (more drones)
    
    This allows you to maintain detail for recent interactions while
    compressing older content more aggressively, all within your drone budget.

AVAILABLE MODELS:
    OpenAI: gpt-4, gpt-4o, gpt-4o-mini, gpt-3.5-turbo
    Anthropic: claude-3-5-sonnet-20241022, claude-3-haiku-20240307
    Google: gemini-1.5-pro, gemini-1.5-flash, gemini-pro

ENVIRONMENT VARIABLES:
    OPENAI_API_KEY      - OpenAI API key
    ANTHROPIC_API_KEY   - Anthropic API key  
    GOOGLE_API_KEY      - Google AI API key
    DEBUG=1             - Show detailed error traces
`);
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = {
    main,
    processConversation
};