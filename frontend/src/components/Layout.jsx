import {Link, useLocation} from 'react-router-dom';
import {LayoutDashboard, Play, Database} from 'lucide-react';


function Layout({children}) {
        const location = useLocation();

        const isActive =(path)=>{
                return location.pathname === path
        }
        const navItems = [
                {path:'/', icon: LayoutDashboard, label:'Dashboard'},
                {path:'/playground', icon: Play, label:'Playground'},
                {path:'/models', icon: Database, label:'Models'},
        ]

        return(
                <div className="flex min-h-screen bg-gray-50">
                        {/* sidebar */}
                        <aside className="w-64 bg-white shadow-lg">
                                <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-800">
                                                Distributed AI OS
                                        </h2>
                                        
                                </div>
                                <nav className="mt-6">
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
                        </aside>
                        {/* main content */}
                        <main className="flex-1">
                                {children}
                        </main>
                </div>
        )
}

export default Layout;
