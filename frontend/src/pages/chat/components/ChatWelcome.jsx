import { Sparkles } from 'lucide-react';

/**
 * ChatWelcome
 * Full-viewport welcome screen shown when no session is active yet.
 */
function ChatWelcome({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-5 animate-fade-in max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-white/10 flex items-center justify-center mx-auto">
          <Sparkles size={28} className="text-neon-cyan" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Welcome to Relay</h1>
          <p className="text-gray-400 mt-2 text-sm">Multi-model chat with intelligent routing</p>
        </div>
        <button
          onClick={onNewChat}
          className="px-6 py-2.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/25 rounded-xl hover:bg-neon-cyan/20 transition-all text-sm font-medium"
        >
          Start New Chat
        </button>
      </div>
    </div>
  );
}

export default ChatWelcome;
