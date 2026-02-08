import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Em emulador Android use 10.0.2.2, iOS simulator usa localhost
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:3333`
  : 'https://sua-api-producao.vercel.app'; // trocar pela URL de produção

const TOKEN_KEY = 'finance-tokens';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

let tokens: Tokens | null = null;
let refreshPromise: Promise<Tokens | null> | null = null;

export async function loadTokens(): Promise<Tokens | null> {
  if (tokens) return tokens;
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    if (raw) {
      tokens = JSON.parse(raw);
      return tokens;
    }
  } catch {}
  return null;
}

export async function saveTokens(t: Tokens): Promise<void> {
  tokens = t;
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export async function clearTokens(): Promise<void> {
  tokens = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function refreshAuth(): Promise<Tokens | null> {
  const current = await loadTokens();
  if (!current?.refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = await res.json();
    const newTokens: Tokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    await saveTokens(newTokens);
    return newTokens;
  } catch {
    await clearTokens();
    return null;
  }
}

async function getValidToken(): Promise<string | null> {
  let current = await loadTokens();
  if (!current) return null;
  return current.accessToken;
}

// Faz request com retry automático em caso de 401
async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getValidToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Se 401, tenta refresh e retenta
  if (res.status === 401 && token) {
    if (!refreshPromise) {
      refreshPromise = refreshAuth();
    }
    const newTokens = await refreshPromise;
    refreshPromise = null;

    if (newTokens) {
      headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } else {
      throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
    }
  }

  if (res.status === 204) return undefined as any;

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.message || 'Erro na requisição.');
  }

  return data as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ===== AUTH =====
export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: async (refreshToken: string) => {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {}
  },

  me: () => request<{ id: string; name: string; email: string }>('/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    request<{ id: string; name: string; email: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ===== ACCOUNTS =====
export const accountsApi = {
  getAll: () => request<any[]>('/accounts'),
  create: (data: { name: string; type: string; balance: number; color: string }) =>
    request<any>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/accounts/${id}`, { method: 'DELETE' }),
};

// ===== TRANSACTIONS =====
export const transactionsApi = {
  getAll: () => request<any[]>('/transactions'),
  create: (data: any) =>
    request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/transactions/${id}`, { method: 'DELETE' }),
};

// ===== TRANSFERS =====
export const transfersApi = {
  create: (data: { fromAccountId: string; toAccountId: string; amount: number; description?: string }) =>
    request('/transfers', { method: 'POST', body: JSON.stringify(data) }),
};

// ===== CATEGORIES =====
export const categoriesApi = {
  getAll: () => request<any[]>('/categories'),
  create: (data: { name: string; icon: string; type: string }) =>
    request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/categories/${id}`, { method: 'DELETE' }),
};

// ===== INVESTMENTS =====
export const investmentsApi = {
  getAll: () => request<any[]>('/investments'),
  create: (data: any) =>
    request<any>('/investments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/investments/${id}`, { method: 'DELETE' }),
};

// ===== GOALS =====
export const goalsApi = {
  getAll: () => request<any[]>('/goals'),
  create: (data: any) =>
    request<any>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/goals/${id}`, { method: 'DELETE' }),
};
