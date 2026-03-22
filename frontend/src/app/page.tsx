'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Zap, Truck, Shield, RefreshCw, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import ProductCard from '@/components/product/ProductCard';
import { productApi } from '@/lib/api';

const HERO_SLIDES = [
  {
    id: 1, title: 'Mega Sale', subtitle: 'Up to 70% off Electronics',
    cta: 'Shop Electronics', href: '/products?category=electronics',
    bg: 'from-blue-900 via-amazon-navy to-gray-900',
    badge: '⚡ Flash Sale',
  },
  {
    id: 2, title: 'Fashion Week', subtitle: 'New arrivals for every style',
    cta: 'Explore Fashion', href: '/products?category=fashion',
    bg: 'from-purple-900 via-pink-900 to-amazon-navy',
    badge: '🔥 Trending',
  },
  {
    id: 3, title: 'Home & Living', subtitle: 'Transform your living space',
    cta: 'Shop Home', href: '/products?category=home-garden',
    bg: 'from-green-900 via-teal-900 to-amazon-navy',
    badge: '🏠 New In',
  },
];

const FEATURES = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders over $50' },
  { icon: RefreshCw, title: 'Easy Returns', desc: '30-day return policy' },
  { icon: Shield, title: 'Secure Payments', desc: 'SSL encrypted checkout' },
  { icon: Zap, title: 'Fast Delivery', desc: '2-day delivery available' },
];

function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
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
  );
}

export default function HomePage() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [featured, setFeatured]       = useState<any[]>([]);
  const [categories, setCategories]   = useState<any[]>([]);
  const [electronics, setElectronics] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // Auto-advance hero
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      productApi.getCategories(),
      productApi.list({ featured: 'true', limit: 10 }),
      productApi.list({ category: 'electronics', limit: 10 }),
    ]).then(([cats, feat, elec]) => {
      setCategories(cats.data.categories || []);
      setFeatured(feat.data.products || []);
      setElectronics(elec.data.products || []);
    }).finally(() => setLoading(false));
  }, []);

  const slide = HERO_SLIDES[heroIdx];

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />

      {/* ── Hero Carousel ── */}
      <div className={`relative bg-gradient-to-r ${slide.bg} text-white overflow-hidden`} style={{ minHeight: 420 }}>
        {/* Animated dots background */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="page-container relative z-10 py-16 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 animate-slide-up">
            <span className="badge bg-amazon-orange text-white mb-4 text-sm">
              {slide.badge}
            </span>
            <h1 className="text-5xl lg:text-6xl font-display font-bold leading-tight mb-4">
              {slide.title}
            </h1>
            <p className="text-xl text-gray-300 mb-8">{slide.subtitle}</p>
            <Link href={slide.href}
              className="inline-flex items-center gap-2 bg-amazon-yellow hover:bg-amazon-orange
                         text-amazon-navy font-bold px-8 py-4 rounded-xl text-lg transition-all
                         hover:scale-105 shadow-lg"
            >
              {slide.cta} <ArrowRight size={20} />
            </Link>
          </div>

          {/* Slide indicators */}
          <div className="flex lg:flex-col gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === heroIdx ? 'bg-amazon-orange w-8 h-3' : 'bg-white/30 w-3 h-3 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Features bar ── */}
      <div className="bg-white border-b shadow-sm">
        <div className="page-container py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="bg-amazon-yellow rounded-full p-2.5 flex-shrink-0">
                  <Icon size={18} className="text-amazon-navy" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-8 space-y-10">

        {/* ── Category Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-heading">Shop by Category</h2>
            <Link href="/products" className="text-amazon-teal hover:text-amazon-orange text-sm font-medium flex items-center gap-1">
              See all <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100
                           hover:border-amazon-orange hover:shadow-md transition-all duration-200 text-center"
              >
                <div className="w-12 h-12 bg-amazon-yellow rounded-full flex items-center justify-center
                                group-hover:bg-amazon-orange transition-colors">
                  <span className="text-2xl">
                    {['📱','👗','🏠','⚽','📚','💄','🧸','🚗'][categories.indexOf(cat) % 8]}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-amazon-orange transition-colors leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Today's Deals ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="section-heading">Today's Deals</h2>
              <span className="badge bg-red-100 text-red-700 animate-pulse">🔥 Limited Time</span>
            </div>
            <Link href="/products?featured=true" className="text-amazon-teal hover:text-amazon-orange text-sm font-medium flex items-center gap-1">
              See all deals <ChevronRight size={16} />
            </Link>
          </div>
          {loading ? <SkeletonGrid count={5} /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featured.slice(0, 10).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        {/* ── Banner ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/products?category=electronics"
            className="relative bg-gradient-to-br from-blue-600 to-blue-900 rounded-2xl p-8 text-white
                       overflow-hidden group hover:shadow-xl transition-shadow"
          >
            <div className="relative z-10">
              <p className="text-blue-200 text-sm font-medium mb-2">Hot Category</p>
              <h3 className="text-2xl font-bold font-display mb-3">Electronics</h3>
              <p className="text-blue-200 text-sm mb-4">Latest gadgets & deals</p>
              <span className="inline-flex items-center gap-1 bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold text-sm
                               group-hover:bg-amazon-yellow group-hover:text-amazon-navy transition-colors">
                Shop Now <ArrowRight size={16} />
              </span>
            </div>
            <div className="absolute right-4 bottom-4 text-8xl opacity-20 group-hover:opacity-30 transition-opacity">📱</div>
          </Link>
          <Link href="/products?category=fashion"
            className="relative bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl p-8 text-white
                       overflow-hidden group hover:shadow-xl transition-shadow"
          >
            <div className="relative z-10">
              <p className="text-purple-200 text-sm font-medium mb-2">New Arrivals</p>
              <h3 className="text-2xl font-bold font-display mb-3">Fashion</h3>
              <p className="text-purple-200 text-sm mb-4">Trending styles this season</p>
              <span className="inline-flex items-center gap-1 bg-white text-purple-700 px-4 py-2 rounded-lg font-semibold text-sm
                               group-hover:bg-amazon-yellow group-hover:text-amazon-navy transition-colors">
                Shop Now <ArrowRight size={16} />
              </span>
            </div>
            <div className="absolute right-4 bottom-4 text-8xl opacity-20 group-hover:opacity-30 transition-opacity">👗</div>
          </Link>
        </section>

        {/* ── Electronics Section ── */}
        {electronics.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-heading">Electronics</h2>
              <Link href="/products?category=electronics" className="text-amazon-teal hover:text-amazon-orange text-sm font-medium flex items-center gap-1">
                See all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {electronics.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="bg-amazon-navy text-white mt-16">
        <div className="page-container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { title: 'Get to Know Us', links: ['About ShopVerse', 'Careers', 'Press Releases', 'Investor Relations'] },
            { title: 'Make Money With Us', links: ['Sell on ShopVerse', 'Affiliate Program', 'Advertise Your Products', 'Self-Publish'] },
            { title: 'Payment Products', links: ['Reload Your Balance', 'Currency Converter', 'Gift Cards', 'ShopVerse Cash'] },
            { title: 'Let Us Help You', links: ['Your Account', 'Track Packages', 'Returns & Replacements', 'Help Center'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="font-semibold mb-4 text-white">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link}>
                    <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-amazon-navy-light py-6 text-center">
          <p className="text-xl font-display font-bold mb-2">
            shop<span className="text-amazon-orange">verse</span>
          </p>
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} ShopVerse, Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
