import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPublicSchool } from '../api/admin';
import { User, Mail, Lock, ArrowRight, Store } from 'lucide-react';

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState(null);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getPublicSchool().then(({ data }) => setSchool(data.school)).catch(() => {});
  }, []);

  const allowedDomain = school?.email_domain || null;

  const validate = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (allowedDomain && !form.email.endsWith(`@${allowedDomain}`))
      return `Only @${allowedDomain} email addresses are allowed`;
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      await signup(form.email, form.password, form.full_name);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            {school?.logo_url
              ? <img src={school.logo_url} alt="" className="w-7 h-7 object-contain" />
              : <Store size={22} className="text-white" />}
          </div>
          <span className="text-white font-bold text-xl">{school?.name || 'StudentSwap'}</span>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join the<br />community.
          </h1>
          <p className="text-blue-100 text-lg">
            {school?.tagline || 'The easiest way to buy and sell within your school.'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            {['Create a free account in seconds', 'List items with photos in minutes', 'Trade safely with verified classmates'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-blue-100 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ArrowRight size={11} className="text-white" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-blue-300 text-sm">
          Only for {allowedDomain ? `@${allowedDomain}` : 'verified school'} email addresses.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">{school?.name || 'StudentSwap'}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Create account</h2>
            <p className="text-slate-500 mt-1">Join your school's marketplace</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" className="input pl-10" placeholder="Alex Johnson"
                  value={form.full_name} onChange={set('full_name')} required autoFocus />
              </div>
            </div>
            <div>
              <label className="label">School Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className="input pl-10"
                  placeholder={allowedDomain ? `25235@${allowedDomain}` : 'you@school.com'}
                  value={form.email} onChange={set('email')} required />
              </div>
              {allowedDomain && (
                <p className="text-xs text-slate-400 mt-1.5 ml-1">Must be a @{allowedDomain} address</p>
              )}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" className="input pl-10" placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} required />
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" className="input pl-10" placeholder="Repeat password"
                  value={form.confirm} onChange={set('confirm')} required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2 text-base">
              {loading
                ? <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                : <span className="flex items-center gap-2 justify-center">Create Account <ArrowRight size={16} /></span>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
