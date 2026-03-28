import { useState, useRef, useEffect } from "react";
import { Bot, User, Copy, Check, RefreshCw, Pencil, X, CornerDownRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { formatRelativeTime } from "../utils/formatTime";
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mermaid from 'mermaid'

// Initialize mermaid once - completely disable auto-rendering and error output
let mermaidInitialized = false
function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    logLevel: 'fatal', // Only fatal errors
    suppressErrors: true,
  })
  mermaidInitialized = true
}

// Custom component to render Mermaid diagrams safely
function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    if (!code) return

    const renderDiagram = async () => {
      try {
        initMermaid()

        // Create a unique ID for this render
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

        // Create an off-screen container for rendering
        const container = document.createElement('div')
        container.id = id
        container.style.display = 'none'
        document.body.appendChild(container)

        try {
          const { svg: renderedSvg } = await mermaid.render(id, code.trim())
          setSvg(renderedSvg)
          setError(null)
        } finally {
          // Always clean up - remove the container and any error elements
          container.remove()
          // Also remove any mermaid error elements that might have been created
          document.querySelectorAll(`[id^="d${id}"]`).forEach(el => el.remove())
          document.querySelectorAll('.mermaid-error').forEach(el => el.remove())
        }
      } catch (err) {
        // Silently set error state - don't log
        setError('invalid')
        setSvg('')
      }
    }

    renderDiagram()
  }, [code])

  // On error, show the code as a styled code block
  if (error) {
    return (
      <div className="my-4 relative">
        <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-3 py-1.5 rounded-t-lg text-xs">
          <span>mermaid (diagram code)</span>
          <button
            onClick={() => setShowCode(!showCode)}
            className="hover:text-white"
          >
            {showCode ? 'Hide' : 'Show'} code
          </button>
        </div>
        {showCode ? (
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-b-lg text-xs overflow-auto max-h-64">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="bg-gray-100 border border-gray-200 rounded-b-lg p-4 text-center text-gray-500 text-sm">
            <span className="text-lg">📊</span>
            <p className="mt-1">Diagram preview unavailable</p>
            <p className="text-xs text-gray-400">Click "Show code" to view the mermaid source</p>
          </div>
        )}
      </div>
    )
  }

  return svg ? (
    <div
      className="my-4 flex justify-center overflow-auto bg-white rounded-lg p-2 border border-gray-100"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  ) : (
    <div className="animate-pulse bg-gray-100 h-32 rounded-lg flex items-center justify-center text-gray-400">
      Loading diagram...
    </div>
  )
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const codeElement = children?.props?.children
    if (!codeElement) return
    try {
      await navigator.clipboard.writeText(String(codeElement))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy code')
    }
  }

  return (
    <div className="relative group/code">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover/code:opacity-100 transition-opacity text-xs"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre>{children}</pre>
    </div>
  )
}

function MessageBubble({
  message,
  isLast,
  isLastAssistant,
  onRegenerate,
  onEdit,
  index,
  selectionMode,
  isSelected,
  onToggleSelect
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef(null);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const selected = !!isSelected

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleCopy = async (e) => {
    if (selectionMode) { e?.stopPropagation(); return }
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("failed to copy");
    }
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const handleSelectionClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(index)
    }
  }

  // ── User message ─────────────────────────────────────
  if (isUser) {
    return (
      <div
        className={`relative flex items-start gap-2 w-full ${
          selectionMode ? 'cursor-pointer' : ''
        } ${selected ? 'ring-2 ring-blue-400 rounded-xl p-1' : ''}`}
        onClick={handleSelectionClick}
      >
        {selectionMode && (
          <div className="flex items-center pt-3 pl-1 flex-shrink-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(index)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
        <div className="flex-1 flex gap-3 justify-end group">
          <div className="relative max-w-[70%]">
            {!selectionMode && (
              <div className="absolute -left-20 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Copy">
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => {
                    if (selectionMode) return
                    setEditContent(message.content); setIsEditing(true)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}

            {isEditing ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-br-sm px-4 py-3">
                <textarea
                  ref={editRef}
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-transparent text-sm text-gray-800 resize-none focus:outline-none min-w-[200px]"
                  rows={1}
                />
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={handleEditCancel} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                  <button onClick={handleEditSave} className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            )}

            {message.timestamp && (
              <p className="text-[10px] text-gray-400 mt-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                {formatRelativeTime(message.timestamp)}
              </p>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
            <User size={16} className="text-gray-600" />
          </div>
        </div>
      </div>
    )
  }

  // ── Assistant message ─────────────────────────────────
  if (isAssistant) {
    return (
      <div
        className={`relative flex items-start gap-2 w-full ${
          selectionMode ? 'cursor-pointer' : ''
        } ${selectionMode && selected ? 'ring-2 ring-blue-400 rounded-xl p-1' : ''}`}
        onClick={handleSelectionClick}
      >
        {selectionMode && (
          <div className="flex items-center pt-3 pl-1 flex-shrink-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(index)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
        <div className="flex-1 flex gap-3 justify-start group">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
            <Bot size={16} className="text-white" />
          </div>

          <div className="relative max-w-[70%]">
            {!selectionMode && (
              <div className="absolute -right-20 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Copy">
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
                {isLastAssistant && (
                  <button
                    onClick={() => {
                      if (selectionMode) return
                      onRegenerate()
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    title="Regenerate"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="text-sm text-gray-800 prose prose-sm max-w-none
                prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1
                prose-pre:my-2 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg
                prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-pre:relative">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const language = match ? match[1] : ''

                      // Render Mermaid diagrams
                      if (language === 'mermaid' && !inline) {
                        return <MermaidDiagram code={String(children).replace(/\n$/, '')} />
                      }

                      // Regular code block
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {message.model && (
                <span className="text-[10px] text-gray-400">via {message.model}</span>
              )}
              {message.timestamp && (
                <span className="text-[10px] text-gray-400">{formatRelativeTime(message.timestamp)}</span>
              )}
              {message.relayUpdated && (
                <span className="text-[10px] text-indigo-500 flex items-center gap-0.5">
                  <CornerDownRight size={8} />
                  Refined via Relay
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default MessageBubble;
