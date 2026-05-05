import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Copy, Check } from 'lucide-react';

// ─── Mermaid singleton init ───────────────────────────────────────────────────
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

// ─── SVG cache shared across all instances ───────────────────────────────────
export const mermaidSvgCache = new Map();

// ─── MermaidDiagram ───────────────────────────────────────────────────────────
const MermaidDiagram = memo(function MermaidDiagram({ code }) {
  const codeHash   = useMemo(() => hashCode(code || ''), [code]);
  const [svg, setSvg]           = useState(() => mermaidSvgCache.get(codeHash) || '');
  const [error, setError]       = useState(null);
  const [activeView, setActiveView] = useState('diagram');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasRendered = useRef(!!mermaidSvgCache.get(codeHash));
  const diagramRef  = useRef(null);
  const canvasRef   = useRef(null);

  // Pan + Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning      = useRef(false);
  const panStart       = useRef({ x: 0, y: 0 });
  const lastTransform  = useRef({ x: 0, y: 0 });

  // ── Render ─────────────────────────────────────────────────────────────────
  // Mindmap/elk/etc. are lazy-loaded mermaid modules that need:
  //   1) A unique SVG id that does NOT clash with any DOM element id
  //   2) A visible container (not visibility:hidden) so layout engines can measure
  //   3) The container passed as 3rd arg to mermaid.render()
  //   4) Enough time for the lazy module to load before rendering
  useEffect(() => {
    if (!code || hasRendered.current) return;
    let cancelled = false;

    const attemptRender = async (retryCount = 0) => {
      try {
        initMermaid();
        const svgId = `mmd-svg-${codeHash}-${Date.now()}`;
        const container = document.createElement('div');
        container.setAttribute('style',
          'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;overflow:hidden;opacity:0;pointer-events:none;'
        );
        document.body.appendChild(container);

        // Longer delay for lazy-loaded diagram modules (mindmap, elk, etc.)
        // These modules need time to register with the mermaid core
        await new Promise(r => setTimeout(r, retryCount === 0 ? 200 : 600));

        try {
          let cleanCode = code.trim();

          // Auto-fix common LLM syntax errors: unquoted parenthesis inside brackets
          // e.g., [Outdoor activities (cycling)] -> ["Outdoor activities (cycling)"]
          cleanCode = cleanCode.replace(/\[([^"\]]+)\]/g, (match, inner) => {
            if (inner.includes('(') || inner.includes(')')) {
              return `["${inner}"]`;
            }
            return match;
          });

          // e.g., (Outdoor activities [cycling]) -> ("Outdoor activities [cycling]")
          cleanCode = cleanCode.replace(/\(([^")]+)\)/g, (match, inner) => {
            if (inner.includes('[') || inner.includes(']')) {
              return `("${inner}")`;
            }
            return match;
          });

          // Validate syntax first — catches parse errors without corrupting renderer
          await mermaid.parse(cleanCode);

          const result = await mermaid.render(svgId, cleanCode, container);
          const renderedSvg = result?.svg || result;
          if (!cancelled && renderedSvg && typeof renderedSvg === 'string' && renderedSvg.includes('<svg')) {
            mermaidSvgCache.set(codeHash, renderedSvg);
            hasRendered.current = true;
            setSvg(renderedSvg);
            setError(null);
          } else if (!cancelled) {
            throw new Error('Empty or invalid SVG output');
          }
        } finally {
          container.remove();
          document.querySelectorAll(`#${CSS.escape(svgId)}`).forEach(el => el.remove());
        }
      } catch (err) {
        if (cancelled) return;

        // Retry once — diagram modules may not have finished loading
        if (retryCount < 1) {
          console.warn(`Mermaid render attempt ${retryCount + 1} failed, retrying...`, err?.message || err);
          return attemptRender(retryCount + 1);
        }

        console.warn('Mermaid render error:', err?.message || err);
        setError('invalid');
        setSvg('');
      }
    };

    attemptRender();
    return () => { cancelled = true; };
  }, [code, codeHash]);

  // ── Pan handlers ───────────────────────────────────────────────────────────
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

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(prev => ({ ...prev, scale: Math.min(4, Math.max(0.2, prev.scale * delta)) }));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [svg, activeView]);

  const resetView  = () => setTransform({ x: 0, y: 0, scale: 1 });
  const zoomIn     = () => setTransform(prev => ({ ...prev, scale: Math.min(4, prev.scale * 1.2) }));
  const zoomOut    = () => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale * 0.8) }));

  const handleDownload = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `diagram-${codeHash}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const toggleFullscreen = () => { setIsFullscreen(prev => !prev); setTransform({ x: 0, y: 0, scale: 1 }); };

  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mermaid-viewer">
        <div className="code-block-header">
          <span>mermaid</span>
          <button onClick={() => setShowCode(!showCode)} className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
            {showCode ? 'Hide' : 'Show'} code
          </button>
        </div>
        {showCode
          ? <pre className="code-block-body"><code>{code}</code></pre>
          : <div className="p-6 text-center text-gray-500 text-sm">
              <p>📊 Diagram preview unavailable</p>
              <p className="text-xs mt-1 text-gray-600">Click &ldquo;Show code&rdquo; to view source</p>
            </div>
        }
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!svg) {
    return (
      <div className="mermaid-viewer p-8 flex items-center justify-center">
        <div className="flex gap-1.5 items-center text-gray-500 text-xs">
          <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          <span className="ml-2">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  // ── Rendered ───────────────────────────────────────────────────────────────
  return (
    <div ref={diagramRef} className={`mermaid-viewer ${isFullscreen ? 'fixed inset-0 z-[9999] bg-obsidian/98 backdrop-blur-xl flex flex-col' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/6 bg-white/[0.02]">
        <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
          <button onClick={() => setActiveView('diagram')} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${activeView === 'diagram' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Diagram</button>
          <button onClick={() => setActiveView('code')}    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${activeView === 'code'    ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Code</button>
        </div>
        {activeView === 'diagram' && (
          <div className="flex items-center gap-0.5">
            <button onClick={zoomOut}         className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Zoom out"><ZoomOut size={13} /></button>
            <button onClick={resetView}        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">{Math.round(transform.scale * 100)}%</button>
            <button onClick={zoomIn}           className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Zoom in"><ZoomIn size={13} /></button>
            <div className="w-px h-4 bg-white/6 mx-1" />
            <button onClick={resetView}        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Reset view"><RotateCcw size={13} /></button>
            <button onClick={handleDownload}   className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Download SVG"><Download size={13} /></button>
            <button onClick={toggleFullscreen} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Fullscreen"><Maximize2 size={13} /></button>
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
        <div ref={canvasRef} className={`mermaid-canvas p-4 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}     onMouseLeave={handleMouseUp}>
          <div style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            transition: isPanning.current ? 'none' : 'transform 150ms ease-out',
            display: 'flex', justifyContent: 'center',
            height: isFullscreen ? '100%' : undefined,
            alignItems: isFullscreen ? 'center' : undefined,
          }} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      ) : (
        <pre className="code-block-body"><code>{code}</code></pre>
      )}
    </div>
  );
});

export default MermaidDiagram;
