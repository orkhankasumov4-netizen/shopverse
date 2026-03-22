'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useCartStore } from '@/store';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setCart } = useCartStore();
  const [countdown, setCountdown] = useState(10);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clear cart on success
    setCart([], 0);

    if (!sessionId) { router.replace('/'); return; }

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); router.push('/dashboard/orders'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-amazon-bg-light">
      <Navbar />
      <div className="page-container py-20 flex flex-col items-center text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 max-w-md w-full shadow-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-amazon-green" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 mb-2">Thank you for your purchase. We'll send a confirmation email shortly.</p>
          <p className="text-sm text-gray-400 mb-8">
            Redirecting to your orders in <strong className="text-amazon-orange">{countdown}s</strong>...
          </p>

          <div className="space-y-3">
            <Link href="/dashboard/orders"
              className="btn-orange w-full flex items-center justify-center gap-2 py-3 rounded-lg">
              <Package size={18} /> View My Orders
            </Link>
            <Link href="/products"
              className="btn-outline w-full flex items-center justify-center gap-2 py-3 rounded-lg">
              Continue Shopping <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
