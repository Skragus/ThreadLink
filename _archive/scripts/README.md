# Scripts Directory

This directory contains utility scripts for development and analysis.

## Scripts

### `quickmap.py`
Multi-language codebase structure mapping tool for LLM context feeding. Supports Python, JavaScript, TypeScript, and React codebases. Enhanced for detecting and displaying codebase messiness.

**Usage:**
```bash
python scripts/quickmap.py
```

### `digestor.py`
Codebase digest generator that creates clean, consolidated text files from source code with configurable filtering options.

**Usage:**
```bash
python scripts/digestor.py [options]
```

**Features:**
- Strips Tailwind classes and comments
- Supports multiple file extensions
- Configurable source directories
- Output file customization
