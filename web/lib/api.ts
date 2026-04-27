"use client";

import { getAccessToken, getRefreshToken, clearSession, saveSession } from "./auth";
import { Analytics, LoginResponse, Offer, Opportunity, Provider, ProviderImage, User } from "./types";

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

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return data;
  },

  async getMyProfile(): Promise<Provider> {
    return apiFetch<Provider>("/provider-profile/me");
  },

  async updateMyProfile(payload: Record<string, unknown>): Promise<Provider> {
    return apiFetch<Provider>("/provider-profile/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async uploadImage(file: File): Promise<ProviderImage> {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<ProviderImage>("/provider-profile/me/images", formData);
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

  async getAnalytics(): Promise<Analytics> {
    return apiFetch<Analytics>("/provider-profile/me/analytics");
  },

  async getUserProfile(): Promise<User> {
    return apiFetch<User>("/users/me");
  },
};