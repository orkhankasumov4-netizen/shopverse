'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, Grid, List, ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import ProductCard from '@/components/product/ProductCard';
import { productApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'price:asc',       label: 'Price: Low to High' },
  { value: 'price:desc',      label: 'Price: High to Low' },
  { value: 'rating:desc',     label: 'Highest Rated' },
  { value: 'sold:desc',       label: 'Best Sellers' },
];

const PRICE_RANGES = [
  { label: 'Under $25',       min: 0,   max: 25   },
  { label: '$25 – $50',       min: 25,  max: 50   },
  { label: '$50 – $100',      min: 50,  max: 100  },
  { label: '$100 – $200',     min: 100, max: 200  },
  { label: 'Over $200',       min: 200, max: 99999},
];

const RATING_FILTERS = [4, 3, 2, 1];

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`text-sm ${s <= rating ? 'text-amazon-orange' : 'text-gray-300'}`}>★</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">& Up</span>
    </span>
  );
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts]     = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [search,    setSearch]    = useState(searchParams.get('search') || '');
  const [category,  setCategory]  = useState(searchParams.get('category') || '');
  const [sortVal,   setSortVal]   = useState('created_at:desc');
  const [minPrice,  setMinPrice]  = useState(searchParams.get('minPrice') || '');
  const [maxPrice,  setMaxPrice]  = useState(searchParams.get('maxPrice') || '');
  const [minRating, setMinRating] = useState('');
  const [page,      setPage]      = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const [sort, order] = sortVal.split(':');
    try {
      const { data } = await productApi.list({
        search: debouncedSearch, category, sort, order,
        minPrice: minPrice || undefined, maxPrice: maxPrice || undefined,
        minRating: minRating || undefined, page, limit: 24,
      });
      setProducts(data.products || []);
      setPagination(data.pagination || {});
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, sortVal, minPrice, maxPrice, minRating, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    productApi.getCategories().then(({ data }) => setCategories(data.categories || []));
  }, []);

  const handlePriceRange = ({ min, max }: { min: number; max: number }) => {
    setMinPrice(min.toString());
    setMaxPrice(max === 99999 ? '' : max.toString());
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(''); setCategory(''); setSortVal('created_at:desc');
    setMinPrice(''); setMaxPrice(''); setMinRating(''); setPage(1);
  };

  const hasFilters = search || category || minPrice || maxPrice || minRating;

  const FilterSidebar = () => (
    <aside className="w-64 flex-shrink-0 space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Department</h3>
        <div className="space-y-1">
          <button
            onClick={() => { setCategory(''); setPage(1); }}
            className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${!category ? 'text-amazon-orange font-medium' : 'text-gray-700 hover:text-amazon-orange'}`}
          >
            All Departments
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.slug); setPage(1); }}
              className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${category === cat.slug ? 'text-amazon-orange font-medium' : 'text-gray-700 hover:text-amazon-orange'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Price</h3>
        <div className="space-y-1">
          {PRICE_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => { handlePriceRange(r); setPage(1); }}
              className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                minPrice === r.min.toString() ? 'text-amazon-orange font-medium' : 'text-gray-700 hover:text-amazon-orange'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number" placeholder="Min" value={minPrice}
            onChange={e => { setMinPrice(e.target.value); setPage(1); }}
            className="input text-xs py-1.5 w-full"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number" placeholder="Max" value={maxPrice}
            onChange={e => { setMaxPrice(e.target.value); setPage(1); }}
            className="input text-xs py-1.5 w-full"
          />
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Avg. Customer Review</h3>
        <div className="space-y-1">
          {RATING_FILTERS.map(r => (
            <button
              key={r}
              onClick={() => { setMinRating(minRating === r.toString() ? '' : r.toString()); setPage(1); }}
              className={`flex items-center w-full px-2 py-1.5 rounded text-sm transition-colors ${
                minRating === r.toString() ? 'bg-amazon-yellow-light' : 'hover:bg-gray-50'
              }`}
            >
              <StarRow rating={r} />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />

      <div className="page-container py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <span>Home</span> <span className="mx-2">/</span>
          <span className="text-gray-900">{category ? categories.find(c => c.slug === category)?.name || 'Products' : 'All Products'}</span>
        </nav>

        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <div className="hidden lg:block">
            <FilterSidebar />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-5 bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-sm text-gray-600">
                {loading ? '...' : (
                  <span><strong>{pagination.total || 0}</strong> results{debouncedSearch ? ` for "${debouncedSearch}"` : ''}</span>
                )}
              </div>

              <div className="flex-1" />

              {/* Mobile filter toggle */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="lg:hidden btn-outline text-sm flex items-center gap-1.5"
              >
                <SlidersHorizontal size={16} /> Filters
              </button>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortVal}
                  onChange={e => { setSortVal(e.target.value); setPage(1); }}
                  className="input text-sm py-1.5 pr-8 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Sort by</option>
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-amazon-navy text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-amazon-navy text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List size={16} />
                </button>
              </div>

              {hasFilters && (
                <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X size={14} /> Clear filters
                </button>
              )}
            </div>

            {/* Mobile filter sidebar */}
            {filtersOpen && (
              <div className="lg:hidden bg-white border border-gray-200 rounded-lg p-4 mb-5">
                <FilterSidebar />
              </div>
            )}

            {/* Products Grid / List */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <div className="skeleton aspect-square" />
                    <div className="p-3 space-y-2">
                      <div className="skeleton h-3 rounded w-3/4" />
                      <div className="skeleton h-3 rounded w-1/2" />
                      <div className="skeleton h-4 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border">
                <p className="text-4xl mb-4">🔍</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search term</p>
                <button onClick={clearFilters} className="btn-orange px-6 py-2">Clear Filters</button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(p => <ProductCard key={p.id} product={p} variant="list" />)}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline px-4 py-2 disabled:opacity-40"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        p === page ? 'bg-amazon-navy text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="btn-outline px-4 py-2 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
