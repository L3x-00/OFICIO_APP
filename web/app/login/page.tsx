'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { saveSession, getRedirectPath, getUser } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import type { LoginFormData } from '@/lib/validators';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://oficio-backend.onrender.com';
const ADMIN_PANEL_URL = 'https://oficioadmin.vercel.app/login';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (lockedUntil === null) return;
    if (lockedUntil <= Date.now()) {
      setLockedUntil(null);
      setAttempts(0);
      return;
    }
    const timer = setInterval(() => {
      if (Date.now() >= (lockedUntil ?? 0)) {
        setLockedUntil(null);
        setAttempts(0);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const remainingSecs = lockedUntil
    ? Math.ceil((lockedUntil - Date.now()) / 1000)
    : 0;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (lockedUntil && Date.now() < lockedUntil) return;

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Partial<LoginFormData> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof LoginFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(email, password);
      saveSession(data);
      toast.success('¡Bienvenido de nuevo!');

      const sessionUser = data.user ?? getUser();
      if (!sessionUser || !sessionUser.role) {
        toast.error('No se pudo cargar tu perfil. Vuelve a iniciar sesión.');
        return;
      }

      if (sessionUser.role === 'ADMIN') {
        window.location.href = `${ADMIN_PANEL_URL}?email=${encodeURIComponent(email)}`;
        return;
      }

      let hasProvider = false;
      try {
        const res = await fetch(`${API_BASE}/users/my-provider-status`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        if (res.ok) {
          const status = await res.json();
          hasProvider = status.hasProvider === true;
        }
      } catch {
        /* continue with role logic */
      }

      // Navegación full reload (no router.push) por dos razones:
      // 1. Garantiza que el middleware vea la cookie recién escrita.
      // 2. Evita que el RSC cache de Next sirva un árbol stale del
      //    layout/landing autenticado-aware sin re-fetch.
      // El flujo ADMIN ya usa window.location.href; alineamos el resto.
      window.location.href = getRedirectPath(sessionUser, hasProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      toast.error(message);
      triggerShake();
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 60000);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = !!lockedUntil && Date.now() < lockedUntil;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-16">
      {/* Topografía suave */}
      <div className="absolute inset-0 topo pointer-events-none" aria-hidden />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" aria-hidden />

      <div
        className={`relative w-full max-w-md card-3d p-8 sm:p-10 animate-scale-in ${shake ? 'animate-shake' : ''}`}
      >
        <div className="flex flex-col items-center mb-8 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center shadow-ink-soft mb-5">
            <Image
              src="/images/logo/logo_dark.png"
              alt="OficioApp"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <h1 className="font-display font-bold tracking-tightest text-ink text-[26px] sm:text-[30px] leading-tight">
            Bienvenido de nuevo
          </h1>
          <p className="text-ink-4 text-[14px] mt-2">Tu portal de gestión profesional</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <label className="block text-ink-3 text-[12.5px] font-display font-semibold mb-2 uppercase tracking-[0.16em]">
              Correo electrónico
            </label>
            <div className="relative group">
              <Mail
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  email ? 'text-primary' : 'text-ink-4 group-focus-within:text-ink'
                }`}
                size={17}
                strokeWidth={1.75}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-surface border rounded-xl pl-11 pr-4 py-3 text-ink text-[14px] placeholder:text-ink-5 focus:outline-none transition-all duration-200 font-sans ${
                  errors.email
                    ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_0_3px_rgba(225,75,90,0.12)]'
                    : 'border-line-2 focus:border-ink focus:shadow-[0_0_0_3px_rgba(20,20,28,0.08)] hover:border-ink-4'
                }`}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={loading || isLocked}
              />
            </div>
            {errors.email && (
              <p className="text-rose text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                <AlertCircle size={12} />
                {errors.email}
              </p>
            )}
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            <label className="block text-ink-3 text-[12.5px] font-display font-semibold mb-2 uppercase tracking-[0.16em]">
              Contraseña
            </label>
            <div className="relative group">
              <Lock
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  password ? 'text-primary' : 'text-ink-4 group-focus-within:text-ink'
                }`}
                size={17}
                strokeWidth={1.75}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-surface border rounded-xl pl-11 pr-12 py-3 text-ink text-[14px] placeholder:text-ink-5 focus:outline-none transition-all duration-200 font-sans ${
                  errors.password
                    ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_0_3px_rgba(225,75,90,0.12)]'
                    : 'border-line-2 focus:border-ink focus:shadow-[0_0_0_3px_rgba(20,20,28,0.08)] hover:border-ink-4'
                }`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading || isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-rose text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                <AlertCircle size={12} />
                {errors.password}
              </p>
            )}
          </div>

          {isLocked && (
            <div className="bg-rose/8 border border-rose/30 rounded-xl px-4 py-3 text-center text-rose text-[13px] animate-fade-in flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              Demasiados intentos. Espera <span className="font-bold tabular-nums">{remainingSecs}s</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="btn btn-ink press-effect w-full h-12 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-fade-in-up"
            style={{ animationDelay: '320ms' }}
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Ingresando...
              </>
            ) : isLocked ? (
              `Espera ${remainingSecs}s`
            ) : (
              <>
                <LogIn size={17} />
                Ingresar
              </>
            )}
          </button>
        </form>

        <div className="mt-7 pt-5 border-t border-line text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <p className="text-ink-4 text-[12.5px] mb-3">
            ¿No tienes cuenta?{' '}
            <Link href="/" className="text-ink font-semibold hover:underline underline-offset-4 transition-colors">
              Descarga la app
            </Link>
          </p>
          <p className="text-ink-5 text-[11px] flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} className="text-green" strokeWidth={1.75} />
            Tus credenciales viajan cifradas. Protegemos tu privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
