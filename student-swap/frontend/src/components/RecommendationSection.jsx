import { useEffect, useState } from 'react';
import { getRecommendations } from '../api/recommendations';
import ListingCard from './ListingCard';
import { Sparkles, Zap } from 'lucide-react';

export default function RecommendationSection() {
  const [recs, setRecs] = useState([]);
  const [personalized, setPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecommendations(8)
      .then(({ data }) => {
        setRecs(data.recommendations);
        setPersonalized(data.personalized);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !recs.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {personalized ? <Sparkles size={18} className="text-blue-500" /> : <Zap size={18} className="text-amber-500" />}
        <h2 className="text-lg font-bold text-gray-900">
          {personalized ? 'Recommended for You' : 'New Arrivals'}
        </h2>
        {personalized && (
          <span className="badge-blue text-xs">Based on your activity</span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex-shrink-0 w-48 animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {recs.map((listing) => (
            <div key={listing.id} className="flex-shrink-0 w-48">
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
