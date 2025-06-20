// components/InfoPanel.tsx - Info Panel Component

import React, { useRef, useEffect } from 'react';
import { 
  X, ChevronDown, ChevronRight, Sparkles, Copy, 
  Shield, Package, Scale, Bot, Focus, Settings, AlertTriangle
} from 'lucide-react';
import { ExpandedSections } from '../types';

interface InfoPanelProps {
  isOpen: boolean;
  expandedSections: ExpandedSections;
  onToggleSection: (section: keyof ExpandedSections) => void;
  onClose: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  isOpen,
  expandedSections,
  onToggleSection,
  onClose
}) => {
  // Refs for each section
  const sectionRefs = {
    what: useRef<HTMLDivElement>(null),
    howto: useRef<HTMLDivElement>(null),
    compression: useRef<HTMLDivElement>(null),
    strategy: useRef<HTMLDivElement>(null),
    drones: useRef<HTMLDivElement>(null),
    recency: useRef<HTMLDivElement>(null),
    advanced: useRef<HTMLDivElement>(null),
    privacy: useRef<HTMLDivElement>(null),
  };

  // Ref for scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Keep track of the previously expanded sections to detect changes
  const prevExpandedRef = useRef<{[key: string]: boolean}>({});
  
  // Effect to scroll to expanded section when it changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Find which section was just expanded (that wasn't expanded before)
    const newlyExpandedSection = Object.keys(expandedSections).find(
      section => 
        expandedSections[section as keyof ExpandedSections] && 
        !prevExpandedRef.current[section]
    ) as keyof ExpandedSections | undefined;
    
    // Store current state for next comparison
    prevExpandedRef.current = {...expandedSections};
    
    if (newlyExpandedSection && sectionRefs[newlyExpandedSection]?.current && scrollContainerRef.current) {
      // Add a slight delay to ensure the section is fully rendered
      setTimeout(() => {
        if (sectionRefs[newlyExpandedSection]?.current && scrollContainerRef.current) {
          const sectionElement = sectionRefs[newlyExpandedSection].current;
          const scrollContainer = scrollContainerRef.current;
          
          // Scroll the section into view with some padding at the top
          const sectionTop = sectionElement.offsetTop - 120; // 20px padding
          scrollContainer.scrollTo({
            top: sectionTop,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [expandedSections, isOpen]);

  // Handler for toggling a section with scroll
  const handleToggleSection = (section: keyof ExpandedSections) => {
    onToggleSection(section);
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="info-panel-title" className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}        <div className="flex items-center justify-between mb-6">
          <h2 id="info-panel-title" className="text-2xl font-medium text-[var(--text-primary)] select-none cursor-default">ThreadLink User Guide</h2>
          <button
            onClick={onClose}
            aria-label="Close info panel"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
          >
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-3">
          {/* Section 1: What is ThreadLink? */}
          <div ref={sectionRefs.what} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('what')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Sparkles size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">What is ThreadLink?</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">LLMs forget. ThreadLink doesn't.</p>
              </div>
              {expandedSections.what ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {expandedSections.what && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                <p>
                  Modern AI is powerful but fundamentally amnesiac. ThreadLink is the antidote. It's a high-signal engine that turns sprawling chat logs and raw text into a clean, portable context card.
                </p>
                <p>
                  Its purpose is to preserve your momentum. The moment you hit a session cap, need to switch models, or just want to archive a project's history without losing a single thought, ThreadLink is the tool you reach for. It's built for a single, seamless workflow:
                </p>
                <p>
                  <strong className="text-[var(--text-primary)]">Use it to:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Make a conversation with Mistral or Groq seamlessly continue inside GPT.</li>
                  <li>Distill a 400,000-token project history into a briefing you can actually read.</li>
                  <li>Archive the complete context of a feature build.</li>
                  <li>Turn any messy data dump into actionable intelligence.</li>
                </ul>
                <p>
                  It's not just a summarizer. <strong className="text-[var(--text-primary)]">It's a memory implant for your work.</strong>
                </p>
              </div>
            )}
          </div>

          {/* Section 2: How to Use ThreadLink */}
          <div ref={sectionRefs.howto} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('howto')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Copy size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">How to Use ThreadLink</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">Garbage In, Garbage Out.</p>
              </div>
              {expandedSections.howto ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {expandedSections.howto && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3 cursor-default">
                <p>
                  The quality of your context card depends entirely on the quality of the text you provide. For best results, follow this simple process to capture a clean, complete session log.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">Prepare the Interface</h4>
                      <p className="text-sm">Before copying, collapse any sidebars or panels in your AI chat application to minimize UI clutter.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">Load the Full History</h4>
                      <p className="text-sm">Most chat apps use lazy loading. Scroll all the way to the top of the conversation to ensure the entire history is loaded into the page.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">Select All</h4>
                      <p className="text-sm">Use your keyboard (<strong>Ctrl+A</strong> on Windows, <strong>Cmd+A</strong> on Mac) to select the entire conversation from top to bottom.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[var(--highlight-blue)] text-white rounded-full flex items-center justify-center text-sm font-medium">4</span>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">Copy and Paste</h4>
                      <p className="text-sm">Copy the selected text (<strong>Ctrl+C</strong> / <strong>Cmd+C</strong>), paste it into ThreadLink, and you're ready to condense.</p>
                    </div>
                  </div>
                </div>
                  <div className="!mt-6 pt-4 border-t border-[var(--divider)]">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Troubleshooting: Why did a drone fail?</h4>
                    <p className="text-sm space-y-2">
                        Sometimes, even with a clean copy, a specific chunk of text can be "problematic" for an AI model. This often happens with highly self-referential content (like chats *about* AI), complex code, or text that accidentally triggers a provider's safety filters. When this occurs, you may see a <code>[⚠ Drone failed...]</code> marker in your output.
                    </p>
                    <p className="text-sm mt-2">
                        The most powerful solution is to adjust the <strong>Drone Density</strong> in the Advanced Settings. By increasing the density (e.g., from 2 to 5), you force ThreadLink to break the problematic text into smaller, more granular chunks. This makes each drone's task simpler and significantly reduces the chance of any single chunk causing a failure. It's a way to trade a bit of compression for a much higher chance of success on difficult content.
                    </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Understanding Compression */}
          <div ref={sectionRefs.compression} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('compression')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Package size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">Understanding Compression</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">The Suitcase Analogy: Pillows vs. Gold Bricks</p>
              </div>
              {expandedSections.compression ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.compression && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3 cursor-default">
                <p>
                  The effectiveness of condensation is a direct function of the source text's information density. The compression level you choose sets a target ratio, but the final output is determined by the content itself.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong className="text-[var(--text-primary)]">Low-Density Text (Pillows):</strong> Rambling conversations or marketing copy can be compressed heavily (20:1 or more). There is a lot of "air" (redundancy) to squeeze out.</li>
                  <li><strong className="text-[var(--text-primary)]">High-Density Text (Gold Bricks):</strong> Source code or technical specifications resist aggressive compression. The system will prioritize preserving critical information over hitting an arbitrary ratio.</li>
                </ul>
                
                <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                  <h4 className="font-medium text-[var(--text-primary)]">Compression Level Settings</h4>
                  <p className="text-sm">
                    This setting controls the summarization pressure your drones will apply.
                  </p>
                </div>
                
                <ul className="space-y-2 ml-4">
                  <li><strong className="text-[var(--text-primary)]">Light:</strong> Preserves nuance and detail. Best for content where every word matters.</li>
                  <li><strong className="text-[var(--text-primary)]">Balanced:</strong> Default setting. Optimal trade-off between brevity and completeness.</li>
                  <li><strong className="text-[var(--text-primary)]">Aggressive:</strong> Maximum compression. Ideal for extracting key points from verbose content.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 4: Context Card Strategy */}
          <div ref={sectionRefs.strategy} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('strategy')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Scale size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">Context Card Strategy</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">Precision vs. Focus: The Core Trade-off</p>
              </div>
              {expandedSections.strategy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.strategy && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3 cursor-default">
                <p>
                  The size of your final context card is a strategic choice. There is no single "best" size; it's a trade-off between the richness of the context and the cost and focus of the next LLM session.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong className="text-[var(--text-primary)]">Large Context Cards (e.g., 15k+ tokens):</strong> These act as <strong>high-fidelity archives</strong>. They are excellent for deep analysis or creating a comprehensive project bible, but can sometimes cause the receiving LLM to get lost in less relevant details.</li>
                  <li><strong className="text-[var(--text-primary)]">Small Context Cards (e.g., &lt; 5k tokens):</strong> These act as <strong>high-signal tactical briefings</strong>. They are cheaper, faster, and force the summary to focus only on the most critical information. The trade-off is that nuance and secondary context are deliberately sacrificed.</li>
                </ul>
                
                <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                  <h4 className="font-medium text-[var(--text-primary)]">The Reality of "Soft Targets"</h4>
                  <p className="text-sm">
                    It is critical to understand that the compression level you set is a <strong>strong suggestion</strong>, not a hard command. Our testing has shown that models, especially on dense technical text, will <strong>exceed the target if they determine it's necessary to preserve critical context</strong>. This is a feature of the system's "context-first" philosophy.
                  </p>
                </div>
                
                <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                  <h4 className="font-medium text-[var(--text-primary)]">How to Achieve Higher Compression</h4>
                  <p className="text-sm">
                    If your first context card is larger than desired, you have two primary strategies for achieving a more aggressive condensation:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                    <li><strong className="text-[var(--text-primary)]">Pre-Filter Your Input (Manual):</strong> The most effective method. Before you click "Condense," manually delete sections of the source text that you know are less important—conversational filler, redundant examples, off-topic tangents. This focuses the drones' attention only on what truly matters.</li>
                    <li><strong className="text-[var(--text-primary)]">Recursive Condensation (The Two-Pass Method):</strong> For maximum compression, you can run ThreadLink on its own output. Take the first context card you generated, paste it back into ThreadLink as a new input, and condense it again.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Meet Your Drones */}
          <div ref={sectionRefs.drones} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('drones')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Bot size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">Meet Your Drones</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">Every Model Has a Personality. Choose the Right Specialist.</p>
              </div>
              {expandedSections.drones ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.drones && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-4 cursor-default">
                <div className="space-y-2">
                  <p className="text-sm">
                    Different AI models have distinct personalities and operational limits. Choosing the right one—and understanding how ThreadLink handles it—is critical for getting the result you want.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Google Gemini</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li><strong>Personality:</strong> Tends to be verbose. Excels at preserving narrative flow but will often exceed its token target to provide rich, descriptive summaries.</li>
                      <li><strong>Speed:</strong> Very fast</li>
                    </ul>
                  </div>
                  
                  <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">OpenAI GPT</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li><strong>Personality:</strong> Generally the most balanced approach. Follows instructions and constraints reliably, offering a good middle ground for most tasks.</li>
                      <li><strong>Speed:</strong> Fast</li>
                    </ul>
                  </div>
                    <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Mistral</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li><strong>Personality:</strong> Precise and ruthlessly efficient. Adheres strictly to token limits and instructions, making it ideal for fine-tuning with the Advanced Settings.</li>
                      <li><strong>Speed:</strong> Fast</li>
                    </ul>
                  </div>
                  
                  <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Groq (Llama)</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li><strong>Personality:</strong> Extremely fast and responsive. Excellent for rapid processing of large amounts of text while providing general-purpose summaries.</li>
                      <li><strong>Speed:</strong> Blazing fast</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                  <h4 className="font-medium text-[var(--text-primary)]">Processing Speed</h4>
                  <p className="text-sm">This setting controls how many drones are dispatched to work in parallel.</p>
                    <div className="space-y-2">
                    <div className="ml-4">
                      <p className="text-sm"><strong className="text-[var(--text-primary)]">Normal:</strong> The default, safe setting (5 concurrent jobs). It's a balance of speed and reliability.</p>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm"><strong className="text-[var(--text-primary)]">Fast:</strong> A more aggressive setting (10 concurrent jobs). It can significantly speed up processing on large sessions but increases the risk of hitting API rate limits.</p>
                    </div>          
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Recency Mode */}
          <div ref={sectionRefs.recency} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('recency')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Focus size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">Recency Mode: The Temporal Zoom Lens</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">Focus on What Matters Now.</p>
              </div>
              {expandedSections.recency ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.recency && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3 cursor-default">
                <p>
                  Recency Mode creates a temporally weighted briefing that automatically adjusts summary resolution based on when information appeared in your conversation. Think of it as a zoom lens that focuses sharper on recent events while maintaining a wide-angle view of the overall context.
                </p>
                
                <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3 space-y-2">
                  <p className="font-medium text-[var(--text-primary)]">How It Works: Temporal Bands</p>
                  <p className="text-sm">
                    Recency Mode divides your conversation into three distinct chronological bands and changes how it processes each one by adjusting the "drone density" (the number of summarization jobs per chunk of text).
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li><strong className="text-[var(--text-primary)]">Recent (Last 20%):</strong> Processed at High Resolution.<br/>
                    <span className="text-sm">The system deploys more, smaller drone jobs. This captures fine-grained details and specific facts from the end of the conversation.</span></li>
                    
                    <li><strong className="text-[var(--text-primary)]">Mid (Middle 50%):</strong> Processed at Standard Resolution.<br/>
                    <span className="text-sm">This section receives normal processing, providing a balanced summary of the core discussion.</span></li>
                    
                    <li><strong className="text-[var(--text-primary)]">Oldest (First 30%):</strong> Processed at Low Resolution.<br/>
                    <span className="text-sm">The system uses fewer, larger drone jobs. This forces it to create a high-level, thematic overview while discarding less critical early details.</span></li>
                  </ul>
                </div>
                <p className="font-medium text-[var(--text-primary)]">The Result:</p>
                <p>
                  Your context card begins with a high-level overview of earlier discussion, gradually increasing in detail as it approaches the present. This creates a natural narrative flow that mirrors how human memory works – general impressions of the past, vivid details of the present.
                </p>
                <p className="font-medium text-[var(--text-primary)]">Recency Strength Settings:</p>
                <ul className="space-y-2 ml-4">
                  <li><strong className="text-[var(--text-primary)]">Subtle:</strong> Gentle gradient. Maintains more detail throughout.</li>
                  <li><strong className="text-[var(--text-primary)]">Balanced:</strong> Standard temporal weighting. Ideal for most projects.</li>
                  <li><strong className="text-[var(--text-primary)]">Strong:</strong> Aggressive recency bias. Heavily focuses on latest developments.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 7: Advanced Controls */}
          <div ref={sectionRefs.advanced} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('advanced')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Settings size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)] cursor-default">Advanced Controls</h3>
                <p className="text-sm text-[var(--text-secondary)] cursor-default">Fine-tuning the engine for specific missions.</p>
              </div>
              {expandedSections.advanced ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.advanced && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-4 cursor-default">
                <p>
                  These settings provide direct control over the cost, performance, and granularity of the condensation pipeline. Adjust them only if you understand the trade-offs.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">                    <h4 className="font-medium text-[var(--text-primary)]">LLM Temperature</h4>                    <p className="text-sm">
                      Temperature controls the "randomness" or "creativity" of the drone's output. It's a value between 0.0 and 1.2 (optimized for condensation quality). ThreadLink defaults to 0.7 for balanced readability and accuracy.
                    </p><ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                      <li><strong className="text-[var(--text-primary)]">Low Temperature (e.g., 0.2 - 0.5):</strong> The drone will be more focused, deterministic, and predictable. Its summaries will be more like a factual report, sticking very closely to the source text.</li>
                      <li><strong className="text-[var(--text-primary)]">Medium Temperature (e.g., 0.6 - 1.0):</strong> Balanced creativity and accuracy. Good for most use cases.</li>
                      <li><strong className="text-[var(--text-primary)]">High Temperature (e.g., 1.1 - 1.2):</strong> The drone will take more creative risks while maintaining clarity. Values above 1.2 are capped to ensure coherent condensation output.</li>
                    </ul>                    <p className="text-sm italic">
                      ThreadLink defaults to 0.7 which balances readability with accuracy for most technical content. Note: Mistral is automatically capped at 1.0 due to provider limitations.
                    </p>
                  </div>
                  
                  <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                    <h4 className="font-medium text-[var(--text-primary)]">Drone Density</h4>
                    <p className="text-sm">
                      This setting controls the "resolution" of the condensation process by defining how many drones are assigned per 10,000 tokens of source text.
                    </p>                    <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                      <li><strong className="text-[var(--text-primary)]">Low Density (e.g., 1-2):</strong> Each drone gets a large chunk of text. This is cheaper and results in a more high-level, thematic summary.</li>
                      <li><strong className="text-[var(--text-primary)]">Medium Density (e.g., 3-5):</strong> Balanced granularity with reasonable costs. Good for most content types.</li>
                      <li><strong className="text-[var(--text-primary)]">High Density (e.g., 6-10):</strong> Each drone gets a smaller, more focused chunk. This is more expensive but results in a more detailed and granular context card. Values above 10 are capped to prevent excessive costs.</li>
                    </ul>
                    <p className="text-sm italic">
                      <strong>Note:</strong> This setting is disabled when Recency Mode is active. Recency Mode uses its own dynamic logic to vary the drone density automatically.
                    </p>
                  </div>
                    <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                    <h4 className="font-medium text-[var(--text-primary)]">Runaway Cost Protection (Max Drones)</h4>
                    <p className="text-sm">
                      This is a hard safety limit on the total number of drones a single job can create. Its primary purpose is to prevent accidental, runaway API costs when processing extremely large documents with a high Drone Density setting.
                    </p>
                    <p className="text-sm italic">
                      <strong className="text-[var(--text-primary)]">Recommendation:</strong> Only increase this limit if you are intentionally processing a massive session (e.g., 500k+ tokens) and have accepted the potential cost implications.
                    </p>
                  </div>
                  
                  <div className="border-t border-[var(--divider)] pt-3 space-y-2">
                    <h4 className="font-medium text-[var(--text-primary)]">Custom Prompt System (experimental)</h4>
                    <p className="text-sm">
                      This experimental feature allows you to override the default drone system prompt with your own instructions.
                    </p>                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 mt-2">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span><strong>Warning:</strong> Custom prompts fundamentally change how ThreadLink functions. This can lead to unpredictable results, cost overruns, or complete processing failures. Use only if you understand prompt engineering and accept the risks.</span>
                      </p>
                    </div>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm mt-2">
                      <li><strong className="text-[var(--text-primary)]">TARGET_TOKENS (optional):</strong> Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{'{TARGET_TOKENS}'}</code> in your prompt to dynamically insert the calculated target output length. </li>
                      <li><strong className="text-[var(--text-primary)]">Testing recommended:</strong> Always test custom prompts on small inputs before processing large sessions.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 8: Privacy & The Project */}
          <div ref={sectionRefs.privacy} className="border border-[var(--divider)] rounded-lg">
            <button
              onClick={() => handleToggleSection('privacy')}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-primary)] transition-colors rounded-lg cursor-pointer"
            >
              <Shield size={20} className="text-[var(--highlight-blue)]" />
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Privacy & The Project</h3>
                <p className="text-sm text-[var(--text-secondary)]">Your Keys, Your Data.</p>
              </div>
              {expandedSections.privacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.privacy && (
              <div className="px-4 pb-3 pt-2 text-[var(--text-secondary)] space-y-3">
                <p>
                  ThreadLink is built with a privacy-first, BYOK, open-source philosophy. Your conversations and API keys remain exclusively yours.
                </p>
                <div className="bg-[var(--bg-primary)] border border-[var(--divider)] rounded p-3 space-y-2">
                  <p className="font-medium text-[var(--text-primary)]">BYOK (Bring Your Own Key) Architecture:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Your API keys are never seen or stored by our servers</li>
                    <li>All API calls go directly from your browser to the LLM provider</li>
                    <li>No intermediary servers handle your sensitive data</li>
                    <li>Complete transparency in how your data flows</li>
                  </ul>
                </div>
                <p>
                  The complete ThreadLink source code is available on GitHub for review. You can see exactly how every feature works, verify our privacy claims, and even run your own instance if desired.
                </p>
                
                <div className="bg-blue-500 bg-opacity-10 border border-blue-500 rounded p-3 mt-4">
                  <p className="text-blue-400">
                    <a 
                      href="https://github.com/skragus/threadlink" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-300 transition-colors"
                    >
                      <strong>GitHub:</strong> github.com/skragus/threadlink - yes, I'd like a star
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[var(--divider)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--highlight-blue)] text-white rounded-lg select-none hover:bg-opacity-90 transition-colors cursor-pointer"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
