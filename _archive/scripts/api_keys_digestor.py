import os
import re
from datetime import datetime

# API key related file patterns
api_key_files = [
    "../src/components/APIKeysModal.tsx",
    "../src/lib/storage.js",
    "../src/lib/client-api.js",
    "../src/ThreadLink.tsx",
    "../src/utils/textProcessing.ts",
    "../src/pipeline/orchestrator.js",
]


def clean_file_content(content, file_path):
    """Clean JS/TS content"""
    # Strip multi-line comments
    content = re.sub(r"\/\*[\s\S]*?\*\/", "", content)
    # Strip single-line comments
    content = re.sub(r"\s*\/\/[^\n]*", "", content)
    # Strip imports
    content = re.sub(
        r"^import[\s\S]*?from\s+['\"].*?['\"];?\s*$", "", content, flags=re.MULTILINE
    )
    content = re.sub(r"^import\s+['\"].*?['\"];?\s*$", "", content, flags=re.MULTILINE)
    # Strip exports
    content = re.sub(
        r"^export\s*\{[\s\S]*?\}\s*from\s*['\"].*?['\"];?\s*$",
        "",
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"^export\s*\{[\s\S]*?\}\s*;?\s*$", "", content, flags=re.MULTILINE
    )
    content = re.sub(r"^export\s+default\s+", "", content, flags=re.MULTILINE)
    content = re.sub(
        r"^export\s+(?=const|function|class)", "", content, flags=re.MULTILINE
    )
    # Clean empty lines
    content = re.sub(r"\n\s*\n", "\n", content)
    return content.strip()


all_content = []
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

for file_path in api_key_files:
    if os.path.exists(file_path):
        print(f"Processing: {file_path}")
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                source_code = f.read()

            cleaned_code = clean_file_content(source_code, file_path)

            if cleaned_code:
                header = f'// FILE: {file_path.replace(os.sep, "/")}'
                all_content.append(header + "\n" + cleaned_code)
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

output_file = f"quickmap_api_keys_{timestamp}.md"
with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n\n" + "=" * 80 + "\n\n".join(all_content))

print(f"API Keys digest created: {output_file}")
