/**
 * Browser-native LLM API client for ThreadLink BYOK
 * Replaces the Node.js utils.js with direct REST API calls
 */

// Model to provider mapping (only cheap, fast models for batch processing)
export const MODEL_PROVIDERS = {
    // Google models
    "gemini-1.5-flash": "google",    
    // OpenAI models
    "gpt-4.1-nano": "openai",
    "gpt-4.1-mini": "openai"
};

// API endpoints
const API_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
};

/**
 * Rough token estimation: ~4 characters per token on average.
 */
export function estimateTokens(text) {
    return Math.floor((text || "").length / 4);
}

/**
 * Get the provider for a given model name.
 */
function getProviderForModel(model) {
    if (!model) {
        throw new Error("Model name is required");
    }
    
    if (!(model in MODEL_PROVIDERS)) {
        const availableModels = Object.keys(MODEL_PROVIDERS);
        throw new Error(`Unknown model: ${model}. Available models: ${availableModels.slice(0, 5).join(", ")}...`);
    }

    return MODEL_PROVIDERS[model];
}

/**
 * Generate response using OpenAI API
 */
async function generateOpenAIResponse(
    systemInstructions,
    userPrompt,
    model,
    apiKey,
    temperature = 0.5,
    maxTokens = 4096
) {
    const response = await fetch(API_ENDPOINTS.openai, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const err = new Error(error.error?.message || `OpenAI API error: ${response.status}`);
        err.status = response.status;
        err.response = response;
        throw err;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

/**
 * Generate response using Anthropic API
 */
async function generateAnthropicResponse(
    systemInstructions,
    userPrompt,
    model,
    apiKey,
    temperature = 0.5,
    maxTokens = 4096
) {
    const response = await fetch(API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemInstructions,
            messages: [{ role: "user", content: userPrompt }]
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const err = new Error(error.error?.message || `Anthropic API error: ${response.status}`);
        err.status = response.status;
        err.response = response;
        err.headers = Object.fromEntries(response.headers.entries());
        throw err;
    }

    const data = await response.json();
    return data.content[0]?.text || "";
}

/**
 * Generate response using Google AI API
 */
async function generateGoogleResponse(
    systemInstructions,
    userPrompt,
    model,
    apiKey,
    temperature = 0.5,
    maxTokens = null // Google doesn't use max_tokens in the same way
) {    const endpoint = API_ENDPOINTS.google.replace('{model}', model);
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `${systemInstructions}\n\n${userPrompt}`
                }]
            }],
            generationConfig: {
                temperature,
                candidateCount: 1
            }
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const err = new Error(error.error?.message || `Google AI API error: ${response.status}`);
        err.status = response.status;
        err.response = response;
        throw err;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Main public interface - Generate response using specified model
 * @param {string} systemInstructions - System prompt
 * @param {string} userPrompt - User prompt
 * @param {string} model - Model name
 * @param {string} apiKey - API key for the provider
 * @param {number} temperature - Temperature setting
 * @param {number} maxTokens - Maximum tokens to generate
 */
export async function generateResponse(
    systemInstructions,
    userPrompt,
    model = "gpt-4.1-nano",
    apiKey,
    temperature = 0.7,
    maxTokens = null
) {
    if (!systemInstructions || !userPrompt) {
        console.error("Missing required parameters: systemInstructions and userPrompt");
        return "";
    }
    
    if (!apiKey) {
        throw new Error("API key is required");
    }
    
    try {
        const provider = getProviderForModel(model);
        console.log(`🚀 Generating response with ${model} via ${provider}`);

        switch (provider) {
            case "openai":
                return await generateOpenAIResponse(
                    systemInstructions, userPrompt, model, apiKey, temperature, maxTokens
                );
            case "anthropic":
                return await generateAnthropicResponse(
                    systemInstructions, userPrompt, model, apiKey, temperature, maxTokens
                );
            case "google":
                return await generateGoogleResponse(
                    systemInstructions, userPrompt, model, apiKey, temperature, maxTokens
                );
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    } catch (error) {
        console.error(`❌ Error generating response with ${model}:`, error.message);
        throw error; // Re-throw for proper error handling upstream
    }
}

/**
 * Clean up common Anthropic introductory phrases from drone outputs.
 * Direct port from original utils.js
 */
export function cleanAnthropicIntros(text, options = {}) {
    if (!text || typeof text !== 'string') return text;
    
    const { debug = false } = options;
    const originalLength = text.length;
    let cleaned = text.trim();
    let patternMatched = null;
    let method = null;
    
    // STRATEGY 1: Keyword-based first-line detection
    const lines = cleaned.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.endsWith(':')) {
        const summaryKeywords = [
            'summary', 'condensed', 'conversation', 'context', 'card', 'token',
            'segment', 'analysis', 'overview', 'breakdown', 'insights',
            'highlights', 'key', 'core', 'essential', 'focus', 'recap', 
            'implementation', 'strategy'
        ];
        
        const hasKeyword = summaryKeywords.some(keyword => 
            firstLine.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
            patternMatched = firstLine + ':';
            method = 'keyword-based';
            cleaned = lines.slice(1).join('\n').trim();
        }
    }
    
    // STRATEGY 2: Specific pattern matching
    if (!patternMatched) {
        const specificPatterns = [
            /^Here's [^:]*:\s*/i,
            /^I'll analyze [^.]*\.\s*/i,
            /^I'll condense [^:]*:\s*/i,
            /^I'll [^.]*\.\s*/i,
            /^I'll [^.]*\.\s*Let's [^:]*:\s*/i,
            /^(?:🔬|📊|💡|🚀|📈|📄|🧪|🎉|💥|⚠️|✅|❌|⭐️|🔍)+ [^:]*:\s*/iu,
            /^[A-Z][a-z]+ [A-Z][^:]*Summary[^:]*:\s*/i,
            /^This is [^:]*:\s*/i,
            /^The following is [^:]*:\s*/i,
            /^Below is [^:]*:\s*/i,
        ];
        
        for (const pattern of specificPatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                patternMatched = match[0];
                method = 'pattern-based';
                cleaned = cleaned.replace(pattern, '').trim();
                break;
            }
        }
    }
    
    if (patternMatched && debug) {
        const trimmedChars = originalLength - cleaned.length;
        console.log(`🧹 Cleaned intro (${method}): "${patternMatched.trim()}" (removed ${trimmedChars} chars)`);
    }
    
    return cleaned;
}

/**
 * Test connection to a provider (simplified for browser)
 */
export async function testProviderConnection(provider, apiKey) {
    if (!apiKey) {
        return {
            provider,
            success: false,
            error: "API key not provided"
        };
    }
    
    try {
        const testPrompt = "Hello";
        const testSystem = "You are a helpful assistant. Respond with 'OK'.";
        
        let result;
        const testModels = {
            openai: "gpt-3.5-turbo",
            anthropic: "claude-3-haiku-20240307", 
            google: "gemini-1.5-flash"
        };
        
        const model = testModels[provider];
        if (!model) {
            return {
                provider,
                success: false,
                error: "Unknown provider"
            };
        }
        
        result = await generateResponse(
            testSystem, 
            testPrompt, 
            model, 
            apiKey, 
            0.0, 
            5
        );
        
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
 * Get information about a specific model
 */
export function getModelInfo(model) {
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
        exists: true
    };
}