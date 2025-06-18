import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { APIKeysModal } from './APIKeysModal'; // Import directly from the component file

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trash2: (props: any) => <svg data-testid="trash-icon" {...props} />,
}));

describe('APIKeysModal Component', () => {
  const mockSetGoogleAPIKey = vi.fn();
  const mockSetOpenaiAPIKey = vi.fn();
  const mockSetAnthropicAPIKey = vi.fn();
  const mockSetGoogleCacheEnabled = vi.fn();
  const mockSetOpenaiCacheEnabled = vi.fn();
  const mockSetAnthropicCacheEnabled = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnDeleteKey = vi.fn();

  const defaultProps = {
    isOpen: true,
    googleAPIKey: 'AIzaOldGoogleKey',
    openaiAPIKey: 'sk-OldOpenAIKey',
    anthropicAPIKey: 'sk-ant-OldAnthropicKey',
    googleCacheEnabled: true,
    openaiCacheEnabled: false,
    anthropicCacheEnabled: true,
    setGoogleAPIKey: mockSetGoogleAPIKey,
    setOpenaiAPIKey: mockSetOpenaiAPIKey,
    setAnthropicAPIKey: mockSetAnthropicAPIKey,
    setGoogleCacheEnabled: mockSetGoogleCacheEnabled,
    setOpenaiCacheEnabled: mockSetOpenaiCacheEnabled,
    setAnthropicCacheEnabled: mockSetAnthropicCacheEnabled,
    onSave: mockOnSave,
    onClose: mockOnClose,
    onDeleteKey: mockOnDeleteKey,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render if isOpen is false', () => {
    render(<APIKeysModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render correctly when isOpen is true', () => {
    render(<APIKeysModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Google API Key')).toHaveValue(defaultProps.googleAPIKey);
    expect(screen.getByLabelText('OpenAI API Key')).toHaveValue(defaultProps.openaiAPIKey);
    expect(screen.getByLabelText('Anthropic API Key')).toHaveValue(defaultProps.anthropicAPIKey);
    expect(screen.getByText('API Key Management')).toBeInTheDocument();
  });

  it('should call set[Provider]APIKey on input change and show validation errors', () => {
    render(<APIKeysModal {...defaultProps} />);
    
    const googleInput = screen.getByLabelText('Google API Key');
    fireEvent.change(googleInput, { target: { value: 'newGoogleKey' } });
    expect(mockSetGoogleAPIKey).toHaveBeenCalledWith('newGoogleKey');
    expect(screen.getByText('Invalid API key format - Google keys must start with AIza')).toBeInTheDocument();

    fireEvent.change(googleInput, { target: { value: 'AIzaValidKey' } });
    expect(mockSetGoogleAPIKey).toHaveBeenCalledWith('AIzaValidKey');
    expect(screen.queryByText('Invalid API key format - Google keys must start with AIza')).not.toBeInTheDocument();

    const openaiInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiInput, { target: { value: 'newOpenAIKey' } });
    expect(mockSetOpenaiAPIKey).toHaveBeenCalledWith('newOpenAIKey');
    expect(screen.getByText('Invalid API key format - OpenAI keys must start with sk-')).toBeInTheDocument();

    const anthropicInput = screen.getByLabelText('Anthropic API Key');
    fireEvent.change(anthropicInput, { target: { value: 'newAnthropicKey' } });
    expect(mockSetAnthropicAPIKey).toHaveBeenCalledWith('newAnthropicKey');
    expect(screen.getByText('Invalid API key format - Anthropic keys must start with sk-ant-')).toBeInTheDocument();
  });

  it('should toggle cache enabled state', () => {
    render(<APIKeysModal {...defaultProps} />);
    
    // Google Cache Toggle
    const googleCacheToggle = screen.getAllByTitle('Toggle browser storage for Google API Key')[0];
    fireEvent.click(googleCacheToggle);
    expect(mockSetGoogleCacheEnabled).toHaveBeenCalledWith(!defaultProps.googleCacheEnabled);

    // OpenAI Cache Toggle
    const openaiCacheToggle = screen.getAllByTitle('Toggle browser storage for OpenAI API Key')[0];
    fireEvent.click(openaiCacheToggle);
    expect(mockSetOpenaiCacheEnabled).toHaveBeenCalledWith(!defaultProps.openaiCacheEnabled);

    // Anthropic Cache Toggle
    const anthropicCacheToggle = screen.getAllByTitle('Toggle browser storage for Anthropic API Key')[0];
    fireEvent.click(anthropicCacheToggle);
    expect(mockSetAnthropicCacheEnabled).toHaveBeenCalledWith(!defaultProps.anthropicCacheEnabled);
  });

  it('should call onSave and onClose when Save button is clicked', async () => {
    render(<APIKeysModal {...defaultProps} />);
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button is clicked', () => {
    render(<APIKeysModal {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onClose when clicking the backdrop', () => {
    render(<APIKeysModal {...defaultProps} />);
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement; // The backdrop is the parent of the dialog
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when clicking inside the modal content', () => {
     render(<APIKeysModal {...defaultProps} />);
     const dialogContent = screen.getByRole('dialog');
     fireEvent.click(dialogContent);
     expect(mockOnClose).not.toHaveBeenCalled();
  });
  
  it('should call handleSave (and thus onClose) when Escape key is pressed', async () => {
    render(<APIKeysModal {...defaultProps} />);
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });
    expect(mockOnSave).toHaveBeenCalledTimes(1); // handleSave calls onSave
    expect(mockOnClose).toHaveBeenCalledTimes(1); // handleSave calls onClose
  });

  it('should call onDeleteKey when a delete button is clicked', () => {
    render(<APIKeysModal {...defaultProps} />);
    
    const googleDeleteButton = screen.getAllByTitle('Clear Google API Key')[0];
    fireEvent.click(googleDeleteButton);
    expect(mockOnDeleteKey).toHaveBeenCalledWith('google');

    const openaiDeleteButton = screen.getAllByTitle('Clear OpenAI API Key')[0];
    fireEvent.click(openaiDeleteButton);
    expect(mockOnDeleteKey).toHaveBeenCalledWith('openai');

    const anthropicDeleteButton = screen.getAllByTitle('Clear Anthropic API Key')[0];
    fireEvent.click(anthropicDeleteButton);
    expect(mockOnDeleteKey).toHaveBeenCalledWith('anthropic');
  });

  it('should display storage error for QuotaExceededError and not close', async () => {
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    mockOnSave.mockImplementationOnce(() => { throw quotaError; });
    
    render(<APIKeysModal {...defaultProps} onSave={mockOnSave} />);
    const saveButton = screen.getByRole('button', { name: 'Save' });
    
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    expect(screen.getByText('Failed to save settings. Your browser storage may be full.')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should display generic storage error for other errors and not close', async () => {
    mockOnSave.mockImplementationOnce(() => { throw new Error('Some other error'); });
    
    render(<APIKeysModal {...defaultProps} onSave={mockOnSave} />);
    const saveButton = screen.getByRole('button', { name: 'Save' });

    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

   it('should handle onSave not being provided', async () => {
    render(<APIKeysModal {...defaultProps} onSave={undefined} />);
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1); // Should still close
  });
});

// Tests for the validateKey function extracted from the component
describe('validateKey function', () => {
  // Define the validateKey function with the same logic as in the component
  const validateKey = (provider: string, key: string): string | undefined => {
    if (!key) return undefined;
    switch (provider) {
      case 'google':
        if (!key.startsWith('AIza')) {
          return 'Invalid API key format - Google keys must start with AIza';
        }
        break;
      case 'openai':
        if (!key.startsWith('sk-')) {
          return 'Invalid API key format - OpenAI keys must start with sk-';
        }
        break;
      case 'anthropic':
        if (!key.startsWith('sk-ant-')) {
          return 'Invalid API key format - Anthropic keys must start with sk-ant-';
        }
        break;
    }
    return undefined;
  };

  it('should return undefined for an empty key', () => {
    expect(validateKey('google', '')).toBeUndefined();
  });

  it('should validate Google API keys correctly', () => {
    expect(validateKey('google', 'AIzaTestKey')).toBeUndefined();
    expect(validateKey('google', 'InvalidKey')).toBe('Invalid API key format - Google keys must start with AIza');
  });

  it('should validate OpenAI API keys correctly', () => {
    expect(validateKey('openai', 'sk-TestKey')).toBeUndefined();
    expect(validateKey('openai', 'InvalidKey')).toBe('Invalid API key format - OpenAI keys must start with sk-');
  });

  it('should validate Anthropic API keys correctly', () => {
    expect(validateKey('anthropic', 'sk-ant-TestKey')).toBeUndefined();
    expect(validateKey('anthropic', 'InvalidKey')).toBe('Invalid API key format - Anthropic keys must start with sk-ant-');
    expect(validateKey('anthropic', 'sk-InvalidKey')).toBe('Invalid API key format - Anthropic keys must start with sk-ant-');
  });

  it('should return undefined for unknown provider if key is present', () => {
    expect(validateKey('unknown', 'somekey')).toBeUndefined();
  });
});
