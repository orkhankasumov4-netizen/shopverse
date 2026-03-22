'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, Users, Package, ShoppingBag,
  DollarSign, Search, RefreshCw, Star, Eye
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  confirmed:  'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped:    'bg-indigo-100 text-indigo-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-red-100 text-red-800',
  paid:       'bg-green-100 text-green-800',
  failed:     'bg-red-100 text-red-800',
};

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: BarChart3 },
  { id: 'users',     label: 'Users',       icon: Users },
  { id: 'products',  label: 'Products',    icon: Package },
  { id: 'orders',    label: 'Orders',      icon: ShoppingBag },
];

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: any[] }) {
  if (!data?.length) return (
    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
  );
  const max = Math.max(...data.map((d: any) => parseFloat(d.revenue || 0)));
  return (
    <div className="flex items-end gap-1 h-48 pt-4">
      {data.slice(-30).map((d: any, i: number) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-amazon-orange rounded-t-sm hover:bg-amazon-orange-dark transition-colors"
            style={{ height: `${max > 0 ? (parseFloat(d.revenue) / max) * 180 : 2}px`, minHeight: '2px' }}
          />
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-amazon-navy text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.date}: ${parseFloat(d.revenue || 0).toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('dashboard');
  const [dashData, setDashData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getDashboard();
      setDashData(data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'users') {
      adminApi.getUsers({ search, limit: 50 }).then(({ data }) => setUsers(data.users || []));
    } else if (tab === 'products') {
      adminApi.getProducts({ search, limit: 50 }).then(({ data }) => setProducts(data.products || []));
    } else if (tab === 'orders') {
      adminApi.getOrders({ status: statusFilter, search, limit: 50 }).then(({ data }) => setOrders(data.orders || []));
    }
  }, [tab, search, statusFilter]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />
      <div className="page-container py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-amazon-navy px-5 py-4">
                <p className="text-white font-semibold font-display">Admin Panel</p>
                <p className="text-gray-400 text-xs mt-0.5">System management</p>
              </div>
              <nav className="py-2">
                {ADMIN_NAV.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`flex items-center gap-3 w-full px-5 py-3 text-sm font-medium transition-colors ${
                      tab === id ? 'bg-amazon-yellow-light text-amazon-orange border-r-4 border-amazon-orange' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={17} /> {label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Dashboard */}
            {tab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="section-heading">Platform Overview</h2>
                  <button onClick={loadDashboard} className="btn-outline text-sm flex items-center gap-1.5">
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
                  </div>
                ) : dashData && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard title="Total Revenue"
                        value={`$${parseFloat(dashData.stats?.revenue?.total_revenue || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`}
                        sub={`$${parseFloat(dashData.stats?.revenue?.monthly_revenue || 0).toFixed(0)} this month`}
                        icon={DollarSign} color="bg-green-500" />
                      <StatCard title="Total Orders"
                        value={dashData.stats?.orders?.total?.toLocaleString() || 0}
                        sub={`${dashData.stats?.orders?.pending || 0} pending`}
                        icon={ShoppingBag} color="bg-blue-500" />
                      <StatCard title="Total Users"
                        value={dashData.stats?.users?.total?.toLocaleString() || 0}
                        sub={`${dashData.stats?.users?.new_this_month || 0} new this month`}
                        icon={Users} color="bg-purple-500" />
                      <StatCard title="Active Products"
                        value={dashData.stats?.products?.active?.toLocaleString() || 0}
                        sub={`${dashData.stats?.products?.out_of_stock || 0} out of stock`}
                        icon={Package} color="bg-orange-500" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Delivered Orders', val: dashData.stats?.orders?.delivered || 0, color: 'text-amazon-green' },
                        { label: 'Active Sellers',   val: dashData.stats?.users?.sellers || 0,    color: 'text-blue-600' },
                        { label: 'Weekly Revenue',   val: `$${parseFloat(dashData.stats?.revenue?.weekly_revenue || 0).toFixed(0)}`, color: 'text-amazon-orange' },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                          <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Revenue — Last 30 Days</h3>
                      <RevenueChart data={dashData.revenueChart || []} />
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>30 days ago</span><span>Today</span>
                      </div>
                    </div>

                    {dashData.topProducts?.length > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b">
                          <h3 className="font-semibold">Top Selling Products</h3>
                        </div>
                        <div className="divide-y">
                          {dashData.topProducts.slice(0, 5).map((p: any, i: number) => (
                            <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                              <span className="text-gray-400 font-bold w-5 text-sm">#{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.title}</p>
                                <p className="text-xs text-gray-500">{p.seller_name}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-amazon-orange">
                                <Star size={12} className="fill-current" />
                                {parseFloat(p.avg_rating || 0).toFixed(1)}
                              </div>
                              <span className="text-sm font-bold text-gray-700">{p.sold_count} sold</span>
                              <span className="text-sm font-bold text-amazon-red">${parseFloat(p.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Users */}
            {tab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="section-heading">Manage Users</h2>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      className="input pl-9 text-sm py-2 w-52" placeholder="Search users..." />
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['User', 'Role', 'Status', 'Orders', 'Joined', 'Action'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-amazon-navy flex items-center justify-center text-white text-xs font-bold">
                                  {u.first_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium">{u.first_name} {u.last_name}</p>
                                  <p className="text-gray-400 text-xs">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select defaultValue={u.role}
                                onChange={e => adminApi.updateUser(u.id, { role: e.target.value }).then(() => toast.success('Role updated'))}
                                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                                <option value="buyer">Buyer</option>
                                <option value="seller">Seller</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{u.order_count || 0}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => adminApi.updateUser(u.id, { is_active: !u.is_active }).then(() => { toast.success('Updated'); setUsers(us => us.map(x => x.id === u.id ? {...x, is_active: !x.is_active} : x)); })}
                                className={`text-xs px-2 py-1 rounded border ${u.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Products */}
            {tab === 'products' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="section-heading">Manage Products</h2>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      className="input pl-9 text-sm py-2 w-52" placeholder="Search products..." />
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Product', 'Seller', 'Price', 'Stock', 'Rating', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {products.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-medium truncate">{p.title}</p>
                              <p className="text-gray-400 text-xs">{p.category_name}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{p.seller_name}</td>
                            <td className="px-4 py-3 font-bold text-amazon-red">${parseFloat(p.price).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={p.stock === 0 ? 'text-red-600 font-medium' : p.stock < 10 ? 'text-orange-500' : 'text-green-600'}>
                                {p.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-xs">
                                <Star size={12} className="fill-amazon-orange text-amazon-orange" />
                                {parseFloat(p.avg_rating || 0).toFixed(1)} ({p.review_count})
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className={`badge text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {p.is_active ? 'Active' : 'Inactive'}
                                </span>
                                {p.is_featured && <span className="badge bg-orange-100 text-orange-700 text-xs">Featured</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Link href={`/products/${p.slug}`} className="p-1 text-amazon-teal hover:text-amazon-orange hover:bg-gray-100 rounded">
                                  <Eye size={14} />
                                </Link>
                                <button
                                  onClick={() => adminApi.featureProduct(p.id).then(() => { toast.success(p.is_featured ? 'Unfeatured' : 'Featured!'); setProducts(ps => ps.map(x => x.id === p.id ? {...x, is_featured: !x.is_featured} : x)); })}
                                  className={`p-1 rounded hover:bg-gray-100 ${p.is_featured ? 'text-amazon-orange' : 'text-gray-400'}`}
                                  title="Toggle featured">
                                  <Star size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {products.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No products found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Orders */}
            {tab === 'orders' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="section-heading">Manage Orders</h2>
                  <div className="flex gap-2">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm py-2">
                      <option value="">All Statuses</option>
                      {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        className="input pl-9 text-sm py-2 w-44" placeholder="Search..." />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Order #', 'Customer', 'Total', 'Status', 'Payment', 'Date', 'Update Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs font-medium">{o.order_number}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{o.customer_name}</p>
                              <p className="text-gray-400 text-xs">{o.email}</p>
                            </td>
                            <td className="px-4 py-3 font-bold text-amazon-red">${parseFloat(o.total).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`badge text-xs ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`badge text-xs ${STATUS_COLORS[o.payment_status] || 'bg-gray-100'}`}>{o.payment_status}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(o.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <select defaultValue={o.status}
                                onChange={e => adminApi.updateOrderStatus(o.id, e.target.value).then(() => toast.success('Order updated'))}
                                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amazon-orange">
                                {['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map(s => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
