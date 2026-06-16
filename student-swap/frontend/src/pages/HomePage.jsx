import { useState, useEffect, useCallback } from 'react';
import { getListings, getCategories } from '../api/listings';
import { getPublicSchool } from '../api/admin';
import ListingGrid from '../components/ListingGrid';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import RecommendationSection from '../components/RecommendationSection';
import { Megaphone, X } from 'lucide-react';

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    category: null,
    sort: 'newest',
    min_price: '',
    max_price: '',
    condition: '',
  });

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [school, setSchool] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data.categories));
    getPublicSchool().then(({ data }) => setSchool(data.school)).catch(() => {});
  }, []);

  const fetchListings = useCallback(async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 20 };
      if (currentFilters.search) params.search = currentFilters.search;
      if (currentFilters.category) params.category = currentFilters.category;
      if (currentFilters.sort) params.sort = currentFilters.sort;
      if (currentFilters.min_price) params.min_price = currentFilters.min_price;
      if (currentFilters.max_price) params.max_price = currentFilters.max_price;
      if (currentFilters.condition) params.condition = currentFilters.condition;

      const { data } = await getListings(params);
      setListings(data.listings);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(filters, page);
  }, [filters, page, fetchListings]);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput }));
    setPage(1);
  };

  const handleCategory = (slug) => {
    setFilters((f) => ({ ...f, category: slug }));
    setPage(1);
  };

  const handleSort = (sort) => {
    setFilters((f) => ({ ...f, sort }));
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Announcement banner */}
      {school?.announcement && !bannerDismissed && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 text-white text-sm font-medium shadow-sm"
          style={{ background: school.announcement_color || '#F59E0B' }}
        >
          <Megaphone size={16} className="flex-shrink-0" />
          <span className="flex-1">{school.announcement}</span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <RecommendationSection />

      {/* Search + filters bar */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <SearchBar value={searchInput} onChange={setSearchInput} onSearch={handleSearch} />
          <button onClick={handleSearch} className="btn-primary flex-shrink-0">Search</button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex-shrink-0 gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="card p-4 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="label">Sort By</label>
                <select className="input" value={filters.sort} onChange={(e) => handleSort(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="popular">Most Viewed</option>
                </select>
              </div>
              <div>
                <label className="label">Condition</label>
                <select className="input" value={filters.condition} onChange={(e) => { setFilters((f) => ({ ...f, condition: e.target.value })); setPage(1); }}>
                  <option value="">Any</option>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="label">Min Price ($)</label>
                <input type="number" className="input" placeholder="0" value={filters.min_price} min="0"
                  onChange={(e) => { setFilters((f) => ({ ...f, min_price: e.target.value })); setPage(1); }} />
              </div>
              <div>
                <label className="label">Max Price ($)</label>
                <input type="number" className="input" placeholder="Any" value={filters.max_price} min="0"
                  onChange={(e) => { setFilters((f) => ({ ...f, max_price: e.target.value })); setPage(1); }} />
              </div>
            </div>
            {(filters.search || filters.category || filters.min_price || filters.max_price || filters.condition) && (
              <button
                onClick={() => { setFilters({ search: '', category: null, sort: 'newest', min_price: '', max_price: '', condition: '' }); setSearchInput(''); setPage(1); }}
                className="btn-ghost text-sm mt-3"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <CategoryFilter categories={categories} selected={filters.category} onSelect={handleCategory} />
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${total} listing${total !== 1 ? 's' : ''} found`}
        </p>
      </div>

      <ListingGrid listings={listings} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            ← Prev
          </button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
