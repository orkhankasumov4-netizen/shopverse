'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart, Heart, Zap, Star, Shield, Truck, RefreshCw,
  ChevronRight, Minus, Plus, Share2, AlertCircle
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { productApi, cartApi, wishlistApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/store';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { setCart, setOpen: setCartOpen } = useCartStore();

  const [product, setProduct]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [mainImage, setMainImage]   = useState('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity]     = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [tab, setTab]               = useState<'description' | 'reviews'>('description');
  const [reviews, setReviews]       = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);

  useEffect(() => {
    productApi.get(slug)
      .then(({ data }) => {
        setProduct(data.product);
        setMainImage(data.product.thumbnail_url || data.product.images?.[0] || '');
        return productApi.getReviews(data.product.id, { limit: 10 });
      })
      .then(({ data }) => {
        setReviews(data.reviews);
        setReviewStats(data.stats);
      })
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setAddingToCart(true);
    try {
      await cartApi.add({
        product_id: product.id,
        variant_id: selectedVariant?.id,
        quantity,
      });
      const { data } = await cartApi.get();
      setCart(data.items, data.subtotal);
      toast.success('Added to cart!');
      setCartOpen(true);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    router.push('/checkout');
  };

  const handleWishlist = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setIsWishlisted(!isWishlisted);
    try {
      isWishlisted ? await wishlistApi.remove(product.id) : await wishlistApi.add(product.id);
    } catch {
      setIsWishlisted(!isWishlisted);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amazon-bg-light">
        <Navbar />
        <div className="page-container py-8">
          <div className="bg-white rounded-xl p-6 flex gap-8">
            <div className="skeleton w-96 h-96 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="skeleton h-6 rounded w-3/4" />
              <div className="skeleton h-4 rounded w-1/2" />
              <div className="skeleton h-8 rounded w-1/4" />
              <div className="skeleton h-32 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const effectivePrice = product.price + (selectedVariant?.price_adj || 0);
  const discount = product.compare_price
    ? Math.round((1 - effectivePrice / product.compare_price) * 100) : 0;
  const inStock = product.stock > 0;

  // Group variants by name
  const variantGroups: Record<string, any[]> = {};
  product.variants?.forEach((v: any) => {
    if (!variantGroups[v.name]) variantGroups[v.name] = [];
    variantGroups[v.name].push(v);
  });

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />

      <div className="page-container py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-5 flex items-center gap-1">
          <Link href="/" className="hover:text-amazon-orange">Home</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-amazon-orange">Products</Link>
          {product.category_name && <>
            <ChevronRight size={14} />
            <Link href={`/products?category=${product.category_slug}`} className="hover:text-amazon-orange">
              {product.category_name}
            </Link>
          </>}
          <ChevronRight size={14} />
          <span className="text-gray-900 line-clamp-1">{product.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Images ── */}
          <div className="flex flex-col gap-3 lg:w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden aspect-square relative">
              <Image
                src={mainImage || 'https://via.placeholder.com/400x400?text=Product'}
                alt={product.title}
                fill className="object-contain p-6"
                priority
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 badge bg-red-600 text-white">-{discount}%</span>
              )}
            </div>
            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[product.thumbnail_url, ...product.images].filter(Boolean).slice(0, 6).map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(img)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden bg-white transition-colors ${
                      mainImage === img ? 'border-amazon-orange' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Center: Details ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h1 className="text-2xl font-semibold text-gray-900 leading-snug mb-3">{product.title}</h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={16}
                      className={s <= Math.round(product.avg_rating || 0)
                        ? 'fill-amazon-orange text-amazon-orange' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-sm text-amazon-teal hover:text-amazon-orange cursor-pointer">
                  {parseFloat(product.avg_rating || 0).toFixed(1)} ({product.review_count?.toLocaleString() || 0} ratings)
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">{product.sold_count?.toLocaleString()} sold</span>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-amazon-red">${effectivePrice.toFixed(2)}</span>
                  {product.compare_price && (
                    <span className="text-lg text-gray-400 line-through">${product.compare_price.toFixed(2)}</span>
                  )}
                  {discount > 0 && (
                    <span className="badge bg-red-100 text-red-700">Save {discount}%</span>
                  )}
                </div>
                {inStock && product.stock <= 10 && (
                  <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> Only {product.stock} left in stock!
                  </p>
                )}
              </div>

              {/* Variants */}
              {Object.entries(variantGroups).map(([variantName, variants]) => (
                <div key={variantName} className="mb-4">
                  <p className="text-sm font-semibold mb-2 text-gray-700">{variantName}:</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          selectedVariant?.id === v.id
                            ? 'border-amazon-orange bg-amazon-yellow-light text-amazon-navy'
                            : 'border-gray-300 hover:border-amazon-navy'
                        } ${v.stock === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                        disabled={v.stock === 0}
                      >
                        {v.value}
                        {v.price_adj > 0 && <span className="text-xs ml-1 text-gray-500">(+${v.price_adj})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity + Actions */}
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!inStock || addingToCart}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-40"
                >
                  <ShoppingCart size={18} />
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>

                <button
                  onClick={handleWishlist}
                  className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isWishlisted ? 'border-red-400 bg-red-50 text-red-500' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <Heart size={18} className={isWishlisted ? 'fill-red-500' : ''} />
                </button>
              </div>

              {inStock && (
                <button
                  onClick={handleBuyNow}
                  className="w-full btn-orange flex items-center justify-center gap-2 py-3 mt-3"
                >
                  <Zap size={18} /> Buy Now
                </button>
              )}

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t">
                {[
                  { icon: Truck, label: 'Free Shipping', sub: 'Orders over $50' },
                  { icon: Shield, label: 'Secure Payment', sub: 'SSL Encrypted' },
                  { icon: RefreshCw, label: 'Easy Returns', sub: '30-day policy' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-1">
                    <Icon size={20} className="text-amazon-green" />
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                    <span className="text-xs text-gray-400">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Seller Info ── */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
              <h3 className="font-semibold text-sm mb-3">Sold by</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-amazon-navy flex items-center justify-center text-white font-bold">
                  {product.seller_name?.[0] || 'S'}
                </div>
                <div>
                  <p className="font-medium text-sm">{product.seller_name}</p>
                  <p className="text-xs text-amazon-teal">View Store</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">SKU</span>
                  <span className="font-mono text-xs">{product.sku || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span>{product.category_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock</span>
                  <span className={inStock ? 'text-amazon-green font-medium' : 'text-red-600 font-medium'}>
                    {inStock ? `${product.stock} units` : 'Out of stock'}
                  </span>
                </div>
              </div>

              <button className="btn-outline w-full text-xs py-2 mt-4 flex items-center justify-center gap-1">
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* ── Description + Reviews Tabs ── */}
        <div className="bg-white rounded-xl border border-gray-100 mt-6 overflow-hidden">
          <div className="flex border-b">
            {(['description', 'reviews'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-4 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'border-b-2 border-amazon-orange text-amazon-navy'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'reviews' ? `Reviews (${product.review_count || 0})` : t}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'description' ? (
              <div className="prose max-w-none text-gray-700 leading-relaxed">
                {product.description || 'No description available.'}
              </div>
            ) : (
              <div>
                {reviewStats && (
                  <div className="flex items-start gap-8 mb-8 pb-6 border-b">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900">
                        {parseFloat(reviewStats.avg_rating || 0).toFixed(1)}
                      </div>
                      <div className="flex justify-center my-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={18}
                            className={s <= Math.round(reviewStats.avg_rating || 0)
                              ? 'fill-amazon-orange text-amazon-orange' : 'text-gray-200'} />
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">{reviewStats.total} reviews</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5,4,3,2,1].map(r => {
                        const count = parseInt(reviewStats[`${['','one','two','three','four','five'][r]}_star`] || 0);
                        const pct = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                        return (
                          <div key={r} className="flex items-center gap-2 text-sm">
                            <span className="w-8 text-right">{r}★</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                              <div
                                className="bg-amazon-orange h-2.5 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-gray-500">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review!</p>
                  ) : reviews.map(r => (
                    <div key={r.id} className="pb-5 border-b last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-amazon-navy flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {r.reviewer_name?.[0] || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{r.reviewer_name}</span>
                            {r.is_verified && (
                              <span className="badge bg-green-100 text-green-700 text-xs">✓ Verified</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={13}
                                  className={s <= r.rating ? 'fill-amazon-orange text-amazon-orange' : 'text-gray-200'} />
                              ))}
                            </div>
                            {r.title && <span className="text-sm font-semibold">{r.title}</span>}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
