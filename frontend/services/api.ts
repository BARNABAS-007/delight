import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/api';

let _token: string | null = null;

export const setToken = (t: string | null) => { _token = t; };
export const getToken = () => _token;

async function req<T>(method: string, path: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const api = {
  // Auth
  register: (name: string, email: string, password: string) =>
    req('POST', '/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),
  googleAuth: (session_id: string) =>
    req('POST', '/auth/google', { session_id }),


  // Restaurants
  getRestaurants: async (params?: Record<string, string | number>) => {
    const page = typeof params?.page === 'number' ? params.page : 1;
    const pageSize = typeof params?.pageSize === 'number' ? params.pageSize : 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    let q = supabase
      .from('restaurants')
      .select('id, name, cuisine, description, image, cover_image, rating, review_count, delivery_time, delivery_fee, min_order, price_range, tags, is_active')
      .range(start, end);
    if (params?.search) {
      q = q.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    
    if (params?.cuisine) {
      const needle = (params.cuisine as string).toLowerCase();
      return (data ?? []).filter((r: any) =>
        Array.isArray(r.cuisine)
          ? r.cuisine.some((c: string) => c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase()))
          : typeof r.cuisine === 'string'
            ? r.cuisine.toLowerCase().includes(needle)
            : false
      );
    }
    return data ?? [];
  },
  getRestaurant: async (id: string) => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // Cart (legacy API — now handled by CartContext, kept for backward compat)
  getCart: () => req('GET', '/cart'),
  addToCart: (item: any) => req('POST', '/cart/items', item),
  updateCartItem: (itemId: string, quantity: number) =>
    req('PUT', `/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId: string) => req('DELETE', `/cart/items/${itemId}`),
  clearCart: () => req('DELETE', '/cart'),

  // Orders
  placeOrder: (order: any) => req('POST', '/orders', order),
  getOrders: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants (
          name,
          image
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Flatten the result for easier UI usage
    return data.map(o => ({
      ...o,
      restaurant_name: (o.restaurants as any)?.name,
      restaurant_image: (o.restaurants as any)?.image
    }));
  },
  getOrder: async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants (*)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return {
      ...data,
      restaurant_name: (data.restaurants as any)?.name,
      restaurant_image: (data.restaurants as any)?.image
    };
  },

  // Chat
  sendMessage: (message: string, session_id: string) =>
    req('POST', '/chat', { message, session_id }),
  getChatHistory: (session_id: string) =>
    req('GET', `/chat/history/${session_id}`),

  // Admin
  adminGetRestaurants: () => req('GET', '/admin/restaurants'),
  adminCreateRestaurant: (data: any) => req('POST', '/admin/restaurants', data),
  adminUpdateRestaurant: (id: string, data: any) => req('PUT', `/admin/restaurants/${id}`, data),
  adminDeleteRestaurant: (id: string) => req('DELETE', `/admin/restaurants/${id}`),
  adminGetOrders: () => req('GET', '/admin/orders'),
  adminUpdateOrderStatus: (id: string, status: string) =>
    req('PUT', `/admin/orders/${id}/status`, { status }),

  // Finance Settings (Admin)
  adminGetFinanceConfigs: () => req('GET', '/admin/finance'),
  adminUpdateFinanceConfig: (restaurantId: string, config: any) =>
    req('PUT', `/admin/finance/${restaurantId}`, config),
  adminGetPlatformFee: () => req('GET', '/admin/finance/platform-fee'),
  adminSetPlatformFee: (fee: number) =>
    req('PUT', '/admin/finance/platform-fee', { fee }),

  // Rapido Logistics
  triggerRapidoDelivery: (orderId: string, payload: any) =>
    req('POST', `/orders/${orderId}/rapido`, payload),
  getRapidoStatus: (bookingId: string) =>
    req('GET', `/logistics/rapido/${bookingId}`),

  // Feedback (Institutional)
  submitFeedback: (data: { type: 'student' | 'lecturer'; rating: number; comment: string; restaurant_id?: string }) =>
    req('POST', '/feedback', data),
  getFeedback: (params?: { type?: string; restaurant_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return req('GET', `/feedback${qs}`);
  },
};
