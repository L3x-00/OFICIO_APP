'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { saveSession, getRedirectPath, getUser } from '@/lib/auth';
import { signInWithGoogleIdToken } from '@/lib/firebase';
import { loginSchema } from '@/lib/validators';
import type { LoginFormData } from '@/lib/validators';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://oficio-backend.onrender.com';
const ADMIN_PANEL_URL = 'https://oficioadmin.vercel.app/login';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  // Redirección post-login compartida por email/password y Google: ADMIN va al
  // panel admin externo; el resto a /panel (proveedor) o /cliente según rol +
  // estado de proveedor (mismo criterio que el móvil).
  const routeAfterLogin = async (accessToken: string, sessionEmail: string) => {
    const sessionUser = getUser();
    if (!sessionUser || !sessionUser.role) {
      toast.error('No se pudo cargar tu perfil. Vuelve a iniciar sesión.');
      return;
    }
    if (sessionUser.role === 'ADMIN') {
      window.location.href = `${ADMIN_PANEL_URL}?email=${encodeURIComponent(sessionEmail)}`;
      return;
    }
    let hasProvider = false;
    try {
      const res = await fetch(`${API_BASE}/users/my-provider-status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const status = await res.json();
        hasProvider = status.hasProvider === true;
      }
    } catch {
      /* continue with role logic */
    }
    window.location.href = getRedirectPath(sessionUser, hasProvider);
  };

  // Login social con Google (Punto 1). Firebase Auth Web → Firebase ID token →
  // POST /auth/social-login (mismo endpoint que Flutter).
  const handleGoogle = async () => {
    if (loading || googleLoading || isLocked) return;
    setGoogleLoading(true);
    setErrors({});
    try {
      const idToken = await signInWithGoogleIdToken();
      const data = await api.socialLogin(idToken);
      saveSession(data);
      toast.success(data.isNewUser ? '¡Cuenta creada!' : '¡Bienvenido de nuevo!');
      await routeAfterLogin(data.accessToken, data.user.email);
    } catch (err: unknown) {
      // El usuario cerró/canceló el popup → no es un error que mostrar.
      const code = (err as { code?: string })?.code;
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled'
      ) {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google';
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
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
      await routeAfterLogin(data.accessToken, email);
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
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-16 bg-dark-surface overflow-hidden">
      {/* Fondo atmosférico */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 grid-bg-night opacity-20" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className={`relative w-full max-w-md glass p-8 sm:p-10 rounded-2xl shadow-glow-lg border-white/5 ${shake ? 'animate-shake' : ''}`}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl glass border-primary/20 flex items-center justify-center shadow-glow-sm mb-5">
            <Image
              src="/images/logo/servi.png" // Logo claro para fondo oscuro
              alt="Servi"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <h1 className="font-display font-bold tracking-tightest text-white text-[26px] sm:text-[30px] leading-tight">
            Bienvenido de nuevo
          </h1>
          <p className="text-white/50 text-[14px] mt-2">Tu portal de gestión profesional</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/50 text-[12.5px] font-display font-semibold mb-2 uppercase tracking-[0.16em]">
              Correo electrónico
            </label>
            <div className="relative group">
              <Mail
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  email ? 'text-primary' : 'text-white/30 group-focus-within:text-primary'
                }`}
                size={17}
                strokeWidth={1.75}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-white/[0.03] border rounded-xl pl-11 pr-4 py-3.5 text-white text-[14px] placeholder:text-white/20 focus:outline-none transition-all duration-300 font-sans ${
                  errors.email
                    ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20'
                    : 'border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 hover:border-white/20'
                }`}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={loading || isLocked}
              />
            </div>
            {errors.email && (
              <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                <AlertCircle size={12} />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-white/50 text-[12.5px] font-display font-semibold mb-2 uppercase tracking-[0.16em]">
              Contraseña
            </label>
            <div className="relative group">
              <Lock
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  password ? 'text-primary' : 'text-white/30 group-focus-within:text-primary'
                }`}
                size={17}
                strokeWidth={1.75}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-white/[0.03] border rounded-xl pl-11 pr-12 py-3.5 text-white text-[14px] placeholder:text-white/20 focus:outline-none transition-all duration-300 font-sans ${
                  errors.password
                    ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20'
                    : 'border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 hover:border-white/20'
                }`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading || isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                <AlertCircle size={12} />
                {errors.password}
              </p>
            )}
          </div>

          {isLocked && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-center text-rose-400 text-[13px] animate-fade-in flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              Demasiados intentos. Espera <span className="font-bold tabular-nums">{remainingSecs}s</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="btn btn-primary btn-lg press-effect w-full h-12 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

        {/* Divisor */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-[11px] uppercase tracking-[0.16em]">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Continuar con Google (Firebase Auth Web → /auth/social-login) */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || googleLoading || isLocked}
          className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white text-[#1f1f1f] font-semibold text-[14px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" />
            </svg>
          )}
          {googleLoading ? 'Conectando…' : 'Continuar con Google'}
        </button>

        <div className="mt-7 pt-5 border-t border-white/5 text-center">
          <p className="text-white/40 text-[12.5px] mb-3">
            ¿No tienes cuenta?{' '}
            <Link href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile" className="text-primary-light font-semibold hover:underline underline-offset-4 transition-colors">
              Descarga la app
            </Link>
          </p>
          <p className="text-white/30 text-[11px] flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} className="text-accent" strokeWidth={1.75} />
            Tus credenciales viajan cifradas. Protegemos tu privacidad.
          </p>
        </div>
      </motion.div>
    </div>
  );
}