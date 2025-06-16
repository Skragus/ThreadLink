# Testing Setup Documentation

## Overview
This document outlines the complete testing setup for ThreadLink, designed for automated LLM testing cycles.

## Test Structure

### Unit Tests (Vitest)
- **Location**: `tests/*.test.js`
- **Framework**: Vitest with Jest compatibility
- **Environment**: jsdom for browser simulation
- **Setup**: `src/test/setup.ts`

### E2E Tests (Playwright)
- **Location**: `tests/e2e/*.spec.ts`
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit
- **Configuration**: `playwright.config.ts`

## Available Test Commands

```bash
# Run all unit tests once
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all tests (unit + E2E)
npm run test:all

# Run linting
npm run lint

# Build project
npm run build
```

## Test Files

### Unit Tests
1. **`tests/drones.test.js`** - Tests drone processing logic, error handling, and batch processing
2. **`tests/output-assembly.test.js`** - Tests context card creation and output assembly
3. **`tests/preprocessing.test.js`** - Tests text preprocessing and cleaning functions

### E2E Tests
1. **`tests/e2e/accessibility.spec.ts`** - Accessibility compliance tests
2. **`tests/e2e/api-keys.spec.ts`** - API key management functionality
3. **`tests/e2e/drone-failure-markers.spec.ts`** - Drone failure handling and markers
4. **`tests/e2e/text-processing.spec.ts`** - End-to-end text processing workflow

## Automated Testing Workflow

For LLM-driven testing cycles:

1. **Run Tests**: Execute `npm run test:all` to run all tests
2. **Check Results**: Parse test output for failures
3. **Fix Issues**: Identify failing tests and apply fixes
4. **Verify Build**: Run `npm run build` to ensure no compilation errors
5. **Retest**: Re-run specific failed tests or full suite
6. **Repeat**: Continue until 100% pass rate

## Key Test Dependencies

- **Vitest**: Unit testing framework
- **@playwright/test**: E2E testing framework
- **jsdom**: Browser environment simulation
- **@vitest/coverage-v8**: Coverage reporting
- **axe-playwright**: Accessibility testing

## Error Handling

Common test failure scenarios:
- **TypeScript errors**: Check type definitions and imports
- **Module resolution**: Verify file paths and imports
- **API mocking**: Ensure mocks are properly configured
- **Async operations**: Check timeout settings and promises
- **DOM manipulation**: Verify element selectors and interactions

## Coverage Targets

- **Branches**: 80%
- **Functions**: 80%  
- **Lines**: 80%
- **Statements**: 80%

## Debugging

- Use `npm run test:watch` for iterative development
- Use `npm run test:e2e:ui` for visual E2E debugging
- Check `test-results/` directory for detailed failure reports
- Review `playwright-report/` for E2E test reports

## Configuration Files

- **`vitest.config.ts`**: Unit test configuration
- **`playwright.config.ts`**: E2E test configuration
- **`jest.config.js`**: Legacy Jest configuration (backup)
- **`.eslintrc.json`**: Code quality rules
- **`src/test/setup.ts`**: Test environment setup
