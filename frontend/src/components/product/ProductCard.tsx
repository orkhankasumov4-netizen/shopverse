'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Heart, ShoppingCart, Zap } from 'lucide-react';
import { useState } from 'react';
import { cartApi, wishlistApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  compare_price?: number;
  thumbnail_url?: string;
  avg_rating?: number;
  review_count?: number;
  stock: number;
  is_featured?: boolean;
  seller_name?: string;
  category_name?: string;
}

interface Props {
  product: Product;
  variant?: 'grid' | 'list';
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(s => (
          <Star
            key={s}
            size={13}
            className={s <= Math.round(rating) ? 'fill-amazon-orange text-amazon-orange' : 'text-gray-300'}
          />
        ))}
      </div>
      <span className="text-xs text-amazon-teal hover:text-amazon-orange cursor-pointer">
        ({count?.toLocaleString() || 0})
      </span>
    </div>
  );
}

export default function ProductCard({ product, variant = 'grid' }: Props) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setCart } = useCartStore();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth/login'); return; }
    setAddingToCart(true);
    try {
      await cartApi.add({ product_id: product.id, quantity: 1 });
      const { data } = await cartApi.get();
      setCart(data.items, data.subtotal);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth/login'); return; }
    setIsWishlisted(!isWishlisted);
    try {
      isWishlisted
        ? await wishlistApi.remove(product.id)
        : await wishlistApi.add(product.id);
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist!');
    } catch {
      setIsWishlisted(!isWishlisted);
    }
  };

  if (variant === 'list') {
    return (
      <Link href={`/products/${product.slug}`}>
        <div className="product-card flex gap-4 p-4">
          <div className="relative w-40 h-40 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden">
            <Image
              src={product.thumbnail_url || 'https://via.placeholder.com/160x160?text=Product'}
              alt={product.title}
              fill className="object-contain p-2"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 hover:text-amazon-teal">
              {product.title}
            </h3>
            {product.avg_rating !== undefined && (
              <StarRating rating={product.avg_rating} count={product.review_count || 0} />
            )}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-bold text-amazon-red">${product.price.toFixed(2)}</span>
              {product.compare_price && (
                <span className="text-sm text-gray-400 line-through">${product.compare_price.toFixed(2)}</span>
              )}
              {discount > 0 && (
                <span className="badge bg-red-100 text-red-700">-{discount}%</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {product.stock > 0
                ? <span className="text-amazon-green font-medium">In Stock</span>
                : <span className="text-red-600 font-medium">Out of Stock</span>
              }
            </p>
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.stock === 0}
              className="btn-primary mt-3 text-sm flex items-center gap-2"
            >
              <ShoppingCart size={14} />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="product-card h-full flex flex-col">
        {/* Image */}
        <div className="relative bg-gray-50 overflow-hidden" style={{ paddingTop: '100%' }}>
          <Image
            src={product.thumbnail_url || 'https://via.placeholder.com/300x300?text=Product'}
            alt={product.title}
            fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount > 0 && (
              <span className="badge bg-red-600 text-white text-xs deal-badge">-{discount}%</span>
            )}
            {product.is_featured && (
              <span className="badge bg-amazon-orange text-white text-xs">
                <Zap size={10} /> Deal
              </span>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <span className="badge bg-orange-100 text-orange-700 text-xs">
                Only {product.stock} left
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-red-50"
          >
            <Heart
              size={16}
              className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          <p className="text-xs text-gray-500 mb-1">{product.seller_name}</p>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 leading-snug">
            {product.title}
          </h3>

          <div className="mt-1.5">
            {product.avg_rating !== undefined && (
              <StarRating rating={product.avg_rating} count={product.review_count || 0} />
            )}
          </div>

          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-base font-bold text-amazon-red">
              ${product.price.toFixed(2)}
            </span>
            {product.compare_price && (
              <span className="text-xs text-gray-400 line-through">
                ${product.compare_price.toFixed(2)}
              </span>
            )}
          </div>

          {product.stock === 0 ? (
            <span className="mt-2 text-xs text-red-600 font-medium">Out of Stock</span>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="mt-2 w-full btn-primary text-xs py-1.5 flex items-center justify-center gap-1.5
                         opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <ShoppingCart size={13} />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
