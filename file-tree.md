# ThreadLink Codebase Structure

```
ThreadLink/
├── .bolt/
│   └── config.json
├── .vscode/
│   └── settings.json
├── src/
│   ├── components/
│   │   ├── APIKeysModal.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── InfoPanel.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── SettingModal.tsx
│   │   └── TextEditor.tsx
│   ├── lib/
│   │   ├── client-api.js
│   │   ├── storage.js
│   │   └── utils.js
│   ├── pipeline/
│   │   ├── batcher.js
│   │   ├── cleaner.js
│   │   ├── config.js
│   │   ├── orchestrator.js
│   │   ├── progressTracker.js
│   │   └── splicer.js
│   ├── test/
│   │   ├── e2e/
│   │   │   ├── helpers/
│   │   │   │   └── test-data.ts
│   │   │   ├── drone-failure-markers.spec.ts
│   │   │   ├── providers.spec.ts
│   │   │   ├── security.spec.ts
│   │   │   └── setup.spec.ts
│   │   └── setup.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── textProcessing.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── ThreadLink.tsx
├── tests/
│   ├── drones.test.js
│   ├── output-assembly.test.js
│   └── preprocessing.test.js
├── App.css
├── App.tsx
├── digestor.py
├── fix.md
├── index.html
├── jest.config.js
├── package.json
├── package-lock.json
├── playwright.config.ts
├── postcss.config.js
├── quickmap.py
├── README.md
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Key Directories

### `/src`
- **Main application source code**
- `components/` - React UI components
- `lib/` - Browser API clients and utilities
- `pipeline/` - Core text processing pipeline
- `test/e2e/` - End-to-end Playwright tests
- `types/` - TypeScript type definitions
- `utils/` - Helper utilities

### `/tests`
- **Legacy Jest unit tests**
- `drones.test.js` - Drone processing tests
- `output-assembly.test.js` - Output assembly tests
- `preprocessing.test.js` - Text preprocessing tests

### Root Files
- Configuration files (Vite, TypeScript, Tailwind, etc.)
- Build and development setup
- Documentation and utilities

## Test Structure
- **E2E Tests**: `/src/test/e2e/` (Playwright)
- **Unit Tests**: `/tests/` (Jest - legacy)
- **Setup**: `/src/test/setup.ts`
