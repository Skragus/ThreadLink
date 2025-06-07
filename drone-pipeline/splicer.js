const { estimateTokens } = require('./utils'); // Assuming cleaner.js is in the same directory and exports estimateTokens

// --- Constants (mirrored from Python script) ---
const CODE_LANGUAGES = new Set([
    'javascript', 'python', 'java', 'typescript', 'html', 'css', 'json',
    'yaml', 'sql', 'code', 'jsx', 'tsx', 'php', 'ruby', 'go', 'rust',
    'c', 'cpp', 'c++', 'csharp', 'c#', 'bash', 'shell', 'sh', 'xml',
    'markdown', 'md', 'swift', 'kotlin', 'r', 'scala', 'perl',
    'powershell', 'cmd'
]);

const SHELL_LIKE_LANGUAGES = new Set(['bash', 'shell', 'sh', 'powershell', 'cmd']);
const CODE_CHARS_STRING = '{}[]();<>/=+-*';

const COMMAND_KEYWORDS = new Set([
    'install', 'update', 'remove', 'get', 'set', 'run', 'exec', 'start', 'stop',
    'build', 'deploy', 'test', 'config', 'init', 'clone', 'commit', 'push',
    'pull', 'merge', 'checkout', 'add', 'status', 'log', 'diff', 'grep', 'find',
    'cat', 'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'sudo', 'docker', 'npm', 'pip',
    'git', 'apt', 'yum', 'choco', 'brew', 'python', 'node', 'java', 'go', 'ruby', 'perl'
]);

const COMMAND_FILE_EXTENSIONS = new Set([
    '.py', '.js', '.sh', '.bat', '.ps1', '.rb', '.pl', '.jar', '.json', '.yaml', '.yml', '.xml', '.conf', '.ini', '.md', '.txt'
]);

const NUMBERED_LIST_PATTERN = /^(\s*)\d+\.\s/;
const HIERARCHICAL_LIST_PATTERN = /^(\s*)\d+\.\d+\s/;
const BULLET_LIST_PATTERN = /^(\s*)[-*•]\s/;
const CONTINUED_LIST_PATTERN = /^(\s*)[a-zA-Z]\.\s/;
const EMOJI_PATTERN_START = /^[🔍🎯📝💡🚀✅❌⚡️🔧📌🎨🕵️‍♂️🕵️‍♀️]/;
const EMOJI_CHARS_FOR_LIST_CHECK = '🔍🎯📝💡🚀✅❌⚡️🔧📌🎨🕵️‍♂️🕵️‍♀️';


const OUTPUT_INDICATORS = [
    'example output:', 'output:', 'console output:', 'terminal output:',
    'result:', 'results:', 'produces:', 'shows:', 'displays:'
];

const CONSOLE_PATTERNS = [
    /^[=\-─━]+/,
    /^[\*=\-─━]{3,}/,
    /^[📊📈📋🚀🔄✅❌⏰📁🗜️🎯💡🔍]/,
    /^\s*\w+\.(md|py|txt|js|html|css):\s*[✅❌]/,
    /^\s*→\s*/,
    /^[\s\-\*]*\d+\s*(tokens?|chars?|lines?|bytes?)/,
];
const CONSOLE_SPECIAL_CHARS_STRING = '═─━┌┐└┘│├┤┬┴┼*=|-+→←↑↓✅❌📊📈📋🚀🔄⏰📁';

const UI_ELEMENTS_SET = new Set(['retry', 'edit', 'copy', 'close', 'cancel', 'ok', 'yes', 'no']);
const TIMESTAMP_PATTERN = /^\d+s$/i;


// --- Helper Functions (ported from Python) ---

function splitIntoParagraphsInternal(content) {
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = content.split('\n');
    let paragraphs = [];
    let currentParagraphLines = [];
    let inBlankLines = false;
    let pendingColon = false;
    let blankLineBuffer = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
            inBlankLines = true;
            blankLineBuffer.push(line);
            if (currentParagraphLines.length > 0) {
                for (let j = currentParagraphLines.length - 1; j >= 0; j--) {
                    const pLine = currentParagraphLines[j];
                    if (pLine.trim()) {
                        if (pLine.trimEnd().endsWith(':')) {
                            pendingColon = true;
                        } else {
                            pendingColon = false;
                        }
                        break;
                    }
                }
            }
        } else { // Non-blank line
            let shouldContinuePrevious = false;
            if (inBlankLines) {
                if (pendingColon) {
                    shouldContinuePrevious = true;
                    if (!CODE_LANGUAGES.has(line.trim().toLowerCase())) {
                        pendingColon = false;
                    }
                } else if (line.length > 0 && (line[0] === ' ' || line[0] === '\t')) {
                    shouldContinuePrevious = true;
                }
            } else { // No blank lines between this and previous non-blank
                if (currentParagraphLines.length > 0 && CODE_LANGUAGES.has(line.trim().toLowerCase())) {
                    for (let j = currentParagraphLines.length - 1; j >= 0; j--) {
                        const pLine = currentParagraphLines[j];
                        if (pLine.trim()) {
                            if (pLine.trimEnd().endsWith(':')) {
                                shouldContinuePrevious = true;
                            }
                            break;
                        }
                    }
                }
            }

            if (shouldContinuePrevious && currentParagraphLines.length > 0) {
                if (blankLineBuffer.length > 0) {
                    currentParagraphLines.push(...blankLineBuffer);
                }
                currentParagraphLines.push(line);
            } else {
                if (inBlankLines && currentParagraphLines.length > 0) {
                    paragraphs.push(currentParagraphLines.join('\n'));
                    currentParagraphLines = [];
                    pendingColon = false;
                }
                currentParagraphLines.push(line);
            }
            inBlankLines = false;
            blankLineBuffer = [];
        }
    }

    if (currentParagraphLines.length > 0) {
        paragraphs.push(currentParagraphLines.join('\n'));
    }
    return paragraphs.filter(p => p.trim() !== '');
}

function mergeCodeLabelsInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        const currentPara = paragraphs[i];
        const lines = currentPara.split('\n');
        let isOnlyLanguage = false;
        let actualLanguageLabel = "";
        
        const nonEmptyLinesInCurrent = lines.map(l => l.trim()).filter(l => l);
        if (nonEmptyLinesInCurrent.length === 1 && CODE_LANGUAGES.has(nonEmptyLinesInCurrent[0].toLowerCase())) {
            isOnlyLanguage = true;
            actualLanguageLabel = nonEmptyLinesInCurrent[0].toLowerCase();
        }

        let endsWithLanguage = false;
        if (!isOnlyLanguage && nonEmptyLinesInCurrent.length > 0) {
            const lastContentLineStrippedLower = nonEmptyLinesInCurrent[nonEmptyLinesInCurrent.length - 1].toLowerCase();
            if (CODE_LANGUAGES.has(lastContentLineStrippedLower)) {
                endsWithLanguage = true;
                actualLanguageLabel = lastContentLineStrippedLower;
            }
        }

        if ((i + 1 < paragraphs.length) && (isOnlyLanguage || endsWithLanguage)) {
            const nextPara = paragraphs[i+1];
            const nextParaLines = nextPara.split('\n');
            let firstLineNextParaContent = "";
            for (const lNext of nextParaLines) {
                if (lNext.trim()) {
                    firstLineNextParaContent = lNext;
                    break;
                }
            }

            if (!firstLineNextParaContent) { // Next para is empty or whitespace
                mergedParagraphs.push(currentPara);
                i++;
                continue;
            }

            let shouldMerge = false;

            // Condition 1: Standard code block (indentation or specific chars)
            if (firstLineNextParaContent.startsWith('\t') || (firstLineNextParaContent.length >= 2 && firstLineNextParaContent.startsWith('  '))) {
                shouldMerge = true;
            } else if (Array.from(CODE_CHARS_STRING).some(char => nextPara.includes(char))) {
                shouldMerge = true;
            }
            
            // Condition 2: Language label logic
            if (!shouldMerge && actualLanguageLabel) {
                const nextParaFirstLineStrippedLower = firstLineNextParaContent.trim().toLowerCase();
                if (CODE_LANGUAGES.has(nextParaFirstLineStrippedLower)) {
                    // Don't merge if next is another language label; shouldMerge remains false
                } else {
                    if (SHELL_LIKE_LANGUAGES.has(actualLanguageLabel)) {
                        let isCommandLike = false;
                        if (COMMAND_KEYWORDS.has(nextParaFirstLineStrippedLower.split(' ')[0])) isCommandLike = true;
                        if (!isCommandLike && /(?:^|\s)-(?:[a-zA-Z]|[a-zA-Z0-9-]+)(?:$|\s|=)/.test(firstLineNextParaContent)) isCommandLike = true;
                        if (!isCommandLike && Array.from(COMMAND_FILE_EXTENSIONS).some(ext => nextParaFirstLineStrippedLower.includes(ext))) isCommandLike = true;
                        if (!isCommandLike && (nextParaFirstLineStrippedLower.startsWith('./') || nextParaFirstLineStrippedLower.startsWith('../'))) isCommandLike = true;
                        if (!isCommandLike && nextPara.trim().split('\n').length === 1 && nextPara.trim().length < 80 && nextPara.trim() === nextPara.trim().toLowerCase()) {
                            if (/[a-zA-Z]/.test(nextPara.trim())) isCommandLike = true;
                        }
                        if (isCommandLike) shouldMerge = true;
                    } else { // Not a shell-like language, but a label exists and next isn't a label
                        shouldMerge = true;
                    }
                }
            }

            if (shouldMerge) {
                mergedParagraphs.push(currentPara + '\n' + nextPara);
                i += 2;
                continue;
            }
        }
        mergedParagraphs.push(currentPara);
        i++;
    }
    return mergedParagraphs;
}

function mergeSplitCodeBlocksInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        let currentPara = paragraphs[i];
        const lines = currentPara.split('\n');
        let isCodeBlock = false;

        if (lines.length > 0) {
            let indentedLines = 0;
            let codeLikeLines = 0;
            const nonEmptyLines = lines.filter(line => line.trim());

            if (nonEmptyLines.length > 0) {
                for (const line of nonEmptyLines) {
                    if (line.startsWith('\t') || (line.length >=2 && line.startsWith('  '))) {
                        indentedLines++;
                    }
                    if (Array.from(CODE_CHARS_STRING).some(char => line.includes(char))) {
                        codeLikeLines++;
                    }
                }
                if (indentedLines / nonEmptyLines.length > 0.5 || codeLikeLines / nonEmptyLines.length > 0.5) {
                    isCodeBlock = true;
                }
            }
        }

        if (isCodeBlock) {
            let j = i + 1;
            while (j < paragraphs.length) {
                const nextPara = paragraphs[j];
                const nextLines = nextPara.split('\n');
                let isNextCode = false;
                if (nextLines.length > 0) {
                    const firstLine = nextLines[0];
                     if (firstLine && (firstLine.startsWith('\t') || (firstLine.length >=2 && firstLine.startsWith('  ')) || Array.from(CODE_CHARS_STRING).some(char => nextPara.includes(char)))) {
                        isNextCode = true;
                    }
                }
                if (isNextCode) {
                    currentPara += '\n\n' + nextPara; // Python added two newlines
                    j++;
                } else {
                    break;
                }
            }
            mergedParagraphs.push(currentPara);
            i = j;
        } else {
            mergedParagraphs.push(currentPara);
            i++;
        }
    }
    return mergedParagraphs;
}

function mergeSplitListsInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;

    while (i < paragraphs.length) {
        let currentPara = paragraphs[i];
        const lines = currentPara.split('\n');
        let hasList = false;
        let hasHierarchical = false;
        let hasEmojiStart = false;

        for (const line of lines) {
            if (NUMBERED_LIST_PATTERN.test(line) || HIERARCHICAL_LIST_PATTERN.test(line) ||
                BULLET_LIST_PATTERN.test(line) || CONTINUED_LIST_PATTERN.test(line)) {
                hasList = true;
                if (HIERARCHICAL_LIST_PATTERN.test(line)) hasHierarchical = true;
                break;
            }
            if (EMOJI_PATTERN_START.test(line.trim())) {
                hasEmojiStart = true;
                hasList = true; // Treat emoji starts as lists for merging
                break;
            }
        }

        if (hasList) { // Note: Python code used (has_list or has_emoji_start), simplified here as has_emoji_start sets has_list
            let j = i + 1;
            while (j < paragraphs.length) {
                const nextPara = paragraphs[j];
                const nextLines = nextPara.split('\n');
                let isListContinuation = false;
                let shouldMergeCode = false; // Renamed from python's should_merge_code

                const firstLineNext = nextLines.find(line => line.trim()) || "";

                if (firstLineNext) {
                    if (NUMBERED_LIST_PATTERN.test(firstLineNext) || HIERARCHICAL_LIST_PATTERN.test(firstLineNext) ||
                        BULLET_LIST_PATTERN.test(firstLineNext) || CONTINUED_LIST_PATTERN.test(firstLineNext) ||
                        EMOJI_PATTERN_START.test(firstLineNext.trim())) {
                        isListContinuation = true;
                    }

                    if (hasHierarchical && NUMBERED_LIST_PATTERN.test(firstLineNext)) {
                        const currentNumsMatch = currentPara.match(/\d+/g);
                        const nextNumMatch = firstLineNext.match(/^\s*(\d+)\./);
                        if (currentNumsMatch && currentNumsMatch.length > 0 && nextNumMatch && nextNumMatch[1]) {
                            const currentMain = parseInt(currentNumsMatch[0], 10);
                            const nextMain = parseInt(nextNumMatch[1], 10);
                            if (Math.abs(nextMain - currentMain) <= 2) isListContinuation = true;
                        }
                    }
                    if (!isListContinuation && firstLineNext.startsWith('    ')) isListContinuation = true;
                    
                    // Python has `has_emoji_start` check again, redundant if `EMOJI_PATTERN_START.test` is comprehensive
                    // if (hasEmojiStart && firstLineNext.trim() && EMOJI_CHARS_FOR_LIST_CHECK.includes(firstLineNext.trim()[0])) {
                    //     isListContinuation = true;
                    // }
                }
                
                // Special case: Check if next paragraph is just a language label + code
                if (!isListContinuation && CODE_LANGUAGES.has(nextPara.trim().toLowerCase())) {
                    if (j + 1 < paragraphs.length) {
                        const followingPara = paragraphs[j + 1];
                        if (followingPara) {
                            const firstCodeLine = (followingPara.split('\n')[0] || "").trimStart();
                            const codeCharsWithHash = CODE_CHARS_STRING + '#'; // Python added '#' here
                             if (firstCodeLine && (firstCodeLine.startsWith('\t') || (firstCodeLine.length >=2 && firstCodeLine.startsWith('  ')) || Array.from(codeCharsWithHash).some(char => firstCodeLine.includes(char)))) {
                                currentPara += '\n' + nextPara + '\n' + followingPara;
                                j += 2;
                                continue; // Restart inner while loop
                            }
                        }
                    }
                }

                if (!isListContinuation && firstLineNext) {
                    if (firstLineNext.startsWith('\t') || (firstLineNext.length >=2 && firstLineNext.startsWith('  ')) || (firstLineNext.startsWith('#') && firstLineNext.includes('Check'))) {
                        shouldMergeCode = true;
                    }
                }

                if (isListContinuation || shouldMergeCode) {
                    currentPara += '\n' + nextPara;
                    j++;
                } else {
                    break;
                }
            }
            mergedParagraphs.push(currentPara);
            i = j;
        } else {
            mergedParagraphs.push(currentPara);
            i++;
        }
    }
    return mergedParagraphs;
}

function mergeConsoleOutputInternal(paragraphs) {
    const mergedParagraphs = [];
    let i = 0;
    while (i < paragraphs.length) {
        let currentPara = paragraphs[i];
        let endsWithOutputIndicator = false;
        const lines = currentPara.split('\n');
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim().toLowerCase();
            if (OUTPUT_INDICATORS.some(indicator => lastLine.endsWith(indicator))) {
                endsWithOutputIndicator = true;
            }
        }

        let looksLikeConsole = false;
        for (const line of lines) {
            if (CONSOLE_PATTERNS.some(pattern => pattern.test(line.trim()))) {
                looksLikeConsole = true;
                break;
            }
        }

        if (endsWithOutputIndicator || looksLikeConsole) {
            let j = i + 1;
            while (j < paragraphs.length) {
                const nextPara = paragraphs[j];
                const nextLines = nextPara.split('\n');
                let isConsoleContinuation = false;

                for (const line of nextLines.slice(0, 5)) { // Check first 5 lines
                    if (CONSOLE_PATTERNS.some(pattern => pattern.test(line.trim()))) {
                        isConsoleContinuation = true;
                        break;
                    }
                }
                if (!isConsoleContinuation) {
                    const specialCharCount = Array.from(nextPara).filter(c => CONSOLE_SPECIAL_CHARS_STRING.includes(c)).length;
                    if (nextPara.length > 0 && specialCharCount / nextPara.length > 0.05) {
                        isConsoleContinuation = true;
                    }
                }

                if (isConsoleContinuation) {
                    currentPara += '\n\n' + nextPara; // Python added two newlines
                    j++;
                } else {
                    break;
                }
            }
            mergedParagraphs.push(currentPara);
            i = j;
        } else {
            mergedParagraphs.push(currentPara);
            i++;
        }
    }
    return mergedParagraphs;
}

function mergeUiElementsInternal(paragraphs) {
    const mergedParagraphs = [];
    for (let i = 0; i < paragraphs.length; i++) {
        const currentPara = paragraphs[i];
        const currentStrippedLower = currentPara.trim().toLowerCase();
        
        const isUiElement = UI_ELEMENTS_SET.has(currentStrippedLower) || TIMESTAMP_PATTERN.test(currentStrippedLower);

        if (isUiElement && i > 0 && mergedParagraphs.length > 0) {
            mergedParagraphs[mergedParagraphs.length - 1] += ' ' + currentPara;
        } else {
            mergedParagraphs.push(currentPara);
        }
    }
    return mergedParagraphs;
}


// --- Main Exported Function ---

/**
 * Processes cleaned AI chat text to splice it into conceptual paragraphs.
 * @param {string} cleanedSessionText - The cleaned text from AI chat.
 * @returns {Array<Object>} An array of paragraph objects.
 * Each object: { id: string, text: string, token_count: number, char_count: number, line_count: number }
 */
function spliceIntoConceptualParagraphs(cleanedSessionText) {
    if (typeof cleanedSessionText !== 'string') {
        throw new Error('Input must be a string.');
    }
    if (!cleanedSessionText.trim()) {
        return [];
    }

    console.log("Initial splitting into paragraphs...");
    let paragraphs = splitIntoParagraphsInternal(cleanedSessionText);
    console.log(`Found ${paragraphs.length} paragraph(s) after initial split.`);

    console.log("Merging code language labels...");
    paragraphs = mergeCodeLabelsInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging code labels.`);

    console.log("Merging split lists...");
    paragraphs = mergeSplitListsInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging split lists.`);
    
    console.log("Merging split code blocks...");
    paragraphs = mergeSplitCodeBlocksInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging split code blocks.`);

    console.log("Merging console output...");
    paragraphs = mergeConsoleOutputInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging console output.`);

    console.log("Merging short UI elements...");
    paragraphs = mergeUiElementsInternal(paragraphs);
    console.log(`Have ${paragraphs.length} paragraph(s) after merging UI elements.`);

    const result = paragraphs.map((paraText, index) => {
        const text = paraText.trim(); // Ensure final paragraphs are trimmed
        return {
            id: `paragraph_${String(index + 1).padStart(3, '0')}`,
            text: text,
            token_count: estimateTokens(text),
            char_count: text.length,
            line_count: text.split('\n').length
        };
    });

    return result.filter(p => p.text); // Filter out any paragraphs that became empty after final trim
}

module.exports = {
    spliceIntoConceptualParagraphs
};