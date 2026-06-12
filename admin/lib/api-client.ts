// Núcleo HTTP del cliente admin: base URL, gestión de tokens, refresh
// automático y el fetcher genérico. Extraído de `lib/api.ts` por
// mantenibilidad; `lib/api.ts` re-exporta las funciones públicas de tokens,
// así que los imports de los consumidores (`@/lib/api`) no cambian.

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  isRetry = false,
): Promise<T> {
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
      throw new Error(
        errorData.message || `Error del servidor: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error: unknown) {
    // CORRECCIÓN: Manejar errores de red o DNS para evitar crashes
    console.error(`Fetch error en ${endpoint}:`, error);
    throw error;
  }
}

// Fetches CSV with auth token, returns as Blob
export async function fetchCSVBlob(endpoint: string): Promise<Blob> {
  const token = getAdminToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

// Excel helpers (usan exceljs — XLSX puro JS, sin dependencias nativas).
export async function downloadXlsx(
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

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
