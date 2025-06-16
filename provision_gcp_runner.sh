#!/bin/bash
# ==============================================================================
#      ThreadLink Autonomous Loop - GCP PROVISIONER
# ==============================================================================
#
# PURPOSE:
#   To be run on your GCP server AFTER cloning the project repository.
#   This script installs dependencies, sets up the .env file, and installs
#   Playwright browsers, making the environment ready for the test loop.
#
# USAGE:
#   1. SSH into your GCP instance.
#   2. Clone your project: git clone <your-repo-url>
#   3. cd <your-project-directory>
#   4. Run this script: ./provision_gcp_runner.sh
#

# --- Color Definitions ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Provisioning GCP environment for the Autonomous Test-Fix Loop...${NC}"
echo "------------------------------------------------------------------"

# --- 1. System Pre-flight Checks ---
echo -e "\n${YELLOW}Step 1: Checking for required tools (node, npm, git)...${NC}"
command -v node >/dev/null 2>&1 || { echo >&2 "  [❌] ${RED}Node.js is not installed. Aborting.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "  [❌] ${RED}npm is not installed. Aborting.${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo >&2 "  [❌] ${RED}Git is not installed. Aborting.${NC}"; exit 1; }
echo "  [✅] All required tools are present."

# --- 2. Install Node.js Dependencies ---
echo -e "\n${YELLOW}Step 2: Installing Node.js dependencies from package.json...${NC}"
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi
echo "  [✅] Dependencies installed successfully."

# --- 3. Set up .env file ---
echo -e "\n${YELLOW}Step 3: Setting up the .env file...${NC}"
if [ -f ".env" ]; then
    echo "  [⚠️] '.env' file already exists. Skipping creation."
else
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  [✅] Copied '.env.example' to '.env'."
        echo -e "  [🚨] ${RED}ACTION REQUIRED: You must now edit the '.env' file and add your real CLAUDE_API_KEY.${NC}"
        echo "      You can use: nano .env"
    else
        echo "  [❌] ${RED}'.env.example' not found. Cannot create '.env'. Aborting.${NC}"
        exit 1
    fi
fi

# --- 4. Install Playwright Browsers ---
echo -e "\n${YELLOW}Step 4: Installing Playwright browsers and OS dependencies...${NC}"
# --with-deps is CRITICAL for headless Linux environments
npx playwright install --with-deps
echo "  [✅] Playwright browsers are installed and ready."

# --- 5. Final Readiness Check ---
echo -e "\n${YELLOW}Step 5: Final readiness check...${NC}"
if ! git diff --quiet; then
    echo -e "  [⚠️] ${YELLOW}Your git working directory is not clean.${NC}"
    echo "      The auto-fixer uses 'git stash', which requires a clean state."
    echo "      Please commit or stash your changes before running the loop."
else
    echo "  [✅] Git working directory is clean."
fi

echo -e "\n------------------------------------------------------------------"
echo -e "${GREEN}✅ GCP environment provisioning complete!${NC}"
echo ""
echo "After you have updated the '.env' file with your API key,"
echo "you can start the autonomous loop with the following command:"
echo ""
echo -e "  ${YELLOW}node automation/claude_runner.js${NC}"
echo ""