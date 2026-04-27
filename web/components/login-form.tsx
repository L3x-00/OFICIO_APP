'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { saveSession, getRedirectPath } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import type { LoginFormData } from '@/lib/validators';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Contador regresivo visual después de 5 intentos fallidos
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
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(email, password);
      saveSession(data);
      toast.success('¡Bienvenido de nuevo!');
      router.push(getRedirectPath(data.user));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      toast.error(message);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 60000); // 60 segundos
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-text-secondary text-sm mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={18}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg-input border border-white/5 rounded-button pl-10 pr-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
            placeholder="tu@correo.com"
            autoComplete="email"
          />
        </div>
        {errors.email && (
          <p className="text-red text-xs mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-text-secondary text-sm mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={18}
          />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-bg-input border border-white/5 rounded-button pl-10 pr-12 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            aria-label="Mostrar contraseña"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-red text-xs mt-1">{errors.password}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || (!!lockedUntil && Date.now() < lockedUntil)}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-button font-semibold text-sm flex items-center justify-center gap-2 transition-colors duration-200"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : lockedUntil && Date.now() < lockedUntil ? (
          `Espera ${remainingSecs}s`
        ) : (
          <>
            <LogIn size={18} />
            Ingresar
          </>
        )}
      </button>
    </form>
  );
}