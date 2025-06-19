// components/APIKeysModal.tsx - API Keys Modal Component

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface APIKeysModalProps {
  isOpen: boolean;
  googleAPIKey: string;
  openaiAPIKey: string;
  mistralAPIKey: string;
  googleCacheEnabled: boolean;
  openaiCacheEnabled: boolean;
  mistralCacheEnabled: boolean;
  setGoogleAPIKey: (key: string) => void;
  setOpenaiAPIKey: (key: string) => void;
  setMistralAPIKey: (key: string) => void;
  setGoogleCacheEnabled: (enabled: boolean) => void;
  setOpenaiCacheEnabled: (enabled: boolean) => void;
  setMistralCacheEnabled: (enabled: boolean) => void;
  onSave?: () => void;
  onClose: () => void;
  onDeleteKey: (provider: 'google' | 'openai' | 'mistral') => void;
}

export const APIKeysModal: React.FC<APIKeysModalProps> = ({
  isOpen,
  googleAPIKey,
  openaiAPIKey,
  mistralAPIKey,
  googleCacheEnabled,
  openaiCacheEnabled,
  mistralCacheEnabled,
  setGoogleAPIKey,
  setOpenaiAPIKey,
  setMistralAPIKey,
  setGoogleCacheEnabled,
  setOpenaiCacheEnabled,
  setMistralCacheEnabled,
  onSave,
  onClose,
  onDeleteKey
}) => {

  const [validationErrors, setValidationErrors] = useState<{
    google?: string;
    openai?: string;
    mistral?: string;
  }>({});
  const [storageError, setStorageError] = useState<string>('');
  const handleSave = useCallback(async () => {
    setStorageError('');
    try {
      if (onSave) {
        // Call onSave and wait for potential errors
        await new Promise<void>((resolve, reject) => {
          try {
            onSave();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to save API keys:', error);
      
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        setStorageError('Failed to save settings. Your browser storage may be full.');
        // Don't close the modal on error
        return;
      } else {
        setStorageError('Failed to save settings. Please try again.');
        return;
      }
    }
  }, [onSave, onClose]);

  // Add keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleSave]); // Add handleSave to dependencies

  const validateKey = (provider: string, key: string): string | undefined => {
    if (!key) return undefined;
      switch (provider) {      case 'google':
        if (!key.startsWith('AIza')) {
          return 'Invalid API key format - Google keys must start with AIza';
        }
        break;
      case 'openai':
        if (!key.startsWith('sk-')) {
          return 'Invalid API key format - OpenAI keys must start with sk-';        }
        break;
      case 'mistral':
        if (!key.startsWith('sk-')) {
          return 'Invalid API key format - Mistral keys must start with sk-';
        }
        break;}
    return undefined;
  };

  if (!isOpen) return null;
  const renderAPIKeySection = (
    provider: 'google' | 'openai' | 'mistral',
    label: string,
    placeholder: string,
    value: string,
    setValue: (key: string) => void,
    cacheEnabled: boolean,
    setCacheEnabled: (enabled: boolean) => void
  ) => (
    <div className="space-y-3" style={{ pointerEvents: 'none' }}>
      <div className="flex items-center justify-between">
        <label htmlFor={`${provider}-api-key`} className="text-sm text-[var(--text-secondary)] select-none cursor-default">
          {label}
        </label>        <div className="flex items-center space-x-2">
          <span className="text-xs text-[var(--text-secondary)] select-none cursor-default" style={{ pointerEvents: 'none' }}>Remember Key</span><button
            onClick={() => setCacheEnabled(!cacheEnabled)}
            title={`Toggle browser storage for ${label}`}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
              cacheEnabled ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
            }`}
            style={{ 
              pointerEvents: 'auto', 
              position: 'relative', 
              zIndex: 15,
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
              cacheEnabled ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>      <div className="relative flex space-x-2" style={{ pointerEvents: 'none' }}>        <input
          id={`${provider}-api-key`}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            setValue(newValue);
            const error = validateKey(provider, newValue);
            setValidationErrors(prev => ({
              ...prev,
              [provider]: error
            }));
          }}
          className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm font-mono cursor-text"
          style={{ 
            pointerEvents: 'auto', 
            maxWidth: 'calc(100% - 70px)',
            width: 'calc(100% - 70px)',
            flexShrink: 1,
            position: 'relative',
            zIndex: 1
          }}
        />        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteKey(provider);
            // Attempt to blur any active input, might help on some mobile browsers
            // if focus is somehow interfering, though stopPropagation should handle most cases.
            (document.activeElement as HTMLElement)?.blur();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteKey(provider);
            (document.activeElement as HTMLElement)?.blur();
          }}
          title={`Clear ${label}`}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer flex-shrink-0"          style={{ 
            pointerEvents: 'auto', 
            position: 'relative', 
            zIndex: 9999, 
            minWidth: '48px',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {validationErrors[provider] && (
        <p className="text-xs text-red-400 mt-1">{validationErrors[provider]}</p>
      )}
    </div>
  );  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not its children
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >      <div role="dialog" aria-labelledby="api-keys-title" className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4" style={{ pointerEvents: 'auto' }}>
        <h3 id="api-keys-title" className="text-lg font-medium text-[var(--text-primary)] mb-2 select-none cursor-default">API Key Management</h3>
        
        {/* Privacy-first usage explanation */}
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-300 select-none cursor-default">
            <strong>Privacy-first usage:  </strong>
            The keys never leave your browser.
          </p>
        </div>
        
        {storageError && (
          <div role="alert" aria-label="storage" className="mb-4 p-3 bg-red-500 text-white rounded" style={{ pointerEvents: 'auto' }}>
            {storageError}
          </div>
        )}
        
        <div className="space-y-6" style={{ pointerEvents: 'none' }}>
          {renderAPIKeySection(
            'google',
            'Google API Key',
            'AIza...',
            googleAPIKey,
            setGoogleAPIKey,
            googleCacheEnabled,
            setGoogleCacheEnabled
          )}

          {renderAPIKeySection(
            'openai',
            'OpenAI API Key',
            'sk-...',
            openaiAPIKey,
            setOpenaiAPIKey,
            openaiCacheEnabled,
            setOpenaiCacheEnabled
          )}          {renderAPIKeySection(
            'mistral',
            'Mistral API Key',
            'sk-...',
            mistralAPIKey,
            setMistralAPIKey,
            mistralCacheEnabled,
            setMistralCacheEnabled
          )}
        </div>        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg select-none cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
export default APIKeysModal;
