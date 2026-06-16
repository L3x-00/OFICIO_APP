"use client";

import { getAccessToken, getRefreshToken, clearSession, saveSession } from "./auth";
import { Analytics, LoginResponse, Offer, Opportunity, Provider, ProviderImage, PublicUserProfile, Review, User } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://oficio-backend.onrender.com";

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data: LoginResponse = await res.json();
    saveSession(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    }
  }

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      });
    }
  }

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/* ── Referidos y monedas ─────────────────────────────────── */

export interface ReferralCodeInfo {
  id: number;
  userId: number;
  code: string;
  totalInvites: number;
  successfulInvites: number;
  createdAt?: string;
}

export type ReferralStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ReferralHistoryItem {
  id: number;
  status: ReferralStatus;
  coinsAwarded: number;
  invitedCoinsAwarded: number;
  createdAt: string;
  approvedAt?: string | null;
  invitedUser?: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
  invitedProvider?: {
    id: number;
    businessName: string;
    type: "OFICIO" | "NEGOCIO";
    verificationStatus: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  } | null;
}

export interface ReferralStats {
  code: string;
  coins: number;
  totalInvited: number;
  approvedInvited: number;
  pendingInvited: number;
  history: ReferralHistoryItem[];
}

export interface ReferralReward {
  id: number;
  title: string;
  description: string;
  coinsCost: number;
  isActive: boolean;
  provider: {
    id: number;
    businessName: string;
    phone?: string;
    whatsapp?: string;
    averageRating?: number;
    type?: "OFICIO" | "NEGOCIO";
    category?: { name?: string };
    images?: { url: string; isCover?: boolean; order?: number }[];
  };
}

export type RedemptionStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface CoinRedemption {
  id: number;
  rewardId?: number | null;
  plan?: string | null;
  coinsSpent: number;
  status: RedemptionStatus;
  createdAt: string;
  reward?: {
    id: number;
    title: string;
    description: string;
    coinsCost: number;
    provider: {
      id: number;
      businessName: string;
      phone?: string;
      whatsapp?: string;
    };
  } | null;
}

export interface RedemptionResult {
  success: boolean;
  redemption: CoinRedemption;
  /** Solo viene cuando el canje fue de un plan. */
  planActivated?: string;
  months?: number;
  /** Solo viene cuando el canje fue de un servicio. */
  reward?: {
    title: string;
    description: string;
    provider: {
      id: number;
      businessName: string;
      phone?: string;
      whatsapp?: string;
    };
  };
}

/**
 * Forma del item que devuelve `GET /favorites`. El backend hace spread
 * del provider + alias `category: { name }` (ver favorites.service.ts).
 * Por eso `id` acá es el id del PROVIDER (no del row Favorite), y los
 * campos del provider están aplanados al primer nivel.
 */
export interface FavoriteFromApi {
  id: number;
  businessName: string;
  averageRating?: number;
  totalReviews?: number;
  type?: "OFICIO" | "NEGOCIO";
  phone?: string;
  whatsapp?: string;
  images?: Array<{ id: number; url: string; isCover?: boolean }>;
  category?: { name: string };
  subscription?: { plan: string; status: string };
}

/** Shape returned by GET /providers (public listing). */
export interface PublicProvider {
  id: number;
  slug?: string;
  businessName: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  averageRating?: number;
  totalReviews?: number;
  type?: "OFICIO" | "NEGOCIO";
  availability?: "DISPONIBLE" | "OCUPADO" | "CON_DEMORA";
  images?: { url: string; isCover?: boolean; order?: number }[];
  category?: { name: string; slug?: string; iconUrl?: string };
  locality?: {
    name?: string;
    department?: string;
    province?: string;
    district?: string;
  };
}

// Categoría del catálogo (GET /providers/categories) — padre con hijos.
export interface FeaturedCategory {
  id: number;
  name: string;
  slug: string;
  iconUrl?: string | null;
  children?: FeaturedCategory[];
}

// Grupo de la home agrupada (GET /providers/featured-grouped).
export interface FeaturedGroup {
  category: FeaturedCategory;
  providers: PublicProvider[];
}

// Proveedor con distancia (GET /providers/nearby).
export type NearbyProvider = PublicProvider & { distanceKm?: number | null };

// Shape that the backend actually returns on /auth/login — fields are flat,
// not wrapped in a `user` object. We normalize it here into LoginResponse.
interface FlatLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  role: User["role"];
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  province?: string;
  district?: string;
}

// Shape que devuelve /auth/social-login — tokens + campos planos del usuario,
// pero SIN userId/role (esos se resuelven con /users/me). Igual que el móvil.
interface SocialLoginResponse {
  accessToken: string;
  refreshToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isNewUser?: boolean;
}

// Payload de POST /auth/register/provider — espejo del RegisterProviderDto del
// backend (mismos nombres/semántica que envía Flutter).
export interface RegisterProviderPayload {
  businessName: string;
  phone: string;
  type: "OFICIO" | "NEGOCIO";
  description: string;
  whatsapp?: string;
  // OFICIO
  dni?: string;
  hasHomeService?: boolean;
  // NEGOCIO
  ruc?: string;
  nombreComercial?: string;
  razonSocial?: string;
  hasDelivery?: boolean;
  plenaCoordinacion?: boolean;
  // comunes
  address?: string;
  categoryIds: number[];
  primaryCategoryId?: number;
  department?: string;
  province?: string;
  district?: string;
  scheduleJson?: Record<string, string | null>;
  // redes sociales
  website?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
  twitterX?: string;
  telegram?: string;
  whatsappBiz?: string;
}

// Shape REAL que devuelve el backend en /provider-profile/me/analytics.
// El web ya tenía un `Analytics` UI-friendly (totalViews, dailyData) pero
// el endpoint responde con `summary` + `dailyClicks` (mismo contrato que
// consume el mobile). Sin esta normalización los KPIs salían 0 y los
// charts vacíos aunque hubiera datos reales en BD.
interface RawAnalytics {
  summary?: {
    whatsappClicks?: number;
    callClicks?: number;
    views?: number;
    totalClicks?: number;
  };
  dailyClicks?: Array<{
    date: string;
    whatsapp?: number;
    calls?: number;
    views?: number;
  }>;
  totalReviews?: number;
}

function normalizeAnalytics(raw: RawAnalytics): Analytics {
  const s = raw.summary ?? {};
  return {
    totalViews:           s.views          ?? 0,
    totalWhatsappClicks:  s.whatsappClicks ?? 0,
    totalCallClicks:      s.callClicks     ?? 0,
    totalReviews:         raw.totalReviews ?? 0,
    dailyData: (raw.dailyClicks ?? []).map((d) => ({
      date:     d.date,
      views:    d.views    ?? 0,
      whatsapp: d.whatsapp ?? 0,
      calls:    d.calls    ?? 0,
    })),
  };
}

function buildUserFromFlat(raw: FlatLoginResponse, fallbackEmail: string): User {
  return {
    id:             raw.userId,
    email:          raw.email ?? fallbackEmail,
    role:           raw.role,
    firstName:      raw.firstName ?? "",
    lastName:       raw.lastName ?? "",
    phone:          raw.phone,
    avatarUrl:      raw.avatarUrl,
    department:     raw.department,
    province:       raw.province,
    district:       raw.district,
    isActive:       true,
    isEmailVerified: true,
  };
}

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const raw = await apiFetch<FlatLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return {
      accessToken:  raw.accessToken,
      refreshToken: raw.refreshToken,
      user:         buildUserFromFlat(raw, email),
    };
  },

  /**
   * Login social (Google) — mismo endpoint que el móvil. Recibe un *Firebase
   * ID token* (obtenido con Firebase Auth Web) y lo canjea por los JWT de
   * Servi. El backend (`POST /auth/social-login`) devuelve los tokens + campos
   * planos del usuario PERO sin `userId`/`role`; por eso resolvemos el perfil
   * completo con `/users/me` (usando el access token recién emitido) para
   * armar el `User` que necesita la sesión. Devuelve también `isNewUser`.
   */
  async socialLogin(
    idToken: string,
  ): Promise<LoginResponse & { isNewUser: boolean }> {
    const raw = await apiFetch<SocialLoginResponse>("/auth/social-login", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });

    // Perfil completo (role/id/ubicación) con el token recién emitido. Header
    // explícito porque la sesión aún no se guardó en localStorage.
    let user: User;
    try {
      const me = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${raw.accessToken}` },
      });
      const m = (me.ok ? await me.json() : {}) as Partial<User>;
      user = {
        id:             m.id ?? 0,
        email:          m.email ?? raw.email ?? "",
        role:           m.role ?? "USUARIO",
        firstName:      m.firstName ?? raw.firstName ?? "",
        lastName:       m.lastName ?? raw.lastName ?? "",
        phone:          m.phone ?? raw.phone,
        avatarUrl:      m.avatarUrl ?? raw.avatarUrl,
        department:     m.department,
        province:       m.province,
        district:       m.district,
        isActive:       m.isActive ?? true,
        isEmailVerified: m.isEmailVerified ?? true,
        fullName:       m.fullName,
      };
    } catch {
      // Si /users/me falla, caemos a los campos planos del social-login.
      user = {
        id:             0,
        email:          raw.email ?? "",
        role:           "USUARIO",
        firstName:      raw.firstName ?? "",
        lastName:       raw.lastName ?? "",
        phone:          raw.phone,
        avatarUrl:      raw.avatarUrl,
        isActive:       true,
        isEmailVerified: true,
      };
    }

    return {
      accessToken:  raw.accessToken,
      refreshToken: raw.refreshToken,
      user,
      isNewUser:    raw.isNewUser ?? false,
    };
  },

  async getMyProfile(type?: "OFICIO" | "NEGOCIO"): Promise<Provider> {
    const qs = type ? `?type=${type}` : "";
    return apiFetch<Provider>(`/provider-profile/me${qs}`);
  },

  async updateMyProfile(
    payload: Record<string, unknown>,
    type?: "OFICIO" | "NEGOCIO",
  ): Promise<Provider> {
    const qs = type ? `?type=${type}` : "";
    return apiFetch<Provider>(`/provider-profile/me${qs}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async uploadImage(file: File): Promise<ProviderImage> {
    const formData = new FormData();
    formData.append("file", file);
    const { url } = await apiUpload<{ url: string }>("/upload/provider-photo", formData);
    return apiFetch<ProviderImage>("/provider-profile/me/images", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  /**
   * Registra el perfil de proveedor (OFICIO/NEGOCIO) — MISMO endpoint que el
   * móvil (`POST /auth/register/provider`). Se envía como JSON (igual que
   * Flutter): el backend ignora la parte multipart si no hay archivos. Las
   * fotos se suben aparte con `uploadImage` tras crear el perfil.
   * Requiere sesión (JWT) — `apiFetch` adjunta el token.
   */
  async registerProvider(payload: RegisterProviderPayload): Promise<unknown> {
    return apiFetch("/auth/register/provider", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getProviderReviews(providerId: number, limit = 5): Promise<Review[]> {
    const data = await apiFetch<{ data: Review[] } | Review[]>(
      `/reviews/provider/${providerId}?limit=${limit}&page=1`
    );
    return Array.isArray(data) ? data : (data as { data: Review[] }).data ?? [];
  },

  async getAnalyticsWithDays(
    days: number,
    type?: "OFICIO" | "NEGOCIO",
  ): Promise<Analytics> {
    const params = new URLSearchParams({ days: String(days) });
    if (type) params.set("type", type);
    const raw = await apiFetch<RawAnalytics>(
      `/provider-profile/me/analytics?${params.toString()}`,
    );
    return normalizeAnalytics(raw);
  },

  async deleteImage(imageId: number): Promise<void> {
    return apiFetch(`/provider-profile/me/images/${imageId}`, {
      method: "DELETE",
    });
  },

  async getOpportunities(): Promise<Opportunity[]> {
    return apiFetch<Opportunity[]>("/subastas/opportunities/me");
  },

  async submitOffer(payload: {
    serviceRequestId: number;
    price: number;
    message: string;
  }): Promise<Offer> {
    return apiFetch<Offer>("/subastas/offers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Envía el comprobante de Yape — MISMO flujo que el móvil (2 pasos):
   *   1. Sube la imagen a `POST /upload/payment-voucher` → { url }.
   *   2. `POST /payments/yape` (JSON) con `voucherUrl` + código de 3 dígitos.
   * El backend pone el monto real desde su diccionario de precios; queda en
   * estado PENDIENTE hasta que el admin lo aprueba.
   */
  async submitYapePayment(payload: {
    plan: string;
    amount: number;
    verificationCode: string;
    voucherFile: File;
    providerType?: "OFICIO" | "NEGOCIO";
    note?: string;
  }): Promise<void> {
    const formData = new FormData();
    formData.append("file", payload.voucherFile);
    const { url } = await apiUpload<{ url: string }>(
      "/upload/payment-voucher",
      formData,
    );
    await apiFetch("/payments/yape", {
      method: "POST",
      body: JSON.stringify({
        plan: payload.plan,
        amount: payload.amount,
        voucherUrl: url,
        verificationCode: payload.verificationCode,
        ...(payload.providerType ? { providerType: payload.providerType } : {}),
        ...(payload.note ? { note: payload.note } : {}),
      }),
    });
  },

  /**
   * Crea la preferencia de MercadoPago — MISMO endpoint que el móvil
   * (`POST /payments/mercadopago/create-preference`). El server fija precio y
   * descripción; el cliente solo elige plan + perfil. Devuelve `initPoint`
   * (URL de checkout) para redirigir al usuario a la pasarela.
   */
  async createMpPreference(payload: {
    plan: "ESTANDAR" | "PREMIUM";
    providerType: "OFICIO" | "NEGOCIO";
  }): Promise<{ preferenceId: string; initPoint: string }> {
    return apiFetch("/payments/mercadopago/create-preference", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAnalytics(type?: "OFICIO" | "NEGOCIO"): Promise<Analytics> {
    const qs = type ? `?type=${type}` : "";
    const raw = await apiFetch<RawAnalytics>(
      `/provider-profile/me/analytics${qs}`,
    );
    return normalizeAnalytics(raw);
  },

  async getMyProviderStatus(): Promise<{
    hasProvider: boolean;
    profiles: Array<{
      providerId: number;
      businessName: string;
      type: "OFICIO" | "NEGOCIO";
      verificationStatus: "PENDIENTE" | "APROBADO" | "RECHAZADO";
      isVerified: boolean;
      categoryName?: string;
    }>;
  }> {
    return apiFetch("/users/my-provider-status");
  },

  /**
   * Lista los favoritos del usuario autenticado. El backend resuelve
   * `userId` desde el JWT — antes el web llamaba `/favorites/:userId`
   * (sólo existe como POST de toggle), lo que devolvía 404 y caía al
   * fallback `[]` silenciosamente. La firma sigue aceptando `userId`
   * (ignorado) para no romper a los callers existentes.
   */
  async getFavorites(_userId?: number): Promise<FavoriteFromApi[]> {
    void _userId;
    try {
      return await apiFetch<FavoriteFromApi[]>("/favorites");
    } catch {
      return [];
    }
  },

  /**
   * Listado público de proveedores (sin auth) para la landing.
   * Usa fetch directo porque apiFetch antepone Authorization si hay token,
   * pero este endpoint es público.
   */
  /** Devuelve el proveedor mejor valorado (1er resultado público) o null si falla. */
  async getFeaturedProvider(): Promise<PublicProvider | null> {
    try {
      const list = await this.getPublicProviders(1);
      return list[0] ?? null;
    } catch {
      return null;
    }
  },

  async getPublicProviders(limit = 12): Promise<PublicProvider[]> {
    const url = `${API_BASE_URL}/providers?sortBy=rating&limit=${limit}&page=1`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`Error ${res.status} cargando proveedores`);
    const json = (await res.json()) as { data?: PublicProvider[] } | PublicProvider[];
    return Array.isArray(json) ? json : json.data ?? [];
  },

  /**
   * Búsqueda pública de proveedores con filtros (página /buscar).
   * Endpoint público — fetch directo sin Authorization.
   */
  async searchProviders(params: {
    search?: string;
    categorySlug?: string;
    type?: "PROFESSIONAL" | "BUSINESS";
    sortBy?: "rating" | "reviews" | "availability";
    limit?: number;
    page?: number;
  } = {}): Promise<PublicProvider[]> {
    const qs = new URLSearchParams();
    qs.set("limit", String(params.limit ?? 24));
    qs.set("page", String(params.page ?? 1));
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.search) qs.set("search", params.search);
    if (params.categorySlug) qs.set("categorySlug", params.categorySlug);
    if (params.type) qs.set("type", params.type);
    const res = await fetch(`${API_BASE_URL}/providers?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Error ${res.status} buscando proveedores`);
    const json = (await res.json()) as { data?: PublicProvider[] } | PublicProvider[];
    return Array.isArray(json) ? json : json.data ?? [];
  },

  /** Catálogo de categorías (padres + hijos). Público. */
  async getCategories(forType?: "OFICIO" | "NEGOCIO"): Promise<FeaturedCategory[]> {
    const qs = forType ? `?type=${forType}` : "";
    const res = await fetch(`${API_BASE_URL}/providers/categories${qs}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Error ${res.status} cargando categorías`);
    return (await res.json()) as FeaturedCategory[];
  },

  /** Home agrupada: top categorías × proveedores destacados. Público. */
  async getFeaturedGrouped(): Promise<FeaturedGroup[]> {
    const res = await fetch(`${API_BASE_URL}/providers/featured-grouped`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Error ${res.status} cargando destacados`);
    return (await res.json()) as FeaturedGroup[];
  },

  /** Búsqueda por radio (PostGIS). Público. radiusKm 1–50. */
  async getNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<NearbyProvider[]> {
    const qs = `?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`;
    const res = await fetch(`${API_BASE_URL}/providers/nearby${qs}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Error ${res.status} en la búsqueda por radio`);
    return (await res.json()) as NearbyProvider[];
  },

  // ── REFERIDOS Y MONEDAS ─────────────────────────────────────

  async getMyReferralCode(): Promise<ReferralCodeInfo> {
    return apiFetch<ReferralCodeInfo>("/referrals/my-code");
  },

  async getMyReferralStats(): Promise<ReferralStats> {
    return apiFetch<ReferralStats>("/referrals/my-stats");
  },

  async applyReferralCode(code: string): Promise<void> {
    await apiFetch("/referrals/apply", {
      method: "POST",
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
  },

  async getReferralRewards(): Promise<ReferralReward[]> {
    return apiFetch<ReferralReward[]>("/referrals/rewards");
  },

  async redeemCoins(payload: {
    rewardId?: number;
    plan?: "ESTANDAR" | "PREMIUM";
  }): Promise<RedemptionResult> {
    return apiFetch<RedemptionResult>("/referrals/redeem", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getRedemptionHistory(): Promise<CoinRedemption[]> {
    return apiFetch<CoinRedemption[]>("/referrals/redemptions");
  },

  /**
   * Inbox de notificaciones del usuario autenticado. El backend lo
   * sirve en `/provider-profile/me/notifications` — mismo endpoint
   * que el mobile. Cuando se pasa `type`, filtra al perfil OFICIO o
   * NEGOCIO; sin tipo, devuelve TODO (incl. broadcasts y notif del
   * cliente puro).
   */
  async getNotifications(type?: "OFICIO" | "NEGOCIO"): Promise<{
    data: Array<{
      id: number;
      type: string;
      title: string;
      message: string;
      sentAt: string;
      isRead: boolean;
    }>;
    unreadCount: number;
  }> {
    const qs = type ? `?type=${type}` : "";
    try {
      return await apiFetch(`/provider-profile/me/notifications${qs}`);
    } catch {
      return { data: [], unreadCount: 0 };
    }
  },

  async markNotificationRead(id: number): Promise<void> {
    await apiFetch(`/provider-profile/me/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiFetch("/provider-profile/me/notifications/read-all", {
      method: "PATCH",
    });
  },

  /**
   * Perfil público mínimo de un usuario (primer nombre, primer apellido,
   * avatar, fecha de registro). Lo usa el proveedor al tocar la foto del
   * usuario en una reseña o chat. Requiere sesión.
   */
  async getPublicUserProfile(userId: number): Promise<PublicUserProfile> {
    return apiFetch<PublicUserProfile>(`/users/${userId}/public`);
  },

  async getUserProfile(): Promise<User> {
    // /users/me returns the user fields directly but omits isActive / isEmailVerified.
    // Default them to true so the User interface is satisfied for the UI.
    const raw = await apiFetch<Partial<User>>("/users/me");
    return {
      id:             raw.id ?? 0,
      email:          raw.email ?? "",
      role:           raw.role ?? "USUARIO",
      firstName:      raw.firstName ?? "",
      lastName:       raw.lastName ?? "",
      phone:          raw.phone,
      avatarUrl:      raw.avatarUrl,
      department:     raw.department,
      province:       raw.province,
      district:       raw.district,
      isActive:       raw.isActive ?? true,
      isEmailVerified: raw.isEmailVerified ?? true,
      fullName:       raw.fullName,
    };
  },

  // ─── CHAT (proveedor ↔ cliente) ──────────────────────────
  //
  // Las salas + mensajes se filtran por rol vía query string para
  // que un user con doble perfil OFICIO + NEGOCIO + cliente tenga
  // bandejas independientes (mismo contrato que el mobile).
  async getChatRooms(opts: {
    scope?: "client" | "provider";
    type?: "OFICIO" | "NEGOCIO";
  } = {}): Promise<ChatRoomSummary[]> {
    const qs = new URLSearchParams();
    if (opts.scope) qs.set("scope", opts.scope);
    if (opts.type)  qs.set("type",  opts.type);
    const path = qs.toString() ? `/chat/rooms/mine?${qs}` : "/chat/rooms/mine";
    return apiFetch<ChatRoomSummary[]>(path);
  },

  async getChatMessages(
    roomId: number,
    page = 1,
    limit = 30,
  ): Promise<ChatMessagesPage> {
    return apiFetch<ChatMessagesPage>(
      `/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`,
    );
  },

  async sendChatMessage(args: {
    chatRoomId: number;
    senderId: number;
    content: string;
  }): Promise<ChatMessage> {
    return apiFetch<ChatMessage>("/chat/messages", {
      method: "POST",
      body: JSON.stringify(args),
    });
  },

  async markChatRoomRead(roomId: number): Promise<{ updated: number }> {
    return apiFetch<{ updated: number }>(`/chat/rooms/${roomId}/read`, {
      method: "PATCH",
    });
  },
};

// ─── Tipos del chat ──────────────────────────────────────────
export interface ChatMessage {
  id: number;
  chatRoomId: number;
  senderId: number;
  content: string;
  status: "SENT" | "DELIVERED" | "READ";
  createdAt: string;
}

export interface ChatMessagesPage {
  items: ChatMessage[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ChatRoomSummary {
  id: number;
  clientId: number;
  providerId: number;
  createdAt: string;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  provider: {
    id: number;
    businessName: string;
    userId: number;
    images: Array<{ url: string }>;
  };
  lastMessage: ChatMessage | null;
  lastActivityAt: string;
  unreadCount: number;
}