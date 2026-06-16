'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Mail,
  Image as ImageIcon,
  Send,
  Loader2,
  X,
  Users,
  UserRound,
  Store,
} from 'lucide-react';
import {
  broadcastEmail,
  uploadBroadcastImage,
  type EmailAudience,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Página de envío de correos masivos (Brevo).
 *
 * Flow:
 *  1. Admin escribe asunto + mensaje y elige la audiencia (todos / clientes /
 *     proveedores).
 *  2. Opcionalmente sube una imagen → `/upload/broadcast-image` → MinIO.
 *  3. Envía `POST /admin/emails/broadcast` con `{subject, message, audience, imageUrl}`.
 *  4. Backend responde con `{recipients}` y dispara el envío en background.
 *
 * A diferencia del broadcast push, esto envía SOLO correo (no notificación
 * push) y permite segmentar por rol.
 */
const AUDIENCES: { value: EmailAudience; label: string; icon: typeof Users }[] = [
  { value: 'ALL', label: 'Todos', icon: Users },
  { value: 'CLIENTS', label: 'Clientes', icon: UserRound },
  { value: 'PROVIDERS', label: 'Proveedores', icon: Store },
];

export default function EmailsPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<EmailAudience>('ALL');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: 'success'; text: string }
    | { kind: 'error'; text: string }
    | null
  >(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setSubject('');
    setMessage('');
    setImageUrl(null);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    try {
      const url = await uploadBroadcastImage(file);
      setImageUrl(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error subiendo imagen';
      setFeedback({ kind: 'error', text: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim() || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await broadcastEmail({
        subject: subject.trim(),
        message: message.trim(),
        audience,
        imageUrl: imageUrl ?? undefined,
      });
      setFeedback({
        kind: 'success',
        text: `Correo encolado a ${res.recipients} destinatario(s). El envío corre en segundo plano.`,
      });
      reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error enviando el correo';
      setFeedback({ kind: 'error', text: msg });
    } finally {
      setSending(false);
    }
  };

  const disabled = !subject.trim() || !message.trim() || sending || uploading;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-amber-400" />
          Enviar correos
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Envía un correo (vía Brevo) a la audiencia que elijas. Soporta una
          imagen de cabecera. El envío es solo por email, no notificación push.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* Audiencia */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Destinatarios
          </label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              const active = audience === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                    active
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Asunto */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Asunto <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={subject}
            maxLength={150}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Novedades de Servi este mes"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">{subject.length}/150</p>
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Mensaje <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            maxLength={5000}
            rows={7}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe el contenido del correo. Los saltos de línea se respetan."
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/5000</p>
        </div>

        {/* Imagen (opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Imagen de cabecera (opcional)
          </label>
          {imageUrl ? (
            <div className="relative inline-block">
              <Image
                src={imageUrl}
                alt="Preview"
                width={300}
                height={192}
                className="max-h-48 rounded-lg border border-gray-700 object-contain"
              />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                aria-label="Quitar imagen"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-950 border border-dashed border-gray-700 hover:border-amber-500 rounded-lg text-gray-400 hover:text-amber-400 transition disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span className="text-sm">
                {uploading ? 'Subiendo…' : 'Subir imagen'}
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = ''; // reset para que el mismo file dispare onChange
            }}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={
              feedback.kind === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm'
                : 'bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm'
            }
          >
            {feedback.text}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-400 text-black font-semibold px-4 py-2.5 rounded-lg transition"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending ? 'Enviando…' : 'Enviar correo'}
        </button>
      </div>

      <div className="text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-400">Recordatorios:</strong>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>Solo se envía a usuarios activos con correo registrado (los admin quedan excluidos).</li>
          <li>El envío es asíncrono y por lotes — no esperes confirmación de entrega 1:1.</li>
          <li>Requiere <code className="text-gray-400">BREVO_API_KEY</code> configurada en el backend; sin ella, no se envía nada.</li>
        </ul>
      </div>
    </div>
  );
}
