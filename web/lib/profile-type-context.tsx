'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type ProfileType = 'OFICIO' | 'NEGOCIO';

export interface ProviderProfileSummary {
  providerId: number;
  businessName: string;
  type: ProfileType;
  verificationStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  isVerified: boolean;
  trustStatus?: string;
  isTrusted?: boolean;
  trustRejectionReason?: string | null;
  phone?: string;
  description?: string;
  categoryName?: string;
}

export interface MyProviderStatus {
  hasProvider: boolean;
  profiles: ProviderProfileSummary[];
}

interface Ctx {
  status: MyProviderStatus | null;
  loading: boolean;
  /** Approved profile types available to the user. */
  availableTypes: ProfileType[];
  /** Active profile type (only one of availableTypes). null if user has no providers. */
  activeType: ProfileType | null;
  /** Switch active profile (persists in localStorage + URL). */
  setActiveType: (type: ProfileType) => void;
  /** The summary of the active profile, if any. */
  activeProfile: ProviderProfileSummary | null;
  /** Reload status from server. */
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'oficio_active_profile_type';

const ProfileTypeContext = createContext<Ctx | null>(null);

export function useProfileType(): Ctx {
  const ctx = useContext(ProfileTypeContext);
  if (!ctx) throw new Error('useProfileType must be used inside <ProfileTypeProvider>');
  return ctx;
}

/**
 * Optional helper for callers that may render outside the provider tree (e.g. before mount).
 * Returns null instead of throwing.
 */
export function useProfileTypeOptional(): Ctx | null {
  return useContext(ProfileTypeContext);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://oficio-backend.onrender.com';

export function ProfileTypeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<MyProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveTypeState] = useState<ProfileType | null>(null);

  const availableTypes = useMemo<ProfileType[]>(() => {
    if (!status?.profiles) return [];
    // Only count APROBADO profiles as switchable. PENDIENTE/RECHAZADO still show
    // info but don't grant panel access toggling.
    const approved = status.profiles.filter(
      (p) => p.verificationStatus === 'APROBADO',
    );
    const types = new Set<ProfileType>();
    approved.forEach((p) => types.add(p.type));
    return Array.from(types);
  }, [status]);

  const fetchStatus = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('oficio_access_token')
        : null;
      if (!token) {
        setStatus({ hasProvider: false, profiles: [] });
        return;
      }
      const res = await fetch(`${API_BASE}/users/my-provider-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setStatus({ hasProvider: false, profiles: [] });
        return;
      }
      const data: MyProviderStatus = await res.json();
      setStatus(data);
    } catch {
      setStatus({ hasProvider: false, profiles: [] });
    }
  }, []);

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  // Resolve activeType once we know what's available.
  useEffect(() => {
    if (loading || availableTypes.length === 0) return;
    const fromUrl = searchParams.get('tipo') as ProfileType | null;
    const fromStorage =
      typeof window !== 'undefined'
        ? (localStorage.getItem(STORAGE_KEY) as ProfileType | null)
        : null;

    let next: ProfileType | null = null;
    if (fromUrl && availableTypes.includes(fromUrl)) next = fromUrl;
    else if (fromStorage && availableTypes.includes(fromStorage)) next = fromStorage;
    else next = availableTypes[0];

    if (next !== activeType) {
      setActiveTypeState(next);
      if (next && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
    }
  }, [availableTypes, loading, searchParams, activeType]);

  const setActiveType = useCallback(
    (type: ProfileType) => {
      if (!availableTypes.includes(type)) return;
      setActiveTypeState(type);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, type);
      }
      // Sync URL param so deep-links work.
      const params = new URLSearchParams(searchParams.toString());
      params.set('tipo', type);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [availableTypes, pathname, router, searchParams],
  );

  const activeProfile = useMemo<ProviderProfileSummary | null>(() => {
    if (!status?.profiles || !activeType) return null;
    return status.profiles.find((p) => p.type === activeType) ?? null;
  }, [status, activeType]);

  const value = useMemo<Ctx>(
    () => ({
      status,
      loading,
      availableTypes,
      activeType,
      setActiveType,
      activeProfile,
      refresh: async () => {
        setLoading(true);
        await fetchStatus();
        setLoading(false);
      },
    }),
    [status, loading, availableTypes, activeType, setActiveType, activeProfile, fetchStatus],
  );

  return (
    <ProfileTypeContext.Provider value={value}>
      {children}
    </ProfileTypeContext.Provider>
  );
}
