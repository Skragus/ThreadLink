Of course. Based on the complete context you've provided—including the initial test plan, the codebase analysis from `QuickMap`, the component code, and the AI agent protocol—here is the definitive, in-depth `E2E_TEST_DOCUMENTATION.md`.

This document is designed to be the single source of truth for the application's intended behavior, providing the necessary clarity for an autonomous AI agent to execute, diagnose, and remediate test failures.

---

# **ThreadLink E2E Test Suite: Master Specification**

## 📁 Test Suite Overview

This document provides the master specification for the ThreadLink application's end-to-end (E2E) test suite. It defines the intended behavior, user workflows, and explicit success criteria for every testable feature. It serves as the **primary source of truth** for both manual QA and automated test remediation agents.

Tests are organized by functionality and prioritized to ensure core workflows are validated first.

-   **P0 (Critical):** Core product functionality. A failure here blocks release.
-   **P1 (Important):** High-value features and error recovery.
-   **P2 (Standard):** Quality-of-life, performance, and accessibility improvements.
-   **P3 (Edge Case):** Robustness and stress testing.

## 🗂️ Test File Structure

*(This section remains for reference and is consistent with the initial plan.)*

### Configuration & Helper Files
- **`playwright.config.ts`**: Main configuration for parallel execution, browser projects, and reporting.
- **`tests/e2e/helpers/`**: Contains helper files for Test Data (`test-data.ts`), Page Objects (`ui-helpers.ts`), API Mocking (`api-mock.ts`), Custom Assertions (`assertions.ts`), Storage Utilities (`storage.ts`), and Network Simulation (`network.ts`).

---

## 🧪 Test Suites & Specifications

### 1. `setup.spec.ts` - Initial Setup & Load
**Priority**: P0
**Purpose**: Verifies the application loads correctly and is visually stable across devices.

#### ✅ Test: Application loads successfully
-   **Intent**: To ensure the user sees a functional, error-free interface upon first visit.
-   **Steps**:
    1.  Navigate to the root URL (`/`).
-   **Success Criteria**:
    -   The page title must contain "ThreadLink".
    -   The `Header` component is visible, containing the `<h1>` with "ThreadLink".
    -   The `TextEditor` component is visible, with the `textarea` and its placeholder text.
    -   The `Footer` component is visible.
    -   The browser's developer console must have zero `error` or `warn` level messages.

#### ✅ Test: Responsive design breakpoints are correctly applied
-   **Intent**: To confirm the UI adapts gracefully to common screen sizes, ensuring a consistent experience on desktop, tablet, and mobile.
-   **Steps**:
    1.  Load the application.
    2.  Set viewport to **Desktop (1920x1080)** and take a baseline screenshot.
    3.  Assert all primary UI elements (`Header`, `TextEditor`, `Footer`) are visible.
    4.  Set viewport to **Tablet (768x1024)** and take a screenshot.
    5.  Assert the layout has adapted and no elements are overlapping or cut off.
    6.  Set viewport to **Mobile (375x667)** and take a screenshot.
    7.  Assert the layout is single-column, readable, and all interactive elements are tappable.
-   **Success Criteria**:
    -   Each viewport test must pass without element overflow or overlap.
    -   Visual regression tests against baseline screenshots must pass within a small tolerance.

### 2. `api-keys.spec.ts` - API Key Management
**Priority**: P0
**Purpose**: Validates all functionality within the API Keys modal, ensuring users can securely add, manage, and delete their keys. This is critical for the app's BYOK model.

#### ✅ Test: Add and save an API key for each provider
-   **Intent**: To confirm a user can successfully provide and persist their API keys.
-   **Steps**:
    1.  Click the `Header` button with `aria-label="Manage API keys"`.
    2.  Verify the `APIKeysModal` is visible.
    3.  Locate the input for "Google API Key" and enter a valid key from `test-data.ts`.
    4.  Ensure the "Save to Browser" toggle for Google is **enabled** (default state).
    5.  Repeat steps 3-4 for OpenAI and Anthropic.
    6.  Click the "Save" button in the modal footer.
-   **Success Criteria**:
    -   The modal must close.
    -   A `localStorage` item with the key `threadlink_api_keys` must exist.
    -   The value of this item, when parsed, must be an object containing the exact keys provided for `google`, `openai`, and `anthropic`.

#### ✅ Test: Toggle "Save to Browser" prevents key persistence
-   **Intent**: To verify the user's choice to not save a key is respected.
-   **Steps**:
    1.  Clear all `localStorage`.
    2.  Open the `APIKeysModal`.
    3.  Enter a valid "Google API Key".
    4.  Click the "Save to Browser" toggle for Google to **disable** it.
    5.  Enter a valid "OpenAI API Key" and leave its toggle **enabled**.
    6.  Click "Save".
-   **Success Criteria**:
    -   The `localStorage` item `threadlink_api_keys` must contain the `openai` key.
    -   The `localStorage` item `threadlink_api_keys` must **NOT** contain the `google` key.

#### ✅ Test: Delete individual keys
-   **Intent**: To ensure users can easily remove a single stored key without affecting others.
-   **Steps**:
    1.  Programmatically set `localStorage` to contain keys for all three providers.
    2.  Reload the page and open the `APIKeysModal`.
    3.  Verify all three input fields are pre-filled (from storage).
    4.  Click the `Trash2` icon button next to the "OpenAI API Key" input.
    5.  Click "Save".
-   **Success Criteria**:
    -   The OpenAI input field in the modal must be empty immediately after clicking the delete icon.
    -   After saving, the `localStorage` item `threadlink_api_keys` must contain keys for `google` and `anthropic`, but **NOT** for `openai`.

#### ✅ Test: Key visibility toggle works correctly
-   **Intent**: To confirm the user can show and hide their API key for verification.
-   **Steps**:
    1.  Open the `APIKeysModal`.
    2.  Enter a key into the "Google API Key" input.
    3.  Verify the input `type` attribute is "password".
    4.  Click the "Show/Hide" toggle button next to the input.
    5.  Verify the input `type` attribute changes to "text".
    6.  Click the toggle button again.
-   **Success Criteria**:
    -   The input `type` attribute must correctly switch between "password" and "text" on each click.

### 3. `pipeline.spec.ts` - Core Processing & State
**Priority**: P0
**Purpose**: Tests the entire condensation pipeline from the user's perspective, ensuring progress is accurately reported and the final output is correct.

#### ✅ Test: Process small text with accurate progress tracking
-   **Intent**: To verify the `LoadingOverlay` provides clear, step-by-step feedback during processing.
-   **Steps**:
    1.  Paste a small conversation (~500 tokens) into the `textarea`.
    2.  Select a model (e.g., "Gemini 1.5 Flash").
    3.  Click the "Condense" button in the `Footer`.
-   **Success Criteria**:
    -   The `LoadingOverlay` must appear.
    -   The message in the overlay must transition through the phases:
        1.  "Preprocessing..." or "Cleaning..."
        2.  "Processing..."
        3.  "Finalizing..."
    -   During the "Processing..." phase, the drone counter (e.g., "1/3 drones") and progress bar must be visible and update correctly.
    -   After completion, the overlay must disappear and the final output text must be displayed in the `textarea`.
    -   The `textarea` must become `readOnly`.
    -   The stats bar (e.g., "Processed in X.Xs...") must appear above the `textarea`.

#### ✅ Test: Ensures chunks are stitched in the correct sequence
-   **Intent**: To guarantee that no matter how the text is batched and processed in parallel, the final output maintains the original chronological order. This is a critical data integrity test.
-   **Steps**:
    1.  Paste the sequential marker text from `test-data.ts` (`ALPHA... BRAVO... CHARLIE... DELTA...`).
    2.  Set Drone Density high enough to ensure multiple drones are used.
    3.  Click "Condense".
-   **Success Criteria**:
    -   The final output text must contain summaries of the chunks.
    -   The summarized content related to "ALPHA" must appear before the content for "BRAVO", which must appear before "CHARLIE", and so on. The sequence must be perfectly preserved.

### 4. `output.spec.ts` - Export & Copy
**Priority**: P0
**Purpose**: Validates the user can successfully export the generated context card.

#### ✅ Test: Copy to clipboard functionality
-   **Intent**: To confirm the primary "copy" action works reliably.
-   **Steps**:
    1.  Complete a processing job so the output `textarea` is populated and the "Copy" button is visible.
    2.  Click the "Copy" button in the `Footer`.
-   **Success Criteria**:
    -   The button text must temporarily show a success state (e.g., a "✓" checkmark appears).
    -   The content of the system clipboard must exactly match the content of the output `textarea`.

#### ✅ Test: Reset button clears state correctly
-   **Intent**: To ensure the "Reset" button returns the application to its initial state for a new job.
-   **Steps**:
    1.  Complete a processing job.
    2.  Verify output text and stats are visible.
    3.  Click the "Reset" button in the `Footer`.
-   **Success Criteria**:
    -   The `textarea` must be cleared and the placeholder text must reappear.
    -   The `textarea` must no longer be `readOnly`.
    -   The stats bar above the `textarea` must disappear.
    -   The "Condense" button must be visible and the "Copy"/"Reset" buttons must be hidden.

### 5. `error-handling.spec.ts` - Error Scenarios
**Priority**: P1
**Purpose**: Ensures the application handles common failures gracefully with clear user feedback.

#### ✅ Test: Handle invalid API key error from provider
-   **Intent**: To provide a clear error when the user's key is rejected by the API provider.
-   **Steps**:
    1.  Mock the API endpoint to return a `401 Unauthorized` or `403 Forbidden` status.
    2.  Enter text and click "Condense".
-   **Success Criteria**:
    -   The `LoadingOverlay` must disappear.
    -   An explicit error message must be displayed in the error region above the `textarea`.
    -   The message must clearly state the API key is invalid or there was an authentication problem.
    -   The application state must reset, allowing the user to try again.

#### ✅ Test: Handle API rate limit gracefully
-   **Intent**: To test the application's retry logic when a provider's rate limit is hit.
-   **Steps**:
    1.  Mock the API endpoint to return a `429 Too Many Requests` status on the first call, and a `200 OK` on the second call.
-   **Success Criteria**:
    -   The `LoadingOverlay` should show an intermediate status indicating a retry (e.g., "Rate limit hit, retrying...").
    -   The application should automatically retry the API call after a short delay.
    -   The process should ultimately succeed using the `200 OK` response from the second call.

#### ✅ Test: Prevent processing with empty input
-   **Intent**: To prevent wasted API calls and provide immediate feedback for invalid input.
-   **Steps**:
    1.  Ensure the `textarea` is empty.
-   **Success Criteria**:
    -   The "Condense" button in the `Footer` must be `disabled`.

### 6. `cancellation.spec.ts` - Cancel & State
**Priority**: P1
**Purpose**: Verifies the user can safely cancel an in-progress job.

#### ✅ Test: Cancel during drone processing
-   **Intent**: To confirm that a long-running job can be aborted mid-way through.
-   **Steps**:
    1.  Start a large processing job that will take several seconds.
    2.  While the `LoadingOverlay` shows the "Processing..." phase, click the "Cancel" button.
-   **Success Criteria**:
    -   The "Cancel" button text must change to "Cancelling...".
    -   All in-flight API requests must be aborted.
    -   The `LoadingOverlay` must disappear.
    -   The application must return to the pre-processing state (input text remains, "Condense" button is enabled).

#### ✅ Test: Cancel button is disabled during finalization
-   **Intent**: To prevent data corruption by disallowing cancellation during the final, non-interruptible stitching phase.
-   **Steps**:
    1.  Start a processing job.
    2.  Wait for the `LoadingOverlay` to show the "Finalizing..." message.
-   **Success Criteria**:
    -   The "Cancel"button within the `LoadingOverlay` must be `disabled`.

### 7. `settings.spec.ts` - Configuration
**Priority**: P2
**Purpose**: Ensures all user-configurable settings in the `SettingsModal` and `Footer` work as intended.

#### ✅ Test: Compression levels affect output length
-   **Intent**: To verify that the compression setting in the `Footer` has a measurable impact on the result.
-   **Steps**:
    1.  Process a large text with the `select` in the `Footer` set to **"Light"**. Record the output token count.
    2.  Reset the app.
    3.  Process the *same* large text with the `select` set to **"Aggressive"**. Record the output token count.
-   **Success Criteria**:
    -   The token count from the "Aggressive" run must be significantly lower than the token count from the "Light" run.

#### ✅ Test: Processing speed is disabled for Anthropic models
-   **Intent**: To confirm the UI correctly enforces provider-specific limitations mentioned in the `InfoPanel`.
-   **Steps**:
    1.  Open the `SettingsModal`.
    2.  Select a non-Anthropic model (e.g., "GPT-4o").
    3.  Verify the "Processing Speed" toggle is visible and enabled.
    4.  Select an Anthropic model (e.g., "Claude 3.5 Sonnet").
-   **Success Criteria**:
    -   The "Processing Speed" toggle and its label must be hidden or disabled.

#### ✅ Test: Recency Mode settings are correctly applied
-   **Intent**: To verify the Recency Mode UI controls function and persist.
-   **Steps**:
    1.  Open the `SettingsModal`.
    2.  Enable the "Recency Mode" toggle.
    3.  Verify the "Recency Strength" slider appears.
    4.  Move the slider to "Strong".
    5.  Close and reopen the `SettingsModal`.
-   **Success Criteria**:
    -   The "Recency Mode" toggle must remain "On".
    -   The "Recency Strength" slider must still be at the "Strong" position.

---


You are absolutely right. My apologies for the premature truncation. The task of generating such a comprehensive document requires careful assembly, and I cut the process short.

Here is the **complete and finished** `E2E_TEST_DOCUMENTATION.md`, continuing from where I left off and incorporating all remaining test suites based on the full context you've provided.

---

# **ThreadLink E2E Test Suite: Master Specification**

## 📁 Test Suite Overview

This document provides the master specification for the ThreadLink application's end-to-end (E2E) test suite. It defines the intended behavior, user workflows, and explicit success criteria for every testable feature. It serves as the **primary source of truth** for both manual QA and automated test remediation agents.

Tests are organized by functionality and prioritized to ensure core workflows are validated first.

-   **P0 (Critical):** Core product functionality. A failure here blocks release.
-   **P1 (Important):** High-value features and error recovery.
-   **P2 (Standard):** Quality-of-life, performance, and accessibility improvements.
-   **P3 (Edge Case):** Robustness and stress testing.

## 🗂️ Test File Structure

*(This section remains for reference and is consistent with the initial plan.)*

### Configuration & Helper Files
- **`playwright.config.ts`**: Main configuration for parallel execution, browser projects, and reporting.
- **`tests/e2e/helpers/`**: Contains helper files for Test Data (`test-data.ts`), Page Objects (`ui-helpers.ts`), API Mocking (`api-mock.ts`), Custom Assertions (`assertions.ts`), Storage Utilities (`storage.ts`), and Network Simulation (`network.ts`).

---

## 🧪 Test Suites & Specifications

### 1. `setup.spec.ts` - Initial Setup & Load
**Priority**: P0
**Purpose**: Verifies the application loads correctly and is visually stable across devices.

#### ✅ Test: Application loads successfully
-   **Intent**: To ensure the user sees a functional, error-free interface upon first visit.
-   **Steps**:
    1.  Navigate to the root URL (`/`).
-   **Success Criteria**:
    -   The page title must contain "ThreadLink".
    -   The `Header` component is visible, containing the `<h1>` with "ThreadLink".
    -   The `TextEditor` component is visible, with the `textarea` and its placeholder text.
    -   The `Footer` component is visible.
    -   The browser's developer console must have zero `error` or `warn` level messages.

#### ✅ Test: Responsive design breakpoints are correctly applied
-   **Intent**: To confirm the UI adapts gracefully to common screen sizes, ensuring a consistent experience on desktop, tablet, and mobile.
-   **Steps**:
    1.  Load the application.
    2.  Set viewport to **Desktop (1920x1080)** and take a baseline screenshot.
    3.  Assert all primary UI elements (`Header`, `TextEditor`, `Footer`) are visible.
    4.  Set viewport to **Tablet (768x1024)** and take a screenshot.
    5.  Assert the layout has adapted and no elements are overlapping or cut off.
    6.  Set viewport to **Mobile (375x667)** and take a screenshot.
    7.  Assert the layout is single-column, readable, and all interactive elements are tappable.
-   **Success Criteria**:
    -   Each viewport test must pass without element overflow or overlap.
    -   Visual regression tests against baseline screenshots must pass within a small tolerance.

### 2. `api-keys.spec.ts` - API Key Management
**Priority**: P0
**Purpose**: Validates all functionality within the API Keys modal, ensuring users can securely add, manage, and delete their keys. This is critical for the app's BYOK model.

#### ✅ Test: Add and save an API key for each provider
-   **Intent**: To confirm a user can successfully provide and persist their API keys.
-   **Steps**:
    1.  Click the `Header` button with `aria-label="Manage API keys"`.
    2.  Verify the `APIKeysModal` is visible.
    3.  Locate the input for "Google API Key" and enter a valid key from `test-data.ts`.
    4.  Ensure the "Save to Browser" toggle for Google is **enabled** (default state).
    5.  Repeat steps 3-4 for OpenAI and Anthropic.
    6.  Click the "Save" button in the modal footer.
-   **Success Criteria**:
    -   The modal must close.
    -   A `localStorage` item with the key `threadlink_api_keys` must exist.
    -   The value of this item, when parsed, must be an object containing the exact keys provided for `google`, `openai`, and `anthropic`.

#### ✅ Test: Toggle "Save to Browser" prevents key persistence
-   **Intent**: To verify the user's choice to not save a key is respected.
-   **Steps**:
    1.  Clear all `localStorage`.
    2.  Open the `APIKeysModal`.
    3.  Enter a valid "Google API Key".
    4.  Click the "Save to Browser" toggle for Google to **disable** it.
    5.  Enter a valid "OpenAI API Key" and leave its toggle **enabled**.
    6.  Click "Save".
-   **Success Criteria**:
    -   The `localStorage` item `threadlink_api_keys` must contain the `openai` key.
    -   The `localStorage` item `threadlink_api_keys` must **NOT** contain the `google` key.

#### ✅ Test: Delete individual keys
-   **Intent**: To ensure users can easily remove a single stored key without affecting others.
-   **Steps**:
    1.  Programmatically set `localStorage` to contain keys for all three providers.
    2.  Reload the page and open the `APIKeysModal`.
    3.  Verify all three input fields are pre-filled (from storage).
    4.  Click the `Trash2` icon button next to the "OpenAI API Key" input.
    5.  Click "Save".
-   **Success Criteria**:
    -   The OpenAI input field in the modal must be empty immediately after clicking the delete icon.
    -   After saving, the `localStorage` item `threadlink_api_keys` must contain keys for `google` and `anthropic`, but **NOT** for `openai`.

#### ✅ Test: Key visibility toggle works correctly
-   **Intent**: To confirm the user can show and hide their API key for verification.
-   **Steps**:
    1.  Open the `APIKeysModal`.
    2.  Enter a key into the "Google API Key" input.
    3.  Verify the input `type` attribute is "password".
    4.  Click the "Show/Hide" toggle button next to the input.
    5.  Verify the input `type` attribute changes to "text".
    6.  Click the toggle button again.
-   **Success Criteria**:
    -   The input `type` attribute must correctly switch between "password" and "text" on each click.

### 3. `pipeline.spec.ts` - Core Processing & State
**Priority**: P0
**Purpose**: Tests the entire condensation pipeline from the user's perspective, ensuring progress is accurately reported and the final output is correct.

#### ✅ Test: Process small text with accurate progress tracking
-   **Intent**: To verify the `LoadingOverlay` provides clear, step-by-step feedback during processing.
-   **Steps**:
    1.  Paste a small conversation (~500 tokens) into the `textarea`.
    2.  Select a model (e.g., "Gemini 1.5 Flash").
    3.  Click the "Condense" button in the `Footer`.
-   **Success Criteria**:
    -   The `LoadingOverlay` must appear.
    -   The message in the overlay must transition through the phases:
        1.  "Preprocessing..." or "Cleaning..."
        2.  "Processing..."
        3.  "Finalizing..."
    -   During the "Processing..." phase, the drone counter (e.g., "1/3 drones") and progress bar must be visible and update correctly.
    -   After completion, the overlay must disappear and the final output text must be displayed in the `textarea`.
    -   The `textarea` must become `readOnly`.
    -   The stats bar (e.g., "Processed in X.Xs...") must appear above the `textarea`.

#### ✅ Test: Ensures chunks are stitched in the correct sequence
-   **Intent**: To guarantee that no matter how the text is batched and processed in parallel, the final output maintains the original chronological order. This is a critical data integrity test.
-   **Steps**:
    1.  Paste the sequential marker text from `test-data.ts` (`ALPHA... BRAVO... CHARLIE... DELTA...`).
    2.  Set Drone Density high enough to ensure multiple drones are used.
    3.  Click "Condense".
-   **Success Criteria**:
    -   The final output text must contain summaries of the chunks.
    -   The summarized content related to "ALPHA" must appear before the content for "BRAVO", which must appear before "CHARLIE", and so on. The sequence must be perfectly preserved.

### 4. `output.spec.ts` - Export & Copy
**Priority**: P0
**Purpose**: Validates the user can successfully export the generated context card.

#### ✅ Test: Copy to clipboard functionality
-   **Intent**: To confirm the primary "copy" action works reliably.
-   **Steps**:
    1.  Complete a processing job so the output `textarea` is populated and the "Copy" button is visible.
    2.  Click the "Copy" button in the `Footer`.
-   **Success Criteria**:
    -   The button text must temporarily show a success state (e.g., a "✓" checkmark appears).
    -   The content of the system clipboard must exactly match the content of the output `textarea`.

#### ✅ Test: Reset button clears state correctly
-   **Intent**: To ensure the "Reset" button returns the application to its initial state for a new job.
-   **Steps**:
    1.  Complete a processing job.
    2.  Verify output text and stats are visible.
    3.  Click the "Reset" button in the `Footer`.
-   **Success Criteria**:
    -   The `textarea` must be cleared and the placeholder text must reappear.
    -   The `textarea` must no longer be `readOnly`.
    -   The stats bar above the `textarea` must disappear.
    -   The "Condense" button must be visible and the "Copy"/"Reset" buttons must be hidden.

### 5. `error-handling.spec.ts` - Error Scenarios
**Priority**: P1
**Purpose**: Ensures the application handles common failures gracefully with clear user feedback.

#### ✅ Test: Handle invalid API key error from provider
-   **Intent**: To provide a clear error when the user's key is rejected by the API provider.
-   **Steps**:
    1.  Mock the API endpoint to return a `401 Unauthorized` or `403 Forbidden` status.
    2.  Enter text and click "Condense".
-   **Success Criteria**:
    -   The `LoadingOverlay` must disappear.
    -   An explicit error message must be displayed in the error region above the `textarea`.
    -   The message must clearly state the API key is invalid or there was an authentication problem.
    -   The application state must reset, allowing the user to try again.

#### ✅ Test: Handle API rate limit gracefully
-   **Intent**: To test the application's retry logic when a provider's rate limit is hit.
-   **Steps**:
    1.  Mock the API endpoint to return a `429 Too Many Requests` status on the first call, and a `200 OK` on the second call.
-   **Success Criteria**:
    -   The `LoadingOverlay` should show an intermediate status indicating a retry (e.g., "Rate limit hit, retrying...").
    -   The application should automatically retry the API call after a short delay.
    -   The process should ultimately succeed using the `200 OK` response from the second call.

#### ✅ Test: Prevent processing with empty input
-   **Intent**: To prevent wasted API calls and provide immediate feedback for invalid input.
-   **Steps**:
    1.  Ensure the `textarea` is empty.
-   **Success Criteria**:
    -   The "Condense" button in the `Footer` must be `disabled`.

### 6. `cancellation.spec.ts` - Cancel & State
**Priority**: P1
**Purpose**: Verifies the user can safely cancel an in-progress job.

#### ✅ Test: Cancel during drone processing
-   **Intent**: To confirm that a long-running job can be aborted mid-way through.
-   **Steps**:
    1.  Start a large processing job that will take several seconds.
    2.  While the `LoadingOverlay` shows the "Processing..." phase, click the "Cancel" button.
-   **Success Criteria**:
    -   The "Cancel" button text must change to "Cancelling...".
    -   All in-flight API requests must be aborted.
    -   The `LoadingOverlay` must disappear.
    -   The application must return to the pre-processing state (input text remains, "Condense" button is enabled).

#### ✅ Test: Cancel button is disabled during finalization
-   **Intent**: To prevent data corruption by disallowing cancellation during the final, non-interruptible stitching phase.
-   **Steps**:
    1.  Start a processing job.
    2.  Wait for the `LoadingOverlay` to show the "Finalizing..." message.
-   **Success Criteria**:
    -   The "Cancel"button within the `LoadingOverlay` must be `disabled`.

### 7. `providers.spec.ts` - Multi-Provider
**Priority**: P1
**Purpose**: To verify that all model providers can be used successfully and switched between seamlessly.

#### ✅ Test: Each provider (Google, OpenAI, Anthropic) works
-   **Intent**: To confirm that a condensation job can be completed with a model from each major provider.
-   **Steps**:
    1.  **Google:** Set a valid Google API key. Select "Gemini 1.5 Flash". Process a small text.
    2.  **OpenAI:** Reset. Set a valid OpenAI key. Select "GPT-4o". Process the same text.
    3.  **Anthropic:** Reset. Set a valid Anthropic key. Select "Claude 3.5 Sonnet". Process the same text.
-   **Success Criteria**:
    -   For each run, the corresponding API endpoint must be called (verified via network interception).
    -   Each job must complete successfully without errors.

#### ✅ Test: Provider switching mid-session is handled correctly
-   **Intent**: To ensure changing settings does not corrupt the state for the next job.
-   **Steps**:
    1.  Set API keys for both Google and OpenAI.
    2.  Open `SettingsModal`, select a Google model, and close the modal.
    3.  Open `SettingsModal` again, select an OpenAI model, and close the modal.
    4.  Process a text.
-   **Success Criteria**:
    -   The API call must be made to the OpenAI endpoint, respecting the last-selected model.

### 8. `settings.spec.ts` - Configuration
**Priority**: P2
**Purpose**: Ensures all user-configurable settings in the `SettingsModal` and `Footer` work as intended.

#### ✅ Test: Compression levels affect output length
-   **Intent**: To verify that the compression setting in the `Footer` has a measurable impact on the result.
-   **Steps**:
    1.  Process a large text with the `select` in the `Footer` set to **"Light"**. Record the output token count.
    2.  Reset the app.
    3.  Process the *same* large text with the `select` set to **"Aggressive"**. Record the output token count.
-   **Success Criteria**:
    -   The token count from the "Aggressive" run must be significantly lower than the token count from the "Light" run.

#### ✅ Test: Processing speed is disabled for Anthropic models
-   **Intent**: To confirm the UI correctly enforces provider-specific limitations mentioned in the `InfoPanel`.
-   **Steps**:
    1.  Open the `SettingsModal`.
    2.  Select a non-Anthropic model (e.g., "GPT-4o").
    3.  Verify the "Processing Speed" toggle is visible and enabled.
    4.  Select an Anthropic model (e.g., "Claude 3.5 Sonnet").
-   **Success Criteria**:
    -   The "Processing Speed" toggle and its label must be hidden or disabled.

#### ✅ Test: Recency Mode settings are correctly applied
-   **Intent**: To verify the Recency Mode UI controls function and persist.
-   **Steps**:
    1.  Open the `SettingsModal`.
    2.  Enable the "Recency Mode" toggle.
    3.  Verify the "Recency Strength" slider appears.
    4.  Move the slider to "Strong".
    5.  Close and reopen the `SettingsModal`.
-   **Success Criteria**:
    -   The "Recency Mode" toggle must remain "On".
    -   The "Recency Strength" slider must still be at the "Strong" position.

#### ✅ Test: Advanced settings persist correctly
-   **Intent**: To ensure advanced users' fine-tuned settings are saved for the session.
-   **Steps**:
    1.  Open `SettingsModal`.
    2.  Expand "Advanced Settings".
    3.  Set "LLM Temperature" to `0.3`.
    4.  Set "Drone Density" to `5`.
    5.  Set "Max Drones Limit" to `50`.
    6.  Close and reopen the `SettingsModal`.
-   **Success Criteria**:
    -   The "Advanced Settings" section must still be expanded.
    -   The input values for Temperature, Drone Density, and Max Drones must match the values set in step 3-5.
    -   The changes must be reflected in the `localStorage` settings object.

### 9. `mobile.spec.ts` - Mobile UX
**Priority**: P2
**Purpose**: To validate the user experience on mobile devices, focusing on touch interactions and layout.

#### ✅ Test: Modal interactions are touch-friendly
-   **Intent**: To ensure modals are usable on a small screen.
-   **Steps**:
    1.  Using a mobile viewport, tap the `Header` button to open the `APIKeysModal`.
    2.  Tap the close button.
    3.  Reopen the modal. Tap the "Cancel" button.
-   **Success Criteria**:
    -   The modal should occupy most of the screen.
    -   All buttons within the modal must be large enough to be easily tappable.
    -   The modal must close correctly on all close/cancel actions.

#### ✅ Test: Virtual keyboard handling is correct
-   **Intent**: To prevent the on-screen keyboard from obscuring important UI elements.
-   **Steps**:
    1.  Using a mobile viewport, tap the `textarea` to bring up the virtual keyboard.
    2.  Verify the view scrolls so the text cursor is visible.
    3.  Open the `APIKeysModal`. Tap on an `input` field.
-   **Success Criteria**:
    -   The virtual keyboard must not cover the input field being typed into.
    -   The user must be able to scroll the modal content to access all fields if necessary.

### 10. `performance.spec.ts` - Performance
**Priority**: P2
**Purpose**: To ensure the application remains responsive and stable under heavy load.

#### ✅ Test: UI is responsive during processing
-   **Intent**: To confirm that background processing does not block the main UI thread.
-   **Steps**:
    1.  Start a very large processing job.
    2.  While the `LoadingOverlay` is active, click the `Header` button to open the `InfoPanel`.
-   **Success Criteria**:
    -   The `InfoPanel` modal must open instantly without any stutter or lag.
    -   The user must be able to scroll the content of the `InfoPanel` smoothly while the condensation job continues in the background.

#### ✅ Test: Memory usage is stable over multiple runs
-   **Intent**: To detect potential memory leaks from repeated use.
-   **Steps**:
    1.  Measure baseline heap size.
    2.  In a loop, 5 times:
        a. Process a large text.
        b. Reset the application.
    3.  Measure the final heap size after a garbage collection cycle.
-   **Success Criteria**:
    -   The final heap size must not have grown by more than a reasonable threshold (e.g., 20%) compared to the heap size after the first run, indicating no major memory leaks.

### 11. `accessibility.spec.ts` - A11y
**Priority**: P2
**Purpose**: To ensure the application is usable by people with disabilities, following WCAG standards.

#### ✅ Test: Passes automated accessibility checks
-   **Intent**: To catch low-hanging accessibility issues like color contrast or missing labels.
-   **Steps**:
    1.  Run the `axe-core` validator on the main page.
    2.  Open the `APIKeysModal` and run the validator again.
    3.  Open the `SettingsModal` and run the validator again.
-   **Success Criteria**:
    -   The `axe.run()` function must return zero violations.

#### ✅ Test: Full keyboard navigation is supported
-   **Intent**: To ensure users who cannot use a mouse can operate the entire application.
-   **Steps**:
    1.  Start from the top of the page.
    2.  Repeatedly press the `Tab` key to navigate through all interactive elements.
    3.  Press `Enter` or `Space` on focused buttons/toggles to activate them.
-   **Success Criteria**:
    -   The focus order must be logical and predictable (e.g., left-to-right, top-to-bottom).
    -   Every interactive element (links, buttons, inputs, selects, toggles) must be focusable.
    -   A visible focus indicator (e.g., an outline) must be present on the focused element at all times.

#### ✅ Test: Focus is managed correctly in modals
-   **Intent**: To provide a non-disorienting experience for screen reader and keyboard users when modals open.
-   **Steps**:
    1.  Press `Tab` until the "Manage API keys" button is focused, then press `Enter`.
    2.  Repeatedly press `Tab`.
    3.  Press `Escape`.
-   **Success Criteria**:
    -   When the modal opens, focus must be moved to the first focusable element inside it.
    -   Tabbing must "trap" focus within the modal; it should not be possible to tab to elements in the background page.
    -   When `Escape` is pressed, the modal must close, and focus must return to the "Manage API keys" button that opened it.

### 12. `integration.spec.ts` - Workflows
**Priority**: P1
**Purpose**: To validate complete, multi-step user journeys that mimic real-world usage.

#### ✅ Test: Full workflow: paste → configure → process → copy → reset
-   **Intent**: To validate the primary "golden path" from start to finish.
-   **Steps**:
    1.  Paste text.
    2.  Open `APIKeysModal` and add a key.
    3.  Open `SettingsModal` and change the model.
    4.  Click "Condense".
    5.  Wait for processing to finish.
    6.  Click "Copy".
    7.  Click "Reset".
-   **Success Criteria**:
    -   Every step must complete successfully without errors.
    -   The clipboard content after step 6 must match the output.
    -   The app must be in its initial state after step 7.

#### ✅ Test: Error recovery workflow: fail → fix key → succeed
-   **Intent**: To ensure a user can easily recover from a common error like an invalid API key.
-   **Steps**:
    1.  Add an *invalid* API key.
    2.  Attempt to process text.
    3.  Verify the invalid key error message appears.
    4.  Open `APIKeysModal`, delete the invalid key, and add a *valid* one.
    5.  Click "Condense" again on the same text.
-   **Success Criteria**:
    -   The first attempt must fail with the expected error.
    -   The second attempt must succeed.

### 13. `edge-cases.spec.ts` - Edge Cases
**Priority**: P3
**Purpose**: To test the application's robustness against unusual inputs and stress conditions.

#### ✅ Test: Recursive condensation is possible
-   **Intent**: To verify the "Two-Pass Method" described in the `InfoPanel` documentation.
-   **Steps**:
    1.  Process a large text.
    2.  Copy the output.
    3.  Reset the application.
    4.  Paste the copied output back into the `textarea`.
    5.  Process the text again.
-   **Success Criteria**:
    -   The second processing job must complete successfully, resulting in an even shorter text.

#### ✅ Test: Handles mixed line endings correctly
-   **Intent**: To ensure text copied from different operating systems (Windows `\r\n`, Mac/Linux `\n`) is parsed correctly.
-   **Steps**:
    1.  Create a string in `test-data.ts` containing `\r\n`, `\n`, and `\r` line endings.
    2.  Paste this string and process it.
-   **Success Criteria**:
    -   The `cleaner.js` logic must normalize all line endings.
    -   The processing should succeed without errors, treating all line breaks as equal.