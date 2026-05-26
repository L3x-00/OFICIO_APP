'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Bell, Image as ImageIcon, Send, Loader2, X } from 'lucide-react';
import { broadcastNotification, uploadBroadcastImage } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Página de broadcast masivo de notificaciones push.
 *
 * Flow:
 *  1. Admin escribe título + mensaje.
 *  2. Opcionalmente sube una imagen → `/upload/broadcast-image` → MinIO.
 *  3. Envía `POST /admin/notifications/broadcast` con `{title, message, imageUrl}`.
 *  4. Backend responde con `{enqueued}` y dispara el envío en background.
 */
export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: 'success'; text: string }
    | { kind: 'error';   text: string }
    | null
  >(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setTitle('');
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
    if (!title.trim() || !message.trim() || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await broadcastNotification({
        title:    title.trim(),
        message:  message.trim(),
        imageUrl: imageUrl ?? undefined,
      });
      setFeedback({
        kind: 'success',
        text: `Push encolado a ${res.enqueued} dispositivos. El envío real corre en background.`,
      });
      reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error enviando broadcast';
      setFeedback({ kind: 'error', text: msg });
    } finally {
      setSending(false);
    }
  };

  const disabled = !title.trim() || !message.trim() || sending || uploading;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-400" />
          Broadcast push
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Envía una notificación promocional a TODOS los usuarios con la app
          instalada y el token FCM activo. Soporta foto.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. ¡Nuevas funciones disponibles!"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/120</p>
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Mensaje <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            maxLength={500}
            rows={4}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Cuéntale a tus usuarios qué hay de nuevo..."
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/500</p>
        </div>

        {/* Imagen (opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Imagen (opcional)
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
          {sending ? 'Enviando…' : 'Enviar a todos'}
        </button>
      </div>

      <div className="text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-400">Recordatorios:</strong>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>Solo los usuarios con la app instalada y permisos de notificación reciben la push.</li>
          <li>Los tokens inválidos se limpian automáticamente del backend.</li>
          <li>El envío es asíncrono — la pantalla cierra inmediatamente, no esperes confirmación de entrega 1:1.</li>
        </ul>
      </div>
    </div>
  );
}
