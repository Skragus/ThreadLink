/**
 * Browser storage utilities for ThreadLink BYOK
 * Manages API keys and settings in localStorage
 */

const STORAGE_KEYS = {
    OPENAI_KEY: 'threadlink_openai_api_key',
    ANTHROPIC_KEY: 'threadlink_anthropic_api_key',
    GOOGLE_KEY: 'threadlink_google_api_key',
    SETTINGS: 'threadlink_settings',
    LAST_USED_MODEL: 'threadlink_last_model',
    CUSTOM_PROMPT: 'threadlink_custom_prompt',
    USE_CUSTOM_PROMPT: 'threadlink_use_custom_prompt'
};

/**
 * Save API key to localStorage
 * @param {string} provider - 'openai', 'anthropic', or 'google'
 * @param {string} key - API key
 */
export function saveAPIKey(provider, key) {
    if (!provider || !key) return;
    
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY
    }[provider];
    
    if (storageKey) {
        try {
            localStorage.setItem(storageKey, key);
            console.log(`✅ Saved ${provider} API key`);
        } catch (error) {
            console.error(`Failed to save ${provider} API key:`, error);
        }
    }
}

/**
 * Get API key from localStorage
 * @param {string} provider - 'openai', 'anthropic', or 'google'
 * @returns {string|null} API key or null if not found
 */
export function getAPIKey(provider) {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY
    }[provider];
    
    if (!storageKey) return null;
    
    try {
        return localStorage.getItem(storageKey);
    } catch (error) {
        console.error(`Failed to get ${provider} API key:`, error);
        return null;
    }
}

/**
 * Remove API key from localStorage
 * @param {string} provider - 'openai', 'anthropic', or 'google'
 */
export function removeAPIKey(provider) {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI_KEY,
        anthropic: STORAGE_KEYS.ANTHROPIC_KEY,
        google: STORAGE_KEYS.GOOGLE_KEY
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
        google: getAPIKey('google')
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
        google: !!getAPIKey('google')
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
        return settings ? JSON.parse(settings) : getDefaultSettings();
    } catch (error) {
        console.error('Failed to get settings:', error);
        return getDefaultSettings();
    }
}

/**
 * Get default settings
 * @returns {Object} Default settings
 */
export function getDefaultSettings() {
    return {
        model: 'gemini-1.5-flash',
        temperature: 0.3,
        processingSpeed: 'balanced',
        recencyMode: false,
        recencyStrength: 0,
        droneDensity: 10, // drones per 10k tokens
        maxDrones: 100,
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
        return localStorage.getItem(STORAGE_KEYS.LAST_USED_MODEL);
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