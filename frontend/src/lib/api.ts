import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 15000,
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('token', data.token);
        processQueue(null, data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('token');
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toasts (skip 401 handled above and 404)
    if (error.response?.status !== 401 && error.response?.status !== 404) {
      const msg = error.response?.data?.message || 'Something went wrong';
      if (typeof window !== 'undefined') toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Typed API helpers ──────────────────────────────────────

export const authApi = {
  register: (data: any)         => api.post('/auth/register', data),
  login:    (data: any)         => api.post('/auth/login', data),
  logout:   ()                  => api.post('/auth/logout'),
  getMe:    ()                  => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data: any)   => api.post('/auth/reset-password', data),
};

export const productApi = {
  list:          (params?: any)  => api.get('/products', { params }),
  get:           (slug: string)  => api.get(`/products/${slug}`),
  create:        (data: any)     => api.post('/products', data),
  update:        (id: string, data: any) => api.put(`/products/${id}`, data),
  delete:        (id: string)    => api.delete(`/products/${id}`),
  getReviews:    (id: string, params?: any) => api.get(`/products/${id}/reviews`, { params }),
  createReview:  (id: string, data: any)    => api.post(`/products/${id}/reviews`, data),
  getCategories: ()              => api.get('/products/categories'),
};

export const cartApi = {
  get:    ()                        => api.get('/users/cart'),
  add:    (data: any)               => api.post('/users/cart', data),
  update: (itemId: string, qty: number) => api.put(`/users/cart/${itemId}`, { quantity: qty }),
  remove: (itemId: string)          => api.delete(`/users/cart/${itemId}`),
  clear:  ()                        => api.delete('/users/cart'),
};

export const wishlistApi = {
  get:    ()                        => api.get('/users/wishlist'),
  add:    (productId: string)       => api.post('/users/wishlist', { product_id: productId }),
  remove: (productId: string)       => api.delete(`/users/wishlist/${productId}`),
};

export const orderApi = {
  list:     (params?: any)          => api.get('/orders', { params }),
  get:      (id: string)            => api.get(`/orders/${id}`),
  checkout: (data: any)             => api.post('/orders/checkout', data),
  cancel:   (id: string, reason: string) => api.put(`/orders/${id}/cancel`, { reason }),
  sellerOrders: (params?: any)      => api.get('/orders/seller', { params }),
};

export const userApi = {
  getProfile:         ()            => api.get('/users/profile'),
  updateProfile:      (data: any)   => api.put('/users/profile', data),
  changePassword:     (data: any)   => api.put('/users/password', data),
  getAddresses:       ()            => api.get('/users/addresses'),
  addAddress:         (data: any)   => api.post('/users/addresses', data),
  deleteAddress:      (id: string)  => api.delete(`/users/addresses/${id}`),
  getNotifications:   ()            => api.get('/users/notifications'),
  markNotificationsRead: ()         => api.put('/users/notifications/read'),
};

export const adminApi = {
  getDashboard:   ()                => api.get('/admin/dashboard'),
  getUsers:       (params?: any)    => api.get('/admin/users', { params }),
  updateUser:     (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser:     (id: string)      => api.delete(`/admin/users/${id}`),
  getProducts:    (params?: any)    => api.get('/admin/products', { params }),
  featureProduct: (id: string)      => api.put(`/admin/products/${id}/feature`),
  getOrders:      (params?: any)    => api.get('/admin/orders', { params }),
  updateOrderStatus: (id: string, status: string) => api.put(`/admin/orders/${id}/status`, { status }),
};
