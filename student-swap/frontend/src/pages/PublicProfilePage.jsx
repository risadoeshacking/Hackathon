import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as usersApi from '../api/users';
import ListingGrid from '../components/ListingGrid';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.getPublicProfile(id),
      usersApi.getUserListings(id),
    ])
      .then(([profileRes, listingsRes]) => {
        setProfile(profileRes.data.user);
        setListings(listingsRes.data.listings);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <div className="text-center py-16 text-gray-400">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={15} />
        Back
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : profile.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Building2 size={13} />
              {profile.school_name}
            </div>
            <p className="text-xs text-gray-400 mt-1">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{profile.active_listings}</p>
            <p className="text-xs text-gray-500">Active Listings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{profile.sold_listings}</p>
            <p className="text-xs text-gray-500">Items Sold</p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">Listings by {profile.full_name}</h3>
      <ListingGrid listings={listings} loading={false} emptyMessage="No active listings" />
    </div>
  );
}
