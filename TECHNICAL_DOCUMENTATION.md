# ThreadLink Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Pipeline System](#pipeline-system)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Processing Stages](#processing-stages)
6. [Drone System](#drone-system)
7. [Configuration & Settings](#configuration--settings)
8. [Error Handling](#error-handling)
9. [API Integration](#api-integration)
10. [Storage & Privacy](#storage--privacy)
11. [Performance Optimization](#performance-optimization)
12. [Testing Framework](#testing-framework)

---

## Architecture Overview

ThreadLink is a browser-based AI conversation condensation application built with React + TypeScript that transforms lengthy AI chat sessions into dense, portable context cards. The application follows a privacy-first, BYOK (Bring Your Own Key) architecture with client-side processing.

### Key Architectural Principles
- **Privacy-First**: All processing happens in the browser; no data sent to external servers
- **BYOK Model**: Users provide their own API keys for LLM providers
- **Client-Side Pipeline**: Complete condensation pipeline runs in the browser
- **Provider Agnostic**: Supports Google (Gemini), OpenAI (GPT), and Anthropic (Claude)
- **Responsive Design**: Mobile-first UI with progressive enhancement

### Technology Stack
```
Frontend: React 18 + TypeScript + Vite
Styling: Tailwind CSS + CSS Variables
State Management: React Hooks + Local State
API Integration: Fetch API with custom adapters
Testing: Playwright (E2E) + Vitest (Unit)
Build System: Vite + TypeScript
```

---

## Pipeline System

The condensation pipeline is the core engine that transforms raw AI conversation text into structured context cards through a multi-stage process.

### Pipeline Overview
```
Raw Text → Cleaner → Splicer → Batcher → Orchestrator → Context Card
```

### Pipeline Stages Flow
1. **Text Cleaning** - Remove AI chat boilerplate and artifacts
2. **Paragraph Splicing** - Segment text into conceptual paragraphs
3. **Orphan Rescue** - Merge tiny paragraphs to prevent loss
4. **Segment Consolidation** - Combine paragraphs into optimal chunks
5. **Drone Batching** - Create drone input batches with size optimization
6. **Drone Processing** - Parallel AI condensation with concurrency control
7. **Context Card Assembly** - Merge drone outputs into final format

---

## Core Components

### Frontend Components

#### `ThreadLink.tsx` - Main Application
- **Purpose**: Root component orchestrating the entire application
- **Key Features**: State management, pipeline coordination, progress tracking
- **Dependencies**: All major components and pipeline modules

#### `TextEditor.tsx` - Input/Output Interface
- **Purpose**: Main text editing interface with loading states
- **Features**: 
  - Auto-resizing textarea with mobile optimization
  - Loading overlay with progress tracking
  - Error display and success statistics
  - Bolt.new attribution badge with scroll-safe positioning

#### `Header.tsx` - Navigation & Controls
- **Purpose**: Application header with action buttons
- **Features**: 
  - Responsive title typography
  - Info, API Keys, and Settings modal triggers
  - Mobile-optimized button sizing

#### `Footer.tsx` - Processing Controls
- **Purpose**: Primary action controls and compression settings
- **Features**: 
  - Token count display with formatting
  - Compression level selection (Light/Balanced/Aggressive)
  - Condense/Copy/Reset action buttons
  - Mobile-responsive layout with stacked controls

#### `SettingsModal.tsx` - Configuration Interface
- **Purpose**: Complete application configuration
- **Features**: 
  - Model selection with provider-specific warnings
  - Recency Mode with temporal weighting controls
  - LLM Temperature adjustment (0.0-2.0)
  - Advanced settings (drone density, max drones)
  - Custom prompt editor integration
  - Processing speed optimization

#### `APIKeysModal.tsx` - Credential Management
- **Purpose**: Secure API key management interface
- **Features**: 
  - Privacy-first messaging and education
  - Optional browser storage with clear warnings
  - Provider-specific key validation
  - In-memory session support
  - Key deletion with confirmation

#### `CustomPromptEditor.tsx` - Prompt Customization
- **Purpose**: Advanced prompt engineering interface
- **Features**: 
  - Full-screen editor with syntax highlighting concepts
  - Warning system for dangerous overrides
  - TARGET_TOKENS variable documentation
  - Cancel/Apply action controls

#### `InfoPanel.tsx` - Documentation System
- **Purpose**: Comprehensive in-app user guide
- **Features**: 
  - Collapsible sections with auto-scroll
  - Complete feature documentation
  - Best practices and tutorials
  - Technical explanations with examples

#### `LoadingOverlay.tsx` - Progress Visualization
- **Purpose**: Real-time processing feedback
- **Features**: 
  - Phase-specific progress indication
  - Drone completion tracking with percentages
  - Cancellation controls with proper cleanup
  - Responsive progress bars

### Pipeline Modules

#### `orchestrator.js` - Pipeline Coordinator
```javascript
// Main pipeline entry point
export async function runCondensationPipeline(options = {})

// Core processing functions
function processDroneBatch(batchData, batchIndex, totalBatches, options, sessionState)
function processDronesWithConcurrency(batches, options, onProgress)
function createContextCard(droneResults, sessionStats, originalPayloads)
```

**Key Responsibilities**:
- Pipeline orchestration and stage coordination
- Progress tracking and user feedback
- Error classification and recovery
- Concurrency management for API calls
- Final context card assembly

#### `cleaner.js` - Text Preprocessing
```javascript
export function cleanAiChatContent(rawText)
```

**Cleaning Operations**:
- Remove AI assistant signatures and timestamps
- Strip UI elements and navigation artifacts
- Normalize whitespace and line breaks
- Preserve code blocks and formatted content
- Handle platform-specific chat formatting

#### `splicer.js` - Content Segmentation
```javascript
export function spliceIntoConceptualParagraphs(cleanedSessionText)
```

**Segmentation Logic**:
- Split text into conceptual paragraphs
- Preserve code blocks and lists integrity
- Merge split console output and commands
- Handle UI elements and special formatting
- Generate token counts for each segment

#### `batcher.js` - Chunk Optimization
```javascript
export function consolidateSegments(paragraphs, customSettings)
export function createDroneBatches(consolidatedSegments, customSettings)
export function prepareDroneInputs(droneBatchesOfSegments, customSettings)
```

**Batching Strategy**:
- Optimize chunk sizes for model context windows
- Implement recency mode with temporal weighting
- Enforce maxDrones limits with intelligent merging
- Balance granularity vs. processing efficiency

#### `config.js` - System Configuration
```javascript
// Token limits and sizing
export const DRONE_INPUT_TOKEN_MAX = 6000
export const DRONE_IDEAL_TARGET_TOKENS = 4500
export const TARGET_CONTEXT_CARD_TOKENS = 8000

// Processing parameters
export const DRONES_PER_10K_TOKENS = 10
export const DEFAULT_DRONE_PROMPT = "..."
```

**Configuration Areas**:
- Token limits and target sizes
- Drone density and concurrency settings
- Model-specific configurations
- Prompt templates and system messages

#### `progressTracker.js` - State Management
```javascript
export class ProgressTracker {
    createJob(jobId, onUpdate)
    setPreprocessing(jobId, message)
    setProcessing(jobId, totalDrones)
    updateDroneProgress(jobId, completedDrones, totalDrones, message)
    setComplete(jobId, result)
}
```

**Progress States**:
- Preprocessing: Text cleaning and segmentation
- Launching: Drone batch preparation
- Processing: Parallel drone execution
- Finalizing: Context card assembly
- Complete: Pipeline finished with results

---

## Data Flow

### Input Processing Flow
```
User Text Input
    ↓
Text Cleaning (Remove AI chat artifacts)
    ↓
Paragraph Splicing (Conceptual segmentation)
    ↓
Orphan Rescue (Merge tiny segments)
    ↓
Segment Consolidation (Optimize chunk sizes)
    ↓
Drone Batching (Create processing units)
    ↓
Drone Input Preparation (Format for API calls)
```

### Processing Flow
```
Drone Batches
    ↓
Concurrent API Calls (Rate-limited parallelization)
    ↓
Response Collection (Handle successes/failures)
    ↓
Quality Validation (Check output integrity)
    ↓
Result Aggregation (Merge successful outputs)
    ↓
Context Card Assembly (Format final output)
```

### Data Structures

#### Paragraph Object
```typescript
interface Paragraph {
    id: string;
    text: string;
    token_count: number;
    char_count: number;
    line_count: number;
}
```

#### Drone Batch
```typescript
interface DroneBatch {
    batch_id: string;
    segments: Paragraph[];
    total_tokens: number;
    oversized?: boolean;
}
```

#### Drone Input
```typescript
interface DroneInput {
    batch_id: string;
    prompt: string;
    text: string;
    token_estimate: number;
    target_output_tokens: number;
    metadata: {
        segment_count: number;
        oversized: boolean;
        recency_mode: boolean;
        is_recent_content: boolean;
    };
}
```

---

## Processing Stages

### Stage 1: Text Cleaning
**Purpose**: Remove AI chat platform artifacts and normalize input

**Operations**:
- Strip timestamps and user/assistant labels
- Remove UI elements and navigation components
- Preserve code blocks and formatted content
- Normalize whitespace and line breaks
- Calculate token savings

**Output**: Clean text ready for segmentation

### Stage 2: Paragraph Splicing
**Purpose**: Segment text into logical, conceptual paragraphs

**Algorithm**:
```javascript
1. Split on double line breaks
2. Identify and preserve code blocks
3. Merge split lists and console output
4. Handle special formatting (quotes, examples)
5. Assign unique IDs and calculate metrics
```

**Output**: Array of paragraph objects with metadata

### Stage 3: Orphan Rescue
**Purpose**: Prevent loss of small but meaningful content

**Logic**:
- Identify paragraphs below token threshold (50 tokens)
- Merge with adjacent paragraphs based on context
- Preserve chronological order
- Maintain semantic coherence

**Output**: Consolidated paragraphs with minimum viability

### Stage 4: Segment Consolidation
**Purpose**: Optimize chunk sizes for efficient processing

**Strategy**:
- Target optimal drone input sizes (2700-4500 tokens)
- Balance granularity with processing efficiency
- Respect model context window limits
- Handle oversized segments gracefully

**Output**: Segments optimized for drone processing

### Stage 5: Drone Batching
**Purpose**: Create final processing units with advanced optimizations

**Features**:
- **Recency Mode**: Temporal weighting with 3-band processing
  - Recent (Last 20%): High resolution (2.5x density)
  - Mid (Middle 50%): Standard resolution (1x density)
  - Oldest (First 30%): Low resolution (0.25x density)
- **Max Drones Enforcement**: Intelligent merging when over limits
- **Dynamic Sizing**: Adjust batch sizes based on content and settings

**Output**: Finalized drone batches ready for API calls

### Stage 6: Drone Input Preparation
**Purpose**: Format batches for API consumption

**Formatting**:
- Combine segment text with separators
- Generate system prompts with target tokens
- Add metadata for tracking and debugging
- Calculate final token estimates

**Output**: API-ready drone input objects

### Stage 7: Drone Processing
**Purpose**: Execute parallel condensation with intelligent controls

**Concurrency Management**:
- Model-specific concurrency limits
- Rate limit detection and adaptation
- Retry logic with exponential backoff
- Cancellation support throughout

**Quality Control**:
- Output validation against targets
- Catastrophic failure detection
- Retry logic for quality issues
- Provider-specific optimizations

### Stage 8: Context Card Assembly
**Purpose**: Merge drone outputs into final context card

**Assembly Logic**:
- Preserve chronological order
- Insert failure traces for failed drones
- Add session statistics and metadata
- Format for readability and portability

---

## Drone System

The "drone" concept is ThreadLink's core innovation - independent AI workers that process text segments in parallel.

### Drone Architecture

#### Individual Drone Processing
```javascript
async function processDroneBatch(batchData, batchIndex, totalBatches, options, sessionState) {
    // 1. Validation and setup
    // 2. API call with retry logic
    // 3. Quality validation
    // 4. Error handling and classification
    // 5. Result formatting and return
}
```

#### Parallel Drone Execution
```javascript
async function processDronesWithConcurrency(batches, options, onProgress) {
    // 1. Initialize concurrency controls
    // 2. Launch initial drone batch
    // 3. Handle completions and failures
    // 4. Process rate-limited drones
    // 5. Aggregate results
}
```

### Drone Lifecycle

1. **Initialization**: Create drone batch with text and metadata
2. **Prompt Generation**: Build system prompt with target tokens
3. **API Execution**: Make LLM API call with retry logic
4. **Quality Check**: Validate output meets minimum standards
5. **Result Processing**: Clean and format successful output
6. **Error Handling**: Classify and handle any failures

### Concurrency Management

#### Rate Limit Handling
```javascript
// Dynamic concurrency adjustment
if (rateLimitDetected) {
    currentConcurrency = 1; // Reduce to serial processing
    waitTime = calculateBackoffTime(headers);
    await sleep(waitTime);
}
```

#### Model-Specific Settings
```javascript
const MODEL_CONFIGS = {
    'gemini-1.5-flash': { safeConcurrency: 10, rateLimitBackoff: 60000 },
    'gpt-4.1-nano': { safeConcurrency: 5, rateLimitBackoff: 60000 },
    'claude-3-5-haiku': { safeConcurrency: 1, rateLimitBackoff: 300000 }
};
```

### Error Classification

#### Error Types
- **RATE_LIMIT**: Temporary API rate limiting
- **NETWORK_ERROR**: Connectivity or fetch failures
- **AUTH_ERROR**: Invalid or missing API keys
- **CONTENT_ERROR**: Content policy violations
- **QUALITY_ERROR**: Output fails quality checks
- **FATAL_ERROR**: Unrecoverable system errors

#### Recovery Strategies
- **Retryable Errors**: Exponential backoff with limits
- **Rate Limits**: Dedicated queue with proper delays
- **Fatal Errors**: Immediate termination with error report
- **Quality Issues**: Retry with adjusted parameters

---

## Configuration & Settings

### Model Selection
```typescript
const MODEL_PROVIDERS = {
    "gemini-1.5-flash": "google",
    "gpt-4.1-nano": "openai",
    "gpt-4.1-mini": "openai",
    "claude-3-5-haiku-20241022": "anthropic"
};
```

### Compression Levels
- **Light**: Preserve maximum detail and nuance
- **Balanced**: Optimal trade-off between brevity and completeness
- **Aggressive**: Maximum compression for key insights only

### Advanced Settings

#### LLM Temperature (0.0 - 2.0)
- **0.0-0.5**: Deterministic, focused output
- **0.5-1.0**: Balanced creativity and consistency
- **1.0-2.0**: High creativity and variation

#### Drone Density (1-20 drones per 10k tokens)
- **1-5**: Broad overview, low granularity
- **6-10**: Standard detail level
- **11-20**: High granularity, expensive processing

#### Processing Speed
- **Balanced**: Standard concurrency, reliable processing
- **Fast**: Increased concurrency, faster completion

#### Recency Mode
- **Temporal Weighting**: Focus processing power on recent content
- **Strength Levels**: Subtle (25%), Balanced (50%), Strong (100%)
- **Band Processing**: 30% oldest, 50% mid, 20% recent

### Custom Prompt System
Advanced users can override the default drone system prompt:

```javascript
const DEFAULT_DRONE_PROMPT = `You are an AI conversation condensation specialist...
TARGET OUTPUT: {TARGET_TOKENS} tokens exactly.`
```

**Warning System**: Clear notices about potential instability and cost implications.

---

## Error Handling

### Error Classification System

#### Intelligent Error Recovery
```javascript
function classifyError(error) {
    // Analyze error type, message, and context
    // Return classification with recovery strategy
    return {
        type: 'RATE_LIMIT' | 'NETWORK_ERROR' | 'AUTH_ERROR' | ...,
        retryable: boolean,
        fatal: boolean,
        waitTime: number,
        userMessage: string
    };
}
```

#### User-Friendly Error Messages
- Technical errors translated to actionable user guidance
- Context-specific help and troubleshooting steps
- Clear indication of next steps or required actions

### Cancellation System

#### Graceful Cancellation
```javascript
// Check cancellation at strategic points
if (cancelled && cancelled()) {
    throw new Error('Processing was cancelled');
}
```

#### Cancellation Points
- Before each pipeline stage
- Before each drone processing attempt
- During retry delays and rate limit waits
- After each API response

#### Cleanup Procedures
- Stop in-flight API requests where possible
- Clear progress tracking state
- Release system resources
- Provide final status to user

---

## API Integration

### Client-Side API Management

#### Provider Abstraction
```javascript
export async function generateResponse(systemPrompt, userPrompt, model, apiKey, temperature, options) {
    const provider = MODEL_PROVIDERS[model];
    switch (provider) {
        case 'google': return callGeminiAPI(/* ... */);
        case 'openai': return callOpenAIAPI(/* ... */);
        case 'anthropic': return callAnthropicAPI(/* ... */);
    }
}
```

#### API Key Management
```javascript
// Secure key retrieval with fallbacks
function getAPIKey(provider) {
    // 1. Check in-memory session keys
    // 2. Check browser localStorage (if opted in)
    // 3. Return null if not found
}
```

### Rate Limiting & Optimization

#### Provider-Specific Limits
- **Google Gemini**: 10 concurrent requests, 60s backoff
- **OpenAI GPT**: 5 concurrent requests, 60s backoff  
- **Anthropic Claude**: 1 concurrent request, 300s backoff

#### Adaptive Concurrency
```javascript
// Dynamic adjustment based on rate limit detection
sessionState.onRateLimit = () => {
    if (!hasHitRateLimit) {
        hasHitRateLimit = true;
        currentConcurrency = 1;
    }
};
```

---

## Storage & Privacy

### Privacy-First Architecture

#### Zero Server Storage
- No data transmission to ThreadLink servers
- All processing happens in browser
- API calls go directly to provider endpoints
- Complete user control over data flow

#### API Key Storage Options
1. **Session Only**: Keys stored in memory, lost on refresh
2. **Browser Storage**: Optional localStorage with clear warnings
3. **No Storage**: Manual entry for each session

### Data Persistence

#### Local Storage Schema
```javascript
// API Keys (optional)
'threadlink_google_api_key': 'encrypted_key'
'threadlink_openai_api_key': 'encrypted_key'
'threadlink_anthropic_api_key': 'encrypted_key'

// Settings
'threadlink_settings': {
    model: 'gemini-1.5-flash',
    compressionRatio: 'balanced',
    temperature: 0.3,
    recencyMode: false,
    // ... other settings
}

// Progress (temporary)
'threadlink_progress': {
    completed: 5,
    total: 10,
    ratio: 0.5
}
```

#### Privacy Safeguards
- Clear user education about storage implications
- Explicit opt-in for browser storage
- Easy key deletion and privacy reset
- No tracking or analytics without consent

---

## Performance Optimization

### Frontend Optimizations

#### React Performance
- Proper component memoization with `useMemo` and `useCallback`
- Efficient state updates to prevent unnecessary re-renders
- Strategic component splitting for code splitting

#### Mobile Optimization
- Touch-friendly UI with 44px minimum touch targets
- Responsive typography and spacing
- Optimized textarea handling to prevent iOS zoom
- Progressive enhancement from mobile to desktop

#### Memory Management
- Cleanup of event listeners and timers
- Proper handling of large text inputs
- Efficient string processing and manipulation

### Pipeline Performance

#### Token Estimation
```javascript
// Fast token estimation without API calls
function estimateTokens(text) {
    // Approximate 1 token = 4 characters for most models
    return Math.ceil(text.length / 4);
}
```

#### Batch Size Optimization
- Dynamic batch sizing based on content and settings
- Minimize API calls while staying within token limits
- Balance between granularity and processing efficiency

#### Concurrency Tuning
- Model-specific concurrency limits
- Rate limit detection and adaptive adjustment
- Optimal retry strategies with exponential backoff

---

## Testing Framework

### E2E Testing with Playwright

#### Test Structure
```typescript
// tests/e2e/settings.spec.ts
test.describe('Settings Configuration', () => {
    let threadlink: ThreadLinkPage;
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        threadlink = new ThreadLinkPage(page);
        await setupAPIMocks(page);
    });
    
    test('compression level settings can be changed', async () => {
        // Test implementation
    });
});
```

#### API Mocking
```javascript
// Mock API responses for consistent testing
export async function setupAPIMocks(page) {
    await page.route('**/v1/models/gemini-1.5-flash:generateContent', 
        async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify(mockGeminiResponse)
            });
        }
    );
}
```

### Unit Testing with Vitest

#### Component Testing
- Isolated component behavior testing
- State management validation
- Event handling verification
- Edge case coverage

#### Pipeline Testing
- Individual stage functionality
- Error handling scenarios
- Data transformation accuracy
- Performance benchmarking

### Test Data Management

#### Structured Test Data
```javascript
export const TEST_DATA = {
    shortConversation: "User: Hello\nAssistant: Hi there!",
    longConversation: "/* 10k+ character conversation */",
    codeConversation: "/* Conversation with code blocks */"
};

export const TEST_KEYS = {
    valid: {
        google: 'test-google-key',
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key'
    },
    invalid: {
        malformed: 'invalid-key-format'
    }
};
```

---

## Development Guidelines

### Code Organization
- **Components**: React components in `src/components/`
- **Pipeline**: Processing modules in `src/pipeline/`
- **Library**: Utilities and APIs in `src/lib/`
- **Types**: TypeScript definitions in `src/types.ts`
- **Tests**: E2E tests in `tests/e2e/`

### Naming Conventions
- **Components**: PascalCase with descriptive names
- **Functions**: camelCase with action-oriented names
- **Constants**: UPPER_SNAKE_CASE for configuration
- **Files**: kebab-case for consistency

### Error Handling Standards
- Always classify errors with appropriate types
- Provide user-friendly error messages
- Implement proper cleanup in error scenarios
- Log technical details for debugging

### Performance Standards
- Keep bundle size under 500KB gzipped
- Maintain 60fps UI interactions
- Optimize for mobile devices first
- Implement proper loading states

---

## Future Enhancements

### Planned Features
- **Offline Mode**: Service worker for offline processing
- **Export Formats**: Multiple output formats (JSON, MD, PDF)
- **Plugin System**: Extensible processing modules
- **Analytics**: Optional usage analytics with privacy controls

### Technical Debt
- Reduce TypeScript `@ts-ignore` usage
- Implement comprehensive error boundary system
- Add automated performance monitoring
- Expand test coverage to 90%+

### Scalability Considerations
- Support for larger input texts (100k+ tokens)
- Enhanced concurrency management
- Improved memory usage optimization
- Provider-specific optimizations

---

## Conclusion

ThreadLink represents a sophisticated client-side AI processing application that prioritizes user privacy while delivering professional-grade functionality. The modular pipeline architecture, intelligent error handling, and responsive design make it suitable for production deployment with minimal risk.

The combination of privacy-first design, comprehensive feature set, and excellent user experience positions ThreadLink as a best-in-class solution for AI conversation condensation and context management.

For additional technical details, refer to the inline code documentation and the extensive in-app user guide accessible through the Info panel.
