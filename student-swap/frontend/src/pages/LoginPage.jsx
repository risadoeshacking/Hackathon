import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPublicSchool } from '../api/admin';
import { Mail, Lock, ArrowRight, Store } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    getPublicSchool().then(({ data }) => setSchool(data.school)).catch(() => {});
  }, []);

  const primaryColor = school?.primary_color || '#3B82F6';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}
      >
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Top: logo */}
        <div className="relative flex items-center gap-3">
          {school?.logo_url ? (
            <img
              src={school.logo_url}
              alt={school.name}
              className="h-12 w-auto object-contain drop-shadow-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Store size={24} className="text-white" />
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg leading-tight">
              {school?.name || 'StudentSwap'}
            </p>
            {school?.tagline && (
              <p className="text-white/70 text-xs mt-0.5">{school.tagline}</p>
            )}
          </div>
        </div>

        {/* Middle: hero text */}
        <div className="relative space-y-5">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your school's<br />marketplace.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xs">
            Buy and sell second-hand uniforms, textbooks, gear and more — all within your school community.
          </p>
          <div className="flex gap-8 pt-2">
            {[['100%', 'School verified'], ['Safe', 'Peer-to-peer'], ['Free', 'To list']].map(([val, label]) => (
              <div key={label}>
                <p className="text-white font-bold text-xl">{val}</p>
                <p className="text-white/60 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/40 text-sm">Only for verified school email addresses.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            {school?.logo_url ? (
              <img src={school.logo_url} alt="" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
                <Store size={18} className="text-white" />
              </div>
            )}
            <span className="font-bold text-slate-900">{school?.name || 'StudentSwap'}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1">Sign in to your school account</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">School Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder={school?.email_domain ? `25235@${school.email_domain}` : 'you@school.com'}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 text-base"
              style={{ background: primaryColor, borderColor: primaryColor }}
            >
              {loading
                ? <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                : <span className="flex items-center gap-2 justify-center">Sign In <ArrowRight size={16} /></span>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: primaryColor }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
