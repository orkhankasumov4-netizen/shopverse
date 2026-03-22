import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'buyer' | 'seller' | 'admin';
  avatar_url?: string;
}

interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price: number;
  price_adj?: number;
  thumbnail_url?: string;
  quantity: number;
  stock: number;
  slug: string;
  variant_id?: string;
  variant_name?: string;
  variant_value?: string;
}

// ── Auth Store ───────────────────────────────────────────────
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser:   (user: User | null) => void;
  setToken:  (token: string | null) => void;
  logout:    () => Promise<void>;
  fetchMe:   () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:      null,
      token:     null,
      isLoading: false,

      setUser:  (user)  => set({ user }),
      setToken: (token) => {
        set({ token });
        if (typeof window !== 'undefined') {
          token ? localStorage.setItem('token', token) : localStorage.removeItem('token');
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch {}
        set({ user: null, token: null });
        if (typeof window !== 'undefined') localStorage.removeItem('token');
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.getMe();
          set({ user: data.user });
        } catch {
          set({ user: null, token: null });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (s) => ({ token: s.token }),
    }
  )
);

// ── Cart Store (optimistic UI, synced from API) ──────────────
interface CartState {
  items:      CartItem[];
  subtotal:   number;
  itemCount:  number;
  isOpen:     boolean;
  isLoading:  boolean;
  setCart:    (items: CartItem[], subtotal: number) => void;
  setOpen:    (open: boolean) => void;
  optimisticRemove: (itemId: string) => void;
  optimisticUpdateQty: (itemId: string, qty: number) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items:     [],
  subtotal:  0,
  itemCount: 0,
  isOpen:    false,
  isLoading: false,

  setCart: (items, subtotal) =>
    set({ items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) }),

  setOpen: (open) => set({ isOpen: open }),

  optimisticRemove: (itemId) => {
    const items = get().items.filter(i => i.id !== itemId);
    const subtotal = items.reduce((s, i) => s + (i.price + (i.price_adj || 0)) * i.quantity, 0);
    set({ items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) });
  },

  optimisticUpdateQty: (itemId, qty) => {
    const items = get().items.map(i => i.id === itemId ? { ...i, quantity: qty } : i);
    const subtotal = items.reduce((s, i) => s + (i.price + (i.price_adj || 0)) * i.quantity, 0);
    set({ items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) });
  },
}));

// ── UI Store ─────────────────────────────────────────────────
interface UIState {
  searchOpen:       boolean;
  mobileMenuOpen:   boolean;
  setSearchOpen:    (v: boolean) => void;
  setMobileMenuOpen:(v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen:      false,
  mobileMenuOpen:  false,
  setSearchOpen:   (v) => set({ searchOpen: v }),
  setMobileMenuOpen:(v) => set({ mobileMenuOpen: v }),
}));
