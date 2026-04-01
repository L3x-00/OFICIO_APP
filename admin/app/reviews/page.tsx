import { getAllReviews } from '@/lib/api';
import { ReviewsModerationTable } from '@/components/reviews-moderation-table';
import Link from 'next/link'; // IMPORTANTE: Sin esto, las etiquetas <Link> fallan

export const dynamic = 'force-dynamic';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const filter = params.filter;

  const isVisible =
    filter === 'visible' ? true :
    filter === 'hidden' ? false :
    undefined;

  const reviews = await getAllReviews(page, isVisible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Moderación de Reseñas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Revisa y modera las reseñas de los proveedores
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        {[
          { label: 'Todas',   value: '' },
          { label: 'Visibles', value: 'visible' },
          { label: 'Ocultas',  value: 'hidden' },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/reviews${f.value ? `?filter=${f.value}` : ''}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              (filter ?? '') === f.value
                ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20'
                : 'bg-[#15192B] text-gray-400 border border-white/5 hover:text-white'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-gray-500 flex items-center">
          {reviews.total || 0} reseñas
        </span>
      </div>

      <ReviewsModerationTable reviews={reviews.data} />

      {/* Paginación */}
      {reviews.lastPage > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: reviews.lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/reviews?page=${p}${filter ? `&filter=${filter}` : ''}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#15192B] text-gray-400 border border-white/5 hover:text-white'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}