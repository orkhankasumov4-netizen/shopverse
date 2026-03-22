'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<{
    first_name: string; last_name: string; email: string;
    password: string; confirmPassword: string; role: string;
  }>({ defaultValues: { role: 'buyer' } });

  const onSubmit = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    setLoading(true);
    try {
      const { data: res } = await authApi.register({
        email: data.email, password: data.password,
        first_name: data.first_name, last_name: data.last_name, role: data.role,
      });
      setToken(res.token);
      setUser(res.user);
      toast.success('Account created! Welcome to ShopVerse!');
      router.push('/');
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
        <p className="text-sm text-gray-500 mb-6">Join millions of shoppers today.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input {...register('first_name', { required: 'Required' })} className="input" placeholder="John" />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input {...register('last_name', { required: 'Required' })} className="input" placeholder="Doe" />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })}
              type="email" className="input" placeholder="you@example.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="Min 8 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input {...register('confirmPassword', { required: 'Required' })}
              type="password" className="input" placeholder="Repeat password" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a:</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ value: 'buyer', label: '🛍️ Buyer', sub: 'Shop products' }, { value: 'seller', label: '🏪 Seller', sub: 'Sell products' }].map(opt => (
                <label key={opt.value}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    watch('role') === opt.value ? 'border-amazon-orange bg-amazon-yellow-light' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <input {...register('role')} type="radio" value={opt.value} className="sr-only" />
                  <span className="text-lg">{opt.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{opt.sub}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-orange w-full py-3 rounded-lg disabled:opacity-60 mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          By creating an account, you agree to our Terms and Privacy Policy.
        </p>

        <div className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-amazon-orange font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
