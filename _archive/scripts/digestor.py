import os
import re
import argparse

# --- Default Configuration ---
DEFAULT_SOURCE_DIR = "./src"
DEFAULT_OUTPUT_FILE = "codebase_digest.txt"
DEFAULT_EXTENSIONS = ".tsx,.jsx,.js,.py"

# --- Global Toggles (controlled by argparse) ---
STRIP_TAILWIND = True
STRIP_ALL_COMMENTS = False  # If True, strips single-line comments too.

# --- Language-Specific Cleaning Functions ---


def clean_js_family_content(content: str, extension: str) -> str:
    """Cleans TSX, JSX, or JS file content."""
    # 1. Strip multi-line block comments (/* ... */) by default.
    content = re.sub(r"\/\*[\s\S]*?\*\/", "", content)

    # 2. If --strip-comments is used, also strip single-line comments (//...)
    if STRIP_ALL_COMMENTS:
        content = re.sub(r"\s*\/\/[^\n]*", "", content)

    # 3. Strip import/require statements
    content = re.sub(
        r"^import[\s\S]*?from\s+[\'\"].*?[\'\"];?\s*$", "", content, flags=re.MULTILINE
    )
    content = re.sub(
        r"^import\s+[\'\"].*?[\'\"];?\s*$", "", content, flags=re.MULTILINE
    )
    content = re.sub(
        r"^\s*const\s+\{?[\w\s,]+\}?\s*=\s*require\(.*?\);?\s*$",
        "",
        content,
        flags=re.MULTILINE,
    )

    # 4. Strip type/interface declarations (for TSX)
    if extension == ".tsx":
        content = re.sub(
            r"^(?:export\s+)?(?:type|interface)\s+\w+[\s\S]*?(\};?|\n;)\s*$",
            "",
            content,
            flags=re.MULTILINE,
        )

    # 5. Strip export statements
    content = re.sub(
        r"^export\s*\{[\s\S]*?\}\s*from\s*[\'\"].*?[\'\"];?\s*$",
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
    content = re.sub(
        r"^module\.exports\s*=\s*.*?;?\s*$", "", content, flags=re.MULTILINE
    )

    # 6. (Optional) Strip Tailwind CSS class names for JSX/TSX
    if STRIP_TAILWIND and extension in (".tsx", ".jsx"):
        content = re.sub(r'\s+className\s*=\s*(?:"[^"]*"|\{[^}]*\})', "", content)

    return content


def clean_python_content(content: str) -> str:
    """Cleans Python file content."""
    # 1. Strip docstrings ("""...""" or ''''...'') by default.
    content = re.sub(r"(\"\"\"[\s\S]*?\"\"\"|\'\'\'[\s\S]*?\'\'\')", "", content)

    # 2. If --strip-comments is used, also strip single-line comments (#...)
    if STRIP_ALL_COMMENTS:
        content = re.sub(r"\s*#[^\n]*", "", content)

    # 3. Strip import statements
    content = re.sub(r"^import\s+[\w\s,.]+\s*$", "", content, flags=re.MULTILINE)
    content = re.sub(
        r"^from\s+[\w.]+\s+import\s+[\w\s,()*]+\s*$", "", content, flags=re.MULTILINE
    )

    # 4. Strip the common `if __name__ == '__main__':` block
    content = re.sub(
        r'\nif\s+__name__\s*==\s*["\']__main__["\']:\s*[\s\S]*', "", content
    )

    return content


# --- Main Processing Logic ---


def clean_file_content(content: str, file_path: str) -> str:
    """Dispatcher function to select the correct cleaner based on file extension."""
    _, extension = os.path.splitext(file_path)

    if extension in (".tsx", ".jsx", ".js"):
        cleaned_content = clean_js_family_content(content, extension)
    elif extension == ".py":
        cleaned_content = clean_python_content(content)
    else:
        cleaned_content = content

    # Generic cleaning: Strip multiple empty lines into one
    cleaned_content = re.sub(r"\n\s*\n", "\n", cleaned_content)
    return cleaned_content.strip()


def process_repository(source_dir: str, output_file: str, extensions: tuple):
    """Walks a directory, processes all supported files, and writes to a single digest file."""
    print(f"Starting processing of files in: {source_dir}")
    print(f"Targeting extensions: {', '.join(extensions)}")

    all_cleaned_content = []
    real_source_dir = os.path.realpath(source_dir)

    file_paths_to_process = []
    for root, _, files in os.walk(real_source_dir):
        for file in files:
            if file.endswith(extensions):
                file_paths_to_process.append(os.path.join(root, file))

    if not file_paths_to_process:
        print("No supported files found. The output file will not be created.")
        return

    for file_path in sorted(file_paths_to_process):
        relative_path = os.path.relpath(file_path, os.path.dirname(real_source_dir))

        print(f"  -> Processing: {relative_path}")
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                source_code = f.read()

            cleaned_code = clean_file_content(source_code, file_path)

            if cleaned_code:
                header = f"// FILE: {relative_path.replace(os.sep, '/')}"
                all_cleaned_content.append(header + "\n" + cleaned_code)

        except Exception as e:
            print(f"    [!] Error processing {file_path}: {e}")

    print(f"\nCombining {len(all_cleaned_content)} processed files into: {output_file}")
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n\n" + "=" * 80 + "\n\n".join(all_cleaned_content))

    print("\n✅ Done! Your codebase digest is ready.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pre-process a codebase into a single text digest for LLM ingestion.",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE_DIR,
        help=f"The source directory containing your code files.\n(default: {DEFAULT_SOURCE_DIR})",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_FILE,
        help=f"The name of the single output text file.\n(default: {DEFAULT_OUTPUT_FILE})",
    )
    parser.add_argument(
        "--extensions",
        default=DEFAULT_EXTENSIONS,
        help=f"Comma-separated list of file extensions to process.\n(default: {DEFAULT_EXTENSIONS})",
    )
    parser.add_argument(
        "--strip-comments",
        action="store_true",
        help="If set, removes ALL comments, including single-line ones (`//` and `#`).\nBy default, only block comments and docstrings are removed.",
    )
    parser.add_argument(
        "--no-tailwind",
        action="store_true",
        help="If set, Tailwind class names will NOT be stripped from JSX/TSX files.",
    )

    args = parser.parse_args()

    if args.no_tailwind:
        STRIP_TAILWIND = False
    if args.strip_comments:
        STRIP_ALL_COMMENTS = True

    # Parse the extensions string into a tuple
    extensions_to_process = tuple(
        [ext.strip() for ext in args.extensions.split(",") if ext.strip()]
    )

    process_repository(args.source, args.output, extensions_to_process)
