/**
 * Mock del EventsGateway para UNIT tests.
 *
 * Sustituye al WebSocket server real. Todos los emisores devuelven
 * `jest.fn()` para que cada test pueda inspeccionar exactamente qué
 * notificaciones se mandaron (tipo, target, payload) sin levantar un
 * socket.io server real.
 *
 * Además expone `server.to(...).emit(...)` con un proxy mínimo porque
 * algunos servicios (chat, payments) usan esa API cruda para emitir a
 * salas específicas.
 */
export type EventsGatewayMock = {
  emitNotification:           jest.Mock;
  emitAdminEvent:             jest.Mock;
  emitSubastaNew:             jest.Mock;
  emitProviderStatusChanged:  jest.Mock;
  emitUserDeactivated:        jest.Mock;
  server: {
    to:   jest.Mock;
    emit: jest.Mock;
  };
};

export function createEventsGatewayMock(): EventsGatewayMock {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  return {
    emitNotification:           jest.fn(),
    emitAdminEvent:             jest.fn(),
    emitSubastaNew:             jest.fn(),
    emitProviderStatusChanged:  jest.fn(),
    emitUserDeactivated:        jest.fn(),
    server: { to, emit },
  };
}
