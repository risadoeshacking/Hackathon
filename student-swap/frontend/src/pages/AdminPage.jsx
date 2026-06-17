import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Flag, Users, BarChart2, School, Tag,
  Check, X, ShieldCheck, ShieldOff, UserCog, Upload, ImagePlus,
  Globe, Phone, MapPin, Megaphone, Palette, Pencil, Trash2, Plus,
  ChevronRight, AlertCircle, Smile, ExternalLink,
} from 'lucide-react';
import * as adminApi from '../api/admin';

const TABS = [
  { id: 'listings',   label: 'Listings',    icon: ClipboardList },
  { id: 'reports',    label: 'Reports',     icon: Flag },
  { id: 'users',      label: 'Users',       icon: Users },
  { id: 'stats',      label: 'Stats',       icon: BarChart2 },
  { id: 'school',     label: 'School',      icon: School },
  { id: 'categories', label: 'Categories',  icon: Tag },
];

// ── School Settings ────────────────────────────────────────────────────────────
function SchoolSettingsTab({ notify }) {
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    adminApi.getSchool().then(({ data }) => {
      setSchool(data.school);
      setForm(data.school);
      setLogoPreview(data.school.logo_url || null);
    }).catch(() => {});
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);
    try {
      const { data } = await adminApi.uploadLogo(logoFile);
      setForm((p) => ({ ...p, logo_url: data.logo_url }));
      setLogoFile(null);
      notify('Logo uploaded');
    } catch (err) {
      notify(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.updateSchool(form);
      setSchool(data.school);
      notify('Settings saved');
    } catch (err) {
      notify(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  if (!school) return <div className="flex justify-center py-16"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="card p-6">
        <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><ImagePlus size={16} /> School Logo</h3>
        <p className="text-sm text-slate-500 mb-5">Displayed in the navbar and login page. PNG, SVG, or WebP recommended.</p>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" onError={() => setLogoPreview(null)} />
              : <School size={28} className="text-slate-300" />}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="label">Logo URL</label>
            <input
              className="input text-sm"
              placeholder="https://example.com/logo.png"
              value={form.logo_url || ''}
              onChange={(e) => { setForm((p) => ({ ...p, logo_url: e.target.value })); setLogoPreview(e.target.value || null); }}
            />
            <p className="text-xs text-slate-400">Paste a direct image URL. Upload to <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" className="text-blue-500 underline">Imgur</a> for a free host.</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><School size={16} /> School Information</h3>
        <div className="space-y-4">
          <div><label className="label">School Name</label>
            <input className="input" value={form.name || ''} onChange={set('name')} placeholder="Rosmini College" /></div>
          <div><label className="label">Tagline</label>
            <input className="input" value={form.tagline || ''} onChange={set('tagline')} placeholder="Your school's marketplace" /></div>
          <div><label className="label flex items-center gap-1.5"><Globe size={13} /> Website</label>
            <input className="input" type="url" value={form.website || ''} onChange={set('website')} placeholder="https://school.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label flex items-center gap-1.5"><MapPin size={13} /> Address</label>
              <input className="input" value={form.address || ''} onChange={set('address')} placeholder="123 School Rd" /></div>
            <div><label className="label flex items-center gap-1.5"><Phone size={13} /> Phone</label>
              <input className="input" value={form.phone || ''} onChange={set('phone')} placeholder="+64 9 000 0000" /></div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="font-bold text-slate-900 mb-1">Authentication Domain</h3>
        <p className="text-sm text-slate-500 mb-4">Only emails ending in this domain can sign up.</p>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-sm">@</span>
          <input className="input font-mono" value={form.email_domain || ''} onChange={set('email_domain')} placeholder="rosmini.school.nz" />
        </div>
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
          <AlertCircle size={12} />
          Students sign up as e.g. <span className="font-mono">25235@{form.email_domain || 'yourdomain.com'}</span>
        </p>
      </section>

      <section className="card p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Palette size={16} /> Colors</h3>
        <div className="grid grid-cols-2 gap-6">
          {[['primary_color', 'Primary Color', '#3B82F6'], ['secondary_color', 'Secondary Color', '#1E40AF']].map(([field, label, def]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form[field] || def} onChange={set(field)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white" />
                <span className="font-mono text-sm text-slate-500">{form[field] || def}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl overflow-hidden border border-slate-200">
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: form.primary_color || '#3B82F6' }}>
            {logoPreview
              ? <img src={logoPreview} alt="" className="w-6 h-6 object-contain rounded" />
              : <School size={18} className="text-white" />}
            <span className="font-bold text-white text-sm">{form.name || 'School Name'}</span>
          </div>
          <div className="p-4 bg-white flex gap-2">
            <span className="px-3 py-1 rounded-lg text-white text-xs font-semibold" style={{ background: form.primary_color || '#3B82F6' }}>Primary</span>
            <span className="px-3 py-1 rounded-lg text-white text-xs font-semibold" style={{ background: form.secondary_color || '#1E40AF' }}>Secondary</span>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><Megaphone size={16} /> Announcement Banner</h3>
        <p className="text-sm text-slate-500 mb-4">Optional banner shown on the homepage. Leave blank to hide.</p>
        <div className="space-y-3">
          <textarea className="input resize-none" rows={2} value={form.announcement || ''} onChange={set('announcement')}
            placeholder="e.g. Uniform sale ends Friday — grab yours now!" />
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Banner color</label>
            <input type="color" value={form.announcement_color || '#F59E0B'} onChange={set('announcement_color')}
              className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white" />
          </div>
          {form.announcement && (
            <div className="rounded-xl px-4 py-2.5 text-white text-sm font-medium flex items-center gap-2"
              style={{ background: form.announcement_color || '#F59E0B' }}>
              <Megaphone size={14} /> {form.announcement}
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end pb-8">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-2.5">
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

// ── Categories Tab ─────────────────────────────────────────────────────────────
const EMOJI_SUGGESTIONS = ['📦','👕','📚','⚽','💻','✏️','🎒','🎸','🎨','🎮','🍎','🏋️','🎭','🔧','💡','🌿','📷','🧪'];

function CategoriesTab({ notify }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', icon: '' });
  const [newForm, setNewForm] = useState({ name: '', icon: '📦' });
  const [adding, setAdding] = useState(false);
  const [showEmojiFor, setShowEmojiFor] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await adminApi.getCategories(); setCats(data.categories); }
    catch {}
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!newForm.name.trim()) return;
    setAdding(true);
    try { await adminApi.createCategory(newForm); setNewForm({ name: '', icon: '📦' }); notify('Category added'); fetch(); }
    catch (err) { notify(err.response?.data?.error || 'Failed'); }
    finally { setAdding(false); }
  };

  const handleUpdate = async (id) => {
    try { await adminApi.updateCategory(id, editForm); setEditingId(null); notify('Category updated'); fetch(); }
    catch (err) { notify(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try { await adminApi.deleteCategory(id); notify('Category deleted'); fetch(); }
    catch (err) { notify(err.response?.data?.error || 'Cannot delete'); }
  };

  const EmojiPicker = ({ value, onChange, id }) => (
    <div className="relative">
      <button type="button" onClick={() => setShowEmojiFor(showEmojiFor === id ? null : id)}
        className="w-10 h-10 text-lg rounded-xl border border-slate-200 bg-white hover:border-blue-300 flex items-center justify-center">
        {value || <Smile size={16} className="text-slate-400" />}
      </button>
      {showEmojiFor === id && (
        <div className="absolute top-12 left-0 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 grid grid-cols-6 gap-1 w-52">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button key={e} type="button" onClick={() => { onChange(e); setShowEmojiFor(null); }}
              className="text-lg hover:bg-slate-100 rounded-lg p-1.5">{e}</button>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Add Category</p>
        <div className="flex items-center gap-2">
          <EmojiPicker value={newForm.icon} onChange={(e) => setNewForm((f) => ({ ...f, icon: e }))} id="new" />
          <input className="input flex-1" placeholder="Category name"
            value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} disabled={adding || !newForm.name.trim()} className="btn-primary px-4">
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {cats.map((cat) => (
          <div key={cat.id} className="card p-3.5 flex items-center gap-3">
            {editingId === cat.id ? (
              <>
                <EmojiPicker value={editForm.icon} onChange={(e) => setEditForm((f) => ({ ...f, icon: e }))} id={`e-${cat.id}`} />
                <input className="input flex-1 py-2" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
                <button onClick={() => handleUpdate(cat.id)} className="btn-success text-sm py-2 px-3"><Check size={14} /></button>
                <button onClick={() => setEditingId(null)} className="btn-secondary text-sm py-2 px-3"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="text-xl w-8 text-center">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{cat.name}</p>
                  <p className="text-xs text-slate-400">{cat.listing_count} listing{cat.listing_count !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => { setEditingId(cat.id); setEditForm({ name: cat.name, icon: cat.icon }); }}
                  className="btn-ghost text-sm py-2 px-2.5"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(cat.id)}
                  className="btn-ghost text-sm py-2 px-2.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Community Card (sidebar) ───────────────────────────────────────────────────
function CommunityCard({ school }) {
  const primary = school?.primary_color || '#3B82F6';
  const secondary = school?.secondary_color || '#1E40AF';

  return (
    <div className="relative rounded-2xl overflow-hidden mt-4" style={{ minHeight: 180 }}>
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(145deg, ${primary} 0%, ${secondary} 100%)` }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute top-10 right-4 w-14 h-14 rounded-full bg-white/5" />

      {/* Content */}
      <div className="relative p-5 flex flex-col gap-3">
        {school?.logo_url ? (
          <img
            src={school.logo_url}
            alt={school?.name}
            className="h-10 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <School size={20} className="text-white" />
          </div>
        )}

        <div>
          <p className="text-white font-bold text-sm leading-tight">
            Join the Community
          </p>
          <p className="text-white/70 text-xs mt-1 leading-relaxed">
            {school?.name || 'Your School'} — connect, trade, and support fellow students.
          </p>
        </div>

        {school?.website && (
          <a
            href={school.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 transition-all w-fit"
          >
            <ExternalLink size={11} />
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState('listings');
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [userSearch, setUserSearch] = useState('');
  const [toast, setToast] = useState('');
  const [school, setSchool] = useState(null);

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    adminApi.getSchool().then(({ data: d }) => setSchool(d.school)).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'stats')    { const { data: d } = await adminApi.getStats(); setStats(d); }
      else if (tab === 'listings') { const { data: d } = await adminApi.getPendingListings({ status: statusFilter }); setData(d.listings); }
      else if (tab === 'reports')  { const { data: d } = await adminApi.getReports({ status: statusFilter }); setData(d.reports); }
      else if (tab === 'users')    { const { data: d } = await adminApi.getUsers({ search: userSearch }); setData(d.users); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (tab !== 'school' && tab !== 'categories') fetchData(); }, [tab, statusFilter]);

  const handleApprove    = async (id) => { await adminApi.approveListing(id); notify('Listing approved'); fetchData(); };
  const handleRemove     = async (id) => { await adminApi.removeListing(id);  notify('Listing removed');  fetchData(); };
  const handleReport     = async (id, status, remove_listing = false) => {
    await adminApi.reviewReport(id, { status, remove_listing, admin_notes: '' });
    notify('Report updated'); fetchData();
  };
  const handleUserToggle = async (u) => {
    await adminApi.updateUser(u.id, { is_active: !u.is_active });
    notify(`User ${u.is_active ? 'deactivated' : 'activated'}`); fetchData();
  };
  const handleRoleToggle = async (u) => {
    await adminApi.updateUser(u.id, { role: u.role === 'admin' ? 'student' : 'admin' });
    notify('Role updated'); fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl">
          <Check size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-slate-500 text-sm">Manage your school's marketplace</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-52 flex-shrink-0">
            <nav className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setStatusFilter('pending'); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    tab === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>

            {/* Community card */}
            <CommunityCard school={school} />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">

            {/* Status filter */}
            {(tab === 'listings' || tab === 'reports') && (
              <div className="flex gap-2 mb-5">
                {(tab === 'listings'
                  ? ['pending', 'active', 'removed']
                  : ['pending', 'reviewed', 'dismissed', 'actioned']
                ).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}>{s}</button>
                ))}
              </div>
            )}

            {/* User search */}
            {tab === 'users' && (
              <div className="flex gap-2 mb-5">
                <input className="input max-w-xs" placeholder="Search name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()} />
                <button onClick={fetchData} className="btn-secondary">Search</button>
              </div>
            )}

            {/* Dedicated components */}
            {tab === 'school'     && <SchoolSettingsTab notify={notify} />}
            {tab === 'categories' && <CategoriesTab notify={notify} />}

            {/* Data tabs */}
            {loading && tab !== 'school' && tab !== 'categories' ? (
              <div className="flex justify-center py-16">
                <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>

            ) : tab === 'stats' && stats ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Total Users" value={stats.users} color="blue" />
                {stats.listings?.map((r) => <StatCard key={r.status} label={`${r.status} Listings`} value={r.count} color="slate" />)}
                {stats.reports?.map((r)  => <StatCard key={r.status} label={`${r.status} Reports`}  value={r.count} color="orange" />)}
              </div>

            ) : tab === 'listings' ? (
              data.length === 0
                ? <EmptyState icon={ClipboardList} text={`No ${statusFilter} listings`} />
                : <div className="space-y-3">
                    {data.map((l) => (
                      <div key={l.id} className="card p-4 flex gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                          {l.images?.[0]
                            ? <img src={l.images[0]} alt="" className="w-full h-full object-cover" />
                            : <PackageIcon size={24} className="text-slate-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link to={`/listings/${l.id}`} target="_blank"
                                className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1 text-sm">
                                {l.title} <ChevronRight size={13} className="text-slate-400" />
                              </Link>
                              <p className="text-xs text-slate-500 mt-0.5">{l.seller_name} · {l.seller_email}</p>
                              <p className="text-blue-600 font-bold text-sm mt-1">
                                ${parseFloat(l.price).toFixed(2)} ·{' '}
                                <span className="text-slate-400 font-normal">{l.condition} · {l.category_name}</span>
                              </p>
                            </div>
                            {statusFilter === 'pending' && (
                              <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => handleApprove(l.id)} className="btn-success text-xs py-1.5 px-3">
                                  <Check size={13} /> Approve
                                </button>
                                <button onClick={() => handleRemove(l.id)} className="btn-danger text-xs py-1.5 px-3">
                                  <X size={13} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5">{new Date(l.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

            ) : tab === 'reports' ? (
              data.length === 0
                ? <EmptyState icon={Flag} text={`No ${statusFilter} reports`} />
                : <div className="space-y-3">
                    {data.map((r) => (
                      <div key={r.id} className="card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">
                              Report on:{' '}
                              <Link to={`/listings/${r.listing_id}`} target="_blank" className="text-blue-600 hover:underline">
                                {r.listing_title}
                              </Link>
                            </p>
                            <p className="text-sm text-slate-600 mt-1 italic">"{r.reason}"</p>
                            <p className="text-xs text-slate-400 mt-1">
                              By {r.reporter_name} · Seller: {r.seller_name} · {new Date(r.created_at).toLocaleString()}
                            </p>
                          </div>
                          {statusFilter === 'pending' && (
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <button onClick={() => handleReport(r.id, 'actioned', true)} className="btn-danger text-xs py-1.5 px-3">Remove listing</button>
                              <button onClick={() => handleReport(r.id, 'dismissed')} className="btn-secondary text-xs py-1.5 px-3">Dismiss</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

            ) : tab === 'users' ? (
              data.length === 0
                ? <EmptyState icon={Users} text="No users found" />
                : <div className="space-y-2">
                    {data.map((u) => (
                      <div key={u.id} className="card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {u.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">{u.full_name}</p>
                          <p className="text-xs text-slate-400">{u.email} · {u.listing_count} listing{u.listing_count !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={u.role === 'admin' ? 'badge-blue' : 'badge-gray'}>{u.role}</span>
                          <span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span>
                          <button onClick={() => handleRoleToggle(u)} className="btn-secondary text-xs py-1.5 px-3">
                            {u.role === 'admin' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                            {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                          <button onClick={() => handleUserToggle(u)}
                            className={`btn text-xs py-1.5 px-3 ${u.is_active ? 'btn-danger' : 'btn-success'}`}>
                            {u.is_active ? <UserCog size={13} /> : <Check size={13} />}
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = { blue: 'text-blue-600', slate: 'text-slate-700', orange: 'text-orange-500' };
  return (
    <div className="card p-5 text-center">
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-sm text-slate-500 mt-1 capitalize">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <Icon size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

function PackageIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
