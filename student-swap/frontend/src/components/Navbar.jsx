import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, Plus, User, LogOut, ShieldCheck, Package,
  ChevronDown, Store, Menu, X,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  const primaryColor = user?.school_primary_color || '#2563EB';
  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [{ to: '/', icon: Home, label: 'Browse' }]
    : [
        { to: '/', icon: Home, label: 'Browse' },
        { to: '/orders', icon: Package, label: 'Orders' },
      ];

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: primaryColor }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            {user?.school_logo_url
              ? <img src={user.school_logo_url} alt="" className="w-7 h-7 object-contain rounded-lg bg-white/20 p-0.5" />
              : <Store size={22} className="text-white" />}
            <span className="font-bold text-white text-lg tracking-tight">
              {user?.school_name || 'StudentSwap'}
            </span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive(to)
                      ? 'bg-white/20 text-white'
                      : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin')
                      ? 'bg-white/20 text-white'
                      : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck size={15} />
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Sell button — students only */}
                {!isAdmin && (
                  <Link to="/create" className="hidden md:flex items-center gap-1.5 btn text-sm bg-white/15 text-white hover:bg-white/25 border border-white/20">
                    <Plus size={15} />
                    List Item
                  </Link>
                )}

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        : user.full_name?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm text-white/90 font-medium max-w-[100px] truncate">
                      {user.full_name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={14} className="text-white/60 hidden md:block" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-slide-down z-50">
                      <div className="px-3.5 py-2.5 border-b border-slate-100 mb-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>

                      <Link to="/profile" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <User size={15} className="text-slate-400" /> My Profile
                      </Link>
                      <Link to="/orders" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Package size={15} className="text-slate-400" /> My Orders
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <ShieldCheck size={15} className="text-slate-400" /> Admin Panel
                        </Link>
                      )}

                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-1.5 rounded-lg text-white hover:bg-white/10"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20">Log In</Link>
                <Link to="/signup" className="btn text-sm bg-white text-blue-600 hover:bg-blue-50 font-semibold">Sign Up</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile dropdown */}
        {user && mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/10 animate-slide-down">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium">
                <Icon size={16} /> {label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium">
                <ShieldCheck size={16} /> Admin Panel
              </Link>
            )}
            {!isAdmin && (
              <Link to="/create" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium">
                <Plus size={16} /> List an Item
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Close menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
