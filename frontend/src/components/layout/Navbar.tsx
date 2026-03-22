'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ShoppingCart, User, MapPin, ChevronDown,
  Menu, X, Heart, Package, Settings, LogOut, Bell
} from 'lucide-react';
import { useAuthStore, useCartStore, useUIStore } from '@/store';
import { productApi } from '@/lib/api';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { itemCount, setOpen: setCartOpen } = useCartStore();
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [categories, setCategories]     = useState<any[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    productApi.getCategories()
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/products?search=${encodeURIComponent(search.trim())}&category=${category !== 'All' ? category : ''}`);
      setSuggestions([]);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 nav-shadow">
      {/* ── Top Bar ── */}
      <div className="bg-amazon-navy">
        <div className="page-container flex items-center gap-2 py-2">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-2">
            <span className="text-white font-display font-bold text-2xl tracking-tight">
              shop<span className="text-amazon-orange">verse</span>
            </span>
          </Link>

          {/* Deliver to */}
          <Link href="/dashboard" className="hidden lg:flex items-center gap-1 nav-link flex-shrink-0">
            <MapPin size={16} className="text-gray-400" />
            <div className="text-xs">
              <div className="text-gray-400 leading-none">Deliver to</div>
              <div className="text-white font-semibold leading-none mt-0.5">
                {user ? `${user.first_name}` : 'Select address'}
              </div>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 flex h-10 rounded-lg overflow-hidden">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="hidden md:block bg-gray-200 text-sm text-gray-700 px-2 border-r border-gray-300
                         focus:outline-none cursor-pointer min-w-[80px] max-w-[130px]"
            >
              <option value="All">All</option>
              {categories.map(c => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, brands and more..."
              className="flex-1 px-4 text-sm text-gray-900 focus:outline-none bg-white"
            />
            <button
              type="submit"
              className="bg-amazon-yellow hover:bg-amazon-orange px-4 flex items-center justify-center transition-colors"
            >
              <Search size={20} className="text-amazon-navy" />
            </button>
          </form>

          {/* Right Icons */}
          <div className="flex items-center gap-1 ml-2">

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => user ? setShowUserMenu(!showUserMenu) : router.push('/auth/login')}
                className="nav-link flex items-center gap-1"
              >
                <div className="text-xs text-left hidden sm:block">
                  <div className="text-gray-400 leading-none">
                    {user ? `Hello, ${user.first_name}` : 'Hello, sign in'}
                  </div>
                  <div className="text-white font-semibold leading-none mt-0.5 flex items-center gap-1">
                    Account <ChevronDown size={12} />
                  </div>
                </div>
                <User size={20} className="sm:hidden" />
              </button>

              {showUserMenu && user && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100
                                z-50 animate-slide-down overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      { href: '/dashboard', icon: User, label: 'My Account' },
                      { href: '/dashboard/orders', icon: Package, label: 'My Orders' },
                      { href: '/dashboard/wishlist', icon: Heart, label: 'Wishlist' },
                      ...(user.role === 'seller' ? [{ href: '/seller/dashboard', icon: Settings, label: 'Seller Dashboard' }] : []),
                      ...(user.role === 'admin'  ? [{ href: '/admin', icon: Settings, label: 'Admin Panel' }] : []),
                    ].map(({ href, icon: Icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Icon size={16} className="text-gray-400" />
                        {label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Returns */}
            <Link href="/dashboard/orders" className="nav-link hidden lg:flex flex-col text-left">
              <span className="text-xs text-gray-400 leading-none">Returns</span>
              <span className="text-sm font-semibold text-white leading-none mt-0.5">& Orders</span>
            </Link>

            {/* Wishlist */}
            {user && (
              <Link href="/dashboard/wishlist" className="nav-link flex items-center gap-1">
                <Heart size={22} />
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="nav-link flex items-center gap-1 relative"
            >
              <div className="relative">
                <ShoppingCart size={26} />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-1 bg-amazon-orange text-white text-xs font-bold
                                   rounded-full w-5 h-5 flex items-center justify-center animate-bounce-subtle">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </div>
              <span className="hidden md:block text-sm font-semibold">Cart</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-link md:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Category Bar ── */}
      <div className="bg-amazon-navy-light py-1.5">
        <div className="page-container flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <Link href="/products" className="nav-link text-sm whitespace-nowrap flex items-center gap-1">
            <Menu size={16} /> All
          </Link>
          {categories.slice(0, 8).map(cat => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="nav-link text-sm whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
          <Link href="/products?featured=true" className="nav-link text-sm whitespace-nowrap text-amazon-yellow">
            Today's Deals
          </Link>
        </div>
      </div>

      {/* ── Mobile Search ── */}
      <div className="md:hidden bg-amazon-navy pb-2 px-4">
        <form onSubmit={handleSearch} className="flex h-10 rounded-lg overflow-hidden">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 px-4 text-sm focus:outline-none bg-white"
          />
          <button type="submit" className="bg-amazon-yellow px-4 flex items-center">
            <Search size={18} className="text-amazon-navy" />
          </button>
        </form>
      </div>
    </header>
  );
}
