import { useState } from 'react';
import { Bot, Copy, Check, RefreshCw, CornerDownRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { formatRelativeTime } from '../../../utils/formatTime';
import MermaidDiagram from './MermaidDiagram';
import CodeBlock from './CodeBlock';
import OrchestrationTrace from './OrchestrationTrace';

/**
 * Walks a React element tree and returns the concatenated text content.
 * Needed because rehype-highlight wraps code into span elements, so
 * String(children) would produce "[object Object]".
 */
function extractText(children) {
  if (children == null)           return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children))    return children.map(extractText).join('');
  if (children?.props?.children != null) return extractText(children.props.children);
  return '';
}

/**
 * AssistantMessage
 * Renders a single assistant response: model label, markdown content,
 * orchestration trace, and hover action bar (copy / regenerate / relay).
 *
 * Props:
 *   message          – message object
 *   index            – position in the messages array
 *   isLastAssistant  – boolean, shows "Regenerate" button when true
 *   onRegenerate     – () => void
 *   onRelay          – () => void  (undefined = no relay button)
 *   isRelayTarget    – boolean, highlight border when true
 *   selectionMode    – boolean
 *   isSelected       – boolean
 *   onToggleSelect   – (index) => void
 */
function AssistantMessage({
  message, index,
  isLastAssistant, onRegenerate, onRelay, isRelayTarget,
  selectionMode, isSelected, onToggleSelect,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Custom renderers passed to ReactMarkdown
  // react-markdown v10+ no longer passes an `inline` prop to `code`.
  // Fenced code blocks are always rendered as <pre><code>…</code></pre>.
  // We intercept at the <pre> level to catch mermaid/code blocks,
  // and leave the <code> override for true inline code only.
  const markdownComponents = {
    pre({ children }) {
      // `children` is the React element for the inner <code>
      const codeChild = Array.isArray(children) ? children[0] : children;
      if (!codeChild?.props) return <pre>{children}</pre>;

      const className = codeChild.props.className || '';
      const match     = /language-(\w+)/.exec(className);
      const language  = match ? match[1] : '';
      const rawText   = extractText(codeChild.props.children).replace(/\n$/, '');

      if (language === 'mermaid') return <MermaidDiagram code={rawText} />;
      return <CodeBlock codeText={rawText} className={className}>{codeChild.props.children}</CodeBlock>;
    },
    code({ className, children, ...props }) {
      // Only reached for true inline code (not wrapped in <pre>)
      return <code className={className} {...props}>{children}</code>;
    },
  };

  return (
    <div
      className={`relative py-3 animate-fade-in group ${
        selectionMode  ? 'cursor-pointer' : ''
      } ${isSelected     ? 'bg-neon-cyan/5 rounded-xl ring-1 ring-neon-cyan/30'    : ''
      } ${isRelayTarget  ? 'bg-neon-cyan/[0.03] rounded-xl ring-1 ring-neon-cyan/20' : ''}`}
      onClick={() => selectionMode && onToggleSelect(index)}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute left-2 top-4 z-10">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-neon-cyan border-neon-cyan text-obsidian'
              : 'border-gray-500 bg-transparent hover:border-gray-400'
          }`}>
            {isSelected && <Check size={12} strokeWidth={3} />}
          </div>
        </div>
      )}

      <div className={selectionMode ? 'pl-9' : ''}>
        {/* Model label row */}
        {message.model && (
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <div className="w-5 h-5 rounded-full bg-neon-cyan/10 border border-neon-cyan/15 flex items-center justify-center">
              <Bot size={11} className="text-neon-cyan" />
            </div>
            <span className="text-[11px] text-gray-500 font-medium">{message.model}</span>
            {message.timestamp && (
              <span className="text-[10px] text-gray-600">{formatRelativeTime(message.timestamp)}</span>
            )}
            {message.relayUpdated && (
              <span className="text-[10px] text-neon-cyan flex items-center gap-0.5">
                <CornerDownRight size={8} /> Refined via Relay
              </span>
            )}
          </div>
        )}

        {/* Relay follow-up badge (visible on hover) */}
        {message.relayFollowUps && message.relayFollowUps.length > 0 && (
          <div className="relay-followups-container">
            <div className="relay-followups-badge">
              <CornerDownRight size={10} />
              <span>{message.relayFollowUps.length} follow-up{message.relayFollowUps.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="relay-followups-tooltip">
              <p className="relay-followups-tooltip-title">Follow-up refinements:</p>
              {message.relayFollowUps.map((q, i) => (
                <p key={i} className="relay-followups-tooltip-item">
                  <span className="relay-followups-tooltip-arrow">→</span> {q}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Markdown content */}
        <div className="ds-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Hive Process trace (only present when Hive Orchestrator was used) */}
        {message.orchestration && (
          <OrchestrationTrace
            orchestration={message.orchestration}
            metrics={message.metrics}
          />
        )}

        {/* Hover action bar */}
        {!selectionMode && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-gray-300 transition-colors"
              title="Copy">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            {isLastAssistant && (
              <button onClick={onRegenerate}
                className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-gray-300 transition-colors"
                title="Regenerate">
                <RefreshCw size={13} />
              </button>
            )}
            {onRelay && (
              <button onClick={onRelay}
                className={`p-1.5 rounded-lg transition-colors ${
                  isRelayTarget
                    ? 'bg-neon-cyan/15 text-neon-cyan'
                    : 'hover:bg-white/8 text-gray-500 hover:text-neon-cyan'
                }`}
                title={isRelayTarget ? 'Cancel relay' : 'Relay — follow-up or branch from this response'}>
                <CornerDownRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssistantMessage;
