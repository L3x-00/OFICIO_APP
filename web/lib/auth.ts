"use client";

import { LoginResponse, User } from "./types";

const ACCESS_TOKEN_KEY = "oficio_access_token";
const REFRESH_TOKEN_KEY = "oficio_refresh_token";
const USER_KEY = "oficio_user";
const LAST_ACTIVITY_KEY = "oficio_last_activity";
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos

export function saveSession(data: LoginResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  updateLastActivity();
  // Sync cookie so middleware (server-side) can read the token
  document.cookie = `${ACCESS_TOKEN_KEY}=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  // Expire the cookie used by middleware
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function updateLastActivity(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function isSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;
  const elapsed = Date.now() - parseInt(lastActivity, 10);
  return elapsed > INACTIVITY_TIMEOUT;
}

export function getRedirectPath(user: User | null | undefined, hasProvider?: boolean): string {
  if (!user || !user.role) return '/cliente';
  // ADMIN is redirected externally by the login page — this path is never hit for ADMIN
  if (user.role === 'PROVEEDOR' || hasProvider) return '/panel';
  return '/cliente';
}
