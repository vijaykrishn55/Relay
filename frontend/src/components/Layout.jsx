import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Database, Brain } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import SessionList from './SessionList';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    sessions, activeSessionId,
    handleSelectSession, handleNewChat, handleDeleteSession, renameSession,
  } = useChat();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/chat', icon: MessageSquare, label: 'Chat', action: 'newChat' },
    { path: '/models', icon: Database, label: 'Models' },
    { path: '/memory', icon: Brain, label: 'Memory' },
  ];

  const handleNavClick = (e, item) => {
    if (item.action === 'newChat') {
      e.preventDefault();
      handleNewChat();
    }
  };

  return (
    <div className="h-screen flex bg-obsidian text-gray-200 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-low/80 backdrop-blur-xl border-r border-white/5 z-50">
        {/* Logo — fixed top */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
            Relay
          </h2>
          <p className="text-[10px] text-neon-cyan/60 mt-1 uppercase tracking-[0.2em] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
            SYSTEM ONLINE
          </p>
        </div>

        {/* Navigation — fixed */}
        <nav className="flex-shrink-0 border-b border-white/5 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex items-center gap-3 px-5 py-2.5 mx-2 my-0.5 rounded-lg transition-all text-sm ${
                  active
                    ? 'bg-neon-cyan/10 text-neon-cyan font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon
                  size={17}
                  className={active ? 'drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]' : ''}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Session List — scrollable, isolated */}
        <div className="flex-1 min-h-0 sidebar-scroll">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={handleSelectSession}
            onCreate={handleNewChat}
            onDelete={handleDeleteSession}
            onRename={renameSession}
          />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-purple/8 via-transparent to-transparent -z-10 blur-3xl pointer-events-none" />
        {children}
      </main>
    </div>
  );
}

export default Layout;
