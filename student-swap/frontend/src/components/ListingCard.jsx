import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const CONDITION = {
  new:      { label: 'New',      cls: 'badge-green' },
  like_new: { label: 'Like New', cls: 'badge-blue' },
  good:     { label: 'Good',     cls: 'badge-blue' },
  fair:     { label: 'Fair',     cls: 'badge-yellow' },
  poor:     { label: 'Poor',     cls: 'badge-gray' },
};

export default function ListingCard({ listing }) {
  const cond = CONDITION[listing.condition] || { label: listing.condition, cls: 'badge-gray' };
  const image = listing.images?.[0];

  return (
    <Link to={`/listings/${listing.id}`} className="group block animate-fade-up">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">

        {/* Image */}
        <div className="aspect-square bg-slate-50 overflow-hidden relative">
          {image
            ? <img src={image} alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            : null}
          <div className={`${image ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
            <Package size={40} className="text-slate-200" />
          </div>

          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
              <span className="bg-white text-slate-900 font-bold text-sm px-3 py-1 rounded-full tracking-wide">SOLD</span>
            </div>
          )}

          {listing.category_name && (
            <div className="absolute top-2 left-2">
              <span className="bg-white/95 backdrop-blur-sm text-slate-700 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
                {listing.category_name}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5">
          <p className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-2.5 group-hover:text-blue-600 transition-colors">
            {listing.title}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-bold text-base">
              ${parseFloat(listing.price).toFixed(2)}
            </span>
            <span className={cond.cls}>{cond.label}</span>
          </div>
          {listing.seller_name && (
            <p className="text-xs text-slate-400 mt-2 truncate">{listing.seller_name}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
