const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/providers';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// ── Métricas ─────────────────────────────────────────────
export const getDashboardMetrics = () =>
  fetchApi<DashboardMetrics>('/admin/metrics');

export const getGraceProviders = () =>
  fetchApi<GraceProvider[]>('/admin/grace-providers');
export interface DailyClick {
  date: string;
  whatsapp: number;
  calls: number;
}
export interface AnalyticsResponse {
  dailyClicks: DailyClick[];
}
export async function getAnalytics(days: number = 30): Promise<AnalyticsResponse> {
  // IMPORTANTE: Usamos BASE_URL para no repetir código
  return fetchApi<AnalyticsResponse>(`/admin/analytics?days=${days}`, {
    next: { revalidate: 60 }
  });
}

// ── Reseñas ───────────────────────────────────────────────
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

// ── Proveedores ───────────────────────────────────────────
export const getProviders = (page = 1, search?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: '15' });
  if (search) params.append('search', search);
  return fetchApi<ProvidersResponse>(`/providers?${params}`);
};

// ── Tipos ──────────────────────────────────────────────────

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

export interface Analytics {
  topProviders: Array<{
    providerId: number;
    eventType: string;
    _count: { id: number };
  }>;
  dailyClicks: Array<{
    date: string;
    whatsapp: number;
    calls: number;
  }>;
}

export interface ReviewsResponse {
  data: Review[];
  total: number;
  page: number;
  lastPage: number;
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  photoUrl: string;
  isVisible: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
  provider: { businessName: string };
}

export interface ProvidersResponse {
  data: Provider[];
  total: number;
}

export interface Provider {
  id: number;
  businessName: string;
  phone: string;
  isVerified: boolean;
  isVisible: boolean;
  averageRating: number;
  totalReviews: number;
  availability: string;
  category: { name: string };
  locality: { name: string };
}
