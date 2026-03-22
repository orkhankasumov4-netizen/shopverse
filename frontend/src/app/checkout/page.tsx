'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, CreditCard, Truck, CheckCircle, Tag } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import { cartApi, orderApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const schema = z.object({
  full_name:   z.string().min(2, 'Full name required'),
  line1:       z.string().min(5, 'Address required'),
  line2:       z.string().optional(),
  city:        z.string().min(2, 'City required'),
  state:       z.string().min(2, 'State required'),
  postal_code: z.string().min(4, 'Postal code required'),
  country:     z.string().default('US'),
  coupon_code: z.string().optional(),
});

type CheckoutForm = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { items, subtotal, setCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    cartApi.get().then(({ data }) => {
      setCart(data.items, data.subtotal);
      setCartLoaded(true);
      if (!data.items.length) router.push('/cart');
    });
  }, [user]);

  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const onSubmit = async (values: CheckoutForm) => {
    setLoading(true);
    try {
      const { data } = await orderApi.checkout({
        shipping_address: {
          full_name: values.full_name,
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          state: values.state,
          postal_code: values.postal_code,
          country: values.country,
        },
        coupon_code: values.coupon_code || undefined,
      });
      // Redirect to Stripe
      window.location.href = data.sessionUrl;
    } catch {
      toast.error('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div className="min-h-screen bg-amazon-bg-light">
        <Navbar />
        <div className="page-container py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon-orange" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />

      <div className="page-container py-8">
        <h1 className="text-2xl font-display font-bold text-amazon-navy mb-6">Checkout</h1>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {['Shipping', 'Payment', 'Confirmation'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                i === 0 ? 'bg-amazon-navy text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                {step}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left: Form ── */}
            <div className="flex-1 space-y-5">

              {/* Shipping Address */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-amazon-navy px-5 py-3 flex items-center gap-2">
                  <Truck size={18} className="text-amazon-yellow" />
                  <h2 className="font-semibold text-white">Shipping Address</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input {...register('full_name')} className="input"
                      placeholder="John Doe" defaultValue={`${user?.first_name} ${user?.last_name}`} />
                    {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input {...register('line1')} className="input" placeholder="123 Main Street" />
                    {errors.line1 && <p className="text-red-500 text-xs mt-1">{errors.line1.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input {...register('line2')} className="input" placeholder="Apt, Suite, etc. (optional)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input {...register('city')} className="input" placeholder="New York" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input {...register('state')} className="input" placeholder="NY" />
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input {...register('postal_code')} className="input" placeholder="10001" />
                    {errors.postal_code && <p className="text-red-500 text-xs mt-1">{errors.postal_code.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select {...register('country')} className="input">
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={18} className="text-amazon-orange" />
                  <h2 className="font-semibold">Coupon Code</h2>
                </div>
                <div className="flex gap-2">
                  <input
                    {...register('coupon_code')}
                    className="input flex-1 uppercase"
                    placeholder="Enter coupon code"
                    onChange={e => e.target.value = e.target.value.toUpperCase()}
                  />
                  <button type="button" className="btn-outline px-4">Apply</button>
                </div>
              </div>

              {/* Payment (handled by Stripe) */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-amazon-navy px-5 py-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-amazon-yellow" />
                  <h2 className="font-semibold text-white">Payment</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Shield size={20} className="text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Secure Payment via Stripe</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        You'll be redirected to Stripe's secure checkout page to enter your payment details.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    {['💳', '🏦', '📱'].map((icon, i) => (
                      <div key={i} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 flex items-center gap-1">
                        {icon} {['Card', 'Bank', 'Apple/Google Pay'][i]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-24">
                <div className="bg-gray-50 px-5 py-3 border-b">
                  <h2 className="font-semibold text-gray-900">Order Summary ({items.length} items)</h2>
                </div>

                {/* Items */}
                <div className="divide-y max-h-64 overflow-y-auto">
                  {items.map(item => {
                    const price = item.price + (item.price_adj || 0);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-4">
                        <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.thumbnail_url || 'https://via.placeholder.com/48?text=P'}
                            alt={item.title} fill className="object-contain p-1"
                          />
                          <span className="absolute -top-1 -right-1 bg-amazon-navy text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 line-clamp-2">{item.title}</p>
                        </div>
                        <span className="text-sm font-medium flex-shrink-0">
                          ${(price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="p-5 border-t space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? <span className="text-amazon-green font-medium">FREE</span> : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax (8%)</span><span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-3 border-t">
                    <span>Order Total</span><span className="text-amazon-red">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-orange w-full py-3 flex items-center justify-center gap-2 rounded-lg disabled:opacity-60"
                  >
                    {loading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Processing...</>
                    ) : (
                      <><Shield size={18} /> Place Order & Pay</>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    By placing your order, you agree to our Terms and Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
