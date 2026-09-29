import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'FACULTY':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'STUDENT':
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 group-hover:border-zinc-700 transition">
            <Shield className="w-4 h-4 text-zinc-200" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-zinc-100 tracking-tight text-sm">
              ExamShield
            </span>
            <span className="text-[10px] text-zinc-500 font-normal">
              Platform
            </span>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            title="View Profile & Security"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-zinc-200 group-hover:text-white leading-none flex items-center gap-1.5">
                <span>{user?.name || 'User'}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${getRoleBadge(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 leading-none mt-1">
                {user?.batch ? user.batch : user?.email}
              </div>
            </div>
          </Link>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-1" />


          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 sm:px-2.5 sm:py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-zinc-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

