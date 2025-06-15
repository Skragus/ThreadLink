// components/APIKeysModal.tsx - API Keys Modal Component

import React from 'react';
import { Trash2 } from 'lucide-react';

interface APIKeysModalProps {
  isOpen: boolean;
  googleAPIKey: string;
  openaiAPIKey: string;
  anthropicAPIKey: string;
  googleCacheEnabled: boolean;
  openaiCacheEnabled: boolean;
  anthropicCacheEnabled: boolean;
  setGoogleAPIKey: (key: string) => void;
  setOpenaiAPIKey: (key: string) => void;
  setAnthropicAPIKey: (key: string) => void;
  setGoogleCacheEnabled: (enabled: boolean) => void;
  setOpenaiCacheEnabled: (enabled: boolean) => void;
  setAnthropicCacheEnabled: (enabled: boolean) => void;
  onSave?: () => void;
  onClose: () => void;
  onDeleteKey: (provider: 'google' | 'openai' | 'anthropic') => void;
}

export const APIKeysModal: React.FC<APIKeysModalProps> = ({
  isOpen,
  googleAPIKey,
  openaiAPIKey,
  anthropicAPIKey,
  googleCacheEnabled,
  openaiCacheEnabled,
  anthropicCacheEnabled,
  setGoogleAPIKey,
  setOpenaiAPIKey,
  setAnthropicAPIKey,
  setGoogleCacheEnabled,
  setOpenaiCacheEnabled,
  setAnthropicCacheEnabled,
  onSave,
  onClose,
  onDeleteKey
}) => {
  if (!isOpen) return null;

  const renderAPIKeySection = (
    provider: 'google' | 'openai' | 'anthropic',
    label: string,
    placeholder: string,
    value: string,
    setValue: (key: string) => void,
    cacheEnabled: boolean,
    setCacheEnabled: (enabled: boolean) => void
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={`${provider}-api-key`} className="text-sm text-[var(--text-secondary)] select-none cursor-default">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[var(--text-secondary)] select-none cursor-default">Save to Browser</span>
          <button
            onClick={() => setCacheEnabled(!cacheEnabled)}
            title={`Toggle browser storage for ${label}`}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors select-none cursor-pointer ${
              cacheEnabled ? 'bg-[var(--highlight-blue)]' : 'bg-[var(--divider)]'
            }`}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform select-none ${
              cacheEnabled ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
      <div className="flex space-x-2">
        <input
          id={`${provider}-api-key`}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--highlight-blue)] text-sm font-mono cursor-text"
        />
        <button
          onClick={() => onDeleteKey(provider)}
          title={`Clear ${label}`}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--divider)] rounded text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4 select-none cursor-default">API Key Management</h3>
        <div className="space-y-6">
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
          )}

          {renderAPIKeySection(
            'anthropic',
            'Anthropic API Key',
            'sk-ant-...',
            anthropicAPIKey,
            setAnthropicAPIKey,
            anthropicCacheEnabled,
            setAnthropicCacheEnabled
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave || onClose}
            className="flex-1 px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--text-secondary)] text-white rounded-lg select-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
export default APIKeysModal;
