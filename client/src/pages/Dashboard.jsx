import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield, Layers } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user?.role === 'STUDENT') {
      navigate('/student', { replace: true });
    } else if (user?.role === 'FACULTY') {
      navigate('/faculty/exams', { replace: true });
    } else if (user?.role === 'ADMIN') {
      navigate('/admin/users', { replace: true });
    }
  }, [user, navigate]);


  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Welcome, <span className="text-emerald-400 font-semibold">{user?.name || 'User'}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-slate-700 rounded-xl text-sm font-medium transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        {/* User Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-semibold text-white">Your Profile Session</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <User className="w-4 h-4 text-emerald-400" />
                Email
              </div>
              <p className="text-white text-sm font-medium truncate">{user?.email}</p>
            </div>

            <div className="p-4 bg-slate-800/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4 text-emerald-400" />
                Role
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {user?.role}
              </span>
            </div>

            <div className="p-4 bg-slate-800/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4 text-emerald-400" />
                Batch
              </div>
              <p className="text-white text-sm font-medium">{user?.batch || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
