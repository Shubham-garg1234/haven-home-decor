/**
 * API Client for Backend
 * Handles all API requests to the backend server
 */

const API_BASE_URL = 'https://haven-home-decor.vercel.app'||'http://localhost:3001/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async signup(email: string, password: string, fullName: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; session: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(token: string) {
    return this.request('/auth/logout', {
      method: 'POST',
      token,
    });
  }

  async getMe(token: string) {
    return this.request<{ user: any }>('/auth/me', {
      method: 'GET',
      token,
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ session: any }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  // Product endpoints
  async getProducts(params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request<{ products: any[] }>(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(identifier: string) {
    return this.request<{ product: any }>(`/products/${identifier}`);
  }

  async createProduct(productData: any, token: string) {
    return this.request<{ product: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
      token,
    });
  }

  async updateProduct(id: string, productData: any, token: string) {
    return this.request<{ product: any }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
      token,
    });
  }

  async deleteProduct(id: string, token: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Category endpoints
  async getCategories(active?: boolean) {
    const query = active === false ? '?active=false' : '';
    return this.request<{ categories: any[] }>(`/categories${query}`);
  }

  async getCategory(identifier: string) {
    return this.request<{ category: any }>(`/categories/${identifier}`);
  }

  async createCategory(categoryData: any, token: string) {
    return this.request<{ category: any }>('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
      token,
    });
  }

  async updateCategory(id: string, categoryData: any, token: string) {
    return this.request<{ category: any }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
      token,
    });
  }

  async deleteCategory(id: string, token: string) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Cart endpoints
  async getCart(token: string) {
    return this.request<{ items: any[] }>('/cart', {
      method: 'GET',
      token,
    });
  }

  async addToCart(productId: string, variantId: string | null, quantity: number, token: string) {
    return this.request<{ item: any }>('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, variant_id: variantId, quantity }),
      token,
    });
  }

  async updateCartItem(id: string, quantity: number, token: string) {
    return this.request<{ item: any }>(`/cart/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
      token,
    });
  }

  async removeFromCart(id: string, token: string) {
    return this.request(`/cart/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async clearCart(token: string) {
    return this.request('/cart', {
      method: 'DELETE',
      token,
    });
  }

  // Order endpoints
  async getOrders(token: string) {
    return this.request<{ orders: any[] }>('/orders', {
      method: 'GET',
      token,
    });
  }

  async getOrder(identifier: string, token: string) {
    return this.request<{ order: any }>(`/orders/${identifier}`, {
      method: 'GET',
      token,
    });
  }

  async createOrder(orderData: any, token: string) {
    return this.request<{ order: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
      token,
    });
  }

  async updateOrderStatus(id: string, status: string, token: string, paymentStatus?: string) {
    return this.request<{ order: any }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, payment_status: paymentStatus }),
      token,
    });
  }

  // Payment endpoints
  async createPaymentOrder(amount: number, currency: string, notes: any, token: string) {
    return this.request<{ order_id: string; amount: number; currency: string }>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, notes }),
      token,
    });
  }

  async verifyPayment(paymentData: any, token: string) {
    return this.request<{ verified: boolean }>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData),
      token,
    });
  }

  // Admin endpoints
  async getAdminStats(token: string) {
    return this.request<{ stats: any }>('/admin/stats', {
      method: 'GET',
      token,
    });
  }

  async getUsers(token: string, limit?: number, offset?: number) {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', String(limit));
    if (offset) queryParams.append('offset', String(offset));
    const query = queryParams.toString();
    return this.request<{ users: any[] }>(`/admin/users${query ? `?${query}` : ''}`, {
      method: 'GET',
      token,
    });
  }

  async updateUserRole(userId: string, role: 'admin' | 'customer', token: string) {
    return this.request<{ user_role: any }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
      token,
    });
  }

  // Address endpoints
  async getAddresses(token: string) {
    return this.request<{ addresses: any[] }>('/addresses', {
      method: 'GET',
      token,
    });
  }

  async createAddress(addressData: any, token: string) {
    return this.request<{ address: any }>('/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
      token,
    });
  }

  async updateAddress(id: string, addressData: any, token: string) {
    return this.request<{ address: any }>(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
      token,
    });
  }

  async deleteAddress(id: string, token: string) {
    return this.request(`/addresses/${id}`, {
      method: 'DELETE',
      token,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;

