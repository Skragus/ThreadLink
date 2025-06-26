/**
 * Text batching module for ThreadLink
 * Groups paragraphs into optimal-sized batches for parallel processing
 * Browser-compatible ES Module version
 */

import * as config from './config.js';
import { estimateTokens } from '../lib/client-api.js';

/**
 * Merges tiny "orphan" paragraphs with adjacent paragraphs.
 * This is an efficient single-pass version.
 */
export function rescueTinyOrphans(paragraphs, minThreshold = config.MIN_ORPHAN_TOKEN_THRESHOLD) {
    if (!Array.isArray(paragraphs) || paragraphs.length < 2) {
        return paragraphs;
    }

    const rescued = [paragraphs[0]]; // Start with the first paragraph

    for (let i = 1; i < paragraphs.length; i++) {
        const current = paragraphs[i];
        const previous = rescued[rescued.length - 1];

        // If current or the block we're building (previous) is an orphan, merge.
        if (current.token_count < minThreshold || previous.token_count < minThreshold) {
            // Annotations: Smart merging to preserve all original data.
            previous.id = `${previous.id}+${current.id}`;
            previous.text = `${previous.text || ''}${config.ORPHAN_MERGE_SEPARATOR}${current.text || ''}`;
            previous.token_count += (current.token_count || 0);
            
            const currentOriginals = Array.isArray(current.merged_from) ? current.merged_from : [current.id];
            const previousOriginals = Array.isArray(previous.merged_from) ? previous.merged_from : [previous.id];
            previous.merged_from = previousOriginals.concat(currentOriginals);
        } else {
            // Neither is an orphan, so the current paragraph can stand on its own.
            rescued.push(current);
        }
    }
    console.log(`🏁 Orphan rescue complete: ${paragraphs.length} → ${rescued.length} paragraphs`);
    return rescued;
}

/**
 * Consolidates an array of paragraph objects into larger segments.
 */
export function consolidateSegments(paragraphs, customSettings = {}) {
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
        console.warn("⚠️ No paragraphs to consolidate.");
        return [];
    }

    const { customDroneDensity, totalInputTokens } = customSettings;
    
    // Calculate dynamic ceiling based on drone density
    let dynamicCeiling = config.AGGREGATOR_CEILING_TOKENS;
    
    if (customDroneDensity && customDroneDensity >= 3 && totalInputTokens > 0) {
        // For high drone density, use smaller ceiling to create more segments
        const targetDroneSize = Math.floor(totalInputTokens / config.calculateEstimatedDrones(totalInputTokens, customDroneDensity));
        dynamicCeiling = Math.min(config.AGGREGATOR_CEILING_TOKENS, Math.max(1000, targetDroneSize * 0.8));
        console.log(`🎯 High drone density: Dynamically reducing aggregator ceiling to ${dynamicCeiling} tokens.`);
    }

    // Log input stats
    const tokenCounts = paragraphs.map(p => p.token_count);
    console.log(`📊 Input paragraph sizes: min=${Math.min(...tokenCounts)}, max=${Math.max(...tokenCounts)}, avg=${Math.round(tokenCounts.reduce((a,b) => a+b, 0) / tokenCounts.length)}`);

    const consolidated = [];
    const needsSplitting = [];

    // First pass: identify paragraphs that need splitting
    for (const para of paragraphs) {
        if (para.token_count > dynamicCeiling) {
            needsSplitting.push(para);
        } else {
            consolidated.push(para);
        }
    }

    // Handle oversized paragraphs that need splitting
    if (needsSplitting.length > 0) {
        console.log(`📋 ${needsSplitting.length} paragraphs exceed the ${dynamicCeiling} token ceiling and will be split.`);
        
        for (const oversizedPara of needsSplitting) {
            const splits = splitOversizedParagraph(oversizedPara, dynamicCeiling);
            console.log(`   Split paragraph (${oversizedPara.token_count} tokens) into ${splits.length} segments`);
            consolidated.push(...splits);
        }
    } else {
        console.log(`📋 No paragraphs needed splitting (all under ${dynamicCeiling} tokens)`);
    }

    // Second pass: consolidate small adjacent segments
    const finalSegments = [];
    let currentSegment = null;

    for (const segment of consolidated) {
        if (!currentSegment) {
            currentSegment = {
                text: segment.text,
                token_count: segment.token_count,
                segment_indices: [segment.segment_index || consolidated.indexOf(segment)]
            };
        } else if (currentSegment.token_count + segment.token_count <= dynamicCeiling) {
            // Merge with current segment
            currentSegment.text += config.CONSOLIDATION_SEPARATOR + segment.text;
            currentSegment.token_count += segment.token_count;
            currentSegment.segment_indices.push(segment.segment_index || consolidated.indexOf(segment));
        } else {
            // Current segment is full, start a new one
            if (currentSegment.token_count >= config.MIN_SEGMENT_TARGET_TOKENS) {
                finalSegments.push(currentSegment);
            } else {
                // Current segment is too small, force merge
                currentSegment.text += config.CONSOLIDATION_SEPARATOR + segment.text;
                currentSegment.token_count += segment.token_count;
                currentSegment.segment_indices.push(segment.segment_index || consolidated.indexOf(segment));
                finalSegments.push(currentSegment);
                currentSegment = null;
                continue;
            }
            
            currentSegment = {
                text: segment.text,
                token_count: segment.token_count,
                segment_indices: [segment.segment_index || consolidated.indexOf(segment)]
            };
        }
    }

    // Don't forget the last segment
    if (currentSegment && currentSegment.token_count > 0) {
        finalSegments.push(currentSegment);
    }

    console.log(`✅ Segment consolidation complete. Final count: ${finalSegments.length} consolidated segments.`);
    
    // Log final segment sizes
    const finalSizes = finalSegments.map(s => s.token_count);
    console.log(`📊 Consolidated segment sizes: [${finalSizes.slice(0, 30).join(', ')}${finalSizes.length > 30 ? '...' : ''}]`);

    return finalSegments;
}

// Helper function to split oversized paragraphs
function splitOversizedParagraph(paragraph, maxTokens) {
    const splits = [];
    
    // Simple sentence-based splitting
    const sentences = paragraph.text.match(/[^.!?]+[.!?]+/g) || [paragraph.text];
    let currentSplit = {
        text: '',
        token_count: 0,
        segment_index: paragraph.segment_index
    };

    for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        
        if (currentSplit.token_count + sentenceTokens > maxTokens && currentSplit.text.length > 0) {
            // Save current split and start a new one
            splits.push({...currentSplit});
            currentSplit = {
                text: sentence,
                token_count: sentenceTokens,
                segment_index: paragraph.segment_index
            };
        } else {
            // Add to current split
            currentSplit.text += (currentSplit.text ? ' ' : '') + sentence;
            currentSplit.token_count += sentenceTokens;
        }
    }

    // Don't forget the last split
    if (currentSplit.text) {
        splits.push(currentSplit);
    }

    // Fallback: if no good splits found, do character-based splitting
    if (splits.length === 0) {
        const targetCharsPerSplit = Math.floor(paragraph.text.length * (maxTokens / paragraph.token_count));
        let remainingText = paragraph.text;
        
        while (remainingText.length > 0) {
            const splitText = remainingText.substring(0, targetCharsPerSplit);
            splits.push({
                text: splitText,
                token_count: estimateTokens(splitText),
                segment_index: paragraph.segment_index
            });
            remainingText = remainingText.substring(targetCharsPerSplit);
        }
    }

    return splits;
}

/**
 * Helper function to split text by size limit when sentence splitting isn't enough
 */
function splitBySizeLimit(text, maxTokens, baseId, startIndex) {
    const chunks = [];
    
    // Try splitting by lines first
    const lines = text.split('\n');
    if (lines.length > 1) {
        let currentChunk = {
            id: `${baseId}_chunk_${String(startIndex).padStart(3, '0')}`,
            text: '',
            token_count: 0,
            original_ids: [baseId]
        };
        let chunkIndex = startIndex;
        
        for (const line of lines) {
            const lineTokens = estimateTokens(line);
            
            if (lineTokens > maxTokens) {
                // Line is too large, need character-level splitting
                if (currentChunk.text.length > 0) {
                    chunks.push(currentChunk);
                    chunkIndex++;
                }
                
                // Split the line by approximate character count
                const charChunks = splitByCharacterLimit(line, maxTokens, baseId, chunkIndex);
                chunks.push(...charChunks);
                chunkIndex += charChunks.length;
                
                currentChunk = {
                    id: `${baseId}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                    text: '',
                    token_count: 0,
                    original_ids: [baseId]
                };
            } else if (currentChunk.token_count + lineTokens > maxTokens && currentChunk.text.length > 0) {
                chunks.push(currentChunk);
                chunkIndex++;
                currentChunk = {
                    id: `${baseId}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                    text: line,
                    token_count: lineTokens,
                    original_ids: [baseId]
                };
            } else {
                currentChunk.text += (currentChunk.text ? '\n' : '') + line;
                currentChunk.token_count += lineTokens;
            }
        }
        
        if (currentChunk.text.length > 0) {
            chunks.push(currentChunk);
        }
    } else {
        // Single line - split by characters
        chunks.push(...splitByCharacterLimit(text, maxTokens, baseId, startIndex));
    }
    
    return chunks;
}

/**
 * Last resort: split by approximate character count
 */
function splitByCharacterLimit(text, maxTokens, baseId, startIndex) {
    const chunks = [];
    // Rough estimate: 1 token ≈ 4 characters
    const approxCharsPerToken = 4;
    const maxChars = maxTokens * approxCharsPerToken;
    
    let chunkIndex = startIndex;
    let start = 0;
    
    while (start < text.length) {
        let end = Math.min(start + maxChars, text.length);
        
        // Try to find a good breaking point (space, punctuation)
        if (end < text.length) {
            let breakPoint = end;
            // Look backwards for a space or punctuation
            for (let i = end; i > start + maxChars * 0.5; i--) {
                if (text[i] === ' ' || text[i] === '\n' || /[.!?,;:]/.test(text[i])) {
                    breakPoint = i + 1;
                    break;
                }
            }
            end = breakPoint;
        }
        
        const chunkText = text.substring(start, end).trim();
        if (chunkText) {
            chunks.push({
                id: `${baseId}_chunk_${String(chunkIndex).padStart(3, '0')}`,
                text: chunkText,
                token_count: estimateTokens(chunkText),
                original_ids: [baseId]
            });
            chunkIndex++;
        }
        
        start = end;
    }
    
    return chunks;
}

/**
 * Creates drone batches from consolidated segments
 */
export function createDroneBatches(consolidatedSegments, customSettings = {}) {
    // --- 1. SETUP & VALIDATION ---
    if (!Array.isArray(consolidatedSegments) || consolidatedSegments.length === 0) {
        return [];
    }

    // --- 2. EXTRACT SETTINGS INCLUDING RECENCY MODE ---
    const { 
        customDroneDensity, 
        totalInputTokens, 
        customMaxDrones, 
        customTargetTokens,
        recencyMode = false,
        recencyStrength = 0
    } = customSettings;
    
    const maxDrones = customMaxDrones;

    // --- 3. RECENCY MODE: TEMPORAL BANDING ---
    if (recencyMode && recencyStrength > 0) {
        console.log(`\n🕐 RECENCY MODE ACTIVE: strength=${recencyStrength}`);
        
        // Calculate band boundaries
        const totalSegments = consolidatedSegments.length;
        const oldestEnd = Math.floor(totalSegments * 0.3);
        const midEnd = Math.floor(totalSegments * 0.8); // 30% + 50% = 80%
        
        // Split segments into temporal bands
        const oldestBand = consolidatedSegments.slice(0, oldestEnd);
        const midBand = consolidatedSegments.slice(oldestEnd, midEnd);
        const recentBand = consolidatedSegments.slice(midEnd);
        
        console.log(`📊 Temporal bands: Oldest=${oldestBand.length}, Mid=${midBand.length}, Recent=${recentBand.length} segments`);
        
        // Calculate density multipliers based on recency strength
        const strength = recencyStrength / 100;
        const oldestMultiplier = 1 - (0.75 * strength);  // 1x → 0.25x
        const midMultiplier = 1 - (0.25 * strength);     // 1x → 0.75x
        const recentMultiplier = 1 + (1.5 * strength);   // 1x → 2.5x
        
        // Calculate effective drone densities for each band
        const baseDensity = customDroneDensity || config.DRONES_PER_10K_TOKENS;
        const oldestDensity = baseDensity * oldestMultiplier;
        const midDensity = baseDensity * midMultiplier;
        const recentDensity = baseDensity * recentMultiplier;
        
        console.log(`🎯 Density multipliers: Oldest=${oldestMultiplier.toFixed(2)}x, Mid=${midMultiplier.toFixed(2)}x, Recent=${recentMultiplier.toFixed(2)}x`);
        console.log(`🎯 Effective densities: Oldest=${oldestDensity.toFixed(2)}, Mid=${midDensity.toFixed(2)}, Recent=${recentDensity.toFixed(2)} drones/10k`);
        
        // Process each band with its specific density
        const allBatches = [];
        
        // Process oldest band (lower resolution)
        if (oldestBand.length > 0) {
            console.log(`\n📦 Processing OLDEST band (${oldestBand.length} segments)...`);
            const oldestBatches = processBandWithDensity(oldestBand, {
                customDroneDensity: oldestDensity,
                totalInputTokens: oldestBand.reduce((sum, seg) => sum + seg.token_count, 0),
                bandName: 'oldest'
            });
            allBatches.push(...oldestBatches);
        }
        
        // Process mid band (medium resolution)
        if (midBand.length > 0) {
            console.log(`\n📦 Processing MID band (${midBand.length} segments)...`);
            const midBatches = processBandWithDensity(midBand, {
                customDroneDensity: midDensity,
                totalInputTokens: midBand.reduce((sum, seg) => sum + seg.token_count, 0),
                bandName: 'mid'
            });
            allBatches.push(...midBatches);
        }
        
        // Process recent band (higher resolution)
        if (recentBand.length > 0) {
            console.log(`\n📦 Processing RECENT band (${recentBand.length} segments)...`);
            const recentBatches = processBandWithDensity(recentBand, {
                customDroneDensity: recentDensity,
                totalInputTokens: recentBand.reduce((sum, seg) => sum + seg.token_count, 0),
                bandName: 'recent'
            });
            allBatches.push(...recentBatches);
        }
        
        console.log(`\n✅ Recency mode batching complete: ${allBatches.length} total batches`);
        
        // Check and enforce max drones limit on the combined result
        let finalBatches = allBatches;
        if (maxDrones && allBatches.length > maxDrones) {
            console.log(`⚠️ Combined batch count (${allBatches.length}) exceeds maxDrones limit (${maxDrones}). Consolidating...`);
            finalBatches = consolidateBatchesToLimit(allBatches, consolidatedSegments, maxDrones);
        }
        
        // Finalize with IDs
        return finalBatches.map((batch, index) => ({
            batch_id: `drone_batch_${String(index + 1).padStart(3, '0')}`,
            ...batch
        }));
    }
    
    // --- 4. STANDARD MODE (NON-RECENCY) PROCESSING ---
    // Calculate dynamic batching parameters
    let droneIdealTarget, droneInputMin, droneInputMax;

    if (customDroneDensity && totalInputTokens > 0) {
        const optimalInputSize = config.calculateOptimalDroneInputSize(totalInputTokens, customDroneDensity);
        droneIdealTarget = optimalInputSize;
        droneInputMin = Math.max(config.ABSOLUTE_MIN_VIABLE_DRONE_TOKENS, Math.floor(optimalInputSize * 0.5));
        droneInputMax = Math.min(config.DRONE_INPUT_TOKEN_MAX, Math.ceil(optimalInputSize * 1.5));
        console.log(`🎯 Custom drone sizing active: density=${customDroneDensity}, ideal=${droneIdealTarget}, min=${droneInputMin}, max=${droneInputMax}`);
    } else {
        droneIdealTarget = config.DRONE_IDEAL_TARGET_TOKENS;
        droneInputMin = config.DRONE_INPUT_TOKEN_MIN;
        droneInputMax = config.DRONE_INPUT_TOKEN_MAX;
    }
    
    if (maxDrones) {
        console.log(`🚨 Max drones limit: ${maxDrones}`);
    }
    
    console.log(`📦 Creating Drone Batches: Min=${droneInputMin}, Max=${droneInputMax}, IdealTarget=${droneIdealTarget}`);

    // --- 5. THE SINGLE-PASS BATCHING ALGORITHM ---
    const batches = [];
    let currentBatch = { segments: [], total_tokens: 0 };

    for (const segment of consolidatedSegments) {
        // First, handle segments that are too large to ever fit in a normal batch.
        if (segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) batches.push(currentBatch);
            batches.push({ segments: [segment], total_tokens: segment.token_count, oversized: true });
            currentBatch = { segments: [], total_tokens: 0 };
            continue;
        }

        // Check if adding the new segment would overflow the max limit.
        if (currentBatch.total_tokens + segment.token_count > droneInputMax) {
            // It doesn't fit. Decide what to do with the current batch.
            if (currentBatch.segments.length > 0) {
                // If the current batch is too small to go alone...
                if (currentBatch.total_tokens < droneInputMin) {
                    // ...we force-fit the new segment into it to preserve chronological order.
                    console.warn(`⚠️ Force-fitting to prevent orphan batch. Creating oversized batch.`);
                    currentBatch.segments.push(segment);
                    currentBatch.total_tokens += segment.token_count;
                    batches.push(currentBatch);
                    currentBatch = { segments: [], total_tokens: 0 };
                } else {
                    // The current batch is large enough. Finalize it.
                    batches.push(currentBatch);
                    // The new segment starts the next batch.
                    currentBatch = { segments: [segment], total_tokens: segment.token_count };
                }
            } else {
                // The current batch is empty, but this new segment is somehow still too big.
                // This is a safety case, shouldn't be hit because of the oversized check.
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            }
        } else {
            // The segment fits. Greedily add it.
            currentBatch.segments.push(segment);
            currentBatch.total_tokens += segment.token_count;
        }
    }

    // Don't forget the last batch in the accumulator.
    if (currentBatch.segments.length > 0) {
        batches.push(currentBatch);
    }
    
    // --- 6. ENFORCE DENSITY-BASED DRONE COUNT ---
    let finalBatches = batches;
    if (customDroneDensity && totalInputTokens > 0) {
        const densityTarget = config.calculateEstimatedDrones(totalInputTokens, customDroneDensity, maxDrones);
        if (finalBatches.length > densityTarget) {
            console.log(`🔄 Reducing batches from ${finalBatches.length} to density target ${densityTarget}`);
            finalBatches = consolidateBatchesToLimit(finalBatches, consolidatedSegments, densityTarget);
        }
    }
    // --- 7. CHECK AND ENFORCE MAX DRONES LIMIT ---
    if (maxDrones && finalBatches.length > maxDrones) {
        console.log(`⚠️ Final batch count (${finalBatches.length}) exceeds maxDrones limit (${maxDrones}). Reconsolidating...`);
        finalBatches = consolidateBatchesToLimit(finalBatches, consolidatedSegments, maxDrones);
    }
    
    console.log(`✅ Final batch count: ${finalBatches.length}${maxDrones ? ` (maxDrones: ${maxDrones})` : ''}`);
    
    // --- 8. FINALIZATION ---
    return finalBatches.map((batch, index) => ({
        batch_id: `drone_batch_${String(index + 1).padStart(3, '0')}`,
        ...batch
    }));
}

// Helper function to process a single band with specific density
function processBandWithDensity(bandSegments, settings) {
    const { customDroneDensity, totalInputTokens, bandName } = settings;
    
    // Calculate batching parameters for this band
    const optimalInputSize = config.calculateOptimalDroneInputSize(totalInputTokens, customDroneDensity);
    const droneIdealTarget = optimalInputSize;
    const droneInputMin = Math.max(config.ABSOLUTE_MIN_VIABLE_DRONE_TOKENS, Math.floor(optimalInputSize * 0.5));
    const droneInputMax = Math.min(config.DRONE_INPUT_TOKEN_MAX, Math.ceil(optimalInputSize * 1.5));
    
    console.log(`  Band "${bandName}": ideal=${droneIdealTarget}, min=${droneInputMin}, max=${droneInputMax}`);
    
    const batches = [];
    let currentBatch = { segments: [], total_tokens: 0 };

    for (const segment of bandSegments) {
        if (segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) batches.push(currentBatch);
            batches.push({ segments: [segment], total_tokens: segment.token_count, oversized: true });
            currentBatch = { segments: [], total_tokens: 0 };
            continue;
        }

        if (currentBatch.total_tokens + segment.token_count > droneInputMax) {
            if (currentBatch.segments.length > 0) {
                if (currentBatch.total_tokens < droneInputMin) {
                    currentBatch.segments.push(segment);
                    currentBatch.total_tokens += segment.token_count;
                    batches.push(currentBatch);
                    currentBatch = { segments: [], total_tokens: 0 };
                } else {
                    batches.push(currentBatch);
                    currentBatch = { segments: [segment], total_tokens: segment.token_count };
                }
            } else {
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            }
        } else {
            currentBatch.segments.push(segment);
            currentBatch.total_tokens += segment.token_count;
        }
    }

    if (currentBatch.segments.length > 0) {
        batches.push(currentBatch);
    }
    
    console.log(`  Created ${batches.length} batches for "${bandName}" band`);
    return batches;
}

// Helper function to consolidate batches when over maxDrones limit
function consolidateBatchesToLimit(batches, allSegments, maxDrones) {
    // Calculate new parameters to stay within limit
    const totalTokens = allSegments.reduce((sum, seg) => sum + seg.token_count, 0);
    const newIdealTarget = Math.ceil(totalTokens / maxDrones);
    const newMax = Math.min(config.DRONE_INPUT_TOKEN_MAX * 2, newIdealTarget * 1.5); // Allow 2x max for consolidation
    const newMin = Math.min(config.DRONE_INPUT_TOKEN_MIN, newIdealTarget * 0.7);
    
    console.log(`🔄 Recalculating with new parameters: ideal=${newIdealTarget}, min=${newMin}, max=${newMax}`);
    
    // Re-batch with new parameters
    let finalBatches = [];
    let currentBatch = { segments: [], total_tokens: 0 };
    
    for (const segment of allSegments) {
        if (segment.token_count > newMax) {
            if (currentBatch.segments.length > 0) finalBatches.push(currentBatch);
            finalBatches.push({ segments: [segment], total_tokens: segment.token_count, oversized: true });
            currentBatch = { segments: [], total_tokens: 0 };
            continue;
        }
        
        if (currentBatch.total_tokens + segment.token_count > newMax) {
            if (currentBatch.segments.length > 0) {
                finalBatches.push(currentBatch);
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            } else {
                currentBatch = { segments: [segment], total_tokens: segment.token_count };
            }
        } else {
            currentBatch.segments.push(segment);
            currentBatch.total_tokens += segment.token_count;
        }
    }
    
    if (currentBatch.segments.length > 0) {
        finalBatches.push(currentBatch);
    }
    
    // If STILL over limit, force merge to stay within maxDrones
    if (finalBatches.length > maxDrones) {
        console.log(`🔨 Still over limit (${finalBatches.length}). Force-merging to exactly ${maxDrones} batches...`);
        finalBatches = forceMergeBatchesToExactCount(finalBatches, maxDrones);
    }
    
    return finalBatches;
}

// Helper function to force merge batches to EXACTLY the target count
function forceMergeBatchesToExactCount(batches, targetCount) {
    if (batches.length <= targetCount) return batches;
    
    // Calculate how many merges we need
    const mergesToDo = batches.length - targetCount;
    console.log(`📊 Need to merge ${mergesToDo} batch pairs: ${batches.length} → ${targetCount}`);
    
    // Create a working copy
    let workingBatches = [...batches];
    
    // Distribute merges evenly across the batches
    for (let i = 0; i < mergesToDo; i++) {
        if (workingBatches.length <= targetCount) break;
        
        // Find the smallest adjacent pair to merge (to minimize oversize batches)
        let bestMergeIndex = -1;
        let smallestCombinedSize = Infinity;
        
        for (let j = 0; j < workingBatches.length - 1; j++) {
            const combinedSize = workingBatches[j].total_tokens + workingBatches[j + 1].total_tokens;
            if (combinedSize < smallestCombinedSize) {
                smallestCombinedSize = combinedSize;
                bestMergeIndex = j;
            }
        }
        
        if (bestMergeIndex >= 0) {
            // Merge the selected pair
            const mergedBatch = {
                segments: [
                    ...workingBatches[bestMergeIndex].segments,
                    ...workingBatches[bestMergeIndex + 1].segments
                ],
                total_tokens: workingBatches[bestMergeIndex].total_tokens + workingBatches[bestMergeIndex + 1].total_tokens,
                oversized: workingBatches[bestMergeIndex].oversized || workingBatches[bestMergeIndex + 1].oversized
            };
            
            // Replace the two batches with the merged one
            workingBatches.splice(bestMergeIndex, 2, mergedBatch);
        }
    }
    
    console.log(`✅ Force-merged ${batches.length} batches into exactly ${workingBatches.length} batches`);
    
    // Verify we hit the target
    if (workingBatches.length !== targetCount) {
        console.warn(`⚠️ Expected ${targetCount} batches but got ${workingBatches.length}`);
    }
    
    // Log stats about the merged batches
    const sizes = workingBatches.map(b => b.total_tokens);
    const avgSize = Math.round(sizes.reduce((sum, s) => sum + s, 0) / sizes.length);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    console.log(`📊 Final batch stats: count=${workingBatches.length}, min=${minSize}, avg=${avgSize}, max=${maxSize} tokens`);
    
    if (maxSize > config.DRONE_INPUT_TOKEN_MAX * 1.5) {
        console.warn(`⚠️ Some batches significantly exceed target size. Consider increasing maxDrones.`);
    }
    
    return workingBatches;
}

/**
 * Prepares the final drone payloads from the batched segments.
 */
export function prepareDroneInputs(droneBatchesOfSegments, customSettings = {}) {
    if (!Array.isArray(droneBatchesOfSegments) || droneBatchesOfSegments.length === 0) {
        console.warn("⚠️ No drone batches to prepare.");
        return [];
    }

    const {
        customDroneDensity,
        totalInputTokens,
        recencyMode = false,
        recencyStrength = 0
    } = customSettings;

    // Calculate target output per drone
    let targetOutputPerDrone = config.DEFAULT_DRONE_OUTPUT_TOKEN_TARGET;
    if (customDroneDensity && totalInputTokens > 0) {
        targetOutputPerDrone = config.calculateDroneOutputTarget(
            totalInputTokens,
            config.TARGET_CONTEXT_CARD_TOKENS,
            customDroneDensity
        );
    }

    console.log(`🎯 Target output per drone: ${targetOutputPerDrone} tokens`);

    const droneInputStrings = [];
    const isRecencyActive = recencyMode && recencyStrength > 0;

    for (const batch of droneBatchesOfSegments) {
        const combinedText = batch.segments
            .map(segment => segment.text)
            .join(config.SEGMENT_TEXT_SEPARATOR);

        const estimatedTokenCount = estimateTokens(combinedText);
        
        // Determine if this batch is from recent content (for recency mode)
        // This is a heuristic based on batch position
        const batchIndex = droneBatchesOfSegments.indexOf(batch);
        const batchPosition = batchIndex / droneBatchesOfSegments.length;
        const isRecentBatch = isRecencyActive && batchPosition > 0.8; // Last 20% of batches
        
        // Adjust target if this is a recent batch in recency mode
        let adjustedTarget = targetOutputPerDrone;
        if (isRecentBatch && recencyStrength > 50) {
            // Give recent batches slightly more output budget
            adjustedTarget = Math.ceil(targetOutputPerDrone * 1.2);
        }

        const dronePrompt = config.DEFAULT_DRONE_PROMPT
            .replace('{TARGET_TOKENS}', adjustedTarget);

        droneInputStrings.push({
            batch_id: batch.batch_id,
            prompt: dronePrompt,
            text: combinedText,
            token_estimate: estimatedTokenCount,
            target_output_tokens: adjustedTarget,
            metadata: {
                segment_count: batch.segments.length,
                oversized: batch.oversized || false,
                recency_mode: isRecencyActive,
                is_recent_content: isRecentBatch
            }
        });

        if (estimatedTokenCount > config.DRONE_INPUT_TOKEN_MAX) {
            console.warn(`⚠️ OVERLOADED BATCH DETECTED for ${batch.batch_id}: Final size ${estimatedTokenCount} tokens.`);
        }
    }

    console.log(`✅ Prepared ${droneInputStrings.length} drone input strings.`);
    
    // Log recency distribution if active
    if (isRecencyActive) {
        const recentCount = droneInputStrings.filter(d => d.metadata.is_recent_content).length;
        console.log(`🕐 Recency distribution: ${recentCount} recent batches, ${droneInputStrings.length - recentCount} older batches`);
    }

    return droneInputStrings;
}