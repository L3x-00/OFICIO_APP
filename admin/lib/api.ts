const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Token management ───────────────────────────────────────
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('adminToken', token);
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminLevel');
}

export function getAdminRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminRefreshToken');
}

export function setAdminRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('adminRefreshToken', token);
}

// Intenta renovar el access token; retorna true si tuvo éxito
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.accessToken) {
      setAdminToken(data.accessToken);
      if (data.refreshToken) setAdminRefreshToken(data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Core fetcher ───────────────────────────────────────────
async function fetchApi<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = getAdminToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Primer intento: tratar de renovar el token
    if (!isRetry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Reintentar la petición original con el nuevo token
        return fetchApi<T>(endpoint, options, true);
      }
    }
    // No se pudo renovar → redirigir al login
    clearAdminToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sesión expirada. Redirigiendo al login...');
  }

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
    next: { revalidate: 60 } as any,
  });

// ── PROVEEDORES ────────────────────────────────────────────
export const getProviders = (page = 1, search?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: '15' });
  if (search) params.append('search', search);
  return fetchApi<ProvidersResponse>(`/admin/providers?${params}`);
};

export const getFormOptions = () =>
  fetchApi<{ categories: any[]; localities: any[] }>('/admin/form-options');

export const createProvider = (data: any) =>
  fetchApi('/admin/providers', { method: 'POST', body: JSON.stringify(data) });

export const updateProvider = (id: number, data: any) =>
  fetchApi(`/admin/providers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteProvider = (id: number) =>
  fetchApi(`/admin/providers/${id}`, { method: 'DELETE' });

export const toggleVisibility = (id: number) =>
  fetchApi(`/admin/providers/${id}/toggle-visibility`, { method: 'PATCH' });

export const updateProviderSubscription = (id: number, plan: string) =>
  fetchApi(`/admin/providers/${id}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  });

// ── VERIFICACIÓN ───────────────────────────────────────────
export const getPendingVerifications = () =>
  fetchApi<VerificationProvider[]>('/admin/verification/pending');

export const approveVerification = (id: number) =>
  fetchApi(`/admin/providers/${id}/approve`, { method: 'PATCH' });

export const rejectVerification = (id: number, reason: string) =>
  fetchApi(`/admin/providers/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

export const requestMoreInfo = (id: number, reason: string) =>
  fetchApi(`/admin/providers/${id}/request-info`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

export const revokeVerification = (id: number, reason?: string) =>
  fetchApi(`/admin/providers/${id}/revoke-verification`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

// ── USUARIOS ───────────────────────────────────────────────
export const getUsers = (params: {
  page?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}) => {
  const q = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.search)             q.append('search', params.search);
  if (params.role)               q.append('role', params.role);
  if (params.isActive !== undefined) q.append('isActive', String(params.isActive));
  return fetchApi<UsersResponse>(`/admin/users?${q}`);
};

export const deleteUser = (id: number) =>
  fetchApi(`/admin/users/${id}`, { method: 'DELETE' });

export const updateUserStatus = (id: number, isActive: boolean) =>
  fetchApi(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

// ── NOTIFICACIONES ─────────────────────────────────────────
export const getNotifications = (page = 1) =>
  fetchApi<NotificationsResponse>(`/admin/notifications?page=${page}&limit=20`);

export const markNotificationRead = (id: number) =>
  fetchApi(`/admin/notifications/${id}/read`, { method: 'PATCH' });

export const markAllNotificationsRead = () =>
  fetchApi('/admin/notifications/read-all', { method: 'PATCH' });

// ── REPORTES ───────────────────────────────────────────────
export const getReports = () =>
  fetchApi<ReportsResponse>('/admin/reports');

export const exportUsersCSV = () =>
  `${BASE_URL}/admin/reports/export/users`;

export const exportProvidersCSV = () =>
  `${BASE_URL}/admin/reports/export/providers`;

// ── CATEGORÍAS ────────────────────────────────────────────
export const getCategories = (search?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  return fetchApi<Category[]>(`/admin/categories?${params}`);
};

export const createCategory = (data: { name: string; slug: string; iconUrl?: string }) =>
  fetchApi<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(data) });

export const updateCategory = (id: number, data: { name?: string; slug?: string; iconUrl?: string }) =>
  fetchApi<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

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
  pendingVerifications: number;
  whatsappClicks: number;
  callClicks: number;
  totalActiveUsers: number;
  totalProviderUsers: number;
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
  averageRating: number;
  id: number;
  businessName: string;
  phone: string;
  address?: string;
  description?: string;
  isVerified: boolean;
  isVisible: boolean;
  availability: string;
  verificationStatus: string;
  type: string;           // 'OFICIO' | 'NEGOCIO' | 'PROFESSIONAL' | 'BUSINESS'
  category: { name: string };
  locality: { name: string };
  user?: { email: string; firstName: string; lastName: string };
  subscription?: { plan: string; status: string; endDate: string };
}

export interface VerificationProvider {
  id: number;
  businessName: string;
  phone: string;
  description?: string;
  verificationStatus: string;
  isVerified: boolean;
  type: string;
  createdAt: string;
  user: { email: string; firstName: string; lastName: string; createdAt: string };
  category: { name: string };
  locality: { name: string };
  verificationDocs: { id: number; docType: string; fileUrl: string; status: string; notes?: string }[];
  images: { url: string; isCover: boolean }[];
}

export interface UsersResponse {
  data: UserItem[];
  total: number;
  page: number;
  lastPage: number;
}

export interface UserItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  provider?: { id: number; businessName: string; verificationStatus: string; isVerified: boolean } | null;
  _count: { reviews: number; favorites: number };
}

export interface NotificationsResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  lastPage: number;
  unreadCount: number;
}

export interface NotificationItem {
  id: number;
  type: 'APROBADO' | 'RECHAZADO' | 'MAS_INFO' | 'VERIFICACION_REVOCADA';
  message: string;
  isRead: boolean;
  sentAt: string;
  provider: { businessName: string; user: { firstName: string; lastName: string } };
}

export interface ReportsResponse {
  topRatedProviders: {
    id: number; businessName: string; averageRating: number; totalReviews: number;
    isVerified: boolean; category: { name: string }; locality: { name: string };
  }[];
  mostReviewedProviders: {
    id: number; businessName: string; totalReviews: number; averageRating: number;
    category: { name: string };
  }[];
  mostActiveUsers: {
    id: number; firstName: string; lastName: string; email: string; createdAt: string;
    _count: { reviews: number; favorites: number };
  }[];
  popularCategories: {
    id: number; name: string; slug: string; _count: { providers: number };
  }[];
  recentRegistrations: { month: string; users: number; providers: number }[];
  verificationStats: { status: string; count: number }[];
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
