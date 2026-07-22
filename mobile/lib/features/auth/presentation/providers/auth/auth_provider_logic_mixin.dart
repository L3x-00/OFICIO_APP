part of '../auth_provider.dart';

/// Gestión del perfil de proveedor (registro + sync con backend).
///
/// Comparte el library con AuthProvider via `part of` para acceder al
/// estado privado de los mapas `_providerProfiles`,
/// `_verificationStatusByType`, `_rejectionReasonByType`,
/// `_providerDataByType`, etc.
mixin AuthProviderLogicMixin on ChangeNotifier {
  // ── Hooks que la clase concreta provee ─────────────────────
  UserModel? get _user;
  set _user(UserModel? v);
  set _isLoading(bool v);
  set _error(String? v);
  AuthRepository get _repo;
  Set<String> get _providerProfiles;
  String? get _activeProfileType;
  set _activeProfileType(String? v);
  String? get _providerVerificationStatus;
  set _providerVerificationStatus(String? v);
  Map<String, String> get _verificationStatusByType;
  Map<String, String> get _rejectionReasonByType;
  Map<String, int> get _rejectionNotificationIdByType;
  Map<String, Map<String, dynamic>> get _providerDataByType;
  ProviderApprovalPayload? get _pendingProviderApproval;
  set _pendingProviderApproval(ProviderApprovalPayload? v);
  TrustRejectionPayload? get _pendingTrustRejection;

  // ── Registro ───────────────────────────────────────────────

  /// Registra el perfil de proveedor en el backend y actualiza el
  /// estado local. Devuelve true si se creó con éxito.
  Future<bool> registerProvider({
    required String businessName,
    required String phone,
    required String type,
    String? whatsapp,
    // OFICIO
    String? dni,
    // NEGOCIO
    String? ruc,
    String? nombreComercial,
    String? razonSocial,
    bool hasDelivery = false,
    bool plenaCoordinacion = false,
    bool hasHomeService = false,
    // comunes
    String? description,
    String? address,

    /// Una o más categorías asociadas al proveedor. El backend valida
    /// el arreglo bajo el nombre `categoryIds`; mantenemos esa forma
    /// desde el provider para evitar transforms espurios en el
    /// repositorio.
    List<int>? categoryIds,

    /// Especialidad principal (isPrimary) — debe estar dentro de categoryIds.
    int? primaryCategoryId,

    /// Ubicación administrativa — el backend resuelve la localidad real.
    String? department,
    String? province,
    String? district,
    Map<String, dynamic>? scheduleJson,
    // redes sociales
    String? website,
    String? instagram,
    String? tiktok,
    String? facebook,
    String? linkedin,
    String? twitterX,
    String? telegram,
    String? whatsappBiz,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.registerProvider(
      businessName: businessName,
      phone: phone,
      type: type,
      whatsapp: whatsapp,
      dni: dni,
      ruc: ruc,
      nombreComercial: nombreComercial,
      razonSocial: razonSocial,
      hasDelivery: hasDelivery,
      plenaCoordinacion: plenaCoordinacion,
      hasHomeService: hasHomeService,
      description: description,
      address: address,
      categoryIds: categoryIds,
      primaryCategoryId: primaryCategoryId,
      department: department,
      province: province,
      district: district,
      scheduleJson: scheduleJson,
      website: website,
      instagram: instagram,
      tiktok: tiktok,
      facebook: facebook,
      linkedin: linkedin,
      twitterX: twitterX,
      telegram: telegram,
      whatsappBiz: whatsappBiz,
    );

    result.when(
      success: (_) {
        // El rol sigue siendo USUARIO hasta que el admin apruebe — pero
        // localmente debemos marcar el perfil como PENDIENTE para que
        // canBecomeRole(type) deje de devolver true inmediatamente
        // después del registro y la UI no ofrezca volver a registrarse.
        _providerProfiles.add(type);
        _verificationStatusByType[type] = 'PENDIENTE';
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  // ── Sync con backend ───────────────────────────────────────

  /// Sincroniza el estado del proveedor con el backend. También
  /// refresca el rol del usuario para reflejar aprobaciones/rechazos.
  /// Silencioso en caso de error (no crítico para el flujo principal).
  Future<void> _syncProviderStatus() async {
    final result = await _repo.getMyProviderStatus();
    result.when(
      success: (data) {
        if (data['hasProvider'] == true) {
          final profiles = (data['profiles'] as List<dynamic>?) ?? const [];
          final hasAnyApproved = _parseProviderProfiles(profiles);
          _syncUserRole(hasAnyApproved);
          _enqueueProviderRejectionIfNeeded();

          // Encolar el modal de bienvenida si hay un perfil aprobado
          // y todavía no se mostró (el flag persistido en
          // SharedPreferences dentro de WelcomeProviderPlanModal evita
          // repetir).
          if (hasAnyApproved && _pendingProviderApproval == null) {
            _enqueueProviderWelcomeIfNeeded();
          }
        } else {
          // Sin perfiles — limpiar TODOS los mapas para evitar
          // contaminación multicuentas.
          _providerProfiles.clear();
          _activeProfileType = null;
          _providerVerificationStatus = null;
          _verificationStatusByType.clear();
          _rejectionReasonByType.clear();
          _rejectionNotificationIdByType.clear();
          _providerDataByType.clear();
          _syncUserRole(false);
        }
      },
      failure: (_) {}, // Silencioso.
    );
  }

  /// Limpia los mapas de proveedor, mapea los alias del backend
  /// (PROFESSIONAL/BUSINESS → OFICIO/NEGOCIO), llena
  /// [_rejectionReasonByType] (extrayendo el motivo después de
  /// "Motivo: ") y devuelve true si AL MENOS un perfil quedó en
  /// estado APROBADO.
  bool _parseProviderProfiles(List<dynamic> profiles) {
    _providerProfiles.clear();
    _providerVerificationStatus = null;
    _verificationStatusByType.clear();
    _rejectionReasonByType.clear();
    _rejectionNotificationIdByType.clear();
    _providerDataByType.clear();

    bool hasAnyApproved = false;

    for (final raw in profiles) {
      final profile = raw as Map<String, dynamic>;
      final rawType = profile['type'] as String? ?? 'OFICIO';
      final internalType = switch (rawType) {
        'PROFESSIONAL' => 'OFICIO',
        'BUSINESS' => 'NEGOCIO',
        _ => rawType,
      };
      _providerProfiles.add(internalType);
      _activeProfileType ??= internalType;
      _providerDataByType[internalType] = profile;

      // Priorizar estado APROBADO; si ninguno aprobado, mostrar el último.
      final status = profile['verificationStatus'] as String?;
      if (_providerVerificationStatus == null || status == 'APROBADO') {
        _providerVerificationStatus = status;
      }
      if (status == 'APROBADO') hasAnyApproved = true;

      // Guardar estado por tipo para que el banner distinga PENDIENTE
      // vs RECHAZADO.
      if (status != null) _verificationStatusByType[internalType] = status;

      // Si fue rechazado, extraer el motivo de la primera notificación
      // RECHAZADO. El mensaje viene con prefijo "Motivo: " desde el admin.
      if (status == 'RECHAZADO') {
        final notifications =
            profile['pendingNotifications'] as List<dynamic>? ?? [];
        final rejectionNotif = notifications.firstWhere((n) {
          final type = (n as Map<String, dynamic>)['type'];
          return type == 'RECHAZADO' || type == 'PROVIDER_REJECTED';
        }, orElse: () => null);
        if (rejectionNotif != null) {
          final notification = rejectionNotif as Map<String, dynamic>;
          final msg = notification['message'] as String? ?? '';
          final idx = msg.indexOf('Motivo: ');
          _rejectionReasonByType[internalType] = idx >= 0
              ? msg.substring(idx + 8)
              : msg;
          final rawNotificationId = notification['id'];
          final notificationId = rawNotificationId is int
              ? rawNotificationId
              : int.tryParse(rawNotificationId?.toString() ?? '');
          if (notificationId != null) {
            _rejectionNotificationIdByType[internalType] = notificationId;
          }
        }
      }
    }

    return hasAnyApproved;
  }

  /// Alinea el `role` local del [_user] con el rol esperado según
  /// haya o no perfiles aprobados. Solo aplica `copyWith` cuando el
  /// rol cambia — evita notifyListeners() innecesarios.
  void _syncUserRole(bool hasAnyApproved) {
    if (_user == null) return;
    final expectedRole = hasAnyApproved ? 'PROVEEDOR' : 'USUARIO';
    if (_user!.role != expectedRole) {
      _user = _user!.copyWith(role: expectedRole);
    }
  }

  /// Si un sync encuentra un perfil RECHAZADO, encola el modal global con
  /// el motivo persistido por el backend. El pending evita duplicados en el
  /// mismo proceso; la UI guarda el notificationId tras mostrarlo.
  void _enqueueProviderRejectionIfNeeded() {
    if (_pendingTrustRejection != null) return;
    String? rejectedType;
    for (final e in _verificationStatusByType.entries) {
      if (e.value == 'RECHAZADO') {
        rejectedType = e.key;
        break;
      }
    }
    if (rejectedType == null) return;
    final reason = _rejectionReasonByType[rejectedType];
    if (reason == null || reason.isEmpty) return;
    (this as dynamic).setPendingTrustRejection(
      TrustRejectionPayload(
        reason: reason,
        profileType: rejectedType,
        notificationId: _rejectionNotificationIdByType[rejectedType],
        isProviderRegistration: true,
      ),
    );
  }

  /// Si tras la sincronización hay un perfil de proveedor APROBADO,
  /// arma el [ProviderApprovalPayload] para que la pantalla principal
  /// abra el modal de bienvenida. Prefiere el `preferredType` (viene
  /// del evento socket); si no, toma el primer aprobado disponible.
  void _enqueueProviderWelcomeIfNeeded({String? preferredType}) {
    final approvedTypes = _verificationStatusByType.entries
        .where((e) => e.value == 'APROBADO')
        .map((e) => e.key)
        .toList();
    if (approvedTypes.isEmpty) return;
    final type = approvedTypes.contains(preferredType)
        ? preferredType!
        : approvedTypes.first;
    final data = _providerDataByType[type];
    if (data == null) return;
    final id = data['providerId'] ?? data['id'];
    if (id is! int) return;
    final name = (data['businessName'] as String?) ?? _user?.firstName ?? '';
    _pendingProviderApproval = ProviderApprovalPayload(
      providerId: id,
      displayName: name,
      type: type,
    );
  }
}
