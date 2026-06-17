import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as usersApi from '../api/users';
import * as ordersApi from '../api/orders';
import { getWatchlist } from '../api/listings';
import ListingCard from '../components/ListingCard';
import {
  CheckCircle, Clock, CheckCheck, Heart, Package,
  ShoppingBag, Building2, Check, Plus, Bookmark,
} from 'lucide-react';

const TABS = [
  { id: 'active',    label: 'Active',    Icon: CheckCircle },
  { id: 'pending',   label: 'Pending',   Icon: Clock },
  { id: 'sold',      label: 'Sold',      Icon: CheckCheck },
  { id: 'liked',     label: 'Liked',     Icon: Heart },
  { id: 'watchlist', label: 'Watchlist',  Icon: Bookmark },
  { id: 'purchases', label: 'Purchases', Icon: Package },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'active');
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', avatar_url: '' });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    usersApi.getProfile().then(({ data }) => {
      setProfile(data.user);
      setEditForm({ full_name: data.user.full_name, avatar_url: data.user.avatar_url || '' });
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === 'liked') {
      usersApi.getLikedListings().then(({ data }) => setListings(data.listings)).finally(() => setLoading(false));
    } else if (tab === 'watchlist') {
      getWatchlist().then(({ data }) => setListings(data.listings)).finally(() => setLoading(false));
    } else if (tab === 'purchases') {
      ordersApi.getMyOrders('buyer').then(({ data }) => setOrders(data.orders)).finally(() => setLoading(false));
    } else {
      usersApi.getMyListings(tab).then(({ data }) => setListings(data.listings)).finally(() => setLoading(false));
    }
  }, [tab]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'active') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', newTab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSaveProfile = async () => {
    try {
      await usersApi.updateProfile(editForm);
      await refreshUser();
      setSaveMsg('Profile updated!');
      setEditing(false);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {}
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden shadow-sm">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : profile.full_name?.[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input
                    className="input"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="Full name"
                  />
                  <input
                    className="input"
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    placeholder="Avatar URL (optional)"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} className="btn-primary text-sm">Save</button>
                    <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                  <div className="flex items-center gap-1 text-sm text-slate-400 mt-0.5">
                    <Building2 size={13} />
                    <span>{profile.school_name}</span>
                  </div>
                  {user?.role === 'admin' && (
                    <span className="badge-blue mt-1 inline-block">Admin</span>
                  )}
                </>
              )}
            </div>

            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm flex-shrink-0">
                Edit Profile
              </button>
            )}
          </div>

          {saveMsg && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 mt-3">
              <Check size={14} />
              {saveMsg}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{profile.active_listings}</p>
              <p className="text-xs text-slate-400 mt-0.5">Active Listings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{profile.sold_listings}</p>
              <p className="text-xs text-slate-400 mt-0.5">Items Sold</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{profile.purchases}</p>
              <p className="text-xs text-slate-400 mt-0.5">Purchases</p>
            </div>
          </div>
        </div>

        {/* List item CTA */}
        <Link
          to="/create"
          className="flex items-center justify-center gap-2 btn-primary w-full mb-6 py-3 text-base"
        >
          <Plus size={18} />
          List an Item for Sale
        </Link>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {TABS.map(({ id: tid, label, Icon }) => (
            <button
              key={tid}
              onClick={() => handleTabChange(tid)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                tab === tid
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'purchases' ? (
          loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package size={48} className="mx-auto mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">No purchases yet</p>
              <p className="text-sm mt-1">Browse the marketplace to find something you like</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                    {order.images?.[0] ? (
                      <img src={order.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : <Package size={24} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{order.title}</p>
                    <p className="text-sm text-slate-500">From: {order.seller_name}</p>
                    <p className="text-blue-600 font-semibold">${parseFloat(order.price).toFixed(2)}</p>
                  </div>
                  <span className={`badge flex-shrink-0 ${
                    order.status === 'completed' ? 'badge-green'
                    : order.status === 'cancelled' ? 'badge-red'
                    : 'badge-yellow'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          loading ? (
            <div className="listing-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-slate-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-lg" />
                    <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingBag size={48} className="mx-auto mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">No {tab} listings</p>
            </div>
          ) : (
            <div className="listing-grid">
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
