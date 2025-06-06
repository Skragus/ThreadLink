#!/usr/bin/env python3
"""
Script to read markdown content, split into paragraphs, number them, and write to output.

Paragraph splitting rules:
- Paragraphs are generally separated by one or more blank lines
- Exception 1: Indented lines (starting with spaces/tabs) after blank lines 
  are considered continuations of the previous paragraph
- Exception 2: Lines ending with colons keep following non-blank lines 
  (even after single blank lines) as part of the same paragraph

Post-processing rules:
- Code language labels (like "python", "javascript") are merged with following code blocks
- Split numbered/bulleted lists are merged back together
- Consecutive code blocks that were split by blank lines are merged together
- Console/terminal output sections are merged together
- Short UI elements or timestamps (like "5s", "Retry") are merged with previous paragraphs
"""

import os
import sys
import re


def read_input_file(filename):
    """Read content from the input file."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found in the current directory.")
        sys.exit(1)
    except IOError as e:
        print(f"Error reading file '{filename}': {e}")
        sys.exit(1)


def split_into_paragraphs(content):
    """Split content into paragraphs based on blank lines, with special handling for indented lines and colons."""
    # First, normalize line endings to \n
    content = content.replace('\r\n', '\n').replace('\r', '\n')
    
    # Common programming language keywords
    code_languages = {
        'javascript', 'python', 'java', 'typescript', 'html', 'css', 'json', 
        'yaml', 'sql', 'code', 'jsx', 'tsx', 'php', 'ruby', 'go', 'rust',
        'c', 'cpp', 'c++', 'csharp', 'c#', 'bash', 'shell', 'sh', 'xml',
        'markdown', 'md', 'swift', 'kotlin', 'r', 'scala', 'perl'
    }
    
    # Split into lines
    lines = content.split('\n')
    paragraphs = []
    current_paragraph = []
    in_blank_lines = False
    pending_colon = False  # Track if we have a paragraph ending with colon waiting to be extended
    blank_line_buffer = []
    
    for i, line in enumerate(lines):
        # Check if line is blank (empty or only whitespace)
        if line.strip() == '':
            in_blank_lines = True
            blank_line_buffer.append(line)
            
            # If we have content and we're entering blank lines, check for colon
            if current_paragraph:
                # Check if current paragraph ends with colon
                for p_line in reversed(current_paragraph):
                    if p_line.strip():
                        if p_line.rstrip().endswith(':'):
                            pending_colon = True
                        else:
                            pending_colon = False
                        break
        else:
            # Non-blank line
            # Check if we should continue the previous paragraph
            should_continue_previous = False
            
            # Check conditions for continuation
            if in_blank_lines:
                # Priority 1: Check if we have a pending colon
                if pending_colon:
                    should_continue_previous = True
                    # Don't reset pending_colon if this is a language label
                    if line.strip().lower() not in code_languages:
                        pending_colon = False  # Use it once
                
                # Priority 2: Check if this line starts with whitespace (indented)
                elif len(line) > 0 and line[0] in ' \t':
                    should_continue_previous = True
            else:
                # No blank lines - check if previous line ended with colon
                # and current line is a language label
                if current_paragraph and line.strip().lower() in code_languages:
                    # Check if last line in current paragraph ends with colon
                    for p_line in reversed(current_paragraph):
                        if p_line.strip():
                            if p_line.rstrip().endswith(':'):
                                should_continue_previous = True
                            break
            
            if should_continue_previous and current_paragraph:
                # Continue the current paragraph
                if blank_line_buffer:
                    current_paragraph.extend(blank_line_buffer)
                current_paragraph.append(line)
            else:
                # Start a new paragraph if needed
                if in_blank_lines and current_paragraph:
                    # Save the accumulated paragraph
                    paragraphs.append('\n'.join(current_paragraph))
                    current_paragraph = []
                    pending_colon = False  # Reset
                current_paragraph.append(line)
            
            in_blank_lines = False
            blank_line_buffer = []  # Clear buffer after processing non-blank line
    
    # Don't forget the last paragraph if it exists
    if current_paragraph:
        paragraphs.append('\n'.join(current_paragraph))
    
    # Filter out any empty paragraphs that might have been created
    paragraphs = [p for p in paragraphs if p.strip()]
    
    return paragraphs


def merge_code_labels(paragraphs):
    """Merge standalone code language labels OR paragraphs ending with them, with subsequent code/command blocks."""
    code_languages = {
        'javascript', 'python', 'java', 'typescript', 'html', 'css', 'json',
        'yaml', 'sql', 'code', 'jsx', 'tsx', 'php', 'ruby', 'go', 'rust',
        'c', 'cpp', 'c++', 'csharp', 'c#', 'bash', 'shell', 'sh', 'powershell', 'cmd', 'xml',
        'markdown', 'md', 'swift', 'kotlin', 'r', 'scala', 'perl'
    }
    shell_like_languages = {'bash', 'shell', 'sh', 'powershell', 'cmd'}
    
    code_chars = '{}[]();<>/=+-*' # General code indicators
    command_keywords = {'install', 'update', 'remove', 'get', 'set', 'run', 'exec', 'start', 'stop',
                        'build', 'deploy', 'test', 'config', 'init', 'clone', 'commit', 'push',
                        'pull', 'merge', 'checkout', 'add', 'status', 'log', 'diff', 'grep', 'find',
                        'cat', 'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'sudo', 'docker', 'npm', 'pip',
                        'git', 'apt', 'yum', 'choco', 'brew', 'python', 'node', 'java', 'go', 'ruby', 'perl'} # Added common interpreters
    command_file_extensions = {'.py', '.js', '.sh', '.bat', '.ps1', '.rb', '.pl', '.jar', '.json', '.yaml', '.yml', '.xml', '.conf', '.ini', '.md', '.txt'}

    merged_paragraphs = []
    i = 0
    
    while i < len(paragraphs):
        current_para = paragraphs[i]
        lines = current_para.split('\n')
        
        # Determine if current_para is *only* a language label
        is_only_language = False
        actual_language_label = "" # The language if is_only_language or ends_with_language
        
        non_empty_lines_in_current = [l.strip() for l in lines if l.strip()]
        if len(non_empty_lines_in_current) == 1 and non_empty_lines_in_current[0].lower() in code_languages:
            is_only_language = True
            actual_language_label = non_empty_lines_in_current[0].lower()

        # Determine if current_para *ends with* a language label
        ends_with_language = False
        last_content_line_stripped_lower = ""
        if not is_only_language and non_empty_lines_in_current: # Only check if not already 'is_only_language'
            last_content_line_stripped_lower = non_empty_lines_in_current[-1].lower()
            if last_content_line_stripped_lower in code_languages:
                ends_with_language = True
                actual_language_label = last_content_line_stripped_lower
        
        # Proceed if we have a label and there's a next paragraph
        if (i + 1 < len(paragraphs)) and (is_only_language or ends_with_language):
            next_para = paragraphs[i+1]
            
            # Get the first non-empty line of the next paragraph
            first_line_next_para_content = ""
            next_para_lines = next_para.split('\n')
            for l_next in next_para_lines:
                if l_next.strip():
                    first_line_next_para_content = l_next
                    break
            
            # If next paragraph is empty or just whitespace, don't merge
            if not first_line_next_para_content:
                merged_paragraphs.append(current_para)
                i += 1
                continue

            should_merge = False
            
            # --- Start of Decision Logic for Merging ---
            
            # Condition 1: Standard code block (indentation or specific chars)
            # This applies regardless of the type of label
            if first_line_next_para_content.startswith('\t') or \
               (len(first_line_next_para_content) >= 2 and first_line_next_para_content.startswith('  ')):
                should_merge = True
            elif any(char in next_para for char in code_chars):
                should_merge = True
            
            # Condition 2: Language label (either standalone or at end of current_para)
            # followed by something that doesn't look like another label,
            # and for shell_like_languages, looks like a command.
            if not should_merge and actual_language_label: # We have a label
                next_para_first_line_stripped_lower = first_line_next_para_content.strip().lower()

                # Don't merge if the next paragraph starts with another language label
                if next_para_first_line_stripped_lower in code_languages:
                    should_merge = False
                else:
                    # If it's a shell-like language, apply stricter command checks
                    if actual_language_label in shell_like_languages:
                        is_command_like = False
                        # Check for command keywords
                        for kw in command_keywords:
                            if next_para_first_line_stripped_lower.startswith(kw):
                                is_command_like = True
                                break
                        # Check for flags
                        if not is_command_like and re.search(r'(?:^|\s)-(?:[a-zA-Z]|[a-zA-Z0-9-]+)(?:$|\s|=)', first_line_next_para_content):
                            is_command_like = True
                        # Check for file extensions in the command
                        if not is_command_like:
                            for ext in command_file_extensions:
                                if ext in next_para_first_line_stripped_lower: # check anywhere in the line
                                    is_command_like = True
                                    break
                        # Check if it starts with './' or '../' (common for script execution)
                        if not is_command_like and (next_para_first_line_stripped_lower.startswith('./') or next_para_first_line_stripped_lower.startswith('../')):
                            is_command_like = True
                        
                        # Check if it's only one line, relatively short, and mostly lowercase (heuristic for simple commands)
                        if not is_command_like and len(next_para.strip().split('\n')) == 1 and len(next_para.strip()) < 80 and next_para.strip() == next_para.strip().lower():
                            if re.search(r'[a-zA-Z]', next_para.strip()): # must contain at least one letter
                                is_command_like = True
                                
                        if is_command_like:
                            should_merge = True
                        # else: if it's a shell label but next doesn't look like a command, don't merge
                    
                    else: # Not a shell-like language, but we have 'actual_language_label'
                          # (e.g. "python", "javascript")
                          # and next line is not another label.
                          # This is the "Criterion 3" for non-shell languages.
                        should_merge = True 
            
            # --- End of Decision Logic for Merging ---

            if should_merge:
                # If current_para was *only* the language label, we might format it like ```bash
                # If it ended with a label, we might want to put a newline before the label.
                # For now, just concatenate.
                merged_content = current_para + '\n' + next_para
                merged_paragraphs.append(merged_content)
                i += 2 
                continue
        
        # If no merge happened
        merged_paragraphs.append(current_para)
        i += 1
            
    return merged_paragraphs


def merge_split_code_blocks(paragraphs):
    """Merge consecutive code blocks that were split by blank lines."""
    merged_paragraphs = []
    i = 0
    
    while i < len(paragraphs):
        current_para = paragraphs[i]
        
        # Check if current paragraph looks like code
        lines = current_para.split('\n')
        is_code_block = False
        
        # Check if most lines are indented or have code characters
        if lines:
            indented_lines = 0
            code_like_lines = 0
            code_chars = '{}[]();<>/=+-*'
            
            for line in lines:
                if line.strip():  # Non-empty line
                    if len(line) > 0 and (line[0] == '\t' or (len(line) >= 2 and line[0:2] == '  ')):
                        indented_lines += 1
                    if any(char in line for char in code_chars):
                        code_like_lines += 1
            
            # If majority of non-empty lines are indented or code-like, it's probably code
            non_empty_lines = sum(1 for line in lines if line.strip())
            if non_empty_lines > 0:
                if (indented_lines / non_empty_lines > 0.5 or 
                    code_like_lines / non_empty_lines > 0.5):
                    is_code_block = True
        
        if is_code_block:
            # Look ahead to see if next paragraphs are also code blocks
            j = i + 1
            while j < len(paragraphs):
                next_para = paragraphs[j]
                next_lines = next_para.split('\n')
                
                # Check if next paragraph is also code
                is_next_code = False
                if next_lines:
                    first_line = next_lines[0]
                    # Check if it starts with indentation or has code chars
                    if (len(first_line) > 0 and 
                        (first_line[0] == '\t' or (len(first_line) >= 2 and first_line[0:2] == '  ')) or
                        any(char in next_para for char in '{}[]();<>/=+-*')):
                        is_next_code = True
                
                if is_next_code:
                    # Merge with current
                    current_para = current_para + '\n\n' + next_para
                    j += 1
                else:
                    break
            
            merged_paragraphs.append(current_para)
            i = j  # Skip merged paragraphs
        else:
            merged_paragraphs.append(current_para)
            i += 1
    
    return merged_paragraphs


def merge_split_lists(paragraphs):
    """Merge paragraphs that are part of the same list structure."""
    import re
    
    # Patterns for list markers
    numbered_list_pattern = re.compile(r'^(\s*)\d+\.\s')
    hierarchical_list_pattern = re.compile(r'^(\s*)\d+\.\d+\s')  # For 12.1, 12.2 style
    bullet_list_pattern = re.compile(r'^(\s*)[-*•]\s')
    continued_list_pattern = re.compile(r'^(\s*)[a-zA-Z]\.\s')  # For a., b., c. style lists
    emoji_pattern = re.compile(r'^[🔍🎯📝💡🚀✅❌⚡️🔧📌🎨🕵️‍♂️🕵️‍♀️]')  # Common emoji bullets
    
    # Common programming language keywords
    code_languages = {
        'javascript', 'python', 'java', 'typescript', 'html', 'css', 'json', 
        'yaml', 'sql', 'code', 'jsx', 'tsx', 'php', 'ruby', 'go', 'rust',
        'c', 'cpp', 'c++', 'csharp', 'c#', 'bash', 'shell', 'sh', 'xml',
        'markdown', 'md', 'swift', 'kotlin', 'r', 'scala', 'perl'
    }
    
    merged_paragraphs = []
    i = 0
    
    while i < len(paragraphs):
        current_para = paragraphs[i]
        
        # Check if current paragraph contains list items or hierarchical sections
        lines = current_para.split('\n')
        has_list = False
        has_hierarchical = False
        has_emoji_start = False
        
        for line in lines:
            if (numbered_list_pattern.match(line) or 
                hierarchical_list_pattern.match(line) or
                bullet_list_pattern.match(line) or
                continued_list_pattern.match(line)):
                has_list = True
                if hierarchical_list_pattern.match(line):
                    has_hierarchical = True
                break
            if emoji_pattern.match(line.strip()):
                has_emoji_start = True
                has_list = True
                break
        
        if has_list or has_emoji_start:
            # Look ahead to merge consecutive list-related paragraphs
            j = i + 1
            while j < len(paragraphs):
                next_para = paragraphs[j]
                next_lines = next_para.split('\n')
                
                # Check if next paragraph is part of the list
                is_list_continuation = False
                should_merge_code = False
                
                # Check first non-empty line
                first_line = ''
                for line in next_lines:
                    if line.strip():
                        first_line = line
                        break
                
                if first_line:
                    # Check if it starts with a list marker, hierarchical number, or emoji
                    if (numbered_list_pattern.match(first_line) or 
                        hierarchical_list_pattern.match(first_line) or
                        bullet_list_pattern.match(first_line) or
                        continued_list_pattern.match(first_line) or
                        emoji_pattern.match(first_line.strip())):
                        is_list_continuation = True
                    
                    # Special check for hierarchical lists - if we're in a hierarchical list,
                    # also merge paragraphs that start with the next section number
                    if has_hierarchical and numbered_list_pattern.match(first_line):
                        # Extract the number to see if it's a continuation
                        current_nums = re.findall(r'\d+', current_para)
                        next_nums = re.findall(r'^\s*(\d+)\.', first_line)
                        if current_nums and next_nums:
                            current_main = int(current_nums[0])
                            next_main = int(next_nums[0])
                            # If next number is close (within 2), it's probably a continuation
                            if abs(next_main - current_main) <= 2:
                                is_list_continuation = True
                    
                    # Check for indented sub-items (common in hierarchical lists)
                    if not is_list_continuation and first_line.startswith('    '):
                        # Indented items are often sub-points in a list
                        is_list_continuation = True
                    
                    # Check if it's emoji-based continuation
                    if has_emoji_start and first_line.strip() and first_line.strip()[0] in '🔍🎯📝💡🚀✅❌⚡️🔧📌🎨🕵️‍♂️🕵️‍♀️':
                        is_list_continuation = True
                
                # Special case: Check if next paragraph is just a language label
                if not is_list_continuation and next_para.strip().lower() in code_languages:
                    # This is a standalone language label - check if code follows
                    if j + 1 < len(paragraphs):
                        following_para = paragraphs[j + 1]
                        if following_para:
                            first_code_line = following_para.split('\n')[0]
                            # Check if it's code
                            if (len(first_code_line) > 0 and 
                                (first_code_line[0] == '\t' or 
                                 (len(first_code_line) >= 2 and first_code_line[0:2] == '  ') or
                                 any(char in first_code_line for char in '{}[]();<>/=+-*#'))):
                                # Merge all three: current + language label + code
                                current_para = current_para + '\n' + next_para + '\n' + following_para
                                j += 2
                                continue
                
                # Check if paragraph starts with code (for cases where code follows list directly)
                if not is_list_continuation and first_line:
                    # Check if it looks like code
                    if (len(first_line) > 0 and 
                        (first_line[0] == '\t' or 
                         (len(first_line) >= 2 and first_line[0:2] == '  ') or
                         (first_line.startswith('#') and 'Check' in first_line))):  # Bash comments
                        should_merge_code = True
                
                if is_list_continuation or should_merge_code:
                    # Merge with current
                    current_para = current_para + '\n' + next_para
                    j += 1
                else:
                    break
            
            merged_paragraphs.append(current_para)
            i = j  # Skip merged paragraphs
        else:
            merged_paragraphs.append(current_para)
            i += 1
    
    return merged_paragraphs

def merge_console_output(paragraphs):
    """Merge paragraphs that appear to be console/terminal output."""
    import re
    
    # Indicators that suggest console output
    output_indicators = [
        'example output:', 'output:', 'console output:', 'terminal output:',
        'result:', 'results:', 'produces:', 'shows:', 'displays:'
    ]
    
    # Patterns that suggest console/terminal formatting
    console_patterns = [
        re.compile(r'^[=\-─━]+'),  # Horizontal lines
        re.compile(r'^[\*=\-─━]{3,}'),  # Lines starting with repeated chars
        re.compile(r'^[📊📈📋🚀🔄✅❌⏰📁🗜️🎯💡🔍]'),  # Lines starting with emojis
        re.compile(r'^\s*\w+\.(md|py|txt|js|html|css):\s*[✅❌]'),  # File status patterns
        re.compile(r'^\s*→\s*'),  # Arrow indicators
        re.compile(r'^[\s\-\*]*\d+\s*(tokens?|chars?|lines?|bytes?)'),  # Metrics
    ]
    
    merged_paragraphs = []
    i = 0
    
    while i < len(paragraphs):
        current_para = paragraphs[i]
        
        # Check if paragraph ends with output indicator
        ends_with_output_indicator = False
        lines = current_para.split('\n')
        if lines:
            last_line = lines[-1].strip().lower()
            for indicator in output_indicators:
                if last_line.endswith(indicator):
                    ends_with_output_indicator = True
                    break
        
        # Check if paragraph looks like console output
        looks_like_console = False
        for line in lines:
            for pattern in console_patterns:
                if pattern.match(line.strip()):
                    looks_like_console = True
                    break
            if looks_like_console:
                break
        
        if ends_with_output_indicator or looks_like_console:
            # Look ahead to merge console output
            j = i + 1
            while j < len(paragraphs):
                next_para = paragraphs[j]
                next_lines = next_para.split('\n')
                
                # Check if next paragraph looks like console output
                is_console_continuation = False
                
                # Check for console patterns
                for line in next_lines[:5]:  # Check first 5 lines
                    for pattern in console_patterns:
                        if pattern.match(line.strip()):
                            is_console_continuation = True
                            break
                    if is_console_continuation:
                        break
                
                # Also check for high density of special characters
                special_char_count = sum(1 for c in next_para if c in '═─━┌┐└┘│├┤┬┴┼*=|-+→←↑↓✅❌📊📈📋🚀🔄⏰📁')
                if len(next_para) > 0 and special_char_count / len(next_para) > 0.05:  # >5% special chars
                    is_console_continuation = True
                
                if is_console_continuation:
                    # Merge with current
                    current_para = current_para + '\n\n' + next_para
                    j += 1
                else:
                    break
            
            merged_paragraphs.append(current_para)
            i = j  # Skip merged paragraphs
        else:
            merged_paragraphs.append(current_para)
            i += 1
    
    return merged_paragraphs


def merge_ui_elements(paragraphs):
    """Merge short UI/timestamp elements with previous paragraphs."""
    # Pattern for timestamps like "5s", "120s"
    timestamp_pattern = re.compile(r'^\d+s$')
    
    # Exact UI elements to merge
    ui_elements = {'retry', 'edit', 'copy', 'close', 'cancel', 'ok', 'yes', 'no'}
    
    merged_paragraphs = []
    
    for i, current_para in enumerate(paragraphs):
        current_stripped = current_para.strip()
        
        # Check if current paragraph is a short UI element or timestamp
        is_ui_element = (
            current_stripped.lower() in ui_elements or
            timestamp_pattern.match(current_stripped.lower())
        )
        
        if is_ui_element and i > 0 and merged_paragraphs:
            # Merge with previous paragraph
            merged_paragraphs[-1] = merged_paragraphs[-1] + ' ' + current_para
        else:
            # No merge needed, add current paragraph
            merged_paragraphs.append(current_para)
    
    return merged_paragraphs

def number_paragraphs(paragraphs):
    """Number paragraphs sequentially starting from 1."""
    numbered_paragraphs = []
    for i, paragraph in enumerate(paragraphs, 1):
        numbered_paragraphs.append(f"{i}. {paragraph}")
    return numbered_paragraphs


def write_output_file(filename, numbered_paragraphs):
    """Write numbered paragraphs to output file with blank lines between them."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            # Join paragraphs with double newlines (blank line between each)
            output_content = '\n\n'.join(numbered_paragraphs)
            f.write(output_content)
            # Add a final newline at the end of the file
            f.write('\n')
        print(f"Successfully wrote {len(numbered_paragraphs)} numbered paragraphs to '{filename}'")
    except IOError as e:
        print(f"Error writing to file '{filename}': {e}")
        sys.exit(1)


def main():
    """Main function to orchestrate the paragraph numbering process."""
    input_filename = 'input.md'
    output_filename = 'output.md'
    
    # Read input file
    print(f"Reading from '{input_filename}'...")
    content = read_input_file(input_filename)
    
    # Split into paragraphs
    print("Splitting content into paragraphs (with colon and indentation handling)...")
    paragraphs = split_into_paragraphs(content)
    
    if not paragraphs:
        print("Warning: No paragraphs found in the input file.")
        # Still create an empty output file
        write_output_file(output_filename, [])
        return
    
    print(f"Found {len(paragraphs)} paragraph(s) after initial split")
    
    # Post-processing: Merge code labels with code blocks
    print("Merging code language labels with code blocks...")
    paragraphs = merge_code_labels(paragraphs)
    print(f"Have {len(paragraphs)} paragraph(s) after merging code labels")
    
    # Post-processing: Merge split lists
    print("Merging split lists...")
    paragraphs = merge_split_lists(paragraphs)
    print(f"Have {len(paragraphs)} paragraph(s) after merging split lists")
    
    # Post-processing: Merge split code blocks
    print("Merging split code blocks...")
    paragraphs = merge_split_code_blocks(paragraphs)
    print(f"Have {len(paragraphs)} paragraph(s) after merging split code blocks")
    
    # Post-processing: Merge console output
    print("Merging console output...")
    paragraphs = merge_console_output(paragraphs)
    print(f"Have {len(paragraphs)} paragraph(s) after merging console output")
    
    # Post-processing: Merge short UI elements with previous paragraphs
    print("Merging short UI elements with previous paragraphs...")
    paragraphs = merge_ui_elements(paragraphs)
    print(f"Have {len(paragraphs)} paragraph(s) after merging UI elements")
    
    # Number paragraphs
    numbered_paragraphs = number_paragraphs(paragraphs)
    
    # Write to output file
    write_output_file(output_filename, numbered_paragraphs)


if __name__ == "__main__":
    main()