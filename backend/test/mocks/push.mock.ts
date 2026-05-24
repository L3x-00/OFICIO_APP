/**
 * Mock de PushNotificationsService.
 *
 * Toda llamada a `sendToUser` queda capturada como jest.fn() resolviendo
 * `undefined` por defecto — los tests inspeccionan los argumentos para
 * confirmar que el mensaje correcto se intentó enviar.
 */
export type PushMock = {
  sendToUser: jest.Mock;
  sendToTopic: jest.Mock;
};

export function createPushMock(): PushMock {
  return {
    sendToUser: jest.fn().mockResolvedValue(undefined),
    sendToTopic: jest.fn().mockResolvedValue(undefined),
  };
}
