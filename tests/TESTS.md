# ThreadLink Test Suite Documentation

This document provides a comprehensive description of every test in the ThreadLink test suite, organized by category and file.

## 📋 Table of Contents

- [Unit Tests](#unit-tests)
- [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
- [Test Coverage Summary](#test-coverage-summary)

---

## Unit Tests

### `drones.test.js` - Drone Error Handling & Processing (Browser Environment)

**Location:** `/tests/drones.test.js`  
**Framework:** Vitest (Browser-compatible)  
**Purpose:** Tests drone processing pipeline, error classification, and concurrency handling

#### Test Suites:

1. **Error Classification Tests**
   - `should classify rate limit errors (status 429)` - Validates 429 HTTP status code handling
   - `should handle browser-specific network errors` - Tests TypeError fetch errors in browsers
   - `should handle CORS errors` - Validates CORS policy blocking scenarios
   - `should classify auth errors (status 401)` - Tests authentication failure handling
   - `should classify server errors (status 500)` - Validates server error responses
   - `should classify bad request errors (status 400)` - Tests malformed request handling
   - `should classify network errors` - Generic network failure scenarios
   - `should classify timeout errors` - Request timeout handling

2. **Drone Batch Processing Tests**
   - `should handle browser fetch errors` - Tests fetch API failures in browser environment
   - `should handle API key from localStorage` - Validates browser storage integration
   - `should succeed on first attempt` - Happy path testing for successful processing
   - `should retry on retryable error and then succeed` - Retry logic validation
   - `should not retry on fatal error` - Fatal error handling (no retry)
   - `should handle rate limit by returning rateLimited status` - Rate limiting workflow

3. **Drone Concurrency Tests**
   - `should process multiple batches concurrently` - Concurrent processing validation
   - `should handle AbortController for cancellation` - Cancellation mechanism testing

4. **Browser Storage Integration Tests**
   - `should save progress to localStorage` - Progress persistence in browser storage

### `preprocessing.test.js` - Text Preprocessing Pipeline (Browser Environment)

**Location:** `/tests/preprocessing.test.js`  
**Framework:** Vitest (Browser-compatible)  
**Purpose:** Tests text segmentation, consolidation, and batch preparation

#### Test Suites:

1. **Configuration Validation Tests**
   - `segmentation boundaries are consistent` - Validates config parameter relationships
   - `compression math is viable` - Tests compression ratio calculations
   - `window percentages are logical` - Validates percentage-based configuration

2. **Orphan Rescue Tests**
   - `rescues tiny orphans below threshold` - Small paragraph consolidation
   - `preserves large segments unchanged` - Large content preservation
   - `handles edge case with all tiny paragraphs` - All-small content handling

3. **Segment Consolidation Tests**
   - `consolidates segments within token limits` - Token-based consolidation logic
   - `handles oversized segments gracefully` - Large segment splitting/handling
   - `respects aggregator ceiling` - Maximum token limit enforcement

4. **Drone Batch Creation Tests**
   - `creates drone batches within token limits` - Batch size validation
   - `prevents tiny batches through force-fitting` - Minimum batch size enforcement
   - `handles oversized segments gracefully` - Large content batch handling
   - `maintains consistent batch ID format` - ID generation validation

5. **Input Validation Tests**
   - `handles empty arrays gracefully` - Empty input handling
   - `handles invalid input types` - Type validation
   - `handles malformed paragraph objects` - Data structure validation

6. **Browser-Specific Tests**
   - `handles file reading from window.fs` - Browser file system integration
   - `processes large text without blocking UI` - Non-blocking processing

### `output-assembly.test.js` - Output Assembly & Statistics (Browser Environment)

**Location:** `/tests/output-assembly.test.js`  
**Framework:** Vitest (Browser-compatible)  
**Purpose:** Tests output generation, context card creation, and session statistics

#### Test Suites:

1. **Session Statistics Tests**
   - `calculates stats for valid drone payloads` - Statistics calculation validation
   - `handles string payloads correctly` - Different payload format handling

2. **Context Card Creation Tests**
   - `creates context card from successful drone results` - Context card generation
   - `CONFIRMS THE N/A:1 BUG IS FIXED - now shows 0.0:1` - Bug fix verification
   - `handles partial drone failures correctly` - Mixed success/failure scenarios

3. **Browser-Specific Tests**
   - `handles localStorage API keys correctly` - Browser storage integration
   - `handles window.fs.readFile for CSV processing` - File reading functionality

---

## End-to-End (E2E) Tests

### `accessibility.spec.ts` - Accessibility & WCAG Compliance

**Location:** `/tests/e2e/accessibility.spec.ts`  
**Framework:** Playwright  
**Purpose:** Comprehensive accessibility testing and WCAG compliance validation

#### Test Suites:

1. **Automated Accessibility Tests**
   - `passes automated accessibility checks` - axe-core automated scanning

2. **Keyboard Navigation Tests**
   - `keyboard navigation` - Tab order and keyboard-only navigation
   - `logical focus order when tabbing` - Systematic tab order validation

3. **Screen Reader Support Tests**
   - `screen reader labels` - ARIA label validation
   - `ARIA live regions for dynamic UI updates` - Dynamic content announcements
   - `error states are announced to screen readers` - Error accessibility

4. **Form Accessibility Tests**
   - `form input label associations` - Label-input relationships
   - `focus management in modals` - Modal focus trapping

5. **Advanced Accessibility Tests**
   - `modal dialogs have proper ARIA attributes` - Modal accessibility
   - `text content is properly structured with headings` - Heading hierarchy
   - `dynamic content changes are accessible` - Real-time content updates
   - `color contrast` - Visual accessibility validation

### `api-keys.spec.ts` - API Key Management

**Location:** `/tests/e2e/api-keys.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests API key storage, validation, and security

#### Test Suites:

1. **API Key Storage Tests**
   - `add API keys for each provider` - Multi-provider key storage
   - `toggle save to browser storage` - Storage preference toggle
   - `validate invalid key format` - Key format validation

2. **API Key Security Tests**
   - `should save, overwrite, and persist an API key` - Key overwriting workflow
   - `should NOT store API keys in plaintext in localStorage` - Security audit test
   - `should not leak API keys in network request URLs` - Network security validation

3. **Storage Error Handling Tests**
   - `should show a friendly error if localStorage quota is exceeded` - Storage quota handling

### `mobile.spec.ts` - Mobile Experience & Responsive Design

**Location:** `/tests/e2e/mobile.spec.ts`  
**Framework:** Playwright (iPhone 12 device emulation)  
**Purpose:** Tests mobile responsiveness, touch interactions, and mobile-specific behaviors

#### Test Suites:

1. **Mobile Layout Tests**
   - `responsive layout on mobile` - Layout adaptation validation
   - `touch interactions` - Touch-based UI interactions
   - `modal interactions on mobile` - Mobile modal behavior

2. **Mobile Input Tests**
   - `virtual keyboard handling` - On-screen keyboard behavior
   - `copy functionality on mobile` - Mobile clipboard integration

3. **Mobile Processing Tests**
   - `should handle orientation change from portrait to landscape mid-processing` - Orientation changes
   - `should handle app-switching without losing processing state` - App backgrounding
   - `should allow text selection in the editor on touch devices` - Touch text selection

4. **Mobile Network Tests** (Separate Suite)
   - `should be responsive and usable on a slow 3G connection` - Slow network performance

### `network.spec.ts` - Network Behavior & Offline Handling

**Location:** `/tests/e2e/network.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests offline functionality, network interruptions, and connection recovery

#### Test Suites:

1. **Offline Detection Tests**
   - `detects offline state on app launch` - Initial offline detection
   - `disables buttons when offline` - UI state management
   - `shows appropriate UI feedback when offline` - Offline messaging

2. **Network Recovery Tests**
   - `re-enables functionality when network returns` - Connection restoration
   - `handles network interruption during processing` - Mid-process disconnection

3. **Retry Logic Tests**
   - `retries failed requests when network is flaky` - Network resilience

### `performance.spec.ts` - Performance & Load Testing

**Location:** `/tests/e2e/performance.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests application performance, memory usage, and client-side protections

#### Test Suites:

1. **Page Performance Tests**
   - `page load performance` - Load time and Core Web Vitals
   - `UI responsiveness during processing` - UI blocking prevention
   - `memory usage stability` - Memory leak detection

2. **Large Content Tests**
   - `handles 1M token input` - Large input handling
   - `should render a very large output without crashing or excessive delay` - DOM rendering performance

3. **Client-Side Protection Tests**
   - `Simulating concurrent users (Informational)` - Documentation on load testing limitations
   - `should respect the "Max Drones Limit" and show the override modal` - Client-side guardrails

### `persistence.spec.ts` - Data Persistence & Recovery

**Location:** `/tests/e2e/persistence.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests data persistence, page reload recovery, and storage management

#### Test Suites:

1. **API Key Persistence Tests**
   - `API keys persist across page reloads` - Key storage persistence
   - `advanced settings restore correctly after reload` - Settings persistence

2. **Storage Error Handling Tests**
   - `handles corrupted localStorage data gracefully` - Corrupted data recovery
   - `handles obsolete schema without crashing` - Schema migration
   - `handles localStorage quota exceeded errors` - Storage quota handling

3. **Session State Tests**
   - `clears in-progress job state on reload` - State cleanup
   - `maintains settings consistency across multiple tabs` - Multi-tab synchronization

### `pipeline-resilience.spec.ts` - Processing Pipeline Resilience

**Location:** `/tests/e2e/pipeline-resilience.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests error handling, retry logic, and pipeline robustness

#### Test Suites:

1. **Retry Logic Tests**
   - `implements exponential backoff correctly` - Backoff timing validation
   - `shows retry UI messaging` - User feedback during retries

2. **Response Handling Tests**
   - `handles non-JSON responses from drones` - Invalid response handling
   - `handles empty but successful responses` - Empty response scenarios
   - `assembles out-of-order drone responses correctly` - Response ordering

3. **Input Validation Tests**
   - `validates custom prompt length before processing` - Pre-flight validation
   - `handles extremely large input gracefully` - Stress testing

### `providers.spec.ts` - Multi-Provider Testing & Health Checks

**Location:** `/tests/e2e/providers.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests multiple AI providers and backend health monitoring

#### Test Suites:

1. **Provider Compatibility Tests**
   - `Google Gemini models` - Google AI provider testing
   - `OpenAI models` - OpenAI provider testing
   - `Anthropic models` - Anthropic provider testing
   - `provider switching mid-session` - Runtime provider switching

2. **Backend Health Check Tests**
   - `should display a specific error when the LLM provider is down` - Service unavailability
   - `should perform a finite number of retries before showing a permanent error` - Retry exhaustion
   - `should recover gracefully when the provider comes back online` - Service recovery

### `security.spec.ts` - Security & Input Hardening

**Location:** `/tests/e2e/security.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests security measures, injection prevention, and input sanitization

#### Test Suites:

1. **Prompt Injection Prevention Tests**
   - `prevents prompt injection in user input` - System prompt protection
   - `handles nested prompt injection attempts` - Advanced injection attempts
   - `resists role-play injection` - Role-playing attack prevention

2. **Input Sanitization Tests**
   - `should summarize an adversarial prompt, not execute it` - Adversarial input handling
   - `should handle ReDoS-style input without freezing the UI` - Regular expression DoS prevention

3. **XSS Prevention Tests**
   - `should not allow XSS via markdown javascript: URI` - JavaScript URI prevention

4. **State Isolation Tests**
   - `should maintain state isolation between processing runs (no prompt poisoning)` - Session isolation

### `settings-modal.spec.ts` - Settings Validation & UI Testing

**Location:** `/tests/e2e/settings-modal.spec.ts`  
**Framework:** Playwright  
**Purpose:** Tests settings modal functionality, validation, and user interactions

#### Test Suites:

1. **Input Validation Tests**
   - `prevents non-numeric input in number fields` - Type validation
   - `validates number ranges` - Range validation
   - `validates custom prompt requirements` - Custom prompt validation

2. **State Management Tests**
   - `maintains custom prompt toggle state` - Toggle persistence

### Additional E2E Test Files

The test suite includes many other E2E test files covering specific scenarios:

- **`cancellation.spec.ts`** - Processing cancellation functionality
- **`combined-features.spec.ts`** - Integration testing of multiple features
- **`custom-prompt-editor.spec.ts`** - Custom prompt editing functionality
- **`debug.spec.ts`** - Debugging and diagnostic features
- **`drone-failure-markers.spec.ts`** - Drone failure indication and handling
- **`edge-cases.spec.ts`** - Edge case scenarios and boundary testing
- **`error-handling.spec.ts`** - General error handling mechanisms
- **`integration.spec.ts`** - Full integration testing
- **`output.spec.ts`** - Output generation and export functionality
- **`pipeline.spec.ts`** - Core processing pipeline testing
- **`race-conditions.spec.ts`** - Concurrency and race condition handling
- **`settings.spec.ts`** - General settings functionality
- **`setup.spec.ts`** - Initial application setup and configuration
- **`text-processing.spec.ts`** - Text processing and manipulation

---

## Test Coverage Summary

### Unit Tests Coverage
- **Drone Processing**: Error handling, concurrency, and batch processing
- **Text Preprocessing**: Segmentation, consolidation, and input preparation  
- **Output Assembly**: Context card generation and session statistics

### E2E Tests Coverage
- **User Interface**: Accessibility, mobile responsiveness, and user interactions
- **Data Management**: Persistence, API keys, and settings
- **Processing Pipeline**: Multi-provider support, error handling, and resilience
- **Security**: Input sanitization, injection prevention, and XSS protection
- **Performance**: Load handling, memory management, and optimization
- **Network**: Offline functionality, connection recovery, and retry logic

### Test Statistics
- **Total Test Files**: ~27 test files
- **Unit Tests**: 3 files with ~50+ individual tests
- **E2E Tests**: ~24 files with ~150+ individual tests  
- **Frameworks Used**: 
  - Vitest (Unit Tests - Browser Environment)
  - Playwright (E2E Tests - Multi-browser)
  - axe-playwright (Accessibility Testing)

### Key Testing Principles
1. **Browser-First**: All tests are designed for browser environments
2. **Comprehensive Coverage**: Testing from unit level to full integration
3. **Security-Focused**: Extensive security and vulnerability testing
4. **Accessibility-Compliant**: WCAG 2.1 accessibility validation
5. **Mobile-Ready**: Responsive design and touch interaction testing
6. **Performance-Aware**: Load testing and optimization validation
7. **Resilience-Tested**: Error handling and recovery scenarios

This test suite ensures ThreadLink is production-ready with comprehensive coverage of functionality, security, accessibility, and performance requirements.
