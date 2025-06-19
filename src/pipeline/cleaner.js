/**
 * Text cleaning module for ThreadLink
 * Removes common boilerplate patterns from AI chat sessions while preserving paragraph splitting markers
 * Browser-compatible ES Module version
 */

import { estimateTokens } from '../lib/client-api.js';

/**
 * Clean common boilerplate patterns from AI chat sessions while preserving paragraph splitting markers
 * @param {string} content - The raw chat content string
 * @returns {{cleanedContent: string, originalContent: string, logs: string[]}}
 */
export function cleanAiChatContent(content) {
    let originalContent = content;
    let logs = [];

    // Calculate original token count
    const originalTokens = estimateTokens(originalContent);

    // SAFE patterns to remove (won't interfere with paragraph splitting)
    const patternsToRemove = [
        // Clock timestamps in chat interfaces (but preserve "5s" style timestamps)
        /\b\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\b/gim,
        /\b\d{1,2}:\d{2}\s*(AM|PM)\b/gim,
        /\bToday\s*\d{1,2}:\d{2}\s*(AM|PM)?\b/gim,
        /\d{1,2}\/\d{1,2}\/\d{4}\s*\d{1,2}:\d{2}/gim,

        // AI platform URLs only
        /https?:\/\/chat\.openai\.com[^\s]*/gim,
        /https?:\/\/claude\.ai[^\s]*/gim,
        /https?:\/\/bard\.google\.com[^\s]*/gim,
        /https?:\/\/gemini\.google\.com[^\s]*/gim,

        // Specific AI interface elements (with exact brackets)
        /\[Copy\]/gim,
        /\[Regenerate\]/gim,
        /\[Thumbs up\]/gim,
        /\[Thumbs down\]/gim,
        /\[Share\]/gim,
        /\[Continue\]/gim,

        // Navigation phrases (only when standalone)
        /^New conversation\s*$/gim,
        /^Clear conversation\s*$/gim,
        /^Export conversation\s*$/gim,
        /^Settings\s*$/gim,
        /^Sign out\s*$/gim,
        /^Menu\s*$/gim,
        /^Skip to content\s*$/gim,

        // Status messages (only when standalone)
        /^Claude is typing\.\.\.\s*$/gim,
        /^Generating response\.\.\.\s*$/gim,
        /^Thinking\.\.\.\s*$/gim,
        /^Processing\.\.\.\s*$/gim,

        // Usage warnings (only when standalone)
        /^This conversation may be reviewed.*$/gim,
        /^ChatGPT can make mistakes.*$/gim,
        /^Claude cannot.*outside.*conversation.*$/gim,

        // Claude and Mistral-specific UI elements and instructions
        /Smart, efficient model for everyday use Learn more/gim,
        /No content added yet/gim,
        /Add images, PDFs, docs, spreadsheets, and more to summarize, analyze, and query content with Claude\./gim,
        /Collapse to hide model thoughts/gim,
        /Expand to view model thoughts/gim,
        /chevron_right/gim,
        /Thinking Thoughts \(experimental\)/gim,
        /^Learn more\s*$/gim
    ];

    for (const pattern of patternsToRemove) {
        content = content.replace(pattern, '');
    }

    // Smart removal of AI assistant UI buttons (Edit/Retry/Content)
    // Only remove if they appear as standalone capitalized words on their own lines
    const editMatches = content.match(/\nEdit\s*$/gm) || [];
    const editCount = editMatches.length;

    const retryMatches = content.match(/\nRetry\s*$/gm) || [];
    const retryCount = retryMatches.length;

    const contentMatches = content.match(/\nContent\s*$/gm) || [];
    const contentCount = contentMatches.length;

    if (editCount >= 2) {
        content = content.replace(/\nEdit\s*$/gm, '');
        console.log(`🗑️  Removed ${editCount} 'Edit' UI buttons`);
        logs.push(`Removed ${editCount} 'Edit' UI buttons`);
    }

    if (retryCount >= 2) {
        content = content.replace(/\nRetry\s*$/gm, '');
        console.log(`🗑️  Removed ${retryCount} 'Retry' UI buttons`);
        logs.push(`Removed ${retryCount} 'Retry' UI buttons`);
    }

    if (contentCount >= 1) { // Content usually appears only once at the very end
        content = content.replace(/\nContent\s*$/gm, '');
        console.log(`🗑️  Removed ${contentCount} 'Content' UI element(s)`);
        logs.push(`Removed ${contentCount} 'Content' UI element(s)`);
    }

    // Only clean up speaker labels when they appear redundantly
    content = content.replace(/^(Claude|ChatGPT|Gemini|GPT-4|GPT-3\.5|Mistral):\s*/gm, '**Assistant:** ');
    content = content.replace(/^(Human|User|You):\s*/gm, '**Human:** ');
    content = content.replace(/^(Assistant|AI):\s*/gm, '**Assistant:** ');

    // MINIMAL whitespace cleanup - preserve structure
    content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n\n');

    // Remove only trailing spaces at end of lines (preserve leading spaces/tabs)
    let lines = content.split('\n');
    content = lines.map(line => line.trimEnd()).join('\n');

    content = content.trim();

    // Calculate cleaned token count and add to logs
    const cleanedTokens = estimateTokens(content);
    const tokensSaved = originalTokens - cleanedTokens;
    const percentSaved = originalTokens > 0 ? ((tokensSaved / originalTokens) * 100).toFixed(1) : 0;

    // Add token count information to logs
    const logMessage = `📊 Token count: ${originalTokens.toLocaleString()} → ${cleanedTokens.toLocaleString()} tokens (saved ${tokensSaved.toLocaleString()} tokens, ${percentSaved}%)`;
    console.log(logMessage);
    logs.push(logMessage);

    return { cleanedContent: content, originalContent, logs };
}