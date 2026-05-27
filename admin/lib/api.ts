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
  } catch (error: unknown) {
    // CORRECCIÓN: Manejar errores de red o DNS para evitar crashes
    console.error(`Fetch error en ${endpoint}:`, error);
    throw error;
  }
}

// ── BROADCAST DE NOTIFICACIONES PUSH ───────────────────────
// El admin envía un push masivo a todos los usuarios con FCM token.
// El backend responde con `enqueued` (cantidad de tokens encolados)
// y el envío real ocurre en background.
export const broadcastNotification = (data: {
  title: string;
  message: string;
  imageUrl?: string;
}) =>
  fetchApi<{ enqueued: number }>('/admin/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(data),
  });

/// Sube una imagen a MinIO via /upload/broadcast-image. Devuelve la
/// URL pública para usar como `imageUrl` del broadcast. Usa FormData →
/// fetch directo (no `fetchApi`) porque ese helper fuerza JSON.
export async function uploadBroadcastImage(file: File): Promise<string> {
  const token = getAdminToken();
  const form  = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/upload/broadcast-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error subiendo imagen');
  }
  const data = await res.json();
  return data.url as string;
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

// ── GEO-STATS de usuarios (mapa de calor por ciudad) ──────
export interface UserGeoStatsRow {
  /** Alias del departamento (mantiene compat con la versión anterior). */
  city: string;
  department: string;
  country: string;
  /** Conteo de PROVEEDORES en ese departamento (no de usuarios). */
  userCount: number;
  lastAccess: string;  // ISO timestamp del último provider creado
  /** Centroide del departamento — backend lo añade para pintar el mapa. */
  lat?: number;
  lng?: number;
}
export const getUsersGeoStats = () =>
  fetchApi<UserGeoStatsRow[]>('/admin/users/geo-stats');

// ── PROVEEDORES ────────────────────────────────────────────
export const getProviders = (page = 1, search?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: '15' });
  if (search) params.append('search', search);
  return fetchApi<ProvidersResponse>(`/admin/providers?${params}`);
};

export const getFormOptions = () =>
  fetchApi<{ categories: unknown[]; localities: unknown[] }>('/admin/form-options');

export const createProvider = (data: Record<string, unknown>) =>
  fetchApi('/admin/providers', { method: 'POST', body: JSON.stringify(data) });

export const updateProvider = (id: number, data: Record<string, unknown>) =>
  fetchApi(`/admin/providers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteProvider = (id: number, reason?: string) =>
  fetchApi(`/admin/providers/${id}`, {
    method: 'DELETE',
    // El motivo viaja al user via socket+push (PROVIDER_DELETED).
    // Si no se envía, el backend usa fallback "Decisión del admin".
    body: reason ? JSON.stringify({ reason }) : undefined,
    headers: reason ? { 'Content-Type': 'application/json' } : undefined,
  });

export const toggleVisibility = (id: number) =>
  fetchApi(`/admin/providers/${id}/toggle-visibility`, { method: 'PATCH' });

export const updateProviderSubscription = (id: number, plan: string) =>
  fetchApi(`/admin/providers/${id}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  });

export const promotePlan = (id: number, plan: 'ESTANDAR' | 'PREMIUM') =>
  fetchApi(`/admin/providers/${id}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  });

// ── SOLICITUDES DE PLAN ────────────────────────────────────
export const getPlanRequests = (status?: string) =>
  fetchApi<unknown[]>(`/admin/plan-requests${status ? `?status=${status}` : ''}`);

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

export const deleteUser = (id: number, reason?: string) =>
  fetchApi(`/admin/users/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason: reason ?? '' }),
    headers: { 'Content-Type': 'application/json' },
  });

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

// Fetches CSV with auth token, returns as Blob
async function fetchCSVBlob(endpoint: string): Promise<Blob> {
  const token = getAdminToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

export const exportUsersCSV    = () => fetchCSVBlob('/admin/reports/export/users');
export const exportProvidersCSV = () => fetchCSVBlob('/admin/reports/export/providers');

// Excel helpers (usan exceljs — XLSX puro JS, sin dependencias nativas).
async function downloadXlsx(
  sheetName: string,
  fileName: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  if (rows.length === 0) {
    ws.addRow(['(sin datos)']);
  } else {
    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));
    for (const row of rows) ws.addRow(row);
    ws.getRow(1).font = { bold: true };
  }

  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface ExportUserItem {
  id: number; firstName: string; lastName: string; email: string;
  role: string; isActive: boolean; createdAt: string;
  provider?: { businessName?: string; verificationStatus?: string } | null;
  _count?: { reviews: number };
}

export async function exportUsersExcel(): Promise<void> {
  const data = await fetchApi<{ data: ExportUserItem[] }>('/admin/users?page=1&limit=10000');
  const rows = data.data.map((u) => ({
    ID:           u.id,
    Nombre:       u.firstName,
    Apellido:     u.lastName,
    Email:        u.email,
    Rol:          u.role,
    Activo:       u.isActive ? 'Sí' : 'No',
    Registro:     new Date(u.createdAt).toLocaleDateString('es-PE'),
    Negocio:      u.provider?.businessName ?? '',
    Verificación: u.provider?.verificationStatus ?? '',
    Reseñas:      u._count?.reviews ?? 0,
  }));
  await downloadXlsx('Usuarios', 'usuarios.xlsx', rows);
}

interface ExportProviderItem {
  id: number; businessName: string; phone: string; type: string;
  averageRating: number; totalReviews?: number; isVerified: boolean;
  verificationStatus: string;
  user?: { email?: string; firstName?: string; lastName?: string } | null;
  category?: { name: string } | null;
  locality?: { name: string } | null;
  subscription?: { plan: string; status: string } | null;
}

export async function exportProvidersExcel(): Promise<void> {
  const data = await fetchApi<{ data: ExportProviderItem[] }>('/admin/providers?page=1&limit=10000');
  const rows = data.data.map((p) => ({
    ID:           p.id,
    Negocio:      p.businessName,
    Email:        p.user?.email ?? '',
    Titular:      `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim(),
    Teléfono:     p.phone,
    Tipo:         p.type,
    Categoría:    p.category?.name ?? '',
    Localidad:    p.locality?.name ?? '',
    Calificación: p.averageRating,
    Reseñas:      p.totalReviews ?? 0,
    Verificado:   p.isVerified ? 'Sí' : 'No',
    Estado:       p.verificationStatus,
    Plan:         p.subscription?.plan ?? 'GRATIS',
    Suscripción:  p.subscription?.status ?? '',
  }));
  await downloadXlsx('Proveedores', 'proveedores.xlsx', rows);
}

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

// ── PAGOS YAPE ────────────────────────────────────────────
export const getYapePayments = (status?: string) =>
  fetchApi<unknown[]>(`/payments/admin/yape${status ? `?status=${status}` : ''}`);

export const approveYapePayment = (id: number) =>
  fetchApi(`/payments/admin/yape/${id}/approve`, { method: 'PATCH' });

export const rejectYapePayment = (id: number, reason?: string) =>
  fetchApi(`/payments/admin/yape/${id}/reject`, {
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
  views: number;
}

export interface AnalyticsKPIs {
  whatsappTotal: number;
  callsTotal: number;
  viewsTotal: number;
  whatsappDelta: number;
  callsDelta: number;
  viewsDelta: number;
}

export interface PlanDistItem { plan: string; count: number; }
export interface ProviderFunnel {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  active: number;
  conversionRate: number;
}
export interface AvailabilityItem { status: string; count: number; }
export interface GeoItem { department: string; count: number; }
export interface TopProvider {
  providerId: number;
  businessName: string;
  type: string;
  categoryName: string;
  clicks: number;
}

export interface AnalyticsResponse {
  dailyClicks: DailyClick[];
  kpis: AnalyticsKPIs;
  planDistribution: PlanDistItem[];
  providerFunnel: ProviderFunnel;
  availabilityDistribution: AvailabilityItem[];
  geoDistribution: GeoItem[];
  topProviders: TopProvider[];
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
  whatsapp?: string;
  address?: string;
  description?: string;
  dni?: string;
  ruc?: string;
  nombreComercial?: string;
  razonSocial?: string;
  hasDelivery?: boolean;
  department?: string;
  province?: string;
  district?: string;
  isTrusted?: boolean;
  trustStatus?: string;
  isVerified: boolean;
  isVisible: boolean;
  availability: string;
  verificationStatus: string;
  type: string;           // 'OFICIO' | 'NEGOCIO'
  category: { name: string };
  locality: { name: string };
  user?: { email: string; firstName: string; lastName: string; phone?: string };
  subscription?: { plan: string; status: string; endDate: string };
  createdAt?: string;
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
  /**
   * Datos del perfil de proveedor cuando existe — el backend ahora trae
   * categoría primaria, ubicación y redes sociales para el modal de
   * detalle. `provider=null` significa cliente puro (sin registro en
   * la tabla `providers`).
   */
  provider?: {
    id: number;
    businessName: string;
    type?: 'OFICIO' | 'NEGOCIO';
    verificationStatus: string;
    isVerified: boolean;
    phone?: string;
    whatsapp?: string;
    address?: string;
    locality?: {
      name?: string;
      department?: string;
      province?: string;
      district?: string;
    } | null;
    providerCategories?: Array<{
      isPrimary: boolean;
      category: { id: number; name: string; slug: string };
    }>;
    website?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    twitterX?: string | null;
    telegram?: string | null;
    whatsappBiz?: string | null;
  } | null;
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
  /**
   * Tipos esperados desde el backend. `BROADCAST_LOG` lo emite el admin
   * service cuando se manda una push masiva — no tiene provider asociado
   * y el frontend lo renderiza con el título completo.
   */
  type:
    | 'APROBADO'
    | 'RECHAZADO'
    | 'MAS_INFO'
    | 'VERIFICACION_REVOCADA'
    | 'PLAN_APROBADO'
    | 'PLAN_RECHAZADO'
    | 'PLAN_SOLICITADO'
    | 'BROADCAST_LOG';
  title?: string;
  message: string;
  isRead: boolean;
  sentAt: string;
  /**
   * Puede ser null para notif sin perfil asociado (ej. BROADCAST_LOG).
   * `type` del provider permite distinguir OFICIO/NEGOCIO en el listado.
   */
  provider: {
    businessName: string;
    type?: 'OFICIO' | 'NEGOCIO';
    user: { firstName: string; lastName: string };
  } | null;
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
  photoUrl: string | null;
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

// ── REFERIDOS Y RECOMPENSAS ────────────────────────────────

export interface ReferralStats {
  totalInvitations: number;
  totalApproved: number;
  conversionRate: number;
  totalCoinsDistributed: number;
  topInviters: Array<{
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    code: string;
    totalInvites: number;
    successfulInvites: number;
    coinsBalance: number;
  }>;
  monthlyInvites: Array<{ month: string; count: number }>;
}

export interface AdminReward {
  id: number;
  providerId: number;
  title: string;
  description: string;
  coinsCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: number;
    businessName: string;
    type: string;
    phone: string;
  };
  _count?: { redemptions: number };
}

export const getReferralStats = () =>
  fetchApi<ReferralStats>('/admin/referral-stats');

export const getAdminRewards = () =>
  fetchApi<AdminReward[]>('/admin/rewards');

export const createReward = (data: {
  providerId: number;
  title: string;
  description: string;
  coinsCost: number;
}) =>
  fetchApi<AdminReward>('/admin/rewards', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateReward = (
  id: number,
  data: Partial<{
    title: string;
    description: string;
    coinsCost: number;
    isActive: boolean;
  }>,
) =>
  fetchApi<AdminReward>(`/admin/rewards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteReward = (id: number) =>
  fetchApi<{ success: boolean }>(`/admin/rewards/${id}`, {
    method: 'DELETE',
  });

// ── MARKETPLACE: OFERTAS & CHATS (admin) ──────────────────
export interface AdminOfferItem {
  id: number;
  title: string;
  description: string;
  price: number | null;
  photoUrl: string | null;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  provider: {
    id: number;
    businessName: string;
    type: 'OFICIO' | 'NEGOCIO';
    averageRating: number;
    locality?: { name?: string; province?: string; district?: string } | null;
  };
  categories: Array<{ category: { id: number; name: string; slug: string } }>;
}

export interface AdminOffersPage {
  data: AdminOfferItem[];
  total: number;
  page: number;
  lastPage: number;
}

export const getAdminOffers = (params: {
  providerType?: string;
  department?: string;
  province?: string;
  district?: string;
  categorySlug?: string;
  page?: number;
}) => {
  const q = new URLSearchParams({ page: String(params.page ?? 1), limit: '30' });
  if (params.providerType) q.append('providerType', params.providerType);
  if (params.department)   q.append('department',   params.department);
  if (params.province)     q.append('province',     params.province);
  if (params.district)     q.append('district',     params.district);
  if (params.categorySlug) q.append('categorySlug', params.categorySlug);
  return fetchApi<AdminOffersPage>(`/admin/offers?${q}`);
};

export const getAdminOfferCategories = () =>
  fetchApi<Array<{ id: number; name: string; slug: string }>>('/admin/offers/categories');

export interface AdminChatRoom {
  id: number;
  createdAt: string;
  client: { id: number; firstName: string; lastName: string; email: string };
  provider: {
    id: number;
    businessName: string;
    type: 'OFICIO' | 'NEGOCIO';
    locality?: { name?: string; department?: string; province?: string; district?: string } | null;
  };
  messages: Array<{ id: number; content: string; createdAt: string; senderId: number }>;
}

export interface AdminChatsPage {
  data: AdminChatRoom[];
  total: number;
  page: number;
  lastPage: number;
}

export const getAdminChats = (params: {
  providerType?: string;
  department?: string;
  province?: string;
  district?: string;
  /** Días con actividad reciente (1, 3 o 7). 0/undefined = sin filtro. */
  activeWithin?: number;
  page?: number;
}) => {
  const q = new URLSearchParams({ page: String(params.page ?? 1), limit: '30' });
  if (params.providerType) q.append('providerType', params.providerType);
  if (params.department)   q.append('department',   params.department);
  if (params.province)     q.append('province',     params.province);
  if (params.district)     q.append('district',     params.district);
  if (params.activeWithin) q.append('activeWithin', String(params.activeWithin));
  return fetchApi<AdminChatsPage>(`/admin/chats?${q}`);
};
