import ListingCard from './ListingCard';
import { ShoppingBag } from 'lucide-react';

export default function ListingGrid({ listings, loading, emptyMessage = 'No listings found' }) {
  if (loading) {
    return (
      <div className="listing-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!listings?.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ShoppingBag size={48} className="mx-auto mb-3 text-gray-200" />
        <p className="text-lg font-medium text-gray-500">{emptyMessage}</p>
        <p className="text-sm mt-1">Be the first to list something!</p>
      </div>
    );
  }

  return (
    <div className="listing-grid">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
