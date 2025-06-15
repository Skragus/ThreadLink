#!/usr/bin/env python3
"""
QuickMap - Multi-language codebase structure mapping for LLM context feeding.
Enhanced for detecting and displaying codebase messiness.
Supports Python, JavaScript, TypeScript, and React codebases.
"""

import os
import re
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict, Counter
import fnmatch

# ─────── Configuration ──────────────────────────────────────────────────────
BLACKLIST_DIRS = {
    ".git",
    "venv",
    ".venv",
    "__pycache__",
    "node_modules",
    ".idea",
    ".vscode",
    ".pytest_cache",
    ".mypy_cache",
    ".tox",
    "build",
    "dist",
    ".eggs",
    "htmlcov",
    ".coverage",
    "site-packages",
    "env",
    "prompt_runs",
    "runlog",
    "archive",
    ".bolt",
    ".next",
    "coverage",
    ".env",
    "virtualenv",
    "ve",
    ".ve",
    "bower_components",
    ".sass-cache",
    "vendor",
    "cache",
    ".cache",
    "tmp",
    ".tmp",
    "temp",
    ".temp",
    "logs",
    ".logs",
    "target",
    "out",
    ".out",
    ".terraform",
    ".serverless",
    ".webpack",
    ".parcel-cache",
}

BLACKLIST_FILES = {
    "__init__.py",
    "setup.py",
    "conftest.py",
    ".DS_Store",
    "package-lock.json",
    ".gitignore",
    ".env",
    ".env.local",
    ".env.example",
    "Thumbs.db",
    ".babelrc",
    "yarn.lock",
    ".dockerignore",
    "poetry.lock",
    "Pipfile.lock",
}

TEST_PATTERNS = {
    "*test*.py",
    "*_test.py",
    "test_*.py",
    "tests.py",
    "*.test.js",
    "*.test.ts",
    "*.test.tsx",
    "*.spec.js",
    "*.spec.ts",
    "*.spec.tsx",
    "*_spec.rb",
    "*_test.go",
    "*.test.jsx",
}

SUPPORTED_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".html",
    ".css",
    ".json",
    ".md",
    ".yml",
    ".yaml",
    ".xml",
    ".sql",
    ".sh",
    ".ps1",
    ".vue",
    ".svelte",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".cs",
    ".rb",
    ".go",
    ".rs",
    ".php",
    ".swift",
    ".kt",
    ".scala",
    ".r",
    ".m",
    ".mm",
    ".pl",
}

# Messiness indicators
PROBLEMATIC_PATTERNS = {
    "naming": [
        r"^test\d+",
        r"^temp",
        r"^tmp",
        r"^old",
        r"^new",
        r"^copy",
        r"^backup",
        r"^bak",
        r"^\d+",
        r"test$",
        r"temp$",
        r"tmp$",
        r"copy\d*$",
        r"_old$",
        r"_new$",
        r"_backup$",
        r"_bak$",
        r"UNUSED",
        r"DELETE",
        r"TODO",
        r"FIXME",
        r"HACK",
        r"XXX",
    ],
    "duplicates": [
        r"(.+?)(?:_copy|\s*\(\d+\)|_\d+|Copy|copy)(\.\w+)?$",
        r"(.+?)(?:_v\d+|_version\d+|_rev\d+)(\.\w+)?$",
    ],
}

CHARS_PER_TOKEN = 4
ENABLE_PATH_DEBUGGING = False


class MessinessDetector:
    """Detects various forms of messiness in a codebase"""

    def __init__(self):
        self.issues = defaultdict(list)
        self.file_extensions = Counter()
        self.naming_issues = []
        self.potential_duplicates = defaultdict(list)
        self.mixed_languages_dirs = defaultdict(set)
        self.orphan_files = []
        self.deeply_nested = []

    def analyze_path(self, path: Path, root: Path):
        """Analyze a single path for messiness indicators"""
        rel_path = str(path.relative_to(root))

        # Check naming issues
        for pattern in PROBLEMATIC_PATTERNS["naming"]:
            if re.search(pattern, path.stem, re.IGNORECASE):
                self.naming_issues.append((rel_path, pattern))
                break

        # Track file extensions
        if path.is_file():
            self.file_extensions[path.suffix.lower()] += 1

            # Check for potential duplicates
            base_name = path.stem
            for pattern in PROBLEMATIC_PATTERNS["duplicates"]:
                match = re.match(pattern, base_name, re.IGNORECASE)
                if match:
                    original_name = match.group(1) if match.group(1) else base_name
                    self.potential_duplicates[original_name].append(rel_path)
                    break

            # Track mixed languages in directories
            if path.suffix.lower() in SUPPORTED_EXTENSIONS:
                dir_path = path.parent
                self.mixed_languages_dirs[str(dir_path.relative_to(root))].add(
                    self._get_language_type(path.suffix.lower())
                )

        # Check for deeply nested paths (more than 5 levels)
        depth = len(path.relative_to(root).parts)
        if depth > 5:
            self.deeply_nested.append((rel_path, depth))

        # Check for orphan config files in wrong places
        if path.is_file() and path.name in {
            "package.json",
            "requirements.txt",
            "Gemfile",
            "pom.xml",
            "build.gradle",
            "CMakeLists.txt",
            "Makefile",
            "setup.py",
        }:
            # These should typically be at root or in specific directories
            parent_parts = path.parent.relative_to(root).parts
            if len(parent_parts) > 2:  # More than 2 levels deep
                self.orphan_files.append((rel_path, path.name))

    def _get_language_type(self, ext: str) -> str:
        """Map file extension to language type"""
        lang_map = {
            ".py": "Python",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".jsx": "React",
            ".tsx": "React",
            ".java": "Java",
            ".cpp": "C++",
            ".c": "C",
            ".cs": "C#",
            ".rb": "Ruby",
            ".go": "Go",
            ".rs": "Rust",
            ".php": "PHP",
            ".swift": "Swift",
            ".kt": "Kotlin",
            ".scala": "Scala",
            ".html": "HTML",
            ".css": "CSS",
            ".sql": "SQL",
            ".md": "Markdown",
        }
        return lang_map.get(ext, ext)

    def get_summary(self) -> List[str]:
        """Generate a summary of messiness issues"""
        summary = []

        if self.naming_issues:
            summary.append(
                f"⚠️  **Problematic naming**: {len(self.naming_issues)} files/folders"
            )
            summary.append(
                "   Examples: "
                + ", ".join(Path(p).name for p, _ in self.naming_issues[:5])
            )

        if self.potential_duplicates:
            dup_count = sum(
                len(files)
                for files in self.potential_duplicates.values()
                if len(files) > 1
            )
            summary.append(f"🔄 **Potential duplicates**: {dup_count} files")
            for base, files in list(self.potential_duplicates.items())[:3]:
                if len(files) > 1:
                    summary.append(f"   '{base}*': {len(files)} versions")

        mixed_dirs = {
            d: langs for d, langs in self.mixed_languages_dirs.items() if len(langs) > 2
        }
        if mixed_dirs:
            summary.append(
                f"🎭 **Mixed language directories**: {len(mixed_dirs)} folders"
            )
            for dir_name, langs in list(mixed_dirs.items())[:3]:
                summary.append(f"   {dir_name}/: {', '.join(sorted(langs))}")

        if self.deeply_nested:
            summary.append(
                f"📦 **Deeply nested files**: {len(self.deeply_nested)} files (>5 levels)"
            )

        if self.orphan_files:
            summary.append(
                f"🏝️  **Misplaced config files**: {len(self.orphan_files)} files"
            )
            for path, name in self.orphan_files[:3]:
                summary.append(f"   {name} in {Path(path).parent}")

        # File type distribution
        if len(self.file_extensions) > 5:
            summary.append(
                f"📊 **File type sprawl**: {len(self.file_extensions)} different extensions"
            )
            top_exts = self.file_extensions.most_common(8)
            summary.append("   " + ", ".join(f"{ext}({cnt})" for ext, cnt in top_exts))

        return summary


class QuickStats:
    def __init__(self):
        self.files, self.functions, self.classes, self.lines = 0, 0, 0, 0
        self.imports = Counter()
        self.directories_listed = 0
        self.files_listed = 0
        self.directories = set()
        self.language_stats = Counter()  # Added for language tracking
        self.messiness_detector = MessinessDetector()  # Added

    def add_file(self, file_data: Dict, is_target_file: bool, file_ext: str = ""):
        if is_target_file:
            self.files += 1
            self.functions += len(file_data["functions"])
            self.classes += len(file_data["classes"])
            self.lines += file_data["lines"]
            # Track language statistics
            if file_ext:
                lang_map = {
                    ".py": "Python",
                    ".js": "JavaScript",
                    ".ts": "TypeScript",
                    ".tsx": "TypeScript",
                    ".jsx": "React",
                    ".html": "HTML",
                    ".css": "CSS",
                    ".json": "JSON",
                    ".md": "Markdown",
                }
                lang = lang_map.get(file_ext, file_ext[1:] if file_ext else "Unknown")
                self.language_stats[lang] += 1
        for imp in file_data.get("external_imports", []):
            self.imports[imp] += 1

    def estimate_tokens(self, content_length: int) -> int:
        return max(content_length // CHARS_PER_TOKEN, 100)


class QuickParser:
    """Enhanced parser for multiple languages"""

    # Python patterns
    PY_FUNC_PATTERN = re.compile(
        r"^(\s*)(async\s+)?def\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE
    )
    PY_CLASS_PATTERN = re.compile(r"^(\s*)class\s+([A-Za-z_]\w*)", re.MULTILINE)
    PY_IMPORT_PATTERN = re.compile(
        r"^\s*(?:from\s+([A-Za-z_0-9\._]+)\s+)?"
        r"import\s+"
        r"(\*|(?:(?:[A-Za-z_0-9\.]+)(?:\s+as\s+[A-Za-z_0-9]+)?(?:,\s*)?)+|\((?:[\s\S]*?)\))"
        r"(?=\s*(?:#|$))",
        re.MULTILINE,
    )

    # JavaScript/TypeScript patterns
    JS_FUNC_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(",
        re.MULTILINE,
    )
    JS_ARROW_FUNC_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
        re.MULTILINE,
    )
    JS_CONST_FUNC_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function",
        re.MULTILINE,
    )
    JS_CLASS_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)",
        re.MULTILINE,
    )
    JS_REACT_COMPONENT_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?(?:const|let|var|function)\s+([A-Z][A-Za-z0-9_$]*)\s*[:=]",
        re.MULTILINE,
    )
    # TypeScript interface and type patterns
    TS_INTERFACE_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)", re.MULTILINE
    )
    TS_TYPE_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=", re.MULTILINE
    )
    JS_IMPORT_PATTERN = re.compile(
        r"(?:^|\n)\s*import\s+(?:{[^}]+}|[A-Za-z_$][\w$]*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\*\s+as\s+[A-Za-z_$][\w$]*)\s+from\s+['\"]([^'\"]+)['\"]",
        re.MULTILINE,
    )
    JS_REQUIRE_PATTERN = re.compile(
        r"(?:const|let|var)\s+(?:{[^}]+}|[A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",
        re.MULTILINE,
    )

    @staticmethod
    def _extract_names_from_import_str(names_str: str) -> List[str]:
        if not names_str or names_str == "*":
            return []
        if names_str.startswith("(") and names_str.endswith(")"):
            names_str = names_str[1:-1]
        return [
            part.strip().split(" as ")[0]
            for part in names_str.split(",")
            if part.strip()
        ]

    @staticmethod
    def _parse_python(content: str) -> Tuple[List[str], List[str], Set[str]]:
        """Parse Python file content"""
        functions, classes = [], []
        external_imports = set()

        for m in QuickParser.PY_FUNC_PATTERN.finditer(content):
            _, async_kw, name = m.groups()
            functions.append(f"{'async 'if async_kw else''}{name}()")

        for m in QuickParser.PY_CLASS_PATTERN.finditer(content):
            _, name = m.groups()
            classes.append(name)

        for match_obj in QuickParser.PY_IMPORT_PATTERN.finditer(content):
            from_module_str, imported_items_str = match_obj.groups()
            if from_module_str and not from_module_str.startswith("."):
                external_imports.add(from_module_str.split(".")[0])
            elif imported_items_str and imported_items_str != "*":
                names = QuickParser._extract_names_from_import_str(imported_items_str)
                for name in names:
                    if not name.startswith("."):
                        external_imports.add(name.split(".")[0])

        return functions, classes, external_imports

    @staticmethod
    def _parse_javascript(
        content: str, is_typescript: bool = False
    ) -> Tuple[List[str], List[str], Set[str]]:
        """Parse JavaScript/TypeScript file content"""
        functions = []
        classes = []
        interfaces = []  # For TypeScript
        types = []  # For TypeScript
        external_imports = set()
        seen_names = set()

        # Function declarations
        for m in QuickParser.JS_FUNC_PATTERN.finditer(content):
            name = m.group(1)
            if name and name not in seen_names:
                functions.append(f"{name}()")
                seen_names.add(name)

        # Arrow functions
        for m in QuickParser.JS_ARROW_FUNC_PATTERN.finditer(content):
            name = m.group(1)
            if name and name not in seen_names:
                functions.append(f"{name}()")
                seen_names.add(name)

        # Function expressions
        for m in QuickParser.JS_CONST_FUNC_PATTERN.finditer(content):
            name = m.group(1)
            if name and name not in seen_names:
                functions.append(f"{name}()")
                seen_names.add(name)

        # Classes
        for m in QuickParser.JS_CLASS_PATTERN.finditer(content):
            name = m.group(1)
            if name:
                classes.append(name)
                seen_names.add(name)

        # TypeScript interfaces and types
        if is_typescript:
            for m in QuickParser.TS_INTERFACE_PATTERN.finditer(content):
                name = m.group(1)
                if name:
                    interfaces.append(name)

            for m in QuickParser.TS_TYPE_PATTERN.finditer(content):
                name = m.group(1)
                if name:
                    types.append(name)

        # React components (PascalCase functions/consts)
        for m in QuickParser.JS_REACT_COMPONENT_PATTERN.finditer(content):
            name = m.group(1)
            if name and name not in seen_names and name not in [c for c in classes]:
                # It's a component if it's PascalCase and not already counted
                functions.append(f"{name}()")
                seen_names.add(name)

        # ES6 imports
        for m in QuickParser.JS_IMPORT_PATTERN.finditer(content):
            module = m.group(1)
            if module and not module.startswith("."):
                # Extract package name from path
                parts = module.split("/")
                if parts[0].startswith("@"):  # Scoped package
                    external_imports.add(
                        f"{parts[0]}/{parts[1] if len(parts) > 1 else ''}"
                    )
                else:
                    external_imports.add(parts[0])

        # CommonJS requires
        for m in QuickParser.JS_REQUIRE_PATTERN.finditer(content):
            module = m.group(1)
            if module and not module.startswith("."):
                parts = module.split("/")
                if parts[0].startswith("@"):
                    external_imports.add(
                        f"{parts[0]}/{parts[1] if len(parts) > 1 else ''}"
                    )
                else:
                    external_imports.add(parts[0])

        # Combine interfaces and types with classes for TypeScript
        if is_typescript and (interfaces or types):
            all_types = (
                classes
                + [f"interface {i}" for i in interfaces]
                + [f"type {t}" for t in types]
            )
            return sorted(list(set(functions))), sorted(all_types), external_imports

        return sorted(list(set(functions))), sorted(classes), external_imports

    @staticmethod
    def parse_file(filepath: Path) -> Dict:
        if ENABLE_PATH_DEBUGGING:
            print(f"[DEBUG Parser] Parsing: {filepath}")

        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            return {
                "functions": [],
                "classes": [],
                "external_imports": [],
                "internal_import_specs": [],
                "lines": 0,
                "error": True,
            }

        lines_list = content.splitlines()
        functions, classes, external_imports = [], [], set()
        internal_import_specs = []

        try:
            # Determine file type and parse accordingly
            ext = filepath.suffix.lower()
            if ext == ".py":
                functions, classes, external_imports = QuickParser._parse_python(
                    content
                )
                # Also extract internal import specs for Python dependency tracking
                for match_obj in QuickParser.PY_IMPORT_PATTERN.finditer(content):
                    from_module_str, imported_items_str = match_obj.groups()
                    imported_names = QuickParser._extract_names_from_import_str(
                        imported_items_str
                    )

                    if from_module_str:
                        from_module_str = from_module_str.strip()
                        internal_import_specs.append(
                            {
                                "type": "from",
                                "module": from_module_str,
                                "names": imported_names,
                            }
                        )
                    elif imported_items_str and imported_items_str != "*":
                        for name in imported_names:
                            internal_import_specs.append(
                                {"type": "direct", "module": name}
                            )

            elif ext in {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}:
                is_typescript = ext in {".ts", ".tsx"}
                functions, classes, external_imports = QuickParser._parse_javascript(
                    content, is_typescript
                )

        except Exception as e:
            if ENABLE_PATH_DEBUGGING:
                print(f"[DEBUG Parser] Parsing error in {filepath}: {e}")

        return {
            "functions": functions,
            "classes": classes,
            "external_imports": sorted(list(external_imports)),
            "internal_import_specs": internal_import_specs,
            "lines": len(lines_list),
            "error": False,
        }


class QuickMapper:
    def __init__(
        self,
        targets: List[str],
        include_tests: bool = False,
        folders_only: bool = False,
        show_messiness: bool = True,
    ):
        self.raw_targets = [str(Path(t)) for t in targets]
        self.target_paths_from_cli = (
            [Path(t).resolve() for t in targets] if targets else [Path.cwd().resolve()]
        )
        self.include_tests = include_tests
        self.folders_only = folders_only
        self.show_messiness = show_messiness  # New flag
        self.stats = QuickStats()
        self.file_data: Dict[str, Dict] = {}
        self.start_time = time.time()
        self.project_root = Path.cwd().resolve()

        # For Python-specific analysis
        self.all_project_py_files_abs: Set[Path] = set()
        self.all_project_source_files_abs: Set[Path] = set()  # All source files
        self.abs_path_to_rel_key_map: Dict[Path, str] = {}
        self.module_str_to_rel_key_map: Dict[str, str] = {}
        self.used_by_map: Dict[str, Set[str]] = defaultdict(set)
        self.target_files_for_output_abs: Set[Path] = set()

    def is_blacklisted(self, path_obj: Path, is_dir: bool) -> bool:
        path_parts_str = {part for part in path_obj.parts}
        if path_parts_str & BLACKLIST_DIRS:
            return True

        if not is_dir:
            if path_obj.name in BLACKLIST_FILES:
                return True
            if not self.include_tests:
                for pattern in TEST_PATTERNS:
                    if fnmatch.fnmatch(path_obj.name, pattern):
                        return True
        return False

    def _scan_entire_project_for_source_files(self):
        """Enhanced to scan all source files and detect messiness"""
        if ENABLE_PATH_DEBUGGING:
            print(f"[DEBUG QM._scan] Scanning project root: {self.project_root}")

        for file_path in self.project_root.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                if not self.is_blacklisted(file_path, is_dir=False):
                    self.all_project_source_files_abs.add(file_path.resolve())
                    if file_path.suffix.lower() == ".py":
                        self.all_project_py_files_abs.add(file_path.resolve())

                    # Analyze messiness
                    if self.show_messiness:
                        self.stats.messiness_detector.analyze_path(
                            file_path, self.project_root
                        )
            elif file_path.is_dir() and self.show_messiness:
                self.stats.messiness_detector.analyze_path(file_path, self.project_root)

    def _identify_target_files_for_output(self):
        target_paths_to_consider = self.target_paths_from_cli
        if not self.raw_targets:
            target_paths_to_consider = [self.project_root]

        for cli_target_path in target_paths_to_consider:
            cli_target_path_resolved = cli_target_path.resolve()
            if cli_target_path_resolved.is_file():
                if cli_target_path_resolved in self.all_project_source_files_abs:
                    self.target_files_for_output_abs.add(cli_target_path_resolved)
            elif cli_target_path_resolved.is_dir():
                for proj_file_abs in self.all_project_source_files_abs:
                    try:
                        proj_file_abs.relative_to(cli_target_path_resolved)
                        self.target_files_for_output_abs.add(proj_file_abs)
                    except ValueError:
                        continue

    def get_relative_path(self, filepath: Path) -> str:
        try:
            return str(filepath.relative_to(self.project_root))
        except ValueError:
            return filepath.name

    def _build_internal_resolution_maps(self):
        """Build maps for Python import resolution"""
        for abs_path in self.all_project_py_files_abs:
            rel_key = self.get_relative_path(abs_path)
            self.abs_path_to_rel_key_map[abs_path] = rel_key
            try:
                path_for_module_str = abs_path.relative_to(self.project_root)
                module_style_parts = list(path_for_module_str.parts)
                if module_style_parts[-1] == "__init__.py":
                    module_style_parts.pop()
                elif module_style_parts[-1].endswith(".py"):
                    module_style_parts[-1] = module_style_parts[-1][:-3]
                if module_style_parts:
                    self.module_str_to_rel_key_map[".".join(module_style_parts)] = (
                        rel_key
                    )
            except ValueError:
                pass

    def _resolve_internal_import(
        self, spec: Dict, importing_file_abs_path: Path
    ) -> Optional[str]:
        """Resolve Python imports (unchanged from original)"""
        module_to_resolve_from_spec = spec["module"]

        if module_to_resolve_from_spec.startswith("."):
            # Handle relative imports
            level = 0
            temp_mod_str = module_to_resolve_from_spec
            while temp_mod_str.startswith("."):
                level += 1
                temp_mod_str = temp_mod_str[1:]
            module_path_after_dots = temp_mod_str
            base_dir = importing_file_abs_path.parent
            for _ in range(level - 1):
                base_dir = base_dir.parent

            candidate_abs_path_base = base_dir
            if module_path_after_dots:
                candidate_abs_path_base = base_dir / Path(
                    *module_path_after_dots.split(".")
                )

            resolved_abs_path = None
            py_file = candidate_abs_path_base.with_suffix(".py")
            init_py_file = candidate_abs_path_base / "__init__.py"

            if py_file in self.all_project_py_files_abs:
                resolved_abs_path = py_file
            elif init_py_file in self.all_project_py_files_abs:
                resolved_abs_path = init_py_file

            if resolved_abs_path:
                return self.abs_path_to_rel_key_map.get(resolved_abs_path)
        else:
            # Handle absolute imports
            if module_to_resolve_from_spec in self.module_str_to_rel_key_map:
                return self.module_str_to_rel_key_map[module_to_resolve_from_spec]

        return None

    def _build_used_by_map(self):
        for importer_rel_key, data in self.file_data.items():
            for imported_rel_key in data.get("resolved_internal_dependencies", []):
                self.used_by_map[imported_rel_key].add(importer_rel_key)

    def analyze_full(self) -> str:
        """Full analysis with messiness detection"""
        self._scan_entire_project_for_source_files()

        if not self.all_project_source_files_abs:
            return "# 🗺️ No source files found in project root!\n"

        self._identify_target_files_for_output()
        if not self.target_files_for_output_abs and self.raw_targets:
            return "# 🗺️ No target source files found for specified paths!\n"

        self._build_internal_resolution_maps()

        # Parse ALL source files that we can parse (not just Python)
        parseable_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}

        for abs_filepath in self.all_project_source_files_abs:
            rel_key = self.get_relative_path(abs_filepath)

            # Parse files we support parsing
            if abs_filepath.suffix.lower() in parseable_extensions:
                parsed_data = QuickParser.parse_file(
                    abs_filepath
                )  # Only do Python import resolution for Python files
                if abs_filepath.suffix.lower() == ".py":
                    resolved_deps = set()
                    for spec in parsed_data.get("internal_import_specs", []):
                        resolved_rel_key = self._resolve_internal_import(
                            spec, abs_filepath
                        )
                        if resolved_rel_key and resolved_rel_key != rel_key:
                            resolved_deps.add(resolved_rel_key)
                    parsed_data["resolved_internal_dependencies"] = sorted(
                        list(resolved_deps)
                    )
                else:
                    parsed_data["resolved_internal_dependencies"] = []

                self.file_data[rel_key] = parsed_data

                is_target = abs_filepath in self.target_files_for_output_abs
                self.stats.add_file(
                    parsed_data,
                    is_target_file=is_target,
                )

                if is_target:
                    path_obj_rel = Path(rel_key)
                    dir_group_key = (
                        str(path_obj_rel.parent)
                        if path_obj_rel.parent != Path(".")
                        else "(root)"
                    )
                    self.stats.directories.add(dir_group_key)

        self._build_used_by_map()

        # Group all target files
        grouped_target_files = self.group_by_directory(
            list(self.target_files_for_output_abs)
        )

        return self.format_output_full(grouped_target_files)

    def group_by_directory(
        self, files_abs_paths_to_group: List[Path]
    ) -> Dict[str, List[Path]]:
        groups = defaultdict(list)
        for abs_filepath in files_abs_paths_to_group:
            rel_path_str = self.get_relative_path(abs_filepath)
            path_obj_rel = Path(rel_path_str)
            dir_group_key = (
                str(path_obj_rel.parent)
                if path_obj_rel.parent != Path(".")
                else "(root)"
            )
            groups[dir_group_key].append(abs_filepath)

        sorted_keys = sorted(groups.keys(), key=lambda k: (k == "(root)", k.lower()))
        return {
            key: sorted(groups[key], key=lambda p: p.name.lower())
            for key in sorted_keys
        }

    def format_output_full(
        self, grouped_files_to_output_abs: Dict[str, List[Path]]
    ) -> str:
        elapsed = time.time() - self.start_time
        lines = []

        # Title
        if self.raw_targets:
            title_target_name = (
                (
                    self.raw_targets[0]
                    + (
                        "/"
                        if Path(self.raw_targets[0]).resolve().is_dir()
                        and not self.raw_targets[0].endswith(("/", "\\"))
                        else ""
                    )
                )
                if len(self.raw_targets) == 1
                else f"Multiple targets ({len(self.raw_targets)})"
            )
        else:
            title_target_name = self.project_root.name + "/"

        # Count parsed files
        parsed_count = len(
            [
                f
                for f in self.target_files_for_output_abs
                if self.get_relative_path(f) in self.file_data
            ]
        )

        lines.append(
            f"# 🗺️ QuickMap: {title_target_name} ({parsed_count} files detailed)\n"
        )

        # Messiness Report (NEW)
        if self.show_messiness:
            messiness_summary = self.stats.messiness_detector.get_summary()
            if messiness_summary:
                lines.extend(
                    [
                        "## 🧹 Messiness Report",
                        "*Issues detected that may benefit from refactoring:*\n",
                    ]
                )
                lines.extend(messiness_summary)
                lines.append("")

        # Quick Stats
        stats_lines = [
            "## ⚡ Quick Stats",
            f"- **Files analyzed**: {len(self.all_project_source_files_abs)} total, {parsed_count} parsed for details",
            f"- **Functions found**: {self.stats.functions}",
            f"- **Classes found**: {self.stats.classes}",
            f"- **Total lines**: {self.stats.lines:,}",
        ]

        # Add language breakdown if multiple languages
        if len(self.stats.language_stats) > 0:
            lang_str = ", ".join(
                [
                    f"{lang}: {count}"
                    for lang, count in self.stats.language_stats.most_common()
                ]
            )
            stats_lines.append(f"- **Languages**: {lang_str}")

        stats_lines.extend(
            [
                f"- **Analysis time**: {elapsed:.3f}s",
                "",
            ]
        )
        lines.extend(stats_lines)

        # Dependencies
        if self.stats.imports:
            lines.append(
                f"**Key dependencies**: {', '.join([f'{pkg}({count})' for pkg, count in self.stats.imports.most_common(8)])}\n"
            )

        # Directory Overview
        meaningful_groups = {k: v for k, v in grouped_files_to_output_abs.items() if v}

        if len(meaningful_groups) > 1:
            lines.append("## 📁 Directory Overview")
            for dir_key in sorted(
                meaningful_groups.keys(), key=lambda k: (k == "(root)", k.lower())
            ):
                files_abs = meaningful_groups[dir_key]

                # Count parsed vs unparsed files
                parsed_files = [
                    f for f in files_abs if self.get_relative_path(f) in self.file_data
                ]

                fc = len(files_abs)
                func_c = cls_c = 0

                for abs_p in parsed_files:
                    rel_k = self.get_relative_path(abs_p)
                    if rel_k in self.file_data and not self.file_data[rel_k].get(
                        "error"
                    ):
                        fd = self.file_data[rel_k]
                        func_c += len(fd["functions"])
                        cls_c += len(fd["classes"])

                dir_str = f"**{dir_key + '/' if dir_key != '(root)' else dir_key}**: "
                dir_str += f"{fc} files"
                if parsed_files:
                    dir_str += f" ({len(parsed_files)} parsed)"
                if func_c or cls_c:
                    dir_str += f", {func_c} functions, {cls_c} classes"

                lines.append(dir_str)
            lines.append("")

        # Code Inventory
        lines.append("## 🔍 Code Inventory")

        for dir_key, files_in_group_abs_paths in grouped_files_to_output_abs.items():
            if not files_in_group_abs_paths:
                continue

            header = (
                (
                    f"\n### 📄 Files in (root)"
                    if len(grouped_files_to_output_abs) > 1
                    else ""
                )
                if dir_key == "(root)"
                else f"\n### 📁 {dir_key}/"
            )
            if header:
                lines.append(header)

            for abs_filepath in files_in_group_abs_paths:
                rel_key = self.get_relative_path(abs_filepath)

                # Check if we have parsed data for this file
                if rel_key in self.file_data:
                    data = self.file_data[rel_key]

                    if data.get("error"):
                        lines.append(f"- **{abs_filepath.name}**: ⚠️ Parse error")
                        continue

                    parts = []
                    if data["classes"]:
                        parts.append(f"classes: {', '.join(data['classes'])}")
                    if data["functions"]:
                        # Show all functions - use multiple lines if many
                        if len(data["functions"]) > 10:
                            # For many functions, show count in summary
                            parts.append(f"functions: {len(data['functions'])} total")
                            summary = " | ".join(parts) if parts else "(no functions)"

                            # Add file type indicator
                            file_type = ""
                            ext = abs_filepath.suffix.lower()
                            if ext in {".ts", ".tsx"}:
                                file_type = " [TypeScript]"
                            elif ext in {".js", ".jsx", ".mjs", ".cjs"}:
                                file_type = " [JavaScript]"

                            lines.append(
                                f"- **{abs_filepath.name}**{file_type}: {summary} ({data['lines']} lines)"
                            )

                            # List all functions on separate lines
                            func_list = ", ".join(data["functions"])
                            lines.append(f"      Functions: {func_list}")

                            # Skip the normal summary line since we already added it
                            continue
                        else:
                            # For fewer functions, show inline as before
                            parts.append(f"functions: {', '.join(data['functions'])}")

                    summary = (
                        " | ".join(parts) if parts else "(no classes or functions)"
                    )

                    summary = (
                        " | ".join(parts) if parts else "(no classes or functions)"
                    )

                    # Add file type indicator for non-Python files
                    file_type = ""
                    ext = abs_filepath.suffix.lower()
                    if ext in {".ts", ".tsx"}:
                        file_type = " [TypeScript]"
                    elif ext in {".js", ".jsx", ".mjs", ".cjs"}:
                        file_type = " [JavaScript]"

                    lines.append(
                        f"- **{abs_filepath.name}**{file_type}: {summary} ({data['lines']} lines)"
                    )

                    # Show dependencies for JS/TS files
                    if ext not in {".py"} and data.get("external_imports"):
                        deps = data["external_imports"]
                        if len(deps) > 5:
                            deps_display = (
                                ", ".join(deps[:5]) + f", ... ({len(deps)-5} more)"
                            )
                        else:
                            deps_display = ", ".join(deps)
                        lines.append(f"      Imports: {deps_display}")

                    # Show who uses this Python file
                    if ext == ".py":
                        importers_rel_keys = self.used_by_map.get(rel_key, set())
                        if importers_rel_keys:
                            importer_names = sorted(
                                [Path(k).name for k in importers_rel_keys]
                            )
                            lines.append(f"      Used by: {', '.join(importer_names)}")
                else:
                    # File not parsed - just show basic info
                    lines.append(
                        f"- **{abs_filepath.name}**: {abs_filepath.suffix.lower()[1:]} file"
                    )

        content_text = "\n".join(lines)
        lines.append(
            f"\n---\n*QuickMap analysis generated in {elapsed:.3f}s | ~{self.stats.estimate_tokens(len(content_text)):,} tokens*"
        )

        return "\n".join(lines)

    def _build_folder_tree_recursive(
        self,
        current_path: Path,
        prefix: str = "",
        tree_lines: Optional[List[str]] = None,
        show_files: bool = True,
    ) -> List[str]:
        """Enhanced folder tree with messiness indicators"""
        if tree_lines is None:
            tree_lines = []

        try:
            entries = sorted(
                [
                    e
                    for e in current_path.iterdir()
                    if not self.is_blacklisted(e, e.is_dir())
                ],
                key=lambda p: (not p.is_dir(), p.name.lower()),
            )
        except Exception:
            tree_lines.append(f"{prefix}⚠️ [error reading {current_path.name}]")
            return tree_lines

        for i, entry_path in enumerate(entries):
            is_last = i == len(entries) - 1
            branch = "└── " if is_last else "├── "
            sub_prefix = "    " if is_last else "│   "

            # Add messiness indicators
            indicators = []
            rel_path = self.get_relative_path(entry_path)

            if self.show_messiness:
                # Check naming issues
                for pattern in PROBLEMATIC_PATTERNS["naming"]:
                    if re.search(pattern, entry_path.stem, re.IGNORECASE):
                        indicators.append("⚠️")
                        break

                # Check if it looks like a duplicate
                for pattern in PROBLEMATIC_PATTERNS["duplicates"]:
                    if re.match(pattern, entry_path.stem, re.IGNORECASE):
                        indicators.append("🔄")
                        break

            indicator_str = " ".join(indicators) + " " if indicators else ""

            if entry_path.is_dir():
                tree_lines.append(f"{prefix}{branch}{indicator_str}{entry_path.name}/")
                self.stats.directories_listed += 1
                self._build_folder_tree_recursive(
                    entry_path, prefix + sub_prefix, tree_lines, show_files
                )
            elif show_files and entry_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                tree_lines.append(f"{prefix}{branch}{indicator_str}{entry_path.name}")
                self.stats.files_listed += 1

        return tree_lines

    def analyze_folders(self) -> str:
        """Folder-only analysis with messiness indicators"""
        if self.show_messiness:
            # Still scan for messiness detection
            self._scan_entire_project_for_source_files()

        tree_lines: List[str] = []
        roots_to_scan = (
            self.target_paths_from_cli if self.raw_targets else [self.project_root]
        )

        for root_path in roots_to_scan:
            resolved_root = root_path.resolve()
            if not resolved_root.is_dir():
                if resolved_root.is_file():
                    resolved_root = resolved_root.parent
                else:
                    tree_lines.append(f"⚠️ Target not found: {resolved_root.name}")
                    continue

            display_root_name = self.get_relative_path(resolved_root)
            if display_root_name == ".":
                display_root_name = self.project_root.name

            tree_lines.append(f"{display_root_name}/")
            self.stats.directories_listed += 1
            self._build_folder_tree_recursive(
                resolved_root, tree_lines=tree_lines, show_files=True
            )
            tree_lines.append("")

        return self.format_output_folders(tree_lines)

    def format_output_folders(self, tree_lines: List[str]) -> str:
        elapsed = time.time() - self.start_time
        output = ["# 🌳 Folder Structure\n"]

        if self.raw_targets:
            output.append(f"Targets: {', '.join(self.raw_targets)}\n")
        else:
            output.append(f"Target: {self.project_root.name}/\n")

        # Add messiness summary if enabled
        if self.show_messiness:
            messiness_summary = self.stats.messiness_detector.get_summary()
            if messiness_summary:
                output.extend(
                    [
                        "## 🧹 Messiness Indicators",
                        "*Legend: ⚠️=naming issue, 🔄=potential duplicate*\n",
                    ]
                )
                output.extend(messiness_summary[:3])  # Just top 3 issues
                output.append("")

        output.extend(tree_lines)
        output.append(
            f"\n---\n*QuickMap folder tree generated in {elapsed:.3f}s. "
            f"Listed {self.stats.directories_listed} directories, {self.stats.files_listed} files.*"
        )

        return "\n".join(output)

    def analyze(self) -> str:
        """Main entry point"""
        if self.folders_only:
            return self.analyze_folders()
        else:
            return self.analyze_full()


def main():
    print(f"--- RUNNING QuickMap (v3.0_multilang) ---", file=sys.stderr)

    parser = argparse.ArgumentParser(
        description="QuickMap - Multi-language codebase mapping with messiness detection",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "targets", nargs="*", help="Files/dirs to map (default: current dir)"
    )
    parser.add_argument("--tests", action="store_true", help="Include test files")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--stdout", action="store_true", help="Output to stdout")
    parser.add_argument(
        "--quiet", "-q", action="store_true", help="Suppress final message"
    )
    parser.add_argument(
        "-f",
        "--folders-only",
        action="store_true",
        help="Output only the folder structure tree",
    )
    parser.add_argument(
        "--no-messiness", action="store_true", help="Disable messiness detection"
    )

    args = parser.parse_args()

    # Validate targets exist
    for t_str in args.targets:
        if not Path(t_str).exists():
            print(f"❌ Error: Target '{t_str}' not found.", file=sys.stderr)
            sys.exit(1)

    start_tm = time.time()
    mapper = QuickMapper(
        args.targets,
        args.tests,
        args.folders_only,
        show_messiness=not args.no_messiness,
    )

    try:
        result = mapper.analyze()

        if args.stdout:
            print(result)
            if not args.quiet:
                print(
                    f"✅ QM complete. Output to stdout. ({time.time()-start_tm:.2f}s)",
                    file=sys.stderr,
                )
        elif args.output:
            out_p = Path(args.output)
            try:
                out_p.parent.mkdir(parents=True, exist_ok=True)
                out_p.write_text(result, encoding="utf-8")
                if not args.quiet:
                    print(
                        f"✅ QM complete! Output to {out_p.resolve()} ({time.time()-start_tm:.2f}s)",
                        file=sys.stderr,
                    )
            except Exception as e:
                print(f"❌ Error writing to '{out_p.resolve()}': {e}", file=sys.stderr)
                sys.exit(1)
        else:
            # Default file output
            script_location = Path(__file__).resolve()
            output_dir = script_location.parent

            if (
                script_location.parent.name == "tools"
                and script_location.parent.parent == mapper.project_root
            ):
                output_dir = mapper.project_root

            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename_prefix = (
                "quickmap_foldertree_" if args.folders_only else "quickmap_output_"
            )
            default_out_p = output_dir / f"{filename_prefix}{ts}.md"

            output_dir.mkdir(parents=True, exist_ok=True)
            default_out_p.write_text(result, encoding="utf-8")

            if not args.quiet:
                print(
                    f"✅ QM complete! Output to {default_out_p.resolve()} ({time.time()-start_tm:.2f}s)",
                    file=sys.stderr,
                )

    except KeyboardInterrupt:
        print("\n⚠️ Analysis interrupted.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
