'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, Package, DollarSign, TrendingUp, Eye, ToggleLeft, ToggleRight, X } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { productApi, orderApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function ProductModal({ product, categories, onClose, onSave }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: product
      ? { ...product, tags: (product.tags || []).join(', ') }
      : { price: '', stock: 0, tags: '' },
  });

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      price: parseFloat(data.price),
      compare_price: data.compare_price ? parseFloat(data.compare_price) : undefined,
      stock: parseInt(data.stock),
      tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    };
    try {
      if (product?.id) {
        await productApi.update(product.id, payload);
        toast.success('Product updated!');
      } else {
        await productApi.create(payload);
        toast.success('Product created!');
      }
      onSave();
      onClose();
    } catch { toast.error('Failed to save product'); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-amazon-navy rounded-t-xl">
          <h2 className="text-white font-semibold text-lg">{product?.id ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register('title', { required: 'Title is required' })} className="input" placeholder="Product title" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{String(errors.title.message)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} className="input min-h-[90px] resize-none" placeholder="Describe your product..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
              <input {...register('price', { required: 'Price is required' })} type="number" step="0.01" className="input" placeholder="29.99" />
              {errors.price && <p className="text-red-500 text-xs mt-1">{String(errors.price.message)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price ($)</label>
              <input {...register('compare_price')} type="number" step="0.01" className="input" placeholder="49.99" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input {...register('stock', { required: 'Stock required' })} type="number" className="input" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input {...register('sku')} className="input" placeholder="SKU-001" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...register('category_id')} className="input">
              <option value="">Select category</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
            <input {...register('thumbnail_url')} className="input" placeholder="https://example.com/image.jpg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input {...register('tags')} className="input" placeholder="sale, new, featured" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-orange flex-1 py-2.5 rounded-lg">{product?.id ? 'Update Product' : 'Create Product'}</button>
            <button type="button" onClick={onClose} className="btn-outline px-6 py-2.5 rounded-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab]               = useState('products');
  const [products, setProducts]     = useState<any[]>([]);
  const [orders, setOrders]         = useState<any[]>([]);
  const [stats, setStats]           = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (!['seller', 'admin'].includes(user.role)) { router.push('/'); return; }
    loadData();
    productApi.getCategories().then(({ data }) => setCategories(data.categories || []));
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, ords] = await Promise.all([
        productApi.list({ seller: user?.id, limit: 100 }),
        orderApi.sellerOrders({ limit: 50 }),
      ]);
      setProducts(prods.data.products || []);
      setOrders(ords.data.orders || []);
      setStats(ords.data.stats);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;
    await productApi.delete(id);
    toast.success('Product deleted');
    loadData();
  };

  const handleToggleActive = async (p: any) => {
    await productApi.update(p.id, { is_active: !p.is_active });
    toast.success(p.is_active ? 'Product deactivated' : 'Product activated');
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />

      {modalOpen && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => { setModalOpen(false); setEditProduct(null); }}
          onSave={loadData}
        />
      )}

      <div className="page-container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-amazon-navy">Seller Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.first_name}! Manage your store.</p>
          </div>
          <button onClick={() => { setEditProduct(null); setModalOpen(true); }} className="btn-orange flex items-center gap-2 px-5 py-2.5 rounded-lg">
            <Plus size={18} /> Add Product
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Revenue',   value: `$${parseFloat(stats?.total_revenue || 0).toFixed(2)}`,   icon: DollarSign, color: 'bg-green-500' },
            { label: 'Monthly Revenue', value: `$${parseFloat(stats?.monthly_revenue || 0).toFixed(2)}`, icon: TrendingUp,  color: 'bg-blue-500' },
            { label: 'Total Orders',    value: stats?.total_orders || 0,                                  icon: Package,    color: 'bg-purple-500' },
            { label: 'Active Products', value: products.filter(p => p.is_active).length,                  icon: Eye,        color: 'bg-orange-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
              <div className={`${color} p-2.5 rounded-xl flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
          ))}
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1 w-fit mb-5">
          {[{ id: 'products', label: 'My Products' }, { id: 'orders', label: 'Sales & Orders' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-amazon-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Products Table */}
        {tab === 'products' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="mx-auto mb-3 text-gray-200" />
                <h3 className="font-semibold text-gray-700 mb-3">No products yet</h3>
                <button onClick={() => setModalOpen(true)} className="btn-orange px-6 py-2 rounded-lg">Add Your First Product</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Product', 'Price', 'Stock', 'Sold', 'Rating', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium truncate">{p.title}</p>
                          <p className="text-xs text-gray-400">{p.category_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-amazon-red">${parseFloat(p.price).toFixed(2)}</p>
                          {p.compare_price && <p className="text-xs text-gray-400 line-through">${parseFloat(p.compare_price).toFixed(2)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.sold_count || 0}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-amazon-orange">★</span> {parseFloat(p.avg_rating || 0).toFixed(1)}
                          <span className="text-gray-400 ml-1">({p.review_count})</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleToggleActive(p)} className="flex items-center gap-1.5 text-xs font-medium">
                            {p.is_active
                              ? <><ToggleRight size={20} className="text-green-500" /><span className="text-green-600">Active</span></>
                              : <><ToggleLeft size={20} className="text-gray-400" /><span className="text-gray-500">Inactive</span></>
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditProduct(p); setModalOpen(true); }}
                              className="p-1.5 text-amazon-teal hover:text-amazon-orange hover:bg-gray-100 rounded transition-colors" title="Edit">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => handleDelete(p.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders Table */}
        {tab === 'orders' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Order #', 'Customer', 'Item', 'Qty', 'Revenue', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((o: any) => (
                    <tr key={o.item_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.customer_name}</p>
                        <p className="text-xs text-gray-400">{o.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]"><p className="truncate text-xs">{o.title}</p></td>
                      <td className="px-4 py-3 text-gray-600">{o.quantity}</td>
                      <td className="px-4 py-3 font-bold text-amazon-green">${parseFloat(o.total_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-700'}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No sales yet. Share your products to start selling!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
