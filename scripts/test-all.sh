#!/bin/bash
# Test runner script for automated LLM testing

echo "🧪 Starting comprehensive test suite..."
echo "======================================"

# Function to check command exit status
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 PASSED"
        return 0
    else
        echo "❌ $1 FAILED"
        return 1
    fi
}

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0

# 1. Lint check
echo "🔍 Running ESLint..."
npm run lint
if check_status "ESLint"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# 2. TypeScript compilation
echo "🔧 Checking TypeScript compilation..."
npm run build
if check_status "TypeScript Build"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# 3. Unit tests
echo "🧪 Running unit tests..."
npm run test
if check_status "Unit Tests"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# 4. E2E tests
echo "🌐 Running E2E tests..."
npm run test:e2e
if check_status "E2E Tests"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# Summary
echo "======================================"
echo "📊 TEST SUMMARY:"
echo "   Total test suites: $TOTAL_TESTS"
echo "   Passed: $PASSED_TESTS"
echo "   Failed: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo "🎉 ALL TESTS PASSED! Ready for deployment."
    exit 0
else
    echo "⚠️  SOME TESTS FAILED. Review and fix issues."
    exit 1
fi
