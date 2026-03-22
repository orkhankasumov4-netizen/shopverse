'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/store';
import { cartApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CartDrawer() {
  const { user } = useAuthStore();
  const { items, subtotal, itemCount, isOpen, setOpen, setCart, optimisticRemove, optimisticUpdateQty } = useCartStore();

  // Fetch cart when user changes or drawer opens
  useEffect(() => {
    if (user && isOpen) {
      cartApi.get().then(({ data }) => setCart(data.items, data.subtotal)).catch(() => {});
    }
  }, [user, isOpen]);

  const handleRemove = async (itemId: string) => {
    optimisticRemove(itemId);
    try {
      await cartApi.remove(itemId);
    } catch {
      // Revert on error
      const { data } = await cartApi.get();
      setCart(data.items, data.subtotal);
    }
  };

  const handleQtyChange = async (itemId: string, current: number, delta: number) => {
    const newQty = current + delta;
    if (newQty <= 0) { handleRemove(itemId); return; }
    optimisticUpdateQty(itemId, newQty);
    try {
      await cartApi.update(itemId, newQty);
    } catch {
      optimisticUpdateQty(itemId, current);
      toast.error('Failed to update quantity');
    }
  };

  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl
                        flex flex-col transform transition-transform duration-300 ease-in-out
                        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-amazon-navy">
          <div className="flex items-center gap-2 text-white">
            <ShoppingCart size={22} />
            <h2 className="font-bold text-lg">Shopping Cart ({itemCount})</h2>
          </div>
          <button onClick={() => setOpen(false)} className="text-white hover:text-amazon-yellow transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Free shipping banner */}
        {subtotal > 0 && subtotal < 50 && (
          <div className="bg-amazon-yellow-light px-5 py-2 text-xs text-center">
            Add <strong>${(50 - subtotal).toFixed(2)}</strong> more for <strong>FREE shipping!</strong>
          </div>
        )}
        {subtotal >= 50 && (
          <div className="bg-green-50 px-5 py-2 text-xs text-center text-amazon-green font-semibold">
            ✓ You qualify for FREE shipping!
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {!user ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <ShoppingCart size={64} className="text-gray-200" />
              <h3 className="font-semibold text-gray-700">Sign in to view your cart</h3>
              <p className="text-sm text-gray-500">Your cart items will be saved for later</p>
              <Link href="/auth/login" onClick={() => setOpen(false)} className="btn-orange w-full text-center">
                Sign In
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <ShoppingCart size={64} className="text-gray-200" />
              <h3 className="font-semibold text-gray-700">Your cart is empty</h3>
              <p className="text-sm text-gray-500">Add items to get started</p>
              <Link href="/products" onClick={() => setOpen(false)} className="btn-orange w-full text-center">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="px-5 space-y-4">
              {items.map((item) => {
                const itemPrice = item.price + (item.price_adj || 0);
                return (
                  <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                    {/* Image */}
                    <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                      <Image
                        src={item.thumbnail_url || 'https://via.placeholder.com/80x80?text=Product'}
                        alt={item.title}
                        fill className="object-contain p-1"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-amazon-teal"
                      >
                        {item.title}
                      </Link>
                      {item.variant_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.variant_name}: {item.variant_value}
                        </p>
                      )}
                      <p className="text-sm font-bold text-amazon-red mt-1">
                        ${(itemPrice * item.quantity).toFixed(2)}
                      </p>

                      {/* Qty controls + Remove */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleQtyChange(item.id, item.quantity, -1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQtyChange(item.id, item.quantity, 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div className="border-t bg-gray-50 px-5 py-4">
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({itemCount} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-amazon-green font-medium">FREE</span> : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Est. Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>Order Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="btn-orange w-full flex items-center justify-center gap-2 py-3 rounded-lg"
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="btn-outline w-full flex items-center justify-center gap-2 py-2.5 rounded-lg mt-2 text-sm"
            >
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
