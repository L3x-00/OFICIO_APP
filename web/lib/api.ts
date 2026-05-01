"use client";

import { getAccessToken, getRefreshToken, clearSession, saveSession } from "./auth";
import { Analytics, LoginResponse, Offer, Opportunity, Provider, ProviderImage, Review, User } from "./types";

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

/** Shape returned by GET /providers (public listing). */
export interface PublicProvider {
  id: number;
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
    return apiFetch<Analytics>(`/provider-profile/me/analytics?${params.toString()}`);
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

  async submitYapePayment(payload: {
    plan: string;
    amount: number;
    verificationCode: string;
    note?: string;
    voucherFile?: File;
  }): Promise<void> {
    if (payload.voucherFile) {
      const formData = new FormData();
      formData.append("file", payload.voucherFile);
      formData.append("plan", payload.plan);
      formData.append("amount", payload.amount.toString());
      formData.append("verificationCode", payload.verificationCode);
      if (payload.note) formData.append("note", payload.note);
      return apiUpload("/payments/yape", formData);
    }
    return apiFetch("/payments/yape", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAnalytics(type?: "OFICIO" | "NEGOCIO"): Promise<Analytics> {
    const qs = type ? `?type=${type}` : "";
    return apiFetch<Analytics>(`/provider-profile/me/analytics${qs}`);
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

  async getFavorites(userId: number): Promise<unknown[]> {
    try {
      return await apiFetch<unknown[]>(`/favorites/${userId}`);
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

  async getNotifications(): Promise<{
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
    try {
      return await apiFetch("/notifications");
    } catch {
      return { data: [], unreadCount: 0 };
    }
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
};