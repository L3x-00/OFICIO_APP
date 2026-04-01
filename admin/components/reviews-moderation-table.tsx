'use client';

import { useState } from 'react';
import { Review, moderateReview } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import { Eye, EyeOff, Star, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  reviews: Review[];
}

export function ReviewsModerationTable({ reviews }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);

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
            <tr key={review.id} className="hover:bg-white/[0.02] transition-colors">
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
              <td className="p-4">
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
  );
}