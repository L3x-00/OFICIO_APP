part of '../auth_provider.dart';

/// Lógica de comunicación con el WebSocket: conexión por user,
/// handler de desactivación remota, handler de notificaciones genéricas
/// (PROVIDER_APPROVED / REJECTED, TRUST_*, PLAN_*).
///
/// Usa `part of` para compartir el library con AuthProvider — así
/// accede al estado privado (_user, _pendingPlanPromotion, etc.) sin
/// exponerlo en la API pública del provider.
mixin AuthSocketMixin on ChangeNotifier {
  // ── Hooks que la clase concreta provee ─────────────────────
  UserModel? get _user;
  String? get _activeProfileType;
  set _wasDeactivated(bool v);
  set _pendingPlanPromotion(PlanActivationPayload? v);
  set _pendingTrustRejection(TrustRejectionPayload? v);

  Future<void> _syncProviderStatus();
  Future<void> _refreshUserToken();
  void _enqueueProviderWelcomeIfNeeded({String? preferredType});
  Future<void> logout();

  // ── Conexión inicial ───────────────────────────────────────

  // false positive: lo llaman login/loginWithSocial/loginFromSaved/
  // initialize en auth_provider.dart y verifyOtp en
  // auth_recovery_mixin.dart, todos dentro del mismo library.
  // ignore: unused_element
  Future<void> _connectSocketForUser(int userId) async {
    final socket = SocketService.instance;
    // Siempre re-registrar listeners (pueden haber sido limpiados en
    // logout anterior).
    socket.removeDeactivationListener(_handleRemoteDeactivation);
    socket.removeNotificationListener(_handleRemoteNotification);
    socket.addDeactivationListener(_handleRemoteDeactivation);
    socket.addNotificationListener(_handleRemoteNotification);

    // Obtener el token JWT guardado para autenticar el WebSocket.
    final token = await AuthLocalStorage.getAccessToken();

    // Forzar reconexión con la sala correcta cada vez que cambia el userId.
    socket.reconnectForUser(DioClient.baseUrl, userId, token ?? '');
  }

  // ── Listeners ──────────────────────────────────────────────

  /// Callback que el SocketService invoca cuando el servidor emite
  /// `userDeactivated` con el userId de esta sesión.
  void _handleRemoteDeactivation(int userId) {
    if (_user?.id != userId) return;
    _wasDeactivated = true;
    // logout() es async pero no necesitamos await aquí;
    // la UI reacciona al cambio de navigationState.
    logout();
  }

  /// Callback que el SocketService invoca cuando el servidor emite
  /// el evento `notification` genérico. Filtra por targetUserId y
  /// reacciona a PROVIDER_APPROVED / PROVIDER_REJECTED, TRUST_*, PLAN_*.
  void _handleRemoteNotification(Map<String, dynamic> payload) {
    // Comparación type-safe: el socket puede enviar int o double para userId.
    final rawTargetId = payload['targetUserId'];
    if (rawTargetId != null) {
      final targetId = rawTargetId is int
          ? rawTargetId
          : int.tryParse(rawTargetId.toString().replaceAll('.0', ''));
      if (targetId != _user?.id) return;
    }

    final type = payload['type'] as String?;

    if (type == 'PLAN_APROBADO' || type == 'PLAN_RECHAZADO') {
      final targetProfileType = payload['targetProfileType'] as String?;
      if (targetProfileType != null && targetProfileType != _activeProfileType) return;
      _syncProviderStatus().then((_) {
        if (type == 'PLAN_APROBADO') {
          // Backend ahora envía `plan` explícito (ESTANDAR/PREMIUM).
          // Mantenemos el regex como fallback para payloads legacy o
          // FCM background con shape distinto.
          final explicit = (payload['plan'] as String?)?.toUpperCase();
          final rawBody  = payload['body'] as String? ?? '';
          final match    = RegExp(r'[Pp]lan (\w+)').firstMatch(rawBody);
          final planName = explicit
              ?? match?.group(1)?.toUpperCase()
              ?? 'ESTANDAR';
          _pendingPlanPromotion = PlanActivationPayload(
            plan: planName,
            title: payload['title'] as String? ?? '¡Plan activado!',
          );
        }
        notifyListeners();
      });
      return;
    }

    if (type == 'PROVIDER_APPROVED') {
      // Sincronizar estado Y refrescar token para que el JWT tenga role:PROVEEDOR.
      _syncProviderStatus().then((_) async {
        await _refreshUserToken();
        // Encolar el modal de bienvenida — la pantalla principal lo
        // consume en cuanto este notifyListeners se propague.
        _enqueueProviderWelcomeIfNeeded(
          preferredType: payload['targetProfileType'] as String?,
        );
        notifyListeners();
      });
      return;
    }

    if (type == 'PROVIDER_REJECTED') {
      _syncProviderStatus().then((_) => notifyListeners());
      return;
    }

    if (type == 'PROVIDER_DELETED') {
      // Admin eliminó este perfil del user en tiempo real:
      // 1. Re-sync — saca el providerType de _providerProfiles, el
      //    botón "Ir a mi panel" en home se vuelve "Quiero ser parte"
      //    al instante.
      // 2. Encolar el payload con motivo para que _AuthSideEffects
      //    muestre el dialog explicativo encima de cualquier pantalla.
      _syncProviderStatus().then((_) {
        final profileType  = (payload['targetProfileType'] as String?) ?? 'OFICIO';
        final reason       = (payload['reason'] as String?)
                          ?? (payload['body'] as String?)
                          ?? 'Decisión del administrador.';
        final businessName = (payload['businessName'] as String?) ?? '';
        (this as dynamic).setPendingProviderDeletion(
          ProviderDeletionPayload(
            profileType:  profileType,
            businessName: businessName,
            reason:       reason,
          ),
        );
      });
      return;
    }

    if (type == 'TRUST_APPROVED' || type == 'TRUST_REJECTED') {
      _syncProviderStatus().then((_) {
        if (type == 'TRUST_REJECTED') {
          _pendingTrustRejection = TrustRejectionPayload(
            reason: payload['body'] as String? ?? '',
            profileType: payload['targetProfileType'] as String? ?? 'OFICIO',
            rejectedAt: payload['rejectedAt'] as String?,
          );
        }
        notifyListeners();
      });
    }
  }
}
