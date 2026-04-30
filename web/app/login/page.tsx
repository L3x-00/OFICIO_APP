'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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

      // Backend may omit `user` in some response shapes — fall back to localStorage,
      // which `saveSession` just populated, before routing.
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

      router.push(getRedirectPath(sessionUser, hasProvider));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decoración */}
      <div className="blob bg-primary/30 w-[500px] h-[500px] -top-40 -left-40 animate-float-slow" aria-hidden />
      <div className="blob bg-amber/20 w-[400px] h-[400px] bottom-[-150px] right-[-80px] animate-float" aria-hidden />
      <div className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.03] pointer-events-none" aria-hidden />

      <div
        className={`relative w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-primary/10 gradient-border animate-scale-in ${shake ? 'animate-shake' : ''}`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-primary rounded-2xl shadow-glow-md animate-pulse-glow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/images/logo/logo_dark.png"
                alt="OficioApp"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-2 animate-fade-in-up"
          style={{ animationDelay: '160ms' }}
        >
          Bienvenido a <span className="text-gradient">OficioApp</span>
        </h1>
        <p
          className="text-text-secondary text-sm text-center mb-8 animate-fade-in-up"
          style={{ animationDelay: '240ms' }}
        >
          Tu portal de gestión profesional
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="animate-fade-in-up" style={{ animationDelay: '320ms' }}>
            <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
              Correo electrónico
            </label>
            <div className="relative group">
              <Mail
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  email ? 'text-primary' : 'text-text-muted group-focus-within:text-primary'
                }`}
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-bg-input border rounded-xl pl-11 pr-4 py-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none transition-all duration-200 ${
                  errors.email
                    ? 'border-red/60 focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
                    : 'border-white/8 focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.15)] hover:border-white/15'
                }`}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={loading || isLocked}
              />
            </div>
            {errors.email && (
              <p className="text-red text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                <AlertCircle size={12} />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative group">
              <Lock
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  password ? 'text-primary' : 'text-text-muted group-focus-within:text-primary'
                }`}
                size={18}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-bg-input border rounded-xl pl-11 pr-12 py-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none transition-all duration-200 ${
                  errors.password
                    ? 'border-red/60 focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
                    : 'border-white/8 focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.15)] hover:border-white/15'
                }`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading || isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                <AlertCircle size={12} />
                {errors.password}
              </p>
            )}
          </div>

          {/* Rate-limit visual */}
          {isLocked && (
            <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-center text-red text-sm animate-fade-in flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              Demasiados intentos. Espera <span className="font-bold tabular-nums">{remainingSecs}s</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isLocked}
            className={`btn-primary press-effect w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-fade-in-up`}
            style={{ animationDelay: '480ms' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Ingresando...
              </>
            ) : isLocked ? (
              `Espera ${remainingSecs}s`
            ) : (
              <>
                <LogIn size={18} />
                Ingresar
              </>
            )}
          </button>
        </form>

        <div
          className="mt-6 pt-5 border-t border-white/5 text-center animate-fade-in-up"
          style={{ animationDelay: '560ms' }}
        >
          <p className="text-text-muted text-xs mb-3">
            ¿No tienes cuenta?{' '}
            <Link href="/" className="text-primary hover:text-primary-light underline-offset-4 hover:underline transition-colors">
              Descarga la app
            </Link>
          </p>
          <p className="text-text-muted/70 text-[10px] flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} className="text-green" />
            Tus credenciales viajan cifradas. Protegemos tu privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
