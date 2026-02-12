/**
 * Browser storage utilities for ThreadLink BYOK
 * Manages API keys and settings in localStorage
 */

// Import MODEL_PROVIDERS to validate models
import { MODEL_PROVIDERS } from './client-api.js';

const STORAGE_KEYS = {
    OPENAI_KEY: 'threadlink_openai_api_key',
    ANTHROPIC_KEY: 'threadlink_anthropic_api_key',
    GOOGLE_KEY: 'threadlink_google_api_key',
    MISTRAL_KEY: 'threadlink_mistral_api_key',
    GROQ_KEY: 'threadlink_groq_api_key',
    SETTINGS: 'threadlink_settings',
    LAST_USED_MODEL: 'threadlink_last_model',
    CUSTOM_PROMPT: 'threadlink_custom_prompt',
    USE_CUSTOM_PROMPT: 'threadlink_use_custom_prompt'
};

/**
 * Simple XOR encryption for API keys
 * This is a basic obfuscation to prevent plaintext storage
 * Note: This is not cryptographically secure - it's just to provide minimal protection
 */
function simpleEncrypt(text, key = 'threadlink_key_2025') {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode the result
}

/**
 * Simple XOR decryption for API keys
 */
function simpleDecrypt(encryptedText, key = 'threadlink_key_2025') {
    try {
        const decoded = atob(encryptedText); // Base64 decode first
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch (error) {
        console.error('Failed to decrypt data:', error);
        return null;
    }
}

/**
 * Save API key to localStorage (only if caching is enabled in the UI)
 * @param {string} provider - 'openai', 'anthropic', 'google', 'mistral', or 'groq'
 * @param {string} key - API key
 * @param {boolean} enableCache - Whether to actually save to localStorage
 */
export function saveAPIKey(provider, key, enableCache = true) {
    if (!provider || !key) return;
    
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY,
        mistral: STORAGE_KEYS.MISTRAL_KEY,
        groq: STORAGE_KEYS.GROQ_KEY
    }[provider];
      if (storageKey && enableCache) {
        try {
            // Encrypt the API key before storing it
            const encryptedKey = simpleEncrypt(key);
            localStorage.setItem(storageKey, encryptedKey);
            console.log(`✅ Saved ${provider} API key to browser cache (encrypted)`);        } catch (error) {
            console.error(`Failed to save ${provider} API key:`, error);
            if (error.name === 'QuotaExceededError') {
                throw error; // Re-throw to be handled by UI layer
            }
        }
    } else if (storageKey && !enableCache) {
        // If caching is disabled, remove any existing key from storage
        try {
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Removed ${provider} API key from browser cache (caching disabled)`);
        } catch (error) {
            console.error(`Failed to remove ${provider} API key:`, error);
        }
    }
}

/**
 * Get API key from localStorage
 * @param {string} provider - 'openai', 'anthropic', 'google', 'mistral', or 'groq'
 * @returns {string|null} API key or null if not found
 */
export function getAPIKey(provider) {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY,
        mistral: STORAGE_KEYS.MISTRAL_KEY,
        groq: STORAGE_KEYS.GROQ_KEY
    }[provider];
    
    if (!storageKey) return null;
    
    try {
        const encryptedKey = localStorage.getItem(storageKey);
        if (!encryptedKey) return null;
        
        // Try to decrypt the key - if it fails, it might be an old plaintext key
        const decryptedKey = simpleDecrypt(encryptedKey);
        if (decryptedKey) {
            return decryptedKey;
        }
        
        // If decryption fails, treat it as a plaintext key (backwards compatibility)
        // but re-encrypt it for future storage
        if (encryptedKey.startsWith('sk-') || encryptedKey.startsWith('AIza')) {
            // Re-encrypt the plaintext key
            const reencrypted = simpleEncrypt(encryptedKey);
            localStorage.setItem(storageKey, reencrypted);
            return encryptedKey;
        }
        
        return null;
    } catch (error) {
        console.error(`Failed to get ${provider} API key:`, error);
        return null;
    }
}

/**
 * Remove API key from localStorage
 * @param {string} provider - 'openai', 'anthropic', 'google', 'mistral', or 'groq'
 */
export function removeAPIKey(provider) {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY,
        mistral: STORAGE_KEYS.MISTRAL_KEY,
        groq: STORAGE_KEYS.GROQ_KEY
    }[provider];
    
    if (storageKey) {
        try {
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Removed ${provider} API key`);
        } catch (error) {
            console.error(`Failed to remove ${provider} API key:`, error);
        }
    }
}

/**
 * Get all saved API keys
 * @returns {Object} Object with provider names as keys
 */
export function getAllAPIKeys() {
    return {
        openai: getAPIKey('openai'),
        anthropic: getAPIKey('anthropic'),
        google: getAPIKey('google'),
        mistral: getAPIKey('mistral'),
        groq: getAPIKey('groq')
    };
}

/**
 * Check which providers have API keys configured
 * @returns {Object} Object with provider names as keys and boolean values
 */
export function getAvailableProviders() {
    return {
        openai: !!getAPIKey('openai'),
        anthropic: !!getAPIKey('anthropic'),
        google: !!getAPIKey('google'),
        mistral: !!getAPIKey('mistral'),
        groq: !!getAPIKey('groq')
    };
}

/**
 * Save custom prompt to localStorage
 * @param {string} prompt - Custom prompt text
 */
export function saveCustomPrompt(prompt) {
    try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPT, prompt);
        console.log('✅ Custom prompt saved');
    } catch (error) {
        console.error('Failed to save custom prompt:', error);
    }
}

/**
 * Get custom prompt from localStorage
 * @returns {string|null} Custom prompt or null if not found
 */
export function getCustomPrompt() {
    try {
        return localStorage.getItem(STORAGE_KEYS.CUSTOM_PROMPT);
    } catch (error) {
        console.error('Failed to get custom prompt:', error);
        return null;
    }
}

/**
 * Save custom prompt enabled state
 * @param {boolean} enabled - Whether custom prompt is enabled
 */
export function saveUseCustomPrompt(enabled) {
    try {
        localStorage.setItem(STORAGE_KEYS.USE_CUSTOM_PROMPT, enabled ? 'true' : 'false');
        console.log(`✅ Custom prompt ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Failed to save custom prompt state:', error);
    }
}

/**
 * Get custom prompt enabled state
 * @returns {boolean} Whether custom prompt is enabled
 */
export function getUseCustomPrompt() {
    try {
        return localStorage.getItem(STORAGE_KEYS.USE_CUSTOM_PROMPT) === 'true';
    } catch (error) {
        console.error('Failed to get custom prompt state:', error);
        return false;
    }
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        console.log('✅ Settings saved');
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

/**
 * Get settings from localStorage
 * @returns {Object} Settings object or default settings
 */
export function getSettings() {
    try {
        const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (settings) {
            const parsedSettings = JSON.parse(settings);
            
            // Validate and fix invalid model references (hotfix for Claude removal)
            if (parsedSettings.model && !(parsedSettings.model in MODEL_PROVIDERS)) {
                console.warn(`Invalid model in settings: ${parsedSettings.model}. Resetting to default.`);
                parsedSettings.model = 'gemini-1.5-flash-latest';
                // Save the corrected settings back to localStorage
                saveSettings(parsedSettings);
            }
            
            return parsedSettings;
        }
        return getDefaultSettings();
    } catch (error) {
        console.error('Failed to get settings:', error);
        return getDefaultSettings();
    }
}

/**
 * Get default settings
 * @returns {Object} Default settings
 */
export function getDefaultSettings() {    return {
        model: 'gemini-1.5-flash-latest',
        temperature: 0.7,
        processingSpeed: 'balanced',
        recencyMode: false,
        recencyStrength: 1, // Default to "Balanced" (50%)
        droneDensity: 2, // drones per 10k tokens
        maxDrones: 50,
        targetTokens: null, // null means auto-calculate
        useCustomPrompt: false,
        customPrompt: null
    };
}

/**
 * Save last used model
 * @param {string} model - Model name
 */
export function saveLastUsedModel(model) {
    try {
        localStorage.setItem(STORAGE_KEYS.LAST_USED_MODEL, model);
    } catch (error) {
        console.error('Failed to save last used model:', error);
    }
}

/**
 * Get last used model
 * @returns {string|null} Model name or null
 */
export function getLastUsedModel() {
    try {
        const model = localStorage.getItem(STORAGE_KEYS.LAST_USED_MODEL);
        
        // Validate model exists in current MODEL_PROVIDERS (hotfix for Claude removal)
        if (model && !(model in MODEL_PROVIDERS)) {
            console.warn(`Invalid last used model: ${model}. Clearing stored value.`);
            localStorage.removeItem(STORAGE_KEYS.LAST_USED_MODEL);
            return null;
        }
        
        return model;
    } catch (error) {
        console.error('Failed to get last used model:', error);
        return null;
    }
}

/**
 * Clear all ThreadLink data from localStorage
 */
export function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove ${key}:`, error);
        }
    });
    console.log('🧹 Cleared all ThreadLink data');
}

/**
 * Export all data (for backup)
 * @returns {Object} All ThreadLink data
 */
export function exportData() {
    return {
        apiKeys: getAllAPIKeys(),
        settings: getSettings(),
        lastUsedModel: getLastUsedModel(),
        customPrompt: getCustomPrompt(),
        useCustomPrompt: getUseCustomPrompt()
    };
}

/**
 * Import data (from backup)
 * @param {Object} data - Data to import
 */
export function importData(data) {
    if (data.apiKeys) {
        Object.entries(data.apiKeys).forEach(([provider, key]) => {
            if (key) saveAPIKey(provider, key);
        });
    }
    
    if (data.settings) {
        saveSettings(data.settings);
    }
    
    if (data.lastUsedModel) {
        saveLastUsedModel(data.lastUsedModel);
    }
    
    if (data.customPrompt !== undefined) {
        saveCustomPrompt(data.customPrompt);
    }
    
    if (data.useCustomPrompt !== undefined) {
        saveUseCustomPrompt(data.useCustomPrompt);
    }
    
    console.log('✅ Data imported successfully');
}