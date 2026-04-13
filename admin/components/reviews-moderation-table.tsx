'use client';

import { useState } from 'react';
import { Review, moderateReview } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import { Eye, EyeOff, Star, Image as ImageIcon, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  reviews: Review[];
}

export function ReviewsModerationTable({ reviews }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Review | null>(null);

  const handleModerate = async (reviewId: number, isVisible: boolean) => {
    setLoading(reviewId);
    try {
      await moderateReview(reviewId, isVisible);
      router.refresh(); // Recarga los datos de la página
    } catch (e) {
      alert('Error al moderar la reseña');
    } finally {
      setLoading(null);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="bg-[#15192B] rounded-2xl border border-white/5 p-12 text-center">
        <p className="text-gray-500">No hay reseñas para mostrar</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-[#15192B] rounded-2xl border border-white/5 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5 text-left">
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Usuario
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Proveedor
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Calificación
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Comentario
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Foto
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {reviews.map((review) => (
            <tr
              key={review.id}
              onClick={() => setViewing(review)}
              className="hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <td className="p-4">
                <span className="text-sm font-medium text-white">
                  {review.user.firstName} {review.user.lastName}
                </span>
              </td>
              <td className="p-4">
                <span className="text-sm text-gray-300">
                  {review.provider.businessName}
                </span>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < review.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }
                    />
                  ))}
                </div>
              </td>
              <td className="p-4 max-w-xs">
                <p className="text-sm text-gray-400 truncate">
                  {review.comment || (
                    <span className="text-gray-600 italic">Sin comentario</span>
                  )}
                </p>
              </td>
              <td className="p-4">
                {review.photoUrl ? (
                  <a
                    href={review.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline text-xs"
                  >
                    <ImageIcon size={14} />
                    Ver foto
                  </a>
                ) : (
                  <span className="text-gray-600 text-xs">Sin foto</span>
                )}
              </td>
              <td className="p-4">
                <StatusBadge
                  label={review.isVisible ? 'Visible' : 'Oculta'}
                  variant={review.isVisible ? 'success' : 'muted'}
                />
              </td>
              <td className="p-4">
                <span className="text-xs text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </td>
              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleModerate(review.id, !review.isVisible)}
                  disabled={loading === review.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                    review.isVisible
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                  }`}
                >
                  {loading === review.id ? (
                    <span className="animate-pulse">...</span>
                  ) : review.isVisible ? (
                    <>
                      <EyeOff size={13} />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye size={13} />
                      Mostrar
                    </>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

      {/* Modal detalle de reseña */}
      {viewing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div
            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-base">Detalle de reseña</h2>
                <p className="text-gray-500 text-xs mt-0.5">{viewing.provider.businessName}</p>
              </div>
              <button onClick={() => setViewing(null)} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Autor + rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                    <User size={15} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{viewing.user.firstName} {viewing.user.lastName}</p>
                    <p className="text-gray-500 text-xs">{formatDate(viewing.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < viewing.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                  ))}
                </div>
              </div>

              {/* Comentario */}
              {viewing.comment && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{viewing.comment}</p>
                </div>
              )}

              {/* Foto */}
              {viewing.photoUrl && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Foto adjunta</h3>
                  <a href={viewing.photoUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={viewing.photoUrl}
                      alt="Foto de reseña"
                      className="w-full rounded-xl border border-white/10 object-cover max-h-56 hover:border-white/30 transition-all"
                    />
                  </a>
                </div>
              )}

              {/* Estado */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className={`text-xs px-3 py-1.5 rounded-xl border font-bold ${
                  viewing.isVisible
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-gray-500 bg-white/5 border-white/10'
                }`}>
                  {viewing.isVisible ? 'Visible' : 'Oculta'}
                </span>
                <button
                  onClick={() => { handleModerate(viewing.id, !viewing.isVisible); setViewing(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    viewing.isVisible
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                  }`}
                >
                  {viewing.isVisible ? 'Ocultar reseña' : 'Hacer visible'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}