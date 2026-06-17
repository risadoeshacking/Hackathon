import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getListing, toggleLike, reportListing, markSold, deleteListing } from '../api/listings';
import { createOrder } from '../api/orders';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart, Eye, ShoppingBag, Flag, Check, Package,
  ArrowLeft, ChevronRight, Edit2, Trash2, CheckSquare,
} from 'lucide-react';

const CONDITION_LABELS = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor' };
const CONDITION_BADGE = {
  new:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  like_new: 'bg-blue-50 text-blue-700 border-blue-200',
  good:     'bg-blue-50 text-blue-700 border-blue-200',
  fair:     'bg-amber-50 text-amber-700 border-amber-200',
  poor:     'bg-slate-50 text-slate-600 border-slate-200',
};

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getListing(id)
      .then(({ data }) => {
        setListing(data.listing);
        setLiked(!!data.listing.user_liked);
        setLikeCount(parseInt(data.listing.like_count) || 0);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleLike = async () => {
    try {
      const { data } = await toggleLike(id);
      setLiked(data.liked);
      setLikeCount((c) => (data.liked ? c + 1 : c - 1));
    } catch {}
  };

  const handleOrder = async () => {
    if (ordering) return;
    setOrdering(true);
    setError('');
    try {
      await createOrder({ listing_id: parseInt(id) });
      setOrderSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await reportListing(id, reportReason);
      setReportSent(true);
      setShowReport(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send report');
    }
  };

  const handleMarkSold = async () => {
    if (!confirm('Mark this listing as sold?')) return;
    await markSold(id);
    setListing((l) => ({ ...l, status: 'sold' }));
  };

  const handleDelete = async () => {
    if (!confirm('Remove this listing?')) return;
    await deleteListing(id);
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-slate-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 rounded-xl w-3/4" />
            <div className="h-6 bg-slate-200 rounded-xl w-1/3" />
            <div className="h-24 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const images = listing.images?.length ? listing.images : null;
  const isSeller = user?.id === listing.seller_id;
  const isActive = listing.status === 'active';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to listings
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              {images ? (
                <img
                  src={images[activeImage]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300">
                  <Package size={64} />
                  <span className="text-sm text-slate-400">No photo</span>
                </div>
              )}
            </div>
            {images && images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activeImage
                        ? 'border-blue-500 shadow-sm shadow-blue-100'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            {/* Title + like */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{listing.title}</h1>
                <button
                  onClick={handleLike}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                    liked
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400'
                  }`}
                >
                  <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                  <span className="text-sm font-medium">{likeCount}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {listing.category_name && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                    {listing.category_name}
                  </span>
                )}
                {listing.condition && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${CONDITION_BADGE[listing.condition] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {CONDITION_LABELS[listing.condition] || listing.condition}
                  </span>
                )}
                {listing.status !== 'active' && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    listing.status === 'sold'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {listing.status.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="text-4xl font-bold text-blue-600">
              ${parseFloat(listing.price).toFixed(2)}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Seller */}
            <Link
              to={`/users/${listing.seller_id}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                {listing.seller_avatar ? (
                  <img src={listing.seller_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : listing.seller_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{listing.seller_name}</p>
                <p className="text-xs text-slate-400">View profile</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
            </Link>

            {/* View count */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Eye size={13} />
              <span>{listing.view_count || 0} views</span>
              <span className="mx-1">·</span>
              <span>Listed {new Date(listing.created_at).toLocaleDateString()}</span>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}

            {/* Order success */}
            {orderSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
                <CheckSquare size={20} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold">Order placed!</p>
                  <p className="text-sm mt-0.5">
                    Contact the seller at <span className="font-medium">{listing.seller_email}</span> to arrange pickup.
                  </p>
                </div>
              </div>
            )}

            {/* Buy button */}
            {!isSeller && isActive && !orderSuccess && (
              <button
                onClick={handleOrder}
                disabled={ordering}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {ordering ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShoppingBag size={18} />
                )}
                {ordering ? 'Placing order...' : 'Buy This Item'}
              </button>
            )}

            {/* Seller controls */}
            {isSeller && (
              <div className="flex gap-2">
                <Link
                  to={`/listings/${id}/edit`}
                  className="btn-secondary flex-1 justify-center flex items-center gap-1.5 text-sm"
                >
                  <Edit2 size={14} />
                  Edit
                </Link>
                {isActive && (
                  <button
                    onClick={handleMarkSold}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm"
                  >
                    <CheckSquare size={14} />
                    Mark Sold
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="btn-danger flex-1 flex items-center justify-center gap-1.5 text-sm"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            )}

            {/* Report */}
            {!isSeller && (
              <div>
                {reportSent ? (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <Check size={14} />
                    Report submitted. Thank you.
                  </div>
                ) : showReport ? (
                  <div className="space-y-2">
                    <textarea
                      className="input text-sm"
                      rows={3}
                      placeholder="Describe why this listing is inappropriate..."
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={handleReport} className="btn-danger text-sm flex-1">Submit Report</button>
                      <button onClick={() => setShowReport(false)} className="btn-ghost text-sm flex-1">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReport(true)}
                    className="flex items-center gap-1.5 btn-ghost text-sm text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Flag size={13} />
                    Report this listing
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
