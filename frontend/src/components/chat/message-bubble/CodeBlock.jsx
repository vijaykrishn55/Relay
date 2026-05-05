import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * CodeBlock
 * Renders a syntax-highlighted code block with a header bar (language label +
 * copy button).  The `children` prop contains the rehype-highlighted React
 * tree; `codeText` is the plain-text version used for clipboard copy.
 */
function CodeBlock({ codeText, className, children }) {
  const [copied, setCopied] = useState(false);
  const language = className ? className.replace(/^language-/, '') : '';

  const handleCopy = async () => {
    if (!codeText) return;
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="code-block-card group/code">
      <div className="code-block-header">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-500 hover:text-gray-200 transition-colors opacity-0 group-hover/code:opacity-100"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-emerald-400"><Check size={11} /> Copied</span>
          ) : (
            <span className="flex items-center gap-1"><Copy size={11} /> Copy</span>
          )}
        </button>
      </div>
      <div className="code-block-body">
        <code className={className}>{children}</code>
      </div>
    </div>
  );
}

export default CodeBlock;
