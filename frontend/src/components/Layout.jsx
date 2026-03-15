import {Link, useLocation} from 'react-router-dom';
import {LayoutDashboard, MessageSquare, Database, Brain} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import SessionList from './SessionList';


function Layout({children}) {
        const location = useLocation();

        const {
                sessions, activeSessionId,
                handleSelectSession, handleNewChat, handleDeleteSession, renameSession,
        } = useChat();

        const isActive =(path)=>{
                return location.pathname === path
        }
        const navItems = [
                {path:'/', icon: LayoutDashboard, label:'Dashboard'},
                {path:'/chat', icon: MessageSquare, label:'Chat'},
                {path:'/models', icon: Database, label:'Models'},
                {path:'/memory', icon: Brain, label:'Memory'},
        ]

        return(
                <div className="min-h-screen bg-gray-50">
                        {/* sidebar */}
                        <aside className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg flex flex-col z-50">
                                <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-800">Relay</h2>
                                        <p className="text-xs text-gray-400 mt-1">AI Model Router</p>
                                </div>
                                <nav className="mt-2">
                                        {navItems.map((item)=>{
                                                const Icon= item.icon;
                                                const active = isActive(item.path);
                                                return (
                                                        <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        className={`flex items-center gap-3 px-6 py-3 transition-colors ${active ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                        <Icon size={20}/>
                                                        <span className="font-medium">{item.label}</span>
                                                        </Link>
                                                )
                                        })}
                                </nav>

                                {/* Session list — always visible */}
                                <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-100 mt-3">
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
                        {/* main content offset by sidebar width */}
                        <main className="ml-64 min-h-screen">
                                {children}
                        </main>
                </div>
        )
}

export default Layout;
