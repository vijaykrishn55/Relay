import { memo } from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';

/**
 * MessageBubble
 * Thin orchestrator: dispatches to UserMessage or AssistantMessage based on
 * `message.role`.  Uses React.memo with a custom comparison to avoid
 * unnecessary re-renders in long chat sessions.
 */
const MessageBubble = memo(function MessageBubble({
  message,
  index,
  isLast,
  isLastAssistant,
  onRegenerate,
  onEdit,
  onRelay,
  isRelayTarget,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  if (message.role === 'user') {
    return (
      <UserMessage
        message={message}
        index={index}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onEdit={onEdit}
      />
    );
  }

  if (message.role === 'assistant') {
    return (
      <AssistantMessage
        message={message}
        index={index}
        isLastAssistant={isLastAssistant}
        onRegenerate={onRegenerate}
        onRelay={onRelay}
        isRelayTarget={isRelayTarget}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  return null;
}, (prev, next) =>
  prev.message         === next.message         &&
  prev.message?.content === next.message?.content &&
  prev.isSelected      === next.isSelected      &&
  prev.selectionMode   === next.selectionMode   &&
  prev.isLastAssistant === next.isLastAssistant &&
  prev.isRelayTarget   === next.isRelayTarget   &&
  prev.isLast          === next.isLast
);

export default MessageBubble;
