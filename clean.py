#!/usr/bin/env python3
"""
AI Chat Session Cleaner
Cleans boilerplate from copied AI chat sessions (Claude, ChatGPT, Gemini)
while preserving paragraph splitting markers for downstream processing.
"""

import re
import os
import sys

def estimate_tokens(text):
    """Rough token estimation: ~4 characters per token on average"""
    return len(text) // 4

def clean_ai_chat_content(content):
    """Clean common boilerplate patterns from AI chat sessions while preserving paragraph splitting markers"""
    
    # Store original for comparison
    original_content = content
    
    # SAFE patterns to remove (won't interfere with paragraph splitting)
    patterns_to_remove = [
        # Clock timestamps in chat interfaces (but preserve "5s" style timestamps)
        r'\b\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\b',
        r'\b\d{1,2}:\d{2}\s*(AM|PM)\b',
        r'\bToday\s*\d{1,2}:\d{2}\s*(AM|PM)?\b',
        r'\d{1,2}/\d{1,2}/\d{4}\s*\d{1,2}:\d{2}',
        
        # AI platform URLs only
        r'https?://chat\.openai\.com[^\s]*',
        r'https?://claude\.ai[^\s]*',
        r'https?://bard\.google\.com[^\s]*',
        r'https?://gemini\.google\.com[^\s]*',
        
        # Specific AI interface elements (with exact brackets)
        r'\[Copy\]',
        r'\[Regenerate\]',
        r'\[Thumbs up\]',
        r'\[Thumbs down\]',
        r'\[Share\]',
        r'\[Continue\]',
        
        # Navigation phrases (only when standalone)
        r'^New conversation\s*$',
        r'^Clear conversation\s*$',
        r'^Export conversation\s*$',
        r'^Settings\s*$',
        r'^Sign out\s*$',
        r'^Menu\s*$',
        
        # Status messages (only when standalone)
        r'^Claude is typing\.\.\.\s*$',
        r'^Generating response\.\.\.\s*$',
        r'^Thinking\.\.\.\s*$',
        r'^Processing\.\.\.\s*$',
        
        # Usage warnings (only when standalone)
        r'^This conversation may be reviewed.*$',      # Corrected from original fragment, added comma
        r'^ChatGPT can make mistakes.*$',             # Added from fragment, corrected, added comma
        r'^Claude cannot.*outside.*conversation.*$',   # Added from fragment, corrected, added comma
        
        # Claude-specific UI elements and instructions
        r'Smart, efficient model for everyday use Learn more',
        r'No content added yet',
        r'Add images, PDFs, docs, spreadsheets, and more to summarize, analyze, and query content with Claude\.',
        r'Collapse to hide model thoughts',
        r'Expand to view model thoughts', 
        r'chevron_right',
        r'Thinking Thoughts \(experimental\)',
        r'^Learn more\s*$'                             # Added from fragment, corrected (last item, no comma)
    ]
    
    # Apply each pattern carefully
    for pattern in patterns_to_remove:
        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.IGNORECASE)
    
    # Smart removal of Claude UI buttons (Edit/Retry/Content)
    # Only remove if they appear as standalone capitalized words on their own lines
    edit_count = len(re.findall(r'\nEdit\s*$', content, re.MULTILINE))
    retry_count = len(re.findall(r'\nRetry\s*$', content, re.MULTILINE))
    content_count = len(re.findall(r'\nContent\s*$', content, re.MULTILINE))
    
    # If we find multiple instances, they're likely UI buttons - remove them
    if edit_count >= 2:
        content = re.sub(r'\nEdit\s*$', '', content, flags=re.MULTILINE)
        print(f"🗑️  Removed {edit_count} 'Edit' UI buttons")
    
    if retry_count >= 2:
        content = re.sub(r'\nRetry\s*$', '', content, flags=re.MULTILINE)
        print(f"🗑️  Removed {retry_count} 'Retry' UI buttons")
    
    # Content usually appears only once at the very end, so remove if found
    if content_count >= 1:
        content = re.sub(r'\nContent\s*$', '', content, flags=re.MULTILINE)
        print(f"🗑️  Removed {content_count} 'Content' UI element(s)")
    
    # Only clean up speaker labels when they appear redundantly
    content = re.sub(r'^(Claude|ChatGPT|Gemini|GPT-4|GPT-3\.5):\s*', '**Assistant:** ', content, flags=re.MULTILINE)
    content = re.sub(r'^(Human|User|You):\s*', '**Human:** ', content, flags=re.MULTILINE)
    content = re.sub(r'^(Assistant|AI):\s*', '**Assistant:** ', content, flags=re.MULTILINE)
    
    # MINIMAL whitespace cleanup - preserve structure your script needs
    content = re.sub(r'\n\s*\n\s*\n\s*\n+', '\n\n\n', content)
    
    # Remove only trailing spaces at end of lines (preserve leading spaces/tabs)
    lines = content.split('\n')
    content = '\n'.join(line.rstrip() for line in lines)
    
    content = content.strip()
    
    return content, original_content

def main():
    """Main function to process the AI chat cleanup"""
    
    # Check if raw.md exists
    if not os.path.exists('raw.md'):
        print("❌ Error: raw.md file not found!")
        print("Please create a raw.md file with your copied AI chat session.")
        sys.exit(1)
    
    try:
        # Read the raw content
        print("📖 Reading raw.md...")
        with open('raw.md', 'r', encoding='utf-8') as f:
            raw_content = f.read()
        
        if not raw_content.strip():
            print("❌ Error: raw.md is empty!")
            sys.exit(1)
        
        # Clean the content
        print("🧹 Cleaning AI chat boilerplate...")
        cleaned_content, original_content = clean_ai_chat_content(raw_content)
        
        # Calculate savings
        original_chars = len(original_content)
        cleaned_chars = len(cleaned_content)
        chars_saved = original_chars - cleaned_chars
        
        original_tokens = estimate_tokens(original_content)
        cleaned_tokens = estimate_tokens(cleaned_content)
        tokens_saved = original_tokens - cleaned_tokens
        
        # Write cleaned content
        with open('input.md', 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        # Display results
        print("\n" + "="*50)
        print("🎉 CLEANUP COMPLETE!")
        print("="*50)
        print(f"📊 Original size:    {original_chars:,} characters ({original_tokens:,} tokens)")
        print(f"📊 Cleaned size:     {cleaned_chars:,} characters ({cleaned_tokens:,} tokens)")
        print(f"💰 Savings:          {chars_saved:,} characters ({tokens_saved:,} tokens)")
        
        if original_chars > 0:
            reduction_percent = (chars_saved / original_chars) * 100
            print(f"📉 Reduction:        {reduction_percent:.1f}%")
        
        print(f"\n✅ Cleaned content saved to: input.md")
        
        # Show preview of cleaned content
        preview_length = 200
        if len(cleaned_content) > preview_length:
            preview = cleaned_content[:preview_length] + "..."
        else:
            preview = cleaned_content
        
        print(f"\n📋 Preview of cleaned content:")
        print("-" * 30)
        print(preview)
        print("-" * 30)
        
    except Exception as e:
        print(f"❌ Error processing file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()