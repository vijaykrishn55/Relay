import { useState, useRef, useEffect } from "react";
import { Bot, User, Copy, Check, RefreshCw, Pencil, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { formatRelativeTime } from "../utils/formatTime";
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    // Extract text from the code element inside <pre>
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
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef(null);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  //auto-focus and auto-resize textarea

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  //copy clipboard

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("failed to copy");
    }
  };

  // edit user message

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

  //user massage

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end group">
        <div className="relative max-w-[70%]">
                <div className="absolute -left-20 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Copy">
                                {copied ? <Check size={14}
                                className="text-green-500" /> : <Copy size={14} 
                                />}
                        </button>
                        <button onClick={()=>{
                          setEditContent(message.content); setIsEditing(true)
                        }} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Edit">
                                <Pencil size={14} />
                        </button>
                </div>

          {isEditing ? (
            /* Edit mode */
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
            /* Normal display */
            <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          )}

          {/* Timestamp on hover */}
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
    )
  }

  // ── Assistant message ─────────────────────────────────
  if (isAssistant) {
    return (
      <div className="flex gap-3 justify-start group">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>

        <div className="relative max-w-[70%]">
          {/* Action buttons — visible on hover */}
          <div className="absolute -right-20 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Copy">
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
            {isLastAssistant && (
              <button onClick={onRegenerate} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Regenerate">
                <RefreshCw size={14} />
              </button>
            )}
          </div>

         <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
           <div className="text-sm text-gray-800 prose prose-sm max-w-none
    prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1
    prose-pre:my-2 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg
    prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
    prose-pre:relative">
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {message.content}
    </ReactMarkdown>
        </div>
</div>

          {/* Model label + timestamp */}
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.model && (
              <span className="text-[10px] text-gray-400">via {message.model}</span>
            )}
            {message.timestamp && (
              <span className="text-[10px] text-gray-400">{formatRelativeTime(message.timestamp)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default MessageBubble;
