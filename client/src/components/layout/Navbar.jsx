import React from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';

const NAV_BY_ROLE = {
  STUDENT: [{ name: 'My timetable', path: '/student' }],
  FACULTY: [
    { name: 'Exams', path: '/faculty/exams' },
    { name: 'Question bank', path: '/faculty/questions' }
  ],
  ADMIN: [
    { name: 'Users', path: '/admin/users' },
    { name: 'Audit log', path: '/admin/audit-logs' },
    { name: 'Exams', path: '/faculty/exams' },
    { name: 'Question bank', path: '/faculty/questions' }
  ]
};

const ROLE_LABEL = { STUDENT: 'Student', FACULTY: 'Faculty', ADMIN: 'Administrator' };

export const Wordmark = ({ to = '/dashboard', onBoard = true }) => (
  <Link to={to} className={`group flex items-center gap-2 rounded-[3px] ${onBoard ? 'text-white' : 'text-ink'}`}>
    <ShieldCheck className={`h-5 w-5 ${onBoard ? 'text-white' : 'text-board'}`} strokeWidth={2.25} aria-hidden="true" />
    <span className="display text-[1.45rem] leading-none tracking-[0.01em]">ExamShield</span>
  </Link>
);

const NavItems = ({ items, mobile }) =>
  items.map((item) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/student'}
      className={({ isActive }) =>
        mobile
          ? `relative shrink-0 px-3 py-3 text-sm font-semibold ${isActive ? 'text-white' : 'text-board-ink'}`
          : `relative flex items-center px-3 text-[15px] font-semibold transition-colors ${
              isActive ? 'text-white' : 'text-board-ink hover:text-white'
            }`
      }
    >
      {({ isActive }) => (
        <>
          {item.name}
          {isActive && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[2px] bg-hl" aria-hidden="true" />}
        </>
      )}
    </NavLink>
  ));

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="felt sticky top-0 z-40 border-b border-board-deep text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Main" className="ml-2 hidden h-full items-stretch gap-1 md:flex">
          <NavItems items={items} />
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 rounded-[5px] px-2 py-1.5 transition-colors hover:bg-white/10"
            title="Profile and security"
          >
            <span className="caps flex h-8 w-8 items-center justify-center rounded-full bg-paper text-[13px] text-board" aria-hidden="true">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-white">{user?.name || 'User'}</span>
              <span className="block text-xs text-board-ink">
                {ROLE_LABEL[user?.role] || user?.role}
                {user?.batch ? ` · ${user.batch}` : ''}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="inline-flex h-10 items-center gap-2 rounded-[5px] px-2.5 text-sm font-semibold text-board-ink transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {items.length > 1 && (
        <nav aria-label="Main (mobile)" className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 md:hidden">
          <NavItems items={items} mobile />
        </nav>
      )}
    </header>
  );
};

export default Navbar;
