import { VerificationQueue } from '@/components/verification-queue';

export const dynamic = 'force-dynamic';

export default function VerificationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sistema de Verificación</h1>
        <p className="text-gray-400 text-sm mt-1">
          Revisa y gestiona las solicitudes de verificación de profesionales y negocios
        </p>
      </div>
      <VerificationQueue />
    </div>
  );
}
