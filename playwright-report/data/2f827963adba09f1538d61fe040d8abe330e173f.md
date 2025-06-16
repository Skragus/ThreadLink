# Page snapshot

```yaml
- heading "API Key Management" [level=3]
- text: Google API Key Save to Browser
- button "Toggle browser storage for Google API Key"
- textbox "Google API Key"
- button "Clear Google API Key"
- text: OpenAI API Key Save to Browser
- button "Toggle browser storage for OpenAI API Key"
- textbox "OpenAI API Key"
- button "Clear OpenAI API Key"
- text: Anthropic API Key Save to Browser
- button "Toggle browser storage for Anthropic API Key"
- textbox "Anthropic API Key"
- button "Clear Anthropic API Key"
- button "Save"
- button "Cancel"
- heading "Thread Link" [level=1]
- button "Open help documentation"
- button "Manage API keys"
- button "Open settings"
- text: Please configure your Google API key
- textbox "Paste your AI conversation here...": Some long text to process.
- link "Powered by Bolt.new":
  - /url: https://bolt.new
  - img "Powered by Bolt.new"
- text: "~10 tokens • Compression level:"
- combobox "Compression level:":
  - option "Light"
  - option "Balanced" [selected]
  - option "Aggressive"
- button "Condense"
- paragraph: Open Source · BYOK · Privacy-first
```