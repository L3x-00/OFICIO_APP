import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import type { PublicProvider } from '@/lib/api';

/**
 * Columna de proveedores de categorías similares que acompaña la ficha
 * pública. Server component: los datos ya vienen resueltos por la página,
 * así que no hay flash de carga ni fetch en cliente.
 */
export default function RelatedProviders({
  providers,
  title = 'Servicios similares',
}: {
  providers: PublicProvider[];
  title?: string;
}) {
  if (providers.length === 0) return null;

  return (
    <aside aria-label={title}>
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-1 h-3.5 rounded-full bg-primary" />
        {title}
      </h2>
      <ul className="space-y-2">
        {providers.map((p) => {
          const imgs = p.images ?? [];
          const cover = (imgs.find((i) => i.isCover) ?? imgs[0])?.url ?? null;
          const category =
            p.category?.name ??
            (p.providerCategories?.find((pc) => pc.isPrimary) ?? p.providerCategories?.[0])
              ?.category?.name ??
            null;
          const district = p.locality?.district ?? p.locality?.province ?? null;

          return (
            <li key={p.id}>
              <Link
                href={`/${p.slug ?? p.id}`}
                className="group flex gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-white/10
                           bg-white dark:bg-white/[0.02] hover:border-primary/40 hover:shadow-md
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={p.businessName}
                      width={56}
                      height={56}
                      unoptimized
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary/50">
                      {p.businessName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                    {p.businessName}
                  </p>
                  {category && (
                    <p className="text-[11px] text-gray-500 dark:text-white/45 truncate">{category}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-white/45">
                    {(p.totalReviews ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500">
                        <Star size={10} className="fill-amber-500" />
                        {(p.averageRating ?? 0).toFixed(1)}
                      </span>
                    )}
                    {district && (
                      <span className="inline-flex items-center gap-0.5 truncate">
                        <MapPin size={10} /> {district}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
