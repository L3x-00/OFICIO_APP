import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminNotificationPayload } from "@/lib/socket";

const socketState = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket: {
    connected: boolean;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  } = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
  };
  socket.on.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return socket;
    },
  );
  socket.off.mockImplementation((event: string) => {
    handlers.delete(event);
    return socket;
  });
  socket.connect.mockImplementation(() => {
    socket.connected = true;
    return socket;
  });
  return { handlers, socket };
});

vi.mock("@/lib/socket", () => ({
  getAdminSocket: () => socketState.socket,
}));

import { useAdminSocket } from "@/hooks/useAdminSocket";

function Harness({
  onNotification,
  onActivity,
}: {
  onNotification: (payload: AdminNotificationPayload) => void;
  onActivity: () => void;
}) {
  useAdminSocket(onNotification, onActivity);
  return null;
}

describe("useAdminSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketState.handlers.clear();
    socketState.socket.connected = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("escucha notification y adminEvent, coalesciendo una sola recarga", () => {
    const onNotification = vi.fn();
    const onActivity = vi.fn();
    render(<Harness onNotification={onNotification} onActivity={onActivity} />);

    act(() => {
      socketState.handlers.get("notification")?.({
        type: "NEW_PROVIDER",
        title: "Nuevo proveedor",
        body: "Pendiente",
        targetRole: "ADMIN",
      });
      socketState.handlers.get("adminEvent")?.({
        event: "NEW_PROVIDER",
        timestamp: new Date().toISOString(),
      });
      vi.advanceTimersByTime(120);
    });

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onActivity).toHaveBeenCalledTimes(1);
    expect(socketState.socket.connect).toHaveBeenCalled();
  });

  it("ignora notificaciones dirigidas a usuarios", () => {
    const onNotification = vi.fn();
    const onActivity = vi.fn();
    render(<Harness onNotification={onNotification} onActivity={onActivity} />);

    act(() => {
      socketState.handlers.get("notification")?.({
        type: "CHAT_MESSAGE",
        title: "Chat",
        body: "Hola",
        targetUserId: 7,
      });
      vi.advanceTimersByTime(120);
    });

    expect(onNotification).not.toHaveBeenCalled();
    expect(onActivity).not.toHaveBeenCalled();
  });
});
