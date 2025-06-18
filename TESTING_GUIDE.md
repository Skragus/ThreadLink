# ThreadLink E2E Testing Guide

This guide provides instructions for running and maintaining the end-to-end tests for the ThreadLink application.

## Stable Tests

We've created several stable test files that should work across environments:

1. **Basic Functionality Tests** - These test the core UI components and interactions
   ```bash
   npx playwright test tests/e2e/basic-functionality.spec.ts
   ```

2. **Text Processing Tests** - These test the text editor functionality
   ```bash
   npx playwright test tests/e2e/text-processing-fixed.spec.ts
   ```

3. **API Key Management Tests** - These test the API key management functionality
   ```bash
   npx playwright test tests/e2e/api-key-fixed.spec.ts
   ```

## Running Tests

To run all stable tests:

```bash
npx playwright test tests/e2e/basic-functionality.spec.ts tests/e2e/text-processing-fixed.spec.ts tests/e2e/api-key-fixed.spec.ts
```

To run tests in a specific browser:

```bash
npx playwright test tests/e2e/basic-functionality.spec.ts --project=chromium
```

## Common Issues and Solutions

1. **Selector Issues**
   - Many tests fail because selectors change over time as the UI evolves
   - Use multiple selector strategies with fall-backs
   - Prefer using data-testid attributes when available

2. **Timing Issues**
   - Use appropriate timeouts for operations like loading and API responses
   - Use waitFor methods with appropriate timeouts for UI state changes
   - Implement fallback approaches when primary detection methods fail

3. **API Keys**
   - Mock API responses to avoid flakiness due to external dependencies
   - Use localStorage fallbacks when UI interactions fail

4. **Close Buttons and Modals**
   - Use multiple approaches to close modals (button click, Escape key, clicking outside)
   - Don't rely on modals being closed to continue tests

## Testing Best Practices

1. Take screenshots at key points for debugging
2. Add appropriate error handling with fallbacks
3. Keep tests isolated and focused on specific functionality
4. Use page object patterns to encapsulate UI interactions

## Maintaining Tests

- When updating the UI, update the corresponding selectors in tests
- When adding new features, add new tests that cover the functionality
- Regularly run the test suite to catch regressions
- If a test becomes flaky, consider rewriting it with more robust approaches
