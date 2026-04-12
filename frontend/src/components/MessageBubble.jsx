import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { Bot, User, Copy, Check, RefreshCw, Pencil, X, CornerDownRight, Download, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatRelativeTime } from '../utils/formatTime';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';

// ── Mermaid init ──
let mermaidInitialized = false;
function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    logLevel: 'fatal',
    suppressErrors: true,
    themeVariables: {
      primaryColor: '#1e1e21',
      primaryBorderColor: '#00e5ff',
      primaryTextColor: '#e2e4e9',
      lineColor: '#4b5563',
      secondaryColor: '#2a2a2e',
      tertiaryColor: '#151517',
    }
  });
  mermaidInitialized = true;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const mermaidSvgCache = new Map();

// ── Interactive Mermaid Viewer ──
const MermaidDiagram = memo(function MermaidDiagram({ code }) {
  const codeHash = useMemo(() => hashCode(code || ''), [code]);
  const [svg, setSvg] = useState(() => mermaidSvgCache.get(codeHash) || '');
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('diagram');
  const [showCode, setShowCode] = useState(false);
  const hasRendered = useRef(!!mermaidSvgCache.get(codeHash));
  const diagramRef = useRef(null);
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pan + Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTransform = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!code || hasRendered.current) return;
    const renderDiagram = async () => {
      try {
        initMermaid();
        const id = `mermaid-${codeHash}-${Date.now()}`;
        const container = document.createElement('div');
        container.id = id;
        container.style.display = 'none';
        document.body.appendChild(container);
        try {
          const { svg: renderedSvg } = await mermaid.render(id, code.trim());
          mermaidSvgCache.set(codeHash, renderedSvg);
          hasRendered.current = true;
          setSvg(renderedSvg);
          setError(null);
        } finally {
          container.remove();
          document.querySelectorAll(`[id^="d${id}"]`).forEach(el => el.remove());
          document.querySelectorAll('.mermaid-error').forEach(el => el.remove());
        }
      } catch {
        setError('invalid');
        setSvg('');
      }
    };
    renderDiagram();
  }, [code, codeHash]);

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    lastTransform.current = { x: transform.x, y: transform.y };
    e.preventDefault();
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTransform(prev => ({ ...prev, x: lastTransform.current.x + dx, y: lastTransform.current.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  // Wheel zoom — must use native listener with { passive: false } to prevent page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(prev => ({
        ...prev,
        scale: Math.min(4, Math.max(0.2, prev.scale * delta))
      }));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [svg, activeView]);

  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });
  const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(4, prev.scale * 1.2) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale * 0.8) }));

  const handleDownload = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${codeHash}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    // Reset view when entering/exiting fullscreen
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  if (error) {
    return (
      <div className="mermaid-viewer">
        <div className="code-block-header">
          <span>mermaid</span>
          <button onClick={() => setShowCode(!showCode)} className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
            {showCode ? 'Hide' : 'Show'} code
          </button>
        </div>
        {showCode ? (
          <pre className="code-block-body"><code>{code}</code></pre>
        ) : (
          <div className="p-6 text-center text-gray-500 text-sm">
            <p>📊 Diagram preview unavailable</p>
            <p className="text-xs mt-1 text-gray-600">Click "Show code" to view source</p>
          </div>
        )}
      </div>
    );
  }

  return svg ? (
    <div ref={diagramRef} className={`mermaid-viewer ${isFullscreen ? 'fixed inset-0 z-[9999] bg-obsidian/98 backdrop-blur-xl flex flex-col' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/6 bg-white/[0.02]">
        {/* View toggles */}
        <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
          <button onClick={() => setActiveView('diagram')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${activeView === 'diagram' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            Diagram
          </button>
          <button onClick={() => setActiveView('code')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${activeView === 'code' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            Code
          </button>
        </div>

        {/* Controls */}
        {activeView === 'diagram' && (
          <div className="flex items-center gap-0.5">
            <button onClick={zoomOut} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Zoom out">
              <ZoomOut size={13} />
            </button>
            <button onClick={resetView} className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Reset">
              {Math.round(transform.scale * 100)}%
            </button>
            <button onClick={zoomIn} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Zoom in">
              <ZoomIn size={13} />
            </button>
            <div className="w-px h-4 bg-white/6 mx-1" />
            <button onClick={resetView} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Reset view">
              <RotateCcw size={13} />
            </button>
            <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Download SVG">
              <Download size={13} />
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Fullscreen">
              <Maximize2 size={13} />
            </button>
          </div>
        )}
        {activeView === 'code' && (
          <button onClick={handleCopy} className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>

      {/* Content */}
      {activeView === 'diagram' ? (
        <div
          ref={canvasRef}
          className={`mermaid-canvas p-4 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: 'center center',
              transition: isPanning.current ? 'none' : 'transform 150ms ease-out',
              display: 'flex',
              justifyContent: 'center',
              height: isFullscreen ? '100%' : undefined,
              alignItems: isFullscreen ? 'center' : undefined,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      ) : (
        <pre className="code-block-body"><code>{code}</code></pre>
      )}
    </div>
  ) : (
    <div className="mermaid-viewer p-8 flex items-center justify-center">
      <div className="flex gap-1.5 items-center text-gray-500 text-xs">
        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
        <span className="ml-2">Rendering diagram...</span>
      </div>
    </div>
  );
});

// ── Code Block ──
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

// ── Main MessageBubble ──
const MessageBubble = memo(function MessageBubble({
  message, isLast, isLastAssistant, onRegenerate, onEdit, index,
  selectionMode, isSelected, onToggleSelect
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent.trim() !== message.content) onEdit(editContent.trim());
    setIsEditing(false);
  };

  const handleEditCancel = () => { setEditContent(message.content); setIsEditing(false); };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
    if (e.key === 'Escape') handleEditCancel();
  };

  // ── User Message ──
  if (isUser) {
    return (
      <div
        className={`relative flex justify-end py-2 group animate-fade-in ${
          selectionMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'bg-neon-cyan/5 rounded-xl ring-1 ring-neon-cyan/30' : ''}`}
        onClick={() => selectionMode && onToggleSelect(index)}
      >
        {selectionMode && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-neon-cyan border-neon-cyan text-obsidian'
                : 'border-gray-500 bg-transparent hover:border-gray-400'
            }`}>
              {isSelected && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
        )}
        <div className={`max-w-[75%] relative ${selectionMode ? 'mr-2' : ''}`}>
          {/* Hover actions */}
          {!selectionMode && (
            <div className="absolute -left-16 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors" title="Copy">
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              <button onClick={() => { setEditContent(message.content); setIsEditing(true); }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors" title="Edit">
                <Pencil size={13} />
              </button>
            </div>
          )}

          {isEditing ? (
            <div className="bg-surface-mid border border-neon-cyan/20 rounded-2xl rounded-br-sm px-4 py-3">
              <textarea ref={editRef} value={editContent}
                onChange={(e) => { setEditContent(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-transparent text-sm text-gray-100 resize-none focus:outline-none min-w-[200px]"
                rows={1}
              />
              <div className="flex gap-1.5 justify-end mt-2">
                <button onClick={handleEditCancel} className="p-1 rounded-md hover:bg-white/10 text-gray-400"><X size={13} /></button>
                <button onClick={handleEditSave} className="p-1 rounded-md bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20"><Check size={13} /></button>
              </div>
            </div>
          ) : (
            <div className="bg-neon-cyan/8 text-gray-100 rounded-2xl rounded-br-sm px-4 py-2.5 border border-neon-cyan/15">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          )}

          {message.timestamp && (
            <p className="text-[10px] text-gray-600 mt-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
              {formatRelativeTime(message.timestamp)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Assistant Message ──
  if (isAssistant) {
    return (
      <div
        className={`relative py-3 animate-fade-in group ${
          selectionMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'bg-neon-cyan/5 rounded-xl ring-1 ring-neon-cyan/30' : ''}`}
        onClick={() => selectionMode && onToggleSelect(index)}
      >
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
          {/* Model label */}
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

          {/* Relay follow-up history */}
          {message.relayFollowUps && message.relayFollowUps.length > 0 && (
            <div className="ml-1 mb-2 pl-3 border-l-2 border-neon-cyan/20">
              <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Follow-up refinements:</p>
              {message.relayFollowUps.map((q, i) => (
                <p key={i} className="text-[11px] text-gray-400 leading-relaxed">
                  <span className="text-neon-cyan/60">→</span> {q}
                </p>
              ))}
            </div>
          )}

          {/* Content — no bubble, full-width like DeepSeek */}
          <div className="ds-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  if (language === 'mermaid' && !inline) {
                    return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
                  }
                  if (!inline) {
                    const codeText = String(children).replace(/\n$/, '');
                    return <CodeBlock codeText={codeText} className={className}>{codeText}</CodeBlock>;
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Hover actions */}
          {!selectionMode && (
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-gray-300 transition-colors" title="Copy">
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              {isLastAssistant && (
                <button onClick={onRegenerate} className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-gray-300 transition-colors" title="Regenerate">
                  <RefreshCw size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}, (prevProps, nextProps) => {
  return prevProps.message === nextProps.message
    && prevProps.message?.content === nextProps.message?.content
    && prevProps.isSelected === nextProps.isSelected
    && prevProps.selectionMode === nextProps.selectionMode
    && prevProps.isLastAssistant === nextProps.isLastAssistant
    && prevProps.isLast === nextProps.isLast;
});

export default MessageBubble;
