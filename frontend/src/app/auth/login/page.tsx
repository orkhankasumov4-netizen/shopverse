'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<{
    email: string; password: string;
  }>();

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data: res } = await authApi.login(data);
      setToken(res.token);
      setUser(res.user);
      toast.success(`Welcome back, ${res.user.first_name}!`);
      router.push(res.user.role === 'admin' ? '/admin' : res.user.role === 'seller' ? '/seller/dashboard' : '/');
    } catch {
      // Error toast shown by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amazon-bg-light flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8">
        <span className="text-3xl font-display font-bold text-amazon-navy">
          shop<span className="text-amazon-orange">verse</span>
        </span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h1>
        <p className="text-sm text-gray-500 mb-6">Welcome back! Please sign in.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })}
              type="email" placeholder="you@example.com" className="input"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                {...register('password', { required: 'Password required' })}
                type={showPw ? 'text' : 'password'} placeholder="••••••••" className="input pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-xs text-amazon-teal hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-orange w-full py-3 rounded-lg disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-500">
          New to ShopVerse?{' '}
          <Link href="/auth/register" className="text-amazon-orange font-medium hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
