// index.js (Updated with Drone Dispatch)
const fs = require('fs');
const config = require('./config'); // Import global config
const { cleanAiChatContent } = require('./cleaner');
const { spliceIntoConceptualParagraphs } = require('./splicer');
const { rescueTinyOrphans, consolidateSegments, createDroneBatches, prepareDroneInputs } = require('./batcher');
const { estimateTokens } = require('./utils');
const { dispatchDrones } = require('./drones');

async function main() {
    const rawFilePath = 'raw.md';
    const droneInputsOutputFilePath = 'drone_payloads.json';
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldRunDrones = args.includes('--run-drones') || args.includes('--dispatch');
    const droneModel = args.find(arg => arg.startsWith('--model='))?.split('=')[1] || 'gemini-1.5-flash';
    const droneConcurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1]) || 3;
    const skipSaving = args.includes('--no-save');

    try {
        console.log("📖 Reading raw.md...");
        const rawContent = fs.readFileSync(rawFilePath, 'utf-8');
        
        if (!rawContent || rawContent.trim().length === 0) {
            throw new Error("raw.md is empty or does not exist.");
        }

        // STAGE 1: Clean content
        console.log("🧹 Cleaning AI chat boilerplate...");
        const cleanerResult = cleanAiChatContent(rawContent);
        const initialTokens = estimateTokens(rawContent);
        const cleanedTokens = estimateTokens(cleanerResult.cleanedContent);
        const tokensSaved = initialTokens - cleanedTokens;
        const percentSaved = ((tokensSaved / initialTokens) * 100).toFixed(1);
        console.log(`📊 Token count: ${(initialTokens / 1000).toFixed(3)} → ${(cleanedTokens / 1000).toFixed(3)} tokens (saved ${(tokensSaved / 1000).toFixed(3)} tokens, ${percentSaved}%)`);

        // STAGE 2: Splice into conceptual paragraphs
        console.log("\n" + "=".repeat(50) + "\n🧩 SPLICING INTO CONCEPTUAL PARAGRAPHS\n" + "=".repeat(50));
        const splicedParagraphObjects = spliceIntoConceptualParagraphs(cleanerResult.cleanedContent);
        console.log(`Found ${splicedParagraphObjects.length} paragraph(s) after initial split.`);

        // STAGE 3: Tiny Orphan Rescue
        console.log("\n" + "=".repeat(50) + "\n👶 RESCUING TINY ORPHAN PARAGRAPHS\n" + "=".repeat(50));
        let processedElements = rescueTinyOrphans(splicedParagraphObjects, config.MIN_ORPHAN_TOKEN_THRESHOLD);
        processedElements.forEach(p => { p.token_count = estimateTokens(p.text); });
        console.log(`\n✅ Orphan rescue complete. Now have ${processedElements.length} elements.`);

        // STAGE 4: Segment Consolidation
        console.log("\n" + "=".repeat(50) + "\n🧱 CONSOLIDATING SEGMENTS\n" + "=".repeat(50));
        processedElements = consolidateSegments(
            processedElements,
            config.MIN_SEGMENT_TARGET_TOKENS,
            config.AGGREGATOR_CEILING_TOKENS
        );
        console.log(`\n✅ Segment consolidation complete. Final count: ${processedElements.length} consolidated segments.`);

        // STAGE 5: Drone Batching
        console.log("\n" + "=".repeat(50) + "\n📦 CREATING DRONE BATCHES\n" + "=".repeat(50));
        const droneBatchesOfSegments = createDroneBatches(processedElements);
        console.log(`\n✅ Drone batching complete. Created ${droneBatchesOfSegments.length} batches.`);

        // STAGE 6: Final Drone Input String Preparation
        console.log("\n" + "=".repeat(50) + "\n📜 PREPARING DRONE INPUT STRINGS\n" + "=".repeat(50));
        const finalDroneInputs = prepareDroneInputs(droneBatchesOfSegments);
        console.log(`\n✅ Drone input preparation complete. Prepared ${finalDroneInputs.length} drone payloads.`);

        // Save drone payloads (always do this for debugging/inspection)
        fs.writeFileSync(droneInputsOutputFilePath, JSON.stringify(finalDroneInputs, null, 2), 'utf-8');
        console.log(`\n📄 Final drone input payloads saved to: ${droneInputsOutputFilePath}`);

        // STAGE 7: Drone Dispatch (Optional)
        if (shouldRunDrones) {
            console.log("\n" + "=".repeat(50) + "\n🚀 DISPATCHING DRONES\n" + "=".repeat(50));
            
            const droneResult = await dispatchDrones({
                payloadsFile: droneInputsOutputFilePath,
                model: droneModel,
                maxConcurrency: droneConcurrency,
                saveOutput: !skipSaving,
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

// Helper function for programmatic usage
async function processConversation(options = {}) {
    const {
        inputFile = 'raw.md',
        runDrones = false,
        model = 'gemini-1.5-flash',
        concurrency = 3,
        saveOutput = true,
        customTargetTokens = null  // ADD THIS LINE
    } = options;

    // Handle customTargetTokens specially since it can't be passed via CLI args
    if (runDrones && customTargetTokens !== null) {
        // We need to call dispatchDrones directly with the custom target
        // First, run preprocessing without drones to generate payloads
        
        // Temporarily override process.argv for preprocessing
        const originalArgv = process.argv;
        process.argv = ['node', 'index.js'];
        
        if (model !== 'gemini-1.5-flash') process.argv.push(`--model=${model}`);
        if (concurrency !== 3) process.argv.push(`--concurrency=${concurrency}`);
        if (!saveOutput) process.argv.push('--no-save');
        // Note: NOT adding --run-drones here
        
        try {
            // Run preprocessing only
            await main();
            
            // Now dispatch drones with custom target
            const { dispatchDrones } = require('./drones');
            const droneResult = await dispatchDrones({
                payloadsFile: 'drone_payloads.json',
                model: model,
                maxConcurrency: concurrency,
                saveOutput: saveOutput,
                customTargetTokens: customTargetTokens  // Pass the custom target
            });

            return droneResult;
        } finally {
            process.argv = originalArgv;
        }
    } else {
        // Normal flow - use your original approach
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
    --no-save                  Don't save output files (drone dispatch only)
    --help, -h                 Show this help

EXAMPLES:
    # Just prepare drone payloads (default)
    node index.js

    # Run full pipeline with Gemini Flash
    node index.js --run-drones

    # Use GPT-4o with 2 concurrent drones
    node index.js --run-drones --model=gpt-4o --concurrency=2

    # Use Claude Haiku with 5 concurrent drones
    node index.js --run-drones --model=claude-3-haiku-20240307 --concurrency=5

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