import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || '') + '/api';

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
  getRestaurants: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return req('GET', `/restaurants${qs}`);
  },
  getRestaurant: (id: string) => req('GET', `/restaurants/${id}`),

  // Cart
  getCart: () => req('GET', '/cart'),
  addToCart: (item: any) => req('POST', '/cart/items', item),
  updateCartItem: (itemId: string, quantity: number) =>
    req('PUT', `/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId: string) => req('DELETE', `/cart/items/${itemId}`),
  clearCart: () => req('DELETE', '/cart'),

  // Orders
  placeOrder: (order: any) => req('POST', '/orders', order),
  getOrders: () => req('GET', '/orders'),
  getOrder: (id: string) => req('GET', `/orders/${id}`),

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
};
