import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getListing, toggleLike, reportListing, markSold, deleteListing, aiCompare } from '../api/listings';
import { toggleWatchlist } from '../api/users';
import { createOrder } from '../api/orders';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart, Eye, ShoppingBag, Flag, Check, Package,
  ArrowLeft, ChevronRight, Edit2, Trash2, CheckSquare,
  Sparkles, TrendingDown, Bookmark, BookmarkCheck,
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
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [watching, setWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    getListing(id)
      .then(({ data }) => {
        setListing(data.listing);
        setLiked(!!data.listing.user_liked);
        setLikeCount(parseInt(data.listing.like_count) || 0);
        setWatching(!!data.listing.user_watched);
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

  const handleWatchlist = async () => {
    if (watchLoading) return;
    setWatchLoading(true);
    try {
      const { data } = await toggleWatchlist(id);
      setWatching(data.watching);
    } catch {}
    finally { setWatchLoading(false); }
  };

  const handleAiCompare = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiAnalysis(null);
    try {
      const { data } = await aiCompare(id);
      setAiAnalysis(data.analysis);
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI analysis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const verdictStyle = (v = '') => {
    if (v.includes('Exceptional') || v.includes('Great')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (v.includes('Good')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (v.includes('Fair')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                      liked
                        ? 'bg-red-50 border-red-200 text-red-500'
                        : 'border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400'
                    }`}
                  >
                    <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                    <span className="text-sm font-medium">{likeCount}</span>
                  </button>
                  {!isSeller && user && (
                    <button
                      onClick={handleWatchlist}
                      disabled={watchLoading}
                      title={watching ? 'Remove from watchlist' : 'Save to watchlist'}
                      className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                        watching
                          ? 'bg-blue-50 border-blue-200 text-blue-600'
                          : 'border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500'
                      }`}
                    >
                      {watchLoading
                        ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : watching
                          ? <BookmarkCheck size={15} />
                          : <Bookmark size={15} />
                      }
                    </button>
                  )}
                </div>
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

            {/* AI Market Analysis */}
            {!isSeller && isActive && user && (
              <div>
                {!aiAnalysis && !aiLoading && !aiError && (
                  <button
                    onClick={handleAiCompare}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-all text-sm font-medium"
                  >
                    <Sparkles size={15} />
                    Analyse Market Price with AI
                  </button>
                )}
                {aiLoading && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-violet-700">Analysing market prices...</p>
                      <p className="text-xs text-violet-400 mt-0.5">Comparing with NZ marketplace data</p>
                    </div>
                  </div>
                )}
                {aiAnalysis && !aiLoading && (
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-violet-500" />
                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">AI Market Analysis</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${verdictStyle(aiAnalysis.verdict)}`}>
                        {aiAnalysis.verdict}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/70 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">Listed Price</p>
                        <p className="text-lg font-bold text-blue-600">${parseFloat(listing.price).toFixed(2)}</p>
                      </div>
                      <div className="bg-white/70 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">Market Range (NZD)</p>
                        <p className="text-lg font-bold text-slate-700">${aiAnalysis.market_low}–${aiAnalysis.market_high}</p>
                      </div>
                    </div>
                    {aiAnalysis.savings_percent > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <TrendingDown size={13} className="text-emerald-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-emerald-700">~{aiAnalysis.savings_percent}% below typical market price</span>
                      </div>
                    )}
                    <p className="text-sm text-slate-700">{aiAnalysis.key_insight}</p>
                    <p className="text-xs text-slate-500">{aiAnalysis.condition_note}</p>
                    <div className="pt-1 border-t border-violet-100">
                      <p className="text-xs text-violet-600 font-medium">{aiAnalysis.buy_local_benefit}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400">Powered by Claude AI · NZ market estimates</p>
                      <button
                        onClick={() => { setAiAnalysis(null); setAiError(''); }}
                        className="text-[10px] text-violet-400 hover:text-violet-600 transition-colors"
                      >
                        Re-analyse
                      </button>
                    </div>
                  </div>
                )}
                {aiError && !aiLoading && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{aiError}</p>
                    <button onClick={handleAiCompare} className="text-xs text-red-500 hover:text-red-700 font-medium ml-3 flex-shrink-0">Retry</button>
                  </div>
                )}
              </div>
            )}

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
