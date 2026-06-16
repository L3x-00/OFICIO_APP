'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
} from 'firebase/auth';

/**
 * Firebase Web SDK para el login social (Google) — Punto 1 del onboarding web.
 *
 * El backend valida el token con `firebase-admin` (`getAuth().verifyIdToken`),
 * por lo que la web DEBE obtener un *Firebase ID token* (no un token crudo de
 * Google Identity, que firebase-admin rechazaría). Por eso usamos Firebase
 * Auth Web (signInWithPopup) — el mismo proveedor que usa Flutter.
 *
 * Config: se lee de `NEXT_PUBLIC_FIREBASE_*` con fallback a los valores
 * públicos del proyecto (los mismos de `google-services.json`; la apiKey de
 * Firebase es config de cliente, no un secreto). El dominio de la web debe
 * estar en Firebase Console → Authentication → Settings → Authorized domains,
 * y Google debe estar habilitado como proveedor (ya lo está para el móvil).
 */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyA4THbfLfpGlrNvX5RjmHBeKRbXczVyrWE',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'oficioapp-7a879.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'oficioapp-7a879',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '31930959072',
  // appId es opcional para Auth; solo se incluye si está configurado.
  ...(process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    ? { appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID }
    : {}),
};

function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

/**
 * Abre el popup de Google, autentica con Firebase y devuelve el *Firebase ID
 * token* listo para enviar a `POST /auth/social-login`. Lanza si el usuario
 * cierra el popup o la autenticación falla.
 */
export async function signInWithGoogleIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  auth.useDeviceLanguage();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user.getIdToken();
}
