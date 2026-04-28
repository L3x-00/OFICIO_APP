'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Loader2, Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { setAdminToken, setAdminRefreshToken } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Credenciales incorrectas');
      }
      const data = await res.json();
      if (data.role !== 'ADMIN') {
        throw new Error('Acceso denegado: se requieren permisos de administrador');
      }
      setAdminToken(data.accessToken);
      if (data.refreshToken) setAdminRefreshToken(data.refreshToken);
      localStorage.setItem('adminLevel', 'ADMIN');
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-0)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Left panel — branding */}
      <div style={{
        width: '42%',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(var(--border-subtle) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.5,
        }} />

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
            }}>
              <Zap size={22} color="#fff" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>OficioApp</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '99px',
            marginBottom: '24px',
          }}>
            <Shield size={11} color="#60A5FA" />
            <span style={{ fontSize: '11px', color: '#60A5FA', fontWeight: 600, letterSpacing: '0.04em' }}>ACCESO SEGURO</span>
          </div>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '16px',
          }}>
            Panel de Control
            <br />
            <span style={{ color: 'var(--brand-light)' }}>Administrativo</span>
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '340px' }}>
            Gestión centralizada de proveedores, usuarios, verificaciones y análisis operacional de la plataforma.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ position: 'relative', display: 'flex', gap: '20px' }}>
          {[
            { label: 'Módulos', value: '9' },
            { label: 'Versión', value: '1.1' },
            { label: 'Entorno', value: 'Prod' },
          ].map(stat => (
            <div key={stat.label}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Form header */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}>
              Iniciar sesión
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Acceso exclusivo para administradores autorizados
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <div style={{
                width: '16px', height: '16px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}>
                <span style={{ fontSize: '10px', color: '#F87171', fontWeight: 700 }}>!</span>
              </div>
              <p style={{ fontSize: '13px', color: '#F87171', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label 
                htmlFor="admin-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  letterSpacing: '0.02em',
                }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@oficioapp.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'var(--transition)',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--brand)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-default)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label 
                htmlFor="admin-password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  letterSpacing: '0.02em',
                }}
              >
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="passwordHash"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'var(--transition)',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--brand)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--border-default)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px',
                background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(59,130,246,0.4)';
              }}
              onMouseLeave={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)';
              }}
            >
              {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Verificando acceso...' : 'Ingresar al panel'}
            </button>
          </form>

          {/* Security note */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
            padding: '10px 14px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
          }}>
            <Lock size={12} color="var(--text-tertiary)" />
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Conexión segura · Solo personal autorizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}