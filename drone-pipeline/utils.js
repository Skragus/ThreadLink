// utils.js

/**
 * Rough token estimation: ~4 characters per token on average.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    return Math.floor((text || "").length / 4);
}

// You can add other utility functions here as your project grows.
// For example, if you had common ID generation logic, etc.


/**
 * Multi-provider LLM service: unified interface for OpenAI, Anthropic, and Google models.
 */

// Global client storage
const _clients = {};

// Model to provider mapping
const MODEL_PROVIDERS = {
    // OpenAI models
    "gpt-4": "openai",
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai",
    "gpt-4-turbo": "openai",
    "gpt-3.5-turbo": "openai",
    "gpt-3.5-turbo-16k": "openai",
    
    // Anthropic models
    "claude-3-5-sonnet-20241022": "anthropic",
    "claude-3-5-sonnet-20240620": "anthropic",
    "claude-3-haiku-20240307": "anthropic",
    "claude-3-opus-20240229": "anthropic",
    "claude-3-sonnet-20240229": "anthropic",
    
    // Google models
    "gemini-pro": "google",
    "gemini-1.5-pro": "google",
    "gemini-1.5-flash": "google",
    "gemini-pro-vision": "google",
};

/**
 * Get or create OpenAI client.
 */
function _getOpenAIClient() {
    if (!_clients.openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("OPENAI_API_KEY environment variable not set");
            throw new Error("Missing OpenAI API key");
        }
        
        try {
            const { OpenAI } = require('openai');
            _clients.openai = new OpenAI({ apiKey });
            console.log("✅ OpenAI client initialized");
        } catch (error) {
            console.error("❌ OpenAI library not installed. Install with: npm install openai");
            throw error;
        }
    }
    return _clients.openai;
}

/**
 * Get or create Anthropic client.
 */
function _getAnthropicClient() {
    if (!_clients.anthropic) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error("ANTHROPIC_API_KEY environment variable not set");
            throw new Error("Missing Anthropic API key");
        }
        
        try {
            const Anthropic = require('@anthropic-ai/sdk');
            _clients.anthropic = new Anthropic({ apiKey });
            console.log("✅ Anthropic client initialized");
        } catch (error) {
            console.error("❌ Anthropic library not installed. Install with: npm install @anthropic-ai/sdk");
            throw error;
        }
    }
    return _clients.anthropic;
}

/**
 * Get or create Google AI client.
 */
function _getGoogleClient() {
    if (!_clients.google) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error("GOOGLE_API_KEY environment variable not set");
            throw new Error("Missing Google API key");
        }
        
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            _clients.google = new GoogleGenerativeAI(apiKey);
            console.log("✅ Google AI client initialized");
        } catch (error) {
            console.error("❌ Google AI library not installed. Install with: npm install @google/generative-ai");
            throw error;
        }
    }
    return _clients.google;
}

/**
 * Generate response using OpenAI.
 */
async function _generateOpenAIResponse(
    systemInstructions,
    userPrompt,
    model,
    temperature = 0.7,
    maxTokens = null
) {
    if (!systemInstructions || !userPrompt) {
        console.error("Empty system instructions or user prompt provided");
        return "";
    }
    
    try {
        const client = _getOpenAIClient();

        const messages = [
            { role: "system", content: systemInstructions },
            { role: "user", content: userPrompt },
        ];

        const requestParams = {
            model,
            messages,
            temperature
        };
        
        if (maxTokens) {
            requestParams.max_tokens = maxTokens;
        }

        const response = await client.chat.completions.create(requestParams);
        const content = response.choices[0]?.message?.content || "";

        console.log(`📤 OpenAI response: ${content.length} chars`);
        return content;

    } catch (error) {
        console.error(`❌ OpenAI API error with ${model}:`, error.message);
        return "";
    }
}

/**
 * Generate response using Anthropic.
 */
async function _generateAnthropicResponse(
    systemInstructions,
    userPrompt,
    model,
    temperature = 0.7,
    maxTokens = null
) {
    if (!systemInstructions || !userPrompt) {
        console.error("Empty system instructions or user prompt provided");
        return "";
    }
    
    try {
        const client = _getAnthropicClient();

        const requestParams = {
            model,
            max_tokens: maxTokens || 1000,
            temperature,
            system: systemInstructions,
            messages: [{ role: "user", content: userPrompt }],
        };

        const response = await client.messages.create(requestParams);
        const content = response.content[0]?.text || "";

        console.log(`📤 Anthropic response: ${content.length} chars`);
        return content;

    } catch (error) {
        console.error(`❌ Anthropic API error with ${model}:`, error.message);
        return "";
    }
}

/**
 * Generate response using Google AI.
 */
async function _generateGoogleResponse(
    systemInstructions,
    userPrompt,
    model,
    temperature = 0.7,
    maxTokens = null
) {
    if (!systemInstructions || !userPrompt) {
        console.error("Empty system instructions or user prompt provided");
        return "";
    }
    
    try {
        const genAI = _getGoogleClient();

        const modelInstance = genAI.getGenerativeModel({
            model,
            generationConfig: {
                temperature,
            },
            systemInstruction: systemInstructions,
        });

        const result = await modelInstance.generateContent(userPrompt);
        const response = await result.response;
        const content = response.text() || "";

        console.log(`📤 Google AI response: ${content.length} chars`);
        return content;

    } catch (error) {
        console.error(`❌ Google AI API error with ${model}:`, error.message);
        return "";
    }
}

/**
 * Get the provider for a given model name.
 */
function _getProviderForModel(model) {
    if (!model) {
        console.error("Model name cannot be empty");
        throw new Error("Model name is required");
    }
    
    if (!(model in MODEL_PROVIDERS)) {
        const availableModels = Object.keys(MODEL_PROVIDERS);
        console.error(`Unknown model '${model}'. Available models: ${availableModels.slice(0, 5).join(", ")}...`);
        throw new Error(`Unknown model: ${model}`);
    }

    const provider = MODEL_PROVIDERS[model];
    console.log(`🔗 Model '${model}' -> provider '${provider}'`);
    return provider;
}

/**
 * Generate response using specified model (main public interface).
 */
async function generateResponse(
    systemInstructions,
    userPrompt,
    model = "gpt-4o",
    temperature = 0.7,
    maxTokens = null
) {
    if (!systemInstructions || !userPrompt) {
        console.error("Missing required parameters: systemInstructions and userPrompt");
        return "";
    }
    
    try {
        const provider = _getProviderForModel(model);
        console.log(`🚀 Generating response with ${model}`);

        if (provider === "openai") {
            return await _generateOpenAIResponse(
                systemInstructions, userPrompt, model, temperature, maxTokens
            );
        } else if (provider === "anthropic") {
            return await _generateAnthropicResponse(
                systemInstructions, userPrompt, model, temperature, maxTokens
            );
        } else if (provider === "google") {
            return await _generateGoogleResponse(
                systemInstructions, userPrompt, model, temperature, maxTokens
            );
        } else {
            console.error(`Unknown provider: ${provider}`);
            return "";
        }
    } catch (error) {
        console.error(`❌ Error generating response with ${model}:`, error.message);
        return "";
    }
}

/**
 * Check if a provider is available (has API key set).
 */
function isProviderAvailable(provider) {
    const apiKeyMap = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GOOGLE_API_KEY",
    };

    const envVar = apiKeyMap[provider];
    if (!envVar) {
        return false;
    }

    return Boolean(process.env[envVar]);
}

/**
 * Get list of providers that have API keys configured.
 */
function getAvailableProviders() {
    return ["openai", "anthropic", "google"].filter(isProviderAvailable);
}

/**
 * Get list of available models grouped by provider.
 */
function getAvailableModels() {
    const available = {};

    for (const [model, provider] of Object.entries(MODEL_PROVIDERS)) {
        if (!available[provider]) {
            available[provider] = [];
        }
        available[provider].push(model);
    }

    return available;
}

/**
 * Get information about a specific model.
 */
function getModelInfo(model) {
    if (!(model in MODEL_PROVIDERS)) {
        return {
            model,
            exists: false,
            error: "Model not found in registry"
        };
    }
    
    const provider = MODEL_PROVIDERS[model];
    
    return {
        model,
        provider,
        exists: true,
        available: isProviderAvailable(provider),
    };
}

/**
 * Test connection to a provider.
 */
async function testProviderConnection(provider) {
    if (!isProviderAvailable(provider)) {
        return {
            provider,
            success: false,
            error: "API key not configured"
        };
    }
    
    try {
        // Test with a simple request
        const testPrompt = "Hello";
        const testSystem = "You are a helpful assistant. Respond with 'OK'.";
        
        let result;
        
        if (provider === "openai") {
            result = await _generateOpenAIResponse(
                testSystem, testPrompt, "gpt-3.5-turbo", 0.0, 5
            );
        } else if (provider === "anthropic") {
            result = await _generateAnthropicResponse(
                testSystem, testPrompt, "claude-3-haiku-20240307", 0.0, 5
            );
        } else if (provider === "google") {
            result = await _generateGoogleResponse(
                testSystem, testPrompt, "gemini-1.5-flash", 0.0, 5
            );
        } else {
            return {
                provider,
                success: false,
                error: "Unknown provider"
            };
        }
        
        return {
            provider,
            success: Boolean(result),
            responseLength: result ? result.length : 0,
        };
        
    } catch (error) {
        return {
            provider,
            success: false,
            error: error.message
        };
    }
}

/**
 * Test all available providers.
 */
async function testAllProviders() {
    const providers = getAvailableProviders();
    const results = {};
    
    console.log(`🧪 Testing ${providers.length} available providers...`);
    
    for (const provider of providers) {
        console.log(`Testing ${provider}...`);
        results[provider] = await testProviderConnection(provider);
    }
    
    return results;
}

module.exports = {
    // Main API
    generateResponse,
    
    // Provider utilities
    isProviderAvailable,
    getAvailableProviders,
    getAvailableModels,
    getModelInfo,
    testProviderConnection,
    testAllProviders,
    estimateTokens,
    
    // Constants
    MODEL_PROVIDERS,
};