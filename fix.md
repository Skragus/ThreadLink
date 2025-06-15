
error messages on frontend testing, noticed that when backend is not running it silently fails instead of message

advanced settings menu

test settings after byok

test garbage input

testing required for target for regualr and recency mode

cache settings + session cache context card, clear on reset button

context card header refinement, remove target, add recency mode 

bolt sticker instead of footer

BYOK build

clean code for open source

welcome message + api require message

blur background on loading messages

info menu open section should scroll jump to it

bolt badge covers scroll bar

Feature Spec: Custom Prompt Editor
1. Overview

The Custom Prompt Editor is an expert-level feature that allows users to completely override ThreadLink's core processing logic. By defining their own system prompt, users can tailor the summarization behavior of the LLM drones for specific use cases (e.g., summarizing code, extracting action items from dialogue). This feature offers immense power at the cost of stability and predictability, and its UI must reflect this inherent risk.
2. User Experience & UI Flow

Location:
The entry point is located within the Settings > Advanced Settings modal, under a clearly demarcated section titled --- DANGER ZONE ---.

Activation:

    A single toggle switch labeled [ ] Use Custom Prompt controls access. It is OFF by default.
    Upon clicking the toggle to ON, the Advanced Settings view is immediately replaced by the Prompt Editor view. The transition should be clean, preserving the modal's size and position.

The Prompt Editor View:
This view is designed to feel like an airlock or a hazardous environment chamber.

    Header:
        A prominent < Back button is in the top-left to allow for a quick, safe exit without saving.
        The header is dominated by heavy warnings.
            Style: Red text, warning icons (e.g., ⚠️).
            Text: "WARNING: CORE LOGIC OVERRIDE", "You are changing the fundamental instructions for the AI. Unstable results, higher costs, and processing failures are likely."
            Description of some core logic and the usage of the {TARGET_TOKENS} variable

    Editor Body:
        A large, multi-line text area dominates the view.
        Default State: Upon first open, the text area is pre-populated with the current default system prompt. This is critical, as it provides the user with the working template they are about to modify.


    Footer:
        A single action button: Apply & Close.

3. Functional Specification: The Core Override

This is what the feature actually does.

    Standard Operation: By default, ThreadLink uses a carefully optimized, hardcoded system prompt that is sent to every drone. It's something like: "Summarize the following text, focusing on extracting the key facts, decisions, and conclusions. Be concise and accurate. Text: {{CHUNK}}".

    Override Mechanism: When the "Use Custom Prompt" toggle is active, the content of the text editor completely replaces that hardcoded system prompt. The string saved by the user becomes the new instruction for every single drone in the pipeline.

    The {{CHUNK}} Placeholder: During processing, the drone pipeline will perform a simple string replacement, substituting the {{CHUNK}} placeholder with the actual segment of text that the specific drone is assigned to process. If the user's custom prompt omits this placeholder, processing will fail with an error.

4. The Risks (Why it's in the "Danger Zone")

    Quality Degradation: The default prompt is engineered for summarization. A poorly written custom prompt (e.g., "What's up with this: {{CHUNK}}") will produce useless, incoherent output.
    Cost Overruns: A longer, more verbose custom prompt increases the token count for every parallel drone call. A user could inadvertently triple their processing costs without realizing it.
    Instability & Failure: The user could introduce instructions that cause the LLM to refuse to answer, produce malformed output, or otherwise break the expected summary -> stitch pipeline.

This feature essentially hands the user the keys to the engine room. They can fine-tune it for incredible performance or they can blow the engine. The UI must make it clear that they are solely responsible for the consequences.