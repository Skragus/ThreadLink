# Custom Prompt Editor Testing Documentation

This document outlines the comprehensive testing strategy for the Custom Prompt Editor feature, including its modal interface and settings integration.

## Overview

The Custom Prompt Editor feature allows users to override the default AI prompt with their own custom instructions. This is a high-risk feature that requires thorough testing due to its potential impact on processing quality and cost.

## Testing Architecture

### 1. Unit Tests (`src/components/`)

#### CustomPromptEditor.test.tsx
**Purpose**: Tests the isolated prompt editor component
**Coverage Areas**:
- Component rendering and initial state
- Text editing functionality
- Save/back button behaviors
- Confirmation dialogs for unsaved changes
- Effect hooks and prop updates
- Accessibility features
- Keyboard navigation
- Responsive design elements

**Key Test Scenarios**:
```typescript
// Rendering tests
✓ Should not render when isOpen=false
✓ Should display warnings and instructions
✓ Should populate with default/custom prompt

// Interaction tests
✓ Should allow text editing
✓ Should save prompt on Apply & Close
✓ Should show confirmation for unsaved changes
✓ Should handle escape key navigation
```

#### SettingsModal.CustomPrompt.test.tsx
**Purpose**: Tests the settings modal integration with custom prompt toggle
**Coverage Areas**:
- Toggle visibility in advanced settings
- Toggle state management (ON/OFF)
- Edit button appearance/functionality
- Modal integration with CustomPromptEditor
- Backdrop click behavior
- State persistence

**Key Test Scenarios**:
```typescript
// Toggle behavior
✓ Should show/hide based on advanced settings
✓ Should open editor when toggled ON
✓ Should disable when toggled OFF
✓ Should show edit button when enabled

// Integration tests
✓ Should pass correct props to editor
✓ Should save and enable on editor save
✓ Should close without saving on back
```

### 2. End-to-End Tests (`tests/e2e/`)

#### custom-prompt-editor.spec.ts (Enhanced)
**Purpose**: Tests the complete user workflow through the browser
**Coverage Areas**:
- Basic functionality and user flows
- Validation and error handling
- Persistence across sessions
- Performance with large prompts
- Special characters and formatting
- Keyboard navigation and shortcuts

**Key Test Scenarios**:
```typescript
// Core functionality
✓ Toggle hidden in advanced settings
✓ Editor shows warnings on entry
✓ Pre-populated with default prompt
✓ Validation for {TARGET_TOKENS} placeholder
✓ Back button discards changes
✓ Prompt persists across sessions

// Advanced features
✓ Keyboard navigation and shortcuts
✓ Drag and drop functionality
✓ Special characters and Unicode
✓ Performance with large text
✓ Concurrent editing sessions
```

#### custom-prompt-integration.spec.ts
**Purpose**: Tests the full end-to-end integration with the processing pipeline
**Coverage Areas**:
- Complete workflow from settings to processing
- Prompt injection into API calls
- Integration with other settings
- Error scenarios and recovery
- Mobile responsiveness

**Key Test Scenarios**:
```typescript
// Full workflow
✓ Enable custom prompt → configure → process text
✓ Verify custom prompt in API calls
✓ Switch between default and custom prompts
✓ Persistence across browser sessions

// Integration tests
✓ Custom prompt + temperature settings
✓ Error handling for invalid prompts
✓ API error scenarios
✓ Mobile viewport behavior
```

## Test Data and Mocking

### API Mocking Strategy
```typescript
// Mock Google Generative AI API
await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
  const body = await request.postDataJSON();
  capturedPrompt = body.contents[0].parts[0].text;
  
  await route.fulfill({
    status: 200,
    body: JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: 'Mock response' }]
        }
      }]
    })
  });
});
```

### Component Mocking
```typescript
// Mock CustomPromptEditor in settings tests
vi.mock('./CustomPromptEditor', () => ({
  CustomPromptEditor: ({ isOpen, customPrompt, onSave, onBack }: any) => 
    isOpen ? (
      <div data-testid="custom-prompt-editor">
        <button onClick={() => onSave('test-prompt')}>Mock Save</button>
        <button onClick={onBack}>Mock Back</button>
      </div>
    ) : null
}));
```

## Test Categories

### 1. Functional Tests
- **User Interactions**: Toggle, edit, save, cancel
- **Data Flow**: Props, state management, persistence
- **Validation**: Prompt requirements, error handling

### 2. Integration Tests
- **Settings Modal**: Toggle integration, modal management
- **Processing Pipeline**: Prompt injection, API communication
- **Storage**: LocalStorage persistence, corruption handling

### 3. Error Handling Tests
- **Invalid Prompts**: Missing placeholders, empty prompts
- **Network Issues**: API failures, timeout scenarios
- **Concurrent Access**: Multiple tabs, race conditions

### 4. Performance Tests
- **Large Text**: Performance with extensive prompts
- **Memory Usage**: Component cleanup, memory leaks
- **Responsiveness**: UI responsiveness during editing

### 5. Accessibility Tests
- **Keyboard Navigation**: Tab order, keyboard shortcuts
- **Screen Readers**: ARIA labels, semantic HTML
- **Focus Management**: Modal focus trapping

### 6. Mobile/Responsive Tests
- **Viewport Adaptation**: Mobile layouts, touch interactions
- **Text Sizing**: Readable fonts, proper spacing
- **Modal Behavior**: Mobile modal presentation

## Risk Areas and Mitigation

### High-Risk Scenarios
1. **Custom Prompt Injection**: Malicious or inappropriate prompts
2. **Cost Impact**: Prompts that increase token usage
3. **Processing Failures**: Prompts that cause API errors
4. **Data Loss**: Unsaved changes, corruption

### Testing Mitigation
```typescript
// Test prompt validation
test('should reject prompts without TARGET_TOKENS', async ({ page }) => {
  await promptEditor.fill('Invalid prompt');
  await applyButton.click();
  await expect(page.getByText(/must include.*TARGET_TOKENS/i)).toBeVisible();
});

// Test error recovery
test('should handle API errors gracefully', async ({ page }) => {
  await page.route('**/generateContent', route => route.fulfill({ status: 400 }));
  await threadlink.startProcessing();
  await expect(page.locator('[data-testid="error-display"]')).toBeVisible();
});
```

## Test Execution

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests (all)
npm run test:e2e

# Specific custom prompt tests
npx playwright test custom-prompt-editor.spec.ts
npx playwright test custom-prompt-integration.spec.ts

# With UI mode for debugging
npm run test:e2e:ui
```

### Test Coverage Goals
- **Unit Tests**: 95%+ line coverage for components
- **E2E Tests**: 100% user workflow coverage
- **Integration Tests**: All API interaction paths
- **Error Scenarios**: All error conditions

## Debugging and Troubleshooting

### Common Issues
1. **Test Timeouts**: Increase timeout for processing tests
2. **Flaky Tests**: Add proper wait conditions
3. **Mock Failures**: Verify API route patterns

### Debug Tools
```typescript
// Screenshot on failure
await page.screenshot({ path: './test-results/failure.png' });

// Console logging
await page.evaluate(() => console.log('Debug info:', localStorage));

// Network inspection
await page.route('**/*', route => {
  console.log('Request:', route.request().url());
  route.continue();
});
```

## Maintenance

### Test Updates Required When:
- Custom prompt validation rules change
- New advanced settings are added
- API endpoints or request formats change
- UI components are refactored

### Performance Monitoring
- Test execution time should remain under 5 minutes
- E2E tests should complete within 30 seconds each
- Memory usage should be stable across test runs

This comprehensive testing strategy ensures the Custom Prompt Editor feature is thoroughly validated across all usage scenarios while maintaining good performance and reliability.
