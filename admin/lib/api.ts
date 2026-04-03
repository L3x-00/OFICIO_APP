const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Ahora endpoint debe empezar con /admin o /reviews, etc.
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ── MÉTRICAS Y ANALYTICS ───────────────────────────────────
export const getDashboardMetrics = () =>
  fetchApi<DashboardMetrics>('/admin/metrics');

export const getGraceProviders = () =>
  fetchApi<GraceProvider[]>('/admin/grace-providers');

export const getAnalytics = (days: number = 30) =>
  fetchApi<AnalyticsResponse>(`/admin/analytics?days=${days}`, {
    next: { revalidate: 60 }
  });

// ── PROVEEDORES (RUTAS CORREGIDAS /admin/...) ─────────────
export const getProviders = (page = 1, search?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: '15' });
  if (search) params.append('search', search);
  return fetchApi<ProvidersResponse>(`/admin/providers?${params}`);
};

export const getFormOptions = () => 
  fetchApi<{ categories: any[], localities: any[] }>('/admin/form-options');

export const createProvider = (data: any) =>
  fetchApi('/admin/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateProvider = (id: number, data: any) =>
  fetchApi(`/admin/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteProvider = (id: number) =>
  fetchApi(`/admin/providers/${id}`, {
    method: 'DELETE',
  });

export const toggleVisibility = (id: number) =>
  fetchApi(`/admin/providers/${id}/toggle-visibility`, {
    method: 'PATCH',
  });

// ── CATEGORÍAS ────────────────────────────────────────────
export const getCategories = (search?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  return fetchApi<Category[]>(`/admin/categories?${params}`);
};

export const createCategory = (data: { name: string; slug: string; iconUrl?: string }) =>
  fetchApi<Category>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateCategory = (id: number, data: { name?: string; slug?: string; iconUrl?: string }) =>
  fetchApi<Category>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteCategory = (id: number) =>
  fetchApi(`/admin/categories/${id}`, { method: 'DELETE' });

// ── RESEÑAS ───────────────────────────────────────────────
export const getAllReviews = (page = 1, isVisible?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: '15' });
  if (isVisible !== undefined) params.append('isVisible', String(isVisible));
  return fetchApi<ReviewsResponse>(`/reviews?${params}`);
};

export const moderateReview = (reviewId: number, isVisible: boolean) =>
  fetchApi(`/reviews/${reviewId}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify({ isVisible }),
  });

// ── INTERFACES ─────────────────────────────────────────────
export interface DashboardMetrics {
  totalProviders: number;
  activeProviders: number;
  providersInGrace: number;
  providersExpiringSoon: number;
  totalUsers: number;
  totalReviews: number;
  pendingReviews: number;
  pendingVerifications: number;
  whatsappClicks: number;
  callClicks: number;
}

export interface GraceProvider {
  id: number;
  endDate: string;
  daysLeft: number;
  isUrgent: boolean;
  provider: {
    id: number;
    businessName: string;
    phone: string;
    isVerified: boolean;
    category: { name: string };
    locality: { name: string };
  };
}

export interface DailyClick {
  date: string;
  whatsapp: number;
  calls: number;
}

export interface AnalyticsResponse {
  dailyClicks: DailyClick[];
}

export interface ProvidersResponse {
  data: Provider[];
  total: number;
  page: number;
  lastPage: number;
}

export interface Provider {
  averageRating: any;
  id: number;
  businessName: string;
  phone: string;
  address?: string;
  description?: string;
  isVerified: boolean;
  isVisible: boolean;
  availability: string;
  category: { name: string };
  locality: { name: string };
  user?: { email: string; firstName: string; lastName: string };
  subscription?: { plan: string; status: string; endDate: string };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  iconUrl?: string;
  providerCount?: number;
}

export interface ReviewsResponse {
  data: Review[];
  total: number;
  page: number;
  lastPage: number;
}

export interface Review {
  photoUrl: any;
  id: number;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
  provider: { businessName: string };
}