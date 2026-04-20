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
  // CORRECCIÓN: Obtener el token actualizado SIEMPRE al inicio de la función
  const token = getAdminToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // CORRECCIÓN: Asegurar que el header se añada si el token existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Si recibimos 401, intentamos refrescar token una sola vez
      if (!isRetry) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Reintentar con el nuevo token llamando recursivamente con isRetry = true
          return fetchApi<T>(endpoint, options, true);
        }
      }
      
      // Si el refresh falla o ya era un reintento
      clearAdminToken();
      if (typeof window !== 'undefined') {
        // CORRECCIÓN: Solo redirigir si no estamos ya en la página de login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      throw new Error('No autorizado. Sesión finalizada.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    // CORRECCIÓN: Manejar errores de red o DNS para evitar crashes
    console.error(`Fetch error en ${endpoint}:`, error);
    throw error;
  }
}

// ── MÉTRICAS Y ANALYTICS ───────────────────────────────────
export const getDashboardMetrics = () =>
  fetchApi<DashboardMetrics>('/admin/metrics');

export const getGraceProviders = () =>
  fetchApi<GraceProvider[]>('/admin/grace-providers');

// En admin/lib/api.ts
export const getAnalytics = (days: number = 30) => {
  const params = new URLSearchParams({ days: String(days) });
  return fetchApi<AnalyticsResponse>(`/admin/analytics?${params.toString()}`);
};

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

// ── SOLICITUDES DE PLAN ────────────────────────────────────
export const getPlanRequests = (status?: string) =>
  fetchApi<any[]>(`/admin/plan-requests${status ? `?status=${status}` : ''}`);

export const approvePlanRequest = (id: number) =>
  fetchApi(`/admin/plan-requests/${id}/approve`, { method: 'PATCH' });

export const rejectPlanRequest = (id: number, reason?: string) =>
  fetchApi(`/admin/plan-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
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

export const getProviderReports = (page = 1, isReviewed?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (isReviewed !== undefined) params.append('isReviewed', String(isReviewed));
  return fetchApi<ProviderReportsResponse>(`/admin/provider-reports?${params}`);
};

export const markReportReviewed = (id: number) =>
  fetchApi(`/admin/provider-reports/${id}/review`, { method: 'PATCH' });

export const getPlatformIssues = (page = 1, isReviewed?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (isReviewed !== undefined) params.append('isReviewed', String(isReviewed));
  return fetchApi<PlatformIssuesResponse>(`/admin/platform-issues?${params}`);
};

export const markPlatformIssueReviewed = (id: number) =>
  fetchApi(`/admin/platform-issues/${id}/review`, { method: 'PATCH' });

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

export const createCategory = (data: { name: string; slug: string; iconUrl?: string; parentId?: number; forType?: string }) =>
  fetchApi<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(data) });

export const updateCategory = (id: number, data: { name?: string; slug?: string; iconUrl?: string; parentId?: number | null; forType?: string | null }) =>
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

// ── TRUST VALIDATION ──────────────────────────────────────
export const getTrustValidationList = (status = 'PENDING') =>
  fetchApi<TrustValidationItem[]>(`/trust-validation/admin/list?status=${status}`);

export const getTrustValidationDetail = (id: number) =>
  fetchApi<TrustValidationDetail>(`/trust-validation/admin/${id}`);

export const approveTrustValidation = (id: number) =>
  fetchApi(`/trust-validation/admin/${id}/approve`, { method: 'PATCH' });

export const rejectTrustValidation = (id: number, reason: string) =>
  fetchApi(`/trust-validation/admin/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
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
  isActive: boolean;
  parentId?: number | null;
  forType?: string | null;   // 'OFICIO' | 'NEGOCIO' | null
  parent?: { id: number; name: string } | null;
  children?: Category[];
  _count?: { providers: number };
  providerCount?: number;
}

export interface ProviderReport {
  id: number;
  reason: string;
  description?: string | null;
  isReviewed: boolean;
  createdAt: string;
  provider: { id: number; businessName: string; type: string };
  user: { id: number; firstName: string; lastName: string; email: string };
}

export interface ProviderReportsResponse {
  data: ProviderReport[];
  total: number;
  page: number;
  lastPage: number;
  pendingCount: number;
}

export interface PlatformIssue {
  id: number;
  description: string;
  isReviewed: boolean;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string; role: string };
}

export interface PlatformIssuesResponse {
  data: PlatformIssue[];
  total: number;
  page: number;
  lastPage: number;
  pendingCount: number;
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

export interface TrustValidationItem {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  providerId: number;
  businessName: string;
  providerType: string;
  ownerName: string;
  email: string;
}

export interface TrustValidationDetail {
  request: {
    id: number;
    status: string;
    createdAt: string;
    rejectionReason?: string;
    reviewedAt?: string;
    dniNumber?: string;
    dniFirstName?: string;
    dniLastName?: string;
    dniAddress?: string;
    rucNumber?: string;
    businessAddress?: string;
    dniPhotoFrontUrl?: string;
    dniPhotoBackUrl?: string;
    selfieWithDniUrl?: string;
    businessPhotoUrl?: string;
    ownerDniPhotoUrl?: string;
  };
  provider: {
    id: number;
    type: string;
    businessName: string;
    description?: string;
    dni?: string;
    ruc?: string;
    nombreComercial?: string;
    razonSocial?: string;
    phone: string;
    address?: string;
    ownerName: string;
    email: string;
    trustStatus: string;
    isTrusted: boolean;
  };
}
