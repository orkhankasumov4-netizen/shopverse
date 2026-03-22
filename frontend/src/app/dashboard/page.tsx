'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Package, Heart, MapPin, Bell, Settings, ChevronRight, LogOut } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { orderApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/store';

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  confirmed:  'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped:    'bg-indigo-100 text-indigo-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-red-100 text-red-800',
  refunded:   'bg-gray-100 text-gray-700',
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview',     icon: User },
  { id: 'orders',   label: 'My Orders',    icon: Package },
  { id: 'wishlist', label: 'Wishlist',     icon: Heart },
  { id: 'addresses',label: 'Addresses',    icon: MapPin },
  { id: 'settings', label: 'Account Settings', icon: Settings },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [tab, setTab]         = useState('overview');
  const [orders, setOrders]   = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    Promise.all([
      orderApi.list({ limit: 20 }),
      userApi.getWishlist?.() || Promise.resolve({ data: { wishlist: [] } }),
      userApi.getProfile(),
    ]).then(([o, w, p]) => {
      setOrders(o.data.orders || []);
      setWishlist(w.data.wishlist || []);
      setProfile(p.data.user);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />

      <div className="page-container py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar ── */}
          <aside className="lg:w-60 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* User header */}
              <div className="bg-amazon-navy px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amazon-orange flex items-center justify-center text-white font-bold text-xl">
                    {user.first_name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{user.first_name} {user.last_name}</p>
                    <p className="text-gray-400 text-xs capitalize">{user.role}</p>
                  </div>
                </div>
              </div>

              <nav className="py-2">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-3 w-full px-5 py-3 text-sm font-medium transition-colors ${
                      tab === id ? 'bg-amazon-yellow-light text-amazon-orange border-r-4 border-amazon-orange' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}

                <div className="border-t mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-5 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div className="flex-1 min-w-0">

            {/* Overview */}
            {tab === 'overview' && (
              <div className="space-y-5">
                <h2 className="section-heading">Welcome back, {user.first_name}! 👋</h2>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Orders', value: orders.length, icon: '📦', color: 'bg-blue-50' },
                    { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: '✅', color: 'bg-green-50' },
                    { label: 'Wishlist', value: wishlist.length, icon: '❤️', color: 'bg-red-50' },
                    { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, icon: '⏳', color: 'bg-yellow-50' },
                  ].map(stat => (
                    <div key={stat.label} className={`${stat.color} rounded-xl p-4 border border-gray-100`}>
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Recent Orders</h3>
                    <button onClick={() => setTab('orders')} className="text-amazon-teal text-sm hover:underline flex items-center gap-1">
                      View all <ChevronRight size={14} />
                    </button>
                  </div>
                  {orders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{order.order_number}</span>
                          <span className={`badge text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="font-bold text-amazon-red">${parseFloat(order.total).toFixed(2)}</span>
                      <Link href={`/dashboard/orders/${order.id}`} className="text-amazon-teal text-sm hover:underline">
                        Details
                      </Link>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package size={40} className="mx-auto mb-2 text-gray-300" />
                      <p>No orders yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {tab === 'orders' && (
              <div>
                <h2 className="section-heading mb-5">My Orders</h2>
                <div className="space-y-3">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">ORDER PLACED</p>
                            <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">TOTAL</p>
                            <p className="font-bold text-amazon-red">${parseFloat(order.total).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge ${STATUS_COLORS[order.status] || ''}`}>{order.status}</span>
                          <span className="text-xs text-gray-500">{order.order_number}</span>
                        </div>
                      </div>

                      {/* Items preview */}
                      <div className="px-5 py-3">
                        {(order.items || []).slice(0, 2).map((item: any) => (
                          <div key={item.id} className="text-sm text-gray-700 py-1">
                            {item.title} × {item.quantity}
                          </div>
                        ))}
                        {(order.items || []).length > 2 && (
                          <p className="text-xs text-gray-400">+ {order.items.length - 2} more items</p>
                        )}
                      </div>

                      <div className="px-5 pb-4 flex gap-2">
                        <Link href={`/dashboard/orders/${order.id}`} className="btn-outline text-sm px-4 py-1.5">
                          View Details
                        </Link>
                        {['pending', 'confirmed'].includes(order.status) && (
                          <button className="text-sm text-red-500 hover:underline px-2">Cancel Order</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border">
                      <Package size={48} className="mx-auto mb-3 text-gray-200" />
                      <h3 className="font-semibold text-gray-700 mb-2">No orders yet</h3>
                      <Link href="/products" className="btn-orange px-6 py-2 inline-block">Start Shopping</Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wishlist Tab */}
            {tab === 'wishlist' && (
              <div>
                <h2 className="section-heading mb-5">My Wishlist ({wishlist.length})</h2>
                {wishlist.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border">
                    <Heart size={48} className="mx-auto mb-3 text-gray-200" />
                    <h3 className="font-semibold text-gray-700 mb-2">Your wishlist is empty</h3>
                    <Link href="/products" className="btn-orange px-6 py-2 inline-block">Browse Products</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {wishlist.map((item: any) => (
                      <Link key={item.id} href={`/products/${item.slug}`}>
                        <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-3">
                          <div className="aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center">
                            <span className="text-3xl">🛍️</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                          <p className="text-amazon-red font-bold text-sm mt-1">${parseFloat(item.price).toFixed(2)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && profile && (
              <div>
                <h2 className="section-heading mb-5">Account Settings</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input className="input" defaultValue={profile.first_name} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input className="input" defaultValue={profile.last_name} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input className="input" defaultValue={profile.email} type="email" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input className="input" defaultValue={profile.phone || ''} type="tel" />
                    </div>
                  </div>
                  <button className="btn-orange px-6 py-2 mt-2">Save Changes</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
