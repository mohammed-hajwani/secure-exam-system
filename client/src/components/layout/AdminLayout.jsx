import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { Users, ScrollText } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();

  const navItems = [
    {
      name: 'User Accounts',
      path: '/admin/users',
      icon: Users
    },
    {
      name: 'System Audit Logs',
      path: '/admin/audit-logs',
      icon: ScrollText
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      {/* Sub-Navigation Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800/80 sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-850 text-zinc-100 border border-zinc-700/80 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Admin Page Outlet */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
