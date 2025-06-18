#!/bin/bash
cd "/c/Users/bragi/Documents/GitHub/ThreadLink"
echo "Starting test run..."
npx playwright test tests/e2e/cancellation.spec.ts --project=chromium --workers=1 --timeout=30000
echo "Test run completed with exit code: $?"
