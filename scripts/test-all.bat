@echo off
REM Test runner script for automated LLM testing (Windows)

echo 🧪 Starting comprehensive test suite...
echo ======================================

set TOTAL_TESTS=0
set PASSED_TESTS=0

REM 1. Lint check
echo 🔍 Running ESLint...
call npm run lint
if %ERRORLEVEL% == 0 (
    echo ✅ ESLint PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ❌ ESLint FAILED
)
set /a TOTAL_TESTS+=1
echo.

REM 2. TypeScript compilation  
echo 🔧 Checking TypeScript compilation...
call npm run build
if %ERRORLEVEL% == 0 (
    echo ✅ TypeScript Build PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ❌ TypeScript Build FAILED
)
set /a TOTAL_TESTS+=1
echo.

REM 3. Unit tests
echo 🧪 Running unit tests...
call npm run test
if %ERRORLEVEL% == 0 (
    echo ✅ Unit Tests PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ❌ Unit Tests FAILED
)
set /a TOTAL_TESTS+=1
echo.

REM 4. E2E tests
echo 🌐 Running E2E tests...
call npm run test:e2e
if %ERRORLEVEL% == 0 (
    echo ✅ E2E Tests PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ❌ E2E Tests FAILED
)
set /a TOTAL_TESTS+=1
echo.

REM Summary
echo ======================================
echo 📊 TEST SUMMARY:
echo    Total test suites: %TOTAL_TESTS%
echo    Passed: %PASSED_TESTS%
set /a FAILED_TESTS=%TOTAL_TESTS%-%PASSED_TESTS%
echo    Failed: %FAILED_TESTS%

if %PASSED_TESTS% == %TOTAL_TESTS% (
    echo 🎉 ALL TESTS PASSED! Ready for deployment.
    exit /b 0
) else (
    echo ⚠️  SOME TESTS FAILED. Review and fix issues.
    exit /b 1
)
