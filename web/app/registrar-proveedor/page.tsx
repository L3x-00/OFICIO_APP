'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Briefcase, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { isAuthenticated, saveSession } from '@/lib/auth';
import { signInWithGoogleIdToken } from '@/lib/firebase';
import ProviderOnboardingForm from '@/components/onboarding/provider-onboarding-form';

export default function RegisterProviderPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(isAuthenticated());
  }, []);

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogleIdToken();
      const data = await api.socialLogin(idToken);
      saveSession(data);
      setAuthed(true);
      toast.success('Sesión iniciada. Completa tu perfil de proveedor.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!mounted) return null;

  // Gate de sesión: register/provider exige JWT.
  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-16 bg-dark-surface">
        <div className="w-full max-w-md glass p-8 rounded-2xl border-white/5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl glass border-primary/20 flex items-center justify-center mb-5">
            <Briefcase className="text-primary" />
          </div>
          <h1 className="font-display font-bold text-white text-2xl">Conviértete en proveedor</h1>
          <p className="text-white/55 text-sm mt-2 leading-relaxed">
            Inicia sesión para registrar tu perfil profesional o de negocio y empezar a recibir clientes.
          </p>
          <div className="flex flex-col gap-2.5 mt-6">
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white text-[#1f1f1f] font-semibold text-[14px] hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={17} />}
              Continuar con Google
            </button>
            <button onClick={() => router.push('/login')} className="text-white/45 hover:text-white text-[13px] py-1 transition-colors">
              Iniciar sesión con correo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ProviderOnboardingForm variant="full" onDone={() => router.push('/panel')} />;
}
