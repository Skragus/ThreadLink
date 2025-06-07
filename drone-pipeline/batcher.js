// batcher.js (or segmentProcessor.js)

const { estimateTokens } = require('./utils');
const config = require('./config');

/**
 * Merges tiny "orphan" paragraphs with adjacent paragraphs.
 */
function rescueTinyOrphans(paragraphs, minTokenThreshold = 25) {
    if (!Array.isArray(paragraphs)) {
        console.warn("rescueTinyOrphans: Input is not an array. Returning input as is.");
        return paragraphs;
    }
    if (paragraphs.length === 0) {
        return [];
    }

    let rescued = JSON.parse(JSON.stringify(paragraphs));
    let mergedSomethingInLoop = true;

    while (mergedSomethingInLoop) {
        mergedSomethingInLoop = false;
        const nextIterationRescued = [];
        let i = 0;

        while (i < rescued.length) {
            const currentP = rescued[i];

            if (currentP.token_count < minTokenThreshold) {
                mergedSomethingInLoop = true;

                if (rescued.length === 1) {
                    nextIterationRescued.push(currentP);
                    i++;
                    continue;
                }

                if (i < rescued.length - 1) {
                    const nextP = rescued[i + 1];
                    nextP.text = currentP.text + "\n" + nextP.text;
                    nextP.token_count += currentP.token_count;
                    nextP.char_count += currentP.char_count;
                    nextP.line_count += currentP.line_count + 1;
                    nextIterationRescued.push(nextP);
                    i += 2;
                } else if (i === rescued.length - 1 && nextIterationRescued.length > 0) {
                    const prevPInNewList = nextIterationRescued[nextIterationRescued.length - 1];
                    prevPInNewList.text += "\n" + currentP.text;
                    prevPInNewList.token_count += currentP.token_count;
                    prevPInNewList.char_count += currentP.char_count;
                    prevPInNewList.line_count += currentP.line_count + 1;
                    i++;
                } else {
                    nextIterationRescued.push(currentP);
                    i++;
                }
            } else {
                nextIterationRescued.push(currentP);
                i++;
            }
        }
        rescued = nextIterationRescued;
    }
    return rescued;
}

/**
 * Splits an oversized paragraph into smaller chunks that respect token limits
 */
function splitOversizedParagraph(paragraph, maxTokens) {
    if (paragraph.token_count <= maxTokens) {
        return [paragraph]; // No splitting needed
    }

    console.log(`📝 Splitting oversized paragraph: ${paragraph.id} (${paragraph.token_count} tokens) into chunks of max ${maxTokens} tokens`);

    const sentences = paragraph.text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = {
        id: `${paragraph.id}_chunk_001`,
        text: '',
        token_count: 0,
        char_count: 0,
        line_count: 0,
        original_ids: [paragraph.id]
    };

    let chunkIndex = 1;

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceTokens = estimateTokens(sentence);
        
        // If adding this sentence would exceed maxTokens, finalize current chunk
        if (currentChunk.token_count + sentenceTokens > maxTokens && currentChunk.text.length > 0) {
            chunks.push(currentChunk);
            chunkIndex++;
            currentChunk = {
                id: `${paragraph.id}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                text: sentence,
                token_count: sentenceTokens,
                char_count: sentence.length,
                line_count: 1,
                original_ids: [paragraph.id]
            };
        } else {
            // Add sentence to current chunk
            if (currentChunk.text.length > 0) {
                currentChunk.text += ' ' + sentence;
                currentChunk.char_count += 1 + sentence.length; // +1 for space
            } else {
                currentChunk.text = sentence;
                currentChunk.char_count = sentence.length;
            }
            currentChunk.token_count += sentenceTokens;
            currentChunk.line_count = 1; // Simplified for chunks
        }
    }

    // Add the last chunk if it has content
    if (currentChunk.text.length > 0) {
        chunks.push(currentChunk);
    }

    console.log(`✂️ Split ${paragraph.id} into ${chunks.length} chunks: ${chunks.map(c => `${c.id}(${c.token_count}t)`).join(', ')}`);
    return chunks;
}

/**
 * Consolidates an array of paragraph objects into larger segments.
 * Enhanced with oversized paragraph handling.
 */
function consolidateSegments(
    paragraphs,
    minSegmentTargetTokens,
    aggregatorCeilingTokens
) {
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
        return [];
    }

    if (minSegmentTargetTokens <= 0 || aggregatorCeilingTokens <= 0 || minSegmentTargetTokens > aggregatorCeilingTokens) {
        console.error("Invalid token targets for consolidation. Ensure minSegmentTargetTokens > 0, aggregatorCeilingTokens > 0, and min <= ceiling.");
        return paragraphs.map(p => ({ ...p }));
    }

    // First pass: Split any oversized paragraphs
    const processedParagraphs = [];
    for (const paragraph of paragraphs) {
        if (paragraph.token_count > aggregatorCeilingTokens) {
            const chunks = splitOversizedParagraph(paragraph, aggregatorCeilingTokens);
            processedParagraphs.push(...chunks);
        } else {
            processedParagraphs.push(paragraph);
        }
    }

    console.log(`📋 After paragraph splitting: ${processedParagraphs.length} segments (was ${paragraphs.length})`);

    // Second pass: Normal consolidation logic on the processed paragraphs
    const consolidated = [];
    let currentSegment = null;

    for (let i = 0; i < processedParagraphs.length; i++) {
        const paragraph = processedParagraphs[i];
        const paragraphEstimatedTokens = estimateTokens(paragraph.text);

        if (!currentSegment) {
            currentSegment = {
                id: paragraph.id,
                text: paragraph.text,
                token_count: paragraphEstimatedTokens,
                char_count: paragraph.char_count,
                line_count: paragraph.line_count,
                original_ids: paragraph.original_ids || [paragraph.id]
            };
        } else {
            const potentialCombinedText = currentSegment.text + "\n\n" + paragraph.text;
            const actualPotentialTokens = estimateTokens(potentialCombinedText);

            if (actualPotentialTokens <= aggregatorCeilingTokens) {
                currentSegment.text = potentialCombinedText;
                currentSegment.token_count = actualPotentialTokens;
                currentSegment.char_count += paragraph.char_count;
                currentSegment.line_count += paragraph.line_count + 2;
                currentSegment.original_ids.push(...(paragraph.original_ids || [paragraph.id]));
            } else {
                // Finalize current segment and start new one
                console.log(`🔍 Finalizing segment: ${currentSegment.id}, tokens: ${currentSegment.token_count}, ceiling: ${aggregatorCeilingTokens}`);
                consolidated.push(currentSegment);
                
                currentSegment = {
                    id: paragraph.id,
                    text: paragraph.text,
                    token_count: paragraphEstimatedTokens,
                    char_count: paragraph.char_count,
                    line_count: paragraph.line_count,
                    original_ids: paragraph.original_ids || [paragraph.id]
                };
            }
        }

        // Check if current segment should be finalized based on targets
        if (currentSegment && currentSegment.token_count >= minSegmentTargetTokens) {
            if (i + 1 < processedParagraphs.length) {
                const nextParagraph = processedParagraphs[i + 1];
                const textWithNextParagraph = currentSegment.text + "\n\n" + nextParagraph.text;
                const tokensWithNextParagraph = estimateTokens(textWithNextParagraph);

                if (tokensWithNextParagraph > aggregatorCeilingTokens) {
                    console.log(`🔍 Finalizing segment: ${currentSegment.id}, tokens: ${currentSegment.token_count}, ceiling: ${aggregatorCeilingTokens}`);
                    consolidated.push(currentSegment);
                    currentSegment = null;
                }
            }
        }
    }

    // Add the last segment if it exists
    if (currentSegment) {
        console.log(`🔍 Finalizing final segment: ${currentSegment.id}, tokens: ${currentSegment.token_count}, ceiling: ${aggregatorCeilingTokens}`);
        consolidated.push(currentSegment);
    }

    // Final pass: Assign new sequential IDs
    return consolidated.map((seg, index) => ({
        ...seg,
        id: `consolidated_segment_${String(index + 1).padStart(3, '0')}`,
    }));
}

/**
 * Enhanced drone batching with force-fitting for tiny batches
 */
function createDroneBatches(consolidatedSegments) {
    if (!Array.isArray(consolidatedSegments) || consolidatedSegments.length === 0) {
        return [];
    }

    let batches = [];
    let currentBatchSegments = [];
    let currentBatchTokens = 0;
    let segmentIndex = 0;

    // Calculate actual window bounds
    const targetWindowLowerBound = Math.floor(config.DRONE_IDEAL_TARGET_TOKENS * config.DRONE_TARGET_TOKEN_WINDOW_LOWER_PERCENT);
    const targetWindowUpperBound = Math.ceil(config.DRONE_IDEAL_TARGET_TOKENS * config.DRONE_TARGET_TOKEN_WINDOW_UPPER_PERCENT);

    console.log(`Drone Batching: Min=${config.DRONE_INPUT_TOKEN_MIN}, Max=${config.DRONE_INPUT_TOKEN_MAX}, IdealTarget=${config.DRONE_IDEAL_TARGET_TOKENS}, TargetWindow=[${targetWindowLowerBound}-${targetWindowUpperBound}]`);

    while (segmentIndex < consolidatedSegments.length) {
        const segment = consolidatedSegments[segmentIndex];

        // Handle oversized segments - create dedicated batch rather than lose content
        if (segment.token_count > config.DRONE_INPUT_TOKEN_MAX) {
            console.warn(`⚠️ OVERSIZED SEGMENT: ${segment.id} (${segment.token_count} tokens) exceeds DRONE_INPUT_TOKEN_MAX (${config.DRONE_INPUT_TOKEN_MAX}). Creating dedicated oversized batch to preserve content.`);
            
            // Finalize current batch if it has content
            if (currentBatchSegments.length > 0) {
                batches.push({
                    segments: currentBatchSegments,
                    total_tokens: currentBatchTokens,
                });
                currentBatchSegments = [];
                currentBatchTokens = 0;
            }
            
            // Create dedicated batch for oversized segment
            batches.push({
                segments: [segment],
                total_tokens: segment.token_count,
                oversized: true, // Flag for drone handling
            });
            
            console.log(`📦 Created dedicated oversized batch: ${segment.token_count} tokens`);
            segmentIndex++;
            continue;
        }

        // Check if adding this segment would exceed max
        if (currentBatchTokens + segment.token_count <= config.DRONE_INPUT_TOKEN_MAX) {
            // It fits - add to current batch
            currentBatchSegments.push(segment);
            currentBatchTokens += segment.token_count;
            segmentIndex++;
        } else {
            // It doesn't fit - decide what to do with current batch
            
            // PREEMPTIVE TINY BATCH PREVENTION: Always try to force-fit if current batch would be tiny
            if (currentBatchTokens < config.DRONE_INPUT_TOKEN_MIN && 
                currentBatchSegments.length > 0) {
                
                // Check if force-fitting keeps us under max
                if (currentBatchTokens + segment.token_count <= config.DRONE_INPUT_TOKEN_MAX) {
                    console.log(`🔧 Force-fitting segment ${segment.id} to prevent tiny batch. Current: ${currentBatchTokens}, adding: ${segment.token_count}, total: ${currentBatchTokens + segment.token_count}`);
                    
                    currentBatchSegments.push(segment);
                    currentBatchTokens += segment.token_count;
                    segmentIndex++;
                    
                    // Immediately finalize this batch
                    batches.push({
                        segments: currentBatchSegments,
                        total_tokens: currentBatchTokens,
                    });
                    
                    console.log(`📦 Finalized force-fitted batch with ${currentBatchTokens} tokens`);
                    currentBatchSegments = [];
                    currentBatchTokens = 0;
                    continue;
                } else {
                    // Can't force-fit without exceeding max - merge with most recent viable batch instead
                    if (batches.length > 0) {
                        const lastBatch = batches[batches.length - 1];
                        if (lastBatch.total_tokens + currentBatchTokens <= config.DRONE_INPUT_TOKEN_MAX) {
                            console.log(`🔗 Merging tiny batch (${currentBatchTokens} tokens) with previous batch (${lastBatch.total_tokens} tokens)`);
                            lastBatch.segments.push(...currentBatchSegments);
                            lastBatch.total_tokens += currentBatchTokens;
                            
                            // Start fresh with current segment
                            currentBatchSegments = [segment];
                            currentBatchTokens = segment.token_count;
                            segmentIndex++;
                            continue;
                        }
                    }
                    
                    // Fallback: create tiny batch anyway (will be caught by guard later)
                    console.warn(`⚠️ Creating tiny batch (${currentBatchTokens} tokens) - no merge options available`);
                }
            }
            
            // Normal case: finalize current batch if it has content
            if (currentBatchSegments.length > 0) {
                batches.push({
                    segments: currentBatchSegments,
                    total_tokens: currentBatchTokens,
                });
            }
            
            // Start new batch with current segment
            currentBatchSegments = [segment];
            currentBatchTokens = segment.token_count;
            segmentIndex++;
        }

        // Check target window finalization with tiny segment lookahead
        if (currentBatchTokens >= config.DRONE_INPUT_TOKEN_MIN && 
            segmentIndex < consolidatedSegments.length) {
            
            const nextSegment = consolidatedSegments[segmentIndex];
            const wouldExceedWindow = currentBatchTokens + nextSegment.token_count > targetWindowUpperBound;
            const inTargetWindow = currentBatchTokens >= targetWindowLowerBound;
            
            if (wouldExceedWindow && inTargetWindow) {
                // TINY SEGMENT LOOKAHEAD: Check if next segment would create a tiny batch
                let shouldFinalize = true;
                
                if (nextSegment.token_count < config.DRONE_INPUT_TOKEN_MIN) {
                    // Next segment is tiny - check if we have room to absorb it
                    const wouldExceedMax = currentBatchTokens + nextSegment.token_count > config.DRONE_INPUT_TOKEN_MAX;
                    
                    if (!wouldExceedMax) {
                        console.log(`🔍 Tiny segment lookahead: Absorbing ${nextSegment.id} (${nextSegment.token_count} tokens) to prevent tiny batch`);
                        currentBatchSegments.push(nextSegment);
                        currentBatchTokens += nextSegment.token_count;
                        segmentIndex++;
                        shouldFinalize = false; // Continue building this batch
                    } else {
                        // Can't absorb - check what comes after the tiny segment
                        if (segmentIndex + 1 < consolidatedSegments.length) {
                            const segmentAfterTiny = consolidatedSegments[segmentIndex + 1];
                            const tinyPlusNext = nextSegment.token_count + segmentAfterTiny.token_count;
                            
                            if (tinyPlusNext <= config.DRONE_INPUT_TOKEN_MAX && tinyPlusNext >= config.DRONE_INPUT_TOKEN_MIN) {
                                console.log(`🔍 Tiny segment will form viable batch with next segment (${tinyPlusNext} tokens) - proceeding with finalization`);
                            } else {
                                console.warn(`⚠️ Next segment (${nextSegment.token_count} tokens) will likely create problems`);
                            }
                        }
                    }
                }
                
                if (shouldFinalize) {
                    batches.push({
                        segments: currentBatchSegments,
                        total_tokens: currentBatchTokens,
                    });
                    
                    console.log(`🎯 Finalized batch at target window: ${currentBatchTokens} tokens`);
                    currentBatchSegments = [];
                    currentBatchTokens = 0;
                }
            }
        }

        // Handle final segment
        const isLastSegmentProcessed = segmentIndex === consolidatedSegments.length;
        if (isLastSegmentProcessed && currentBatchSegments.length > 0) {
            batches.push({
                segments: currentBatchSegments,
                total_tokens: currentBatchTokens,
            });
            currentBatchSegments = [];
            currentBatchTokens = 0;
        }
    }

    // Handle "Last Two Drone Rebalance"
    if (batches.length >= 2) {
        let batchNMinus1 = batches[batches.length - 2];
        let batchN = batches[batches.length - 1];

        const triggerRebalance =
            batchN.total_tokens < Math.floor(config.DRONE_IDEAL_TARGET_TOKENS * config.REBALANCE_LOWER_THRESHOLD_PERCENT) &&
            batchNMinus1.total_tokens > Math.ceil(config.DRONE_IDEAL_TARGET_TOKENS * config.REBALANCE_UPPER_THRESHOLD_PERCENT) &&
            batchNMinus1.segments.length > 1;

        if (triggerRebalance) {
            console.log(`♻️ Rebalance Triggered: Batch N-1 (${batchNMinus1.total_tokens} tokens), Batch N (${batchN.total_tokens} tokens)`);
            const segmentToMove = batchNMinus1.segments.pop();
            batchNMinus1.total_tokens -= segmentToMove.token_count;

            if (batchNMinus1.total_tokens >= config.DRONE_INPUT_TOKEN_MIN || batches.length === 2) {
                if (batchN.total_tokens + segmentToMove.token_count <= config.DRONE_INPUT_TOKEN_MAX) {
                    batchN.segments.unshift(segmentToMove);
                    batchN.total_tokens += segmentToMove.token_count;
                    console.log(`✅ Rebalanced: Moved segment ${segmentToMove.id}. New Batch N-1: ${batchNMinus1.total_tokens} tokens, New Batch N: ${batchN.total_tokens} tokens.`);
                } else {
                    batchNMinus1.segments.push(segmentToMove);
                    batchNMinus1.total_tokens += segmentToMove.token_count;
                    console.log("❌ Rebalance: Move failed (Batch N would exceed max). Reverted.");
                }
            } else {
                batchNMinus1.segments.push(segmentToMove);
                batchNMinus1.total_tokens += segmentToMove.token_count;
                console.log("❌ Rebalance: Move failed (Batch N-1 would become too small). Reverted.");
            }
        }
    }

    // Handle "Recent Conversation Priority" - boost final batch for better condensation
    if (batches.length >= 2) {
        let batchNMinus1 = batches[batches.length - 2];
        let batchN = batches[batches.length - 1];
        
        // Use DRONE_INPUT_TOKEN_MIN as the threshold since that's our actual minimum
        const recentConvoMinTokens = config.RECENT_CONVERSATION_MIN_TOKENS || config.DRONE_INPUT_TOKEN_MIN;
        
        const needsRecentConvoBoost = 
            batchN.total_tokens < recentConvoMinTokens &&
            batchNMinus1.segments.length > 1; // N-1 has segments to spare
        
        if (needsRecentConvoBoost) {
            console.log(`🎯 Recent Conversation Priority: Final batch (${batchN.total_tokens} tokens) below threshold (${recentConvoMinTokens})`);
            
            // Find ANY segment in N-1 that would help N reach minimum (more aggressive)
            let bestSegmentIndex = -1;
            let bestSegmentGain = 0;
            
            for (let i = 0; i < batchNMinus1.segments.length; i++) {
                const segment = batchNMinus1.segments[i];
                const newNTokens = batchN.total_tokens + segment.token_count;
                const newNMinus1Tokens = batchNMinus1.total_tokens - segment.token_count;
                
                // More relaxed conditions - just need to help and not break things
                if (newNTokens <= config.DRONE_INPUT_TOKEN_MAX && // N doesn't exceed max
                    (newNMinus1Tokens >= config.DRONE_INPUT_TOKEN_MIN || batchNMinus1.segments.length === 1) && // N-1 stays viable OR we're taking its only segment
                    segment.token_count > bestSegmentGain) { // This is the best segment so far
                    
                    bestSegmentIndex = i;
                    bestSegmentGain = segment.token_count;
                }
            }
            
            if (bestSegmentIndex >= 0) {
                const segmentToMove = batchNMinus1.segments.splice(bestSegmentIndex, 1)[0];
                batchNMinus1.total_tokens -= segmentToMove.token_count;
                batchN.segments.unshift(segmentToMove); // Add to beginning to maintain chronological order
                batchN.total_tokens += segmentToMove.token_count;
                
                console.log(`🚀 Recent Conversation Boost: Moved segment ${segmentToMove.id} (${segmentToMove.token_count} tokens)`);
                console.log(`   Final batch: ${batchN.total_tokens - segmentToMove.token_count} → ${batchN.total_tokens} tokens`);
                console.log(`   Previous batch: ${batchNMinus1.total_tokens + segmentToMove.token_count} → ${batchNMinus1.total_tokens} tokens`);
                
                // If N-1 became too small, merge it with N
                if (batchNMinus1.total_tokens < config.DRONE_INPUT_TOKEN_MIN && batchNMinus1.segments.length > 0) {
                    console.log(`🔗 N-1 became too small (${batchNMinus1.total_tokens}), merging remainder into final batch`);
                    batchN.segments.unshift(...batchNMinus1.segments);
                    batchN.total_tokens += batchNMinus1.total_tokens;
                    batches.splice(-2, 1); // Remove N-1
                }
            } else {
                console.log(`⚠️ Recent Conversation Priority: No safe segment move found for final batch boost`);
            }
        }
    }

    // Add batch_id to each batch first (needed for guard logic)
    batches = batches.map((batch, index) => ({
        batch_id: `drone_batch_${String(index + 1).padStart(3, '0')}`,
        ...batch
    }));

    // Guard against batches smaller than output target (final safeguard)
    const outputTarget = config.DEFAULT_DRONE_OUTPUT_TOKEN_TARGET || 150;
    const minViableInput = Math.max(outputTarget * 1.5, config.DRONE_INPUT_TOKEN_MIN);

    for (let i = batches.length - 1; i >= 0; i--) {
        const batch = batches[i];
        
        if (batch.total_tokens < config.DRONE_INPUT_TOKEN_MIN) {
            console.warn(`🚨 Batch ${batch.batch_id} (${batch.total_tokens} tokens) below minimum threshold`);
            
            let merged = false;
            
            // Try merging with previous batch first (more chronologically logical)
            if (i > 0) {
                const prevBatch = batches[i-1];
                if (prevBatch.total_tokens + batch.total_tokens <= config.DRONE_INPUT_TOKEN_MAX) {
                    console.log(`🔗 Merging batch ${batch.batch_id} INTO previous batch ${prevBatch.batch_id}`);
                    prevBatch.segments.push(...batch.segments);
                    prevBatch.total_tokens += batch.total_tokens;
                    batches.splice(i, 1);
                    merged = true;
                }
            }
            
            // Try merging with next batch if previous didn't work
            if (!merged && i < batches.length - 1) {
                const nextBatch = batches[i+1];
                if (batch.total_tokens + nextBatch.total_tokens <= config.DRONE_INPUT_TOKEN_MAX) {
                    console.log(`🔗 Merging batch ${batch.batch_id} INTO next batch ${nextBatch.batch_id}`);
                    nextBatch.segments.unshift(...batch.segments);
                    nextBatch.total_tokens += batch.total_tokens;
                    batches.splice(i, 1);
                    merged = true;
                }
            }
            
            // Last resort: try merging with any viable batch
            if (!merged) {
                for (let j = 0; j < batches.length; j++) {
                    if (j !== i && batches[j].total_tokens + batch.total_tokens <= config.DRONE_INPUT_TOKEN_MAX) {
                        console.log(`🔗 Last resort: Merging batch ${batch.batch_id} into batch ${batches[j].batch_id}`);
                        if (j < i) {
                            batches[j].segments.push(...batch.segments);
                        } else {
                            batches[j].segments.unshift(...batch.segments);
                        }
                        batches[j].total_tokens += batch.total_tokens;
                        batches.splice(i, 1);
                        merged = true;
                        break;
                    }
                }
            }
            
            if (!merged) {
                console.error(`💀 CRITICAL: Cannot merge tiny batch ${batch.batch_id} anywhere. Marking for potential skip.`);
                batch.skip_reason = `Below minimum threshold (${batch.total_tokens} < ${config.DRONE_INPUT_TOKEN_MIN}) and cannot merge`;
            }
        }
    }

    // Re-assign batch IDs after any merging
    batches = batches.map((batch, index) => ({
        ...batch,
        batch_id: `drone_batch_${String(index + 1).padStart(3, '0')}`
    }));

    // Apply "Last Drone Scraps" policy (final reporting)
    if (batches.length > 0) {
        const lastBatch = batches[batches.length - 1];
        if (lastBatch.total_tokens < config.DRONE_INPUT_TOKEN_MIN) {
            if (lastBatch.total_tokens < config.ABSOLUTE_MIN_VIABLE_DRONE_TOKENS) {
                console.error(`💀 INEFFICIENCY: Last drone batch ${lastBatch.batch_id} has ${lastBatch.total_tokens} tokens, which is below ABSOLUTE_MIN_VIABLE_DRONE_TOKENS (${config.ABSOLUTE_MIN_VIABLE_DRONE_TOKENS}).`);
            } else {
                console.warn(`⚠️ Last drone batch ${lastBatch.batch_id} has ${lastBatch.total_tokens} tokens, which is below DRONE_INPUT_TOKEN_MIN (${config.DRONE_INPUT_TOKEN_MIN}) but above absolute minimum. Proceeding.`);
            }
        }
    }

    // Token conservation verification
    const totalBatchedTokens = batches.reduce((sum, batch) => sum + batch.total_tokens, 0);
    const inputTokens = consolidatedSegments.reduce((sum, seg) => sum + seg.token_count, 0);

    console.log(`\n🧮 Token Conservation Check:`);
    console.log(`   Input segments: ${inputTokens.toLocaleString()} tokens`);
    console.log(`   Final batches: ${totalBatchedTokens.toLocaleString()} tokens`);

    if (totalBatchedTokens === inputTokens) {
        console.log(`   ✅ Perfect conservation - no tokens lost`);
    } else {
        const difference = totalBatchedTokens - inputTokens;
        console.log(`   ${difference > 0 ? '⚠️' : '❌'} Difference: ${difference > 0 ? '+' : ''}${difference} tokens`);
    }

    return batches;
}

function prepareDroneInputs(droneBatches) {
    if (!Array.isArray(droneBatches)) {
        return [];
    }

    return droneBatches.map(batch => {
        const inputText = batch.segments
            .map(segment => segment.text)
            .join(config.SEGMENT_TEXT_SEPARATOR);

        const actualTokenCount = estimateTokens(inputText);

        // Sanity check for final token count vs max
        if (actualTokenCount > config.DRONE_INPUT_TOKEN_MAX) {
            console.error(`CRITICAL ERROR for ${batch.batch_id}: Final concatenated input_text has ${actualTokenCount} tokens, exceeding DRONE_INPUT_TOKEN_MAX (${config.DRONE_INPUT_TOKEN_MAX}). Batch tokens sum was ${batch.total_tokens}. This might be due to separator tokens.`);
        }

        const originalSegmentIds = batch.segments.reduce((acc, seg) => {
            if (Array.isArray(seg.original_ids)) {
                acc.push(...seg.original_ids);
            } else {
                acc.push(seg.id);
            }
            return acc;
        }, []);

        return {
            drone_id: batch.batch_id,
            input_text: inputText,
            actual_token_count: actualTokenCount,
            prompt: config.DEFAULT_DRONE_PROMPT,
            output_token_target: config.DEFAULT_DRONE_OUTPUT_TOKEN_TARGET,
            original_segment_ids: originalSegmentIds,
        };
    });
}

module.exports = {
    rescueTinyOrphans,
    consolidateSegments,
    createDroneBatches,
    prepareDroneInputs
};