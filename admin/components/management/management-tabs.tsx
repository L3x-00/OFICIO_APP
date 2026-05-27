'use client';

import { useState } from 'react';
import { Users, Briefcase, UsersRound } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ProvidersList } from '@/components/providers-list';
import { UsersList } from '@/components/users-list';

/**
 * Tabs principal de Gestión. 3 vistas:
 *   • clients    — `role=USUARIO` (sin perfil de proveedor).
 *   • providers  — la tabla rica con suscripción / verificación / acciones.
 *   • dual       — `role=DUAL`.
 *
 * Cada tab monta el componente EXISTENTE (UsersList / ProvidersList)
 * envuelto en una Card uniforme. Los componentes internos no se tocan —
 * eso garantiza que el flujo de aprobación / edición / verificación
 * que ya funciona sigue funcionando idéntico.
 *
 * Persistencia simple en el query string para deep-link `?tab=clients`.
 */
type Tab = 'clients' | 'providers' | 'dual';

interface Props {
  initialTab?: Tab;
  initialSearch?: string;
  initialPage?: number;
}

export function ManagementTabs({
  initialTab = 'providers',
  initialSearch = '',
  initialPage = 1,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="space-y-4">
      <TabsList>
        <TabsTrigger value="clients">
          <Users size={14} />
          Clientes
        </TabsTrigger>
        <TabsTrigger value="providers">
          <Briefcase size={14} />
          Proveedores
        </TabsTrigger>
        <TabsTrigger value="dual">
          <UsersRound size={14} />
          Duales
        </TabsTrigger>
      </TabsList>

      <TabsContent value="clients">
        <Card className="p-4 sm:p-5">
          <UsersList initialRole="USUARIO" lockedRole />
        </Card>
      </TabsContent>

      <TabsContent value="providers">
        <Card className="p-4 sm:p-5">
          <ProvidersList
            initialPage={initialPage}
            initialSearch={initialSearch}
          />
        </Card>
      </TabsContent>

      <TabsContent value="dual">
        <Card className="p-4 sm:p-5">
          <UsersList initialRole="DUAL" lockedRole />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
