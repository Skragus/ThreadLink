import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser APIs
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock file system API for browser-based file operations
Object.defineProperty(global.window, 'fs', {
  value: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
  writable: true,
});

// Mock fetch if needed
global.fetch = vi.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  value: vi.fn(() => 'mocked-object-url'),
  writable: true,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

// Mock ResizeObserver if your components use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver if needed
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup any other browser globals your app needs
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});
