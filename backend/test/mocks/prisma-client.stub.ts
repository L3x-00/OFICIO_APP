/**
 * Stub del PrismaClient generado.
 *
 * El cliente real (`src/generated/client/client.ts`) usa `import.meta.url`
 * que es ESM-only — Jest en modo CommonJS lo rechaza al parsear los
 * archivos que terminan importando `prisma.service.ts` → `client.js`.
 *
 * Como los UNIT tests inyectan un PrismaMock directamente al constructor
 * de cada servicio, el cliente real NUNCA se instancia. Reemplazamos el
 * módulo por esta clase vacía vía `moduleNameMapper` para que la
 * resolución de imports siga compilando sin tocar la lógica.
 */
export class PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_opts?: any) {}
  async $connect()    { /* noop */ }
  async $disconnect() { /* noop */ }
}
