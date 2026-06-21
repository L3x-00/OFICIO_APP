import 'package:flutter/material.dart';
import '../../data/dashboard_repository.dart';
import '../../domain/models/dashboard_profile_model.dart';
import '../../domain/models/service_item_model.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../features/providers_list/domain/models/review_model.dart';
import '../../../../features/payments/data/payments_repository.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/socket_service.dart'; // <--- NUEVO IMPORT

export '../../data/dashboard_repository.dart'
    show ProviderNotification, ProviderNotificationsResult, ProfileImageRef;

enum DashboardStatus { idle, loading, loaded, error }

class DashboardProvider extends ChangeNotifier {
  final _repo = DashboardRepository();
  final _paymentsRepo = PaymentsRepository();

  DashboardProfileModel? _profile;
  DashboardAnalytics? _analytics;
  List<ReviewModel> _reviews = [];
  List<ServiceItem> _services = [];
  List<ProviderNotification> _notifications = [];
  int _unreadNotifications = 0;
  DashboardStatus _status = DashboardStatus.idle;
  String? _error;
  bool _isUploadingPhoto = false;
  String? _currentProviderType;

  // AuthProvider global para limpiar la caché del dashboard al cerrar sesión
  // (independencia de cuentas): sin esto, el stale-while-revalidate podría
  // mostrar brevemente el perfil del usuario anterior al reabrir el panel.
  AuthProvider? _auth;

  /// Plan del último YapePayment en estado PENDIENTE (revisión admin
  /// pendiente). Si está set, las tarjetas de plan se deshabilitan y
  /// muestran "Revisión pendiente" en lugar de los CTAs de upgrade.
  /// Se limpia automáticamente al recibir PLAN_APROBADO o PLAN_RECHAZADO.
  String? _pendingPaymentPlan;
  String? get pendingPaymentPlan => _pendingPaymentPlan;

  DashboardProfileModel? get profile => _profile;
  DashboardAnalytics? get analytics => _analytics;
  List<ReviewModel> get reviews => List.unmodifiable(_reviews);
  List<ServiceItem> get services => List.unmodifiable(_services);
  List<ProviderNotification> get notifications =>
      List.unmodifiable(_notifications);
  int get unreadNotifications => _unreadNotifications;
  DashboardStatus get status => _status;
  String? get error => _error;
  bool get isLoading => _status == DashboardStatus.loading;
  bool get isUploadingPhoto => _isUploadingPhoto;
  String? get currentProviderType => _currentProviderType;

  // ── CARGA INICIAL ────────────────────────────────────────

  /// [providerType] 'OFICIO' | 'NEGOCIO' — si es null, carga el primer perfil.
  ///
  /// Stale-while-revalidate (UX #6.1): si ya hay datos cargados del MISMO
  /// perfil y no se [force], se muestran al instante y el refresco corre en
  /// segundo plano SIN spinner — reabrir el panel ya no "recarga todo desde
  /// cero". [force] = true recarga visible (cambios materiales: plan aprobado,
  /// perfil eliminado).
  Future<void> loadDashboard({String? providerType, bool force = false}) async {
    if (_status == DashboardStatus.loading) return;

    // ¿Tenemos ya datos válidos del mismo perfil? (se evalúa con el tipo
    // ANTES de reasignarlo). En modo silencioso no tocamos el spinner.
    final sameProfileLoaded =
        _status == DashboardStatus.loaded &&
        _currentProviderType == providerType &&
        _profile != null;
    final silent = sameProfileLoaded && !force;

    _currentProviderType = providerType;
    if (!silent) {
      _status = DashboardStatus.loading;
      _error = null;
      notifyListeners();
    }

    try {
      final results = await Future.wait([
        _repo.getMyProfile(type: providerType),
        _repo.getMyAnalytics(days: 30, type: providerType),
      ]);

      _profile = results[0] as DashboardProfileModel;
      _analytics = results[1] as DashboardAnalytics;

      // Extraer servicios del scheduleJson
      _services = _parseServices(_profile!.scheduleJson);

      // Hidrata estado de "revisión pendiente" desde el backend para que el
      // refresh post-tab-switch siga mostrando el chip de pendiente sin
      // depender del estado en memoria local.
      _refreshPendingPaymentPlan();

      // Cargar reseñas del proveedor
      try {
        _reviews = await _repo.getMyReviews(_profile!.id, limit: 5);
      } catch (_) {
        _reviews = [];
      }

      _status = DashboardStatus.loaded;

      // --- NUEVO: Unirse a salas de categoría para recibir subastas ---
      _joinCategoryRooms();

      // Cargar notificaciones silenciosamente
      _loadNotificationsSilent();
    } catch (e) {
      // En modo silencioso conservamos los datos previos válidos: un fallo
      // del refresco en 2º plano no debe tumbar la vista a pantalla de error.
      if (!silent) {
        _status = DashboardStatus.error;
        _error = _formatError(e);
      }
    }

    notifyListeners();
  }

  // ── SOCKET: SALAS DE CATEGORÍA ─────────────────────────────

  /// Emite el evento `joinCategoryRooms` para que el backend coloque al
  /// socket en la sala `category_${id}` y reciba sólo las nuevas subastas
  /// de esa categoría. El backend recortó el broadcast global por
  /// seguridad: si no nos unimos, no llegan notificaciones de subasta.
  void _joinCategoryRooms() {
    final categoryId = _profile?.categoryId;
    if (categoryId == null) {
      debugPrint('[Dashboard] sin categoryId — no se hace joinCategoryRooms');
      return;
    }

    SocketService.instance.emit('joinCategoryRooms', {
      'categoryIds': [categoryId],
    });
  }

  /// Trae el último YapePayment PENDIENTE del proveedor para que la sección
  /// de planes muestre "Revisión pendiente" en tiempo real. Silencioso: si
  /// falla la red no rompe la carga del dashboard.
  Future<void> _refreshPendingPaymentPlan() async {
    try {
      final result = await _paymentsRepo.getMyPayments();
      if (!result.isSuccess) return;
      final pending = result.data
          .where((p) => p.status.toUpperCase() == 'PENDING')
          .toList();
      final next = pending.isEmpty ? null : pending.first.plan;
      // Guard: solo notificar si el valor REALMENTE cambió. Este método corre
      // en cada loadDashboard (incl. refresh silencioso por tab-switch); sin
      // el guard reconstruía la sección de planes aunque nada cambiara.
      if (next == _pendingPaymentPlan) return;
      _pendingPaymentPlan = next;
      notifyListeners();
    } catch (_) {}
  }

  /// Llamado desde la UI tras un submit de Yape exitoso para que la sección
  /// de planes refleje el estado pendiente sin esperar al próximo refresh.
  void markPaymentPending(String plan) {
    _pendingPaymentPlan = plan.toUpperCase();
    notifyListeners();
  }

  /// Limpia el flag — invocado desde el listener de PLAN_APROBADO /
  /// PLAN_RECHAZADO en main.dart para que las tarjetas se rehabiliten
  /// inmediatamente.
  void clearPendingPaymentPlan() {
    if (_pendingPaymentPlan == null) return;
    _pendingPaymentPlan = null;
    notifyListeners();
  }

  // Carga notificaciones sin afectar el estado principal. Filtra por
  // `_currentProviderType` (OFICIO|NEGOCIO) cuando está activo, así el
  // panel home del provider solo muestra notif de su perfil + las
  // globales (sin `targetProfileType`). Sin filtro mezclaría notif de
  // ambos paneles en el mismo home — el bug que reportó el user.
  Future<void> _loadNotificationsSilent() async {
    try {
      final result = await _repo.getMyNotifications(
        providerType: _currentProviderType,
      );
      _notifications = result.data;
      _unreadNotifications = result.unreadCount;
      notifyListeners();
    } catch (_) {
      // No crítico — la app sigue funcionando
    }
  }

  Future<void> refreshNotifications() => _loadNotificationsSilent();

  Future<void> markNotificationRead(int id) async {
    try {
      await _repo.markNotificationRead(id);
      _notifications = _notifications
          .map((n) => n.id == id ? _copyNotifRead(n) : n)
          .toList();
      _unreadNotifications = _notifications.where((n) => !n.isRead).length;
      notifyListeners();
    } catch (_) {}
  }

  ProviderNotification _copyNotifRead(ProviderNotification n) =>
      ProviderNotification(
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: true,
        sentAt: n.sentAt,
      );

  // ── PERFIL ────────────────────────────────────────────────

  Future<bool> updateProfile({
    String? businessName,
    String? description,
    String? phone,
    String? whatsapp,
    String? address,
    Map<String, dynamic>? scheduleJson,
    // Redes sociales — el sheet de edición las pasa una por una. Un
    // valor null aquí significa "no tocar"; el sheet manda String vacío
    // para limpiar un campo.
    String? website,
    String? instagram,
    String? tiktok,
    String? facebook,
    String? linkedin,
    String? twitterX,
    String? telegram,
    String? whatsappBiz,

    /// Edición de Especialidades — la primera es principal. Si es null,
    /// no se tocan.
    List<int>? categoryIds,
  }) async {
    try {
      final updated = await _repo.updateMyProfile(
        businessName: businessName,
        description: description,
        phone: phone,
        whatsapp: whatsapp,
        address: address,
        scheduleJson: scheduleJson,
        website: website,
        instagram: instagram,
        tiktok: tiktok,
        facebook: facebook,
        linkedin: linkedin,
        twitterX: twitterX,
        telegram: telegram,
        whatsappBiz: whatsappBiz,
        categoryIds: categoryIds,
        type: _currentProviderType,
      );
      _profile = updated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  /// Activa o desactiva el servicio a domicilio (solo OFICIO).
  /// Usa optimistic update: revierte si el servidor falla.
  Future<bool> setHomeService(bool value) async {
    final prev = _profile?.hasHomeService ?? false;
    if (_profile != null) {
      _profile = _profile!.copyWith(hasHomeService: value);
      notifyListeners();
    }
    try {
      await _repo.updateMyProfile(
        hasHomeService: value,
        type: _currentProviderType,
      );
      return true;
    } catch (e) {
      if (_profile != null) {
        _profile = _profile!.copyWith(hasHomeService: prev);
      }
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  /// Toggles de privacidad (showPhone / showWhatsapp / showExactLocation).
  /// Independientes del plan. Optimistic update con revert si el servidor
  /// falla. [field] debe ser uno de los tres nombres exactos.
  Future<bool> setPrivacyToggle(String field, bool value) async {
    if (_profile == null) return false;
    final p = _profile!;
    final prev = switch (field) {
      'showPhone' => p.showPhone,
      'showWhatsapp' => p.showWhatsapp,
      'showExactLocation' => p.showExactLocation,
      _ => true,
    };

    DashboardProfileModel apply(bool v) => switch (field) {
      'showPhone' => p.copyWith(showPhone: v),
      'showWhatsapp' => p.copyWith(showWhatsapp: v),
      'showExactLocation' => p.copyWith(showExactLocation: v),
      _ => p,
    };

    _profile = apply(value);
    notifyListeners();
    try {
      await _repo.updateMyProfile(
        showPhone: field == 'showPhone' ? value : null,
        showWhatsapp: field == 'showWhatsapp' ? value : null,
        showExactLocation: field == 'showExactLocation' ? value : null,
        type: _currentProviderType,
      );
      return true;
    } catch (e) {
      _profile = apply(prev);
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> setAvailability(String status) async {
    final prev = _profile?.availability;
    // Optimistic update
    if (_profile != null) {
      _profile = _profile!.copyWith(availability: status);
      notifyListeners();
    }
    try {
      await _repo.setAvailability(status, type: _currentProviderType);
      return true;
    } catch (e) {
      // Revertir en caso de error
      if (_profile != null && prev != null) {
        _profile = _profile!.copyWith(availability: prev);
      }
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  // ── SERVICIOS ─────────────────────────────────────────────

  Future<bool> saveServices(List<ServiceItem> services) async {
    try {
      await _repo.saveServices(
        services,
        _profile?.scheduleJson,
        type: _currentProviderType,
      );
      _services = List.from(services);
      // Actualizar en el perfil local
      final updated = Map<String, dynamic>.from(_profile?.scheduleJson ?? {});
      updated['services'] = services.map((s) => s.toJson()).toList();
      _profile = _profile?.copyWith(scheduleJson: updated);
      notifyListeners();
      return true;
    } catch (e) {
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  // ── SUBIDA DE IMAGEN ──────────────────────────────────────

  /// Sube una foto del proveedor y la registra en la BD.
  /// Devuelve la URL o null si falló.
  String? _uploadError;
  String? get uploadError => _uploadError;

  Future<String?> uploadProviderPhoto(String filePath) async {
    _isUploadingPhoto = true;
    _uploadError = null;
    notifyListeners();
    try {
      // 1. Subir archivo al disco
      final url = await _repo.uploadProviderPhoto(filePath);
      // 2. Crear registro en la BD (ProviderImage)
      final saved = await _repo.saveProviderImage(
        url,
        type: _currentProviderType,
      );
      // 3. Actualizar estado local
      final updatedImages = List<ProfileImage>.from(_profile?.images ?? [])
        ..add(ProfileImage(id: saved.id, url: saved.url));
      _profile = _profile?.copyWith(images: updatedImages);
      _isUploadingPhoto = false;
      notifyListeners();
      return url;
    } catch (e) {
      _isUploadingPhoto = false;
      _uploadError = _mapUploadError(e);
      notifyListeners();
      return null;
    }
  }

  /// Elimina una imagen del perfil de la BD y actualiza el estado local.
  Future<bool> deleteProviderImage(int imageId) async {
    try {
      await _repo.deleteProviderImage(imageId, type: _currentProviderType);
      final updatedImages = (_profile?.images ?? [])
          .where((img) => img.id != imageId)
          .toList();
      _profile = _profile?.copyWith(images: updatedImages);
      notifyListeners();
      return true;
    } catch (e) {
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  /// Solicita upgrade de plan. Devuelve true si se envió con éxito.
  Future<bool> requestPlanUpgrade(String plan) async {
    try {
      await _repo.requestPlanUpgrade(plan, type: _currentProviderType);
      return true;
    } catch (e) {
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  /// Elimina el perfil de proveedor en cascada. Devuelve true si tuvo éxito.
  Future<bool> deleteProviderProfile() async {
    try {
      await _repo.deleteProviderProfile(type: _currentProviderType);
      return true;
    } catch (e) {
      _error = _formatError(e);
      notifyListeners();
      return false;
    }
  }

  String _mapUploadError(Object e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('413') ||
        msg.contains('file too large') ||
        msg.contains('maxfilesize')) {
      return 'La imagen supera el límite de 5 MB. Elige una más pequeña.';
    }
    if (msg.contains('socketexception') ||
        msg.contains('network') ||
        msg.contains('connection')) {
      return 'Sin conexión. Verifica tu red e inténtalo de nuevo.';
    }
    if (msg.contains('timeout')) {
      return 'Tiempo de espera agotado. Inténtalo de nuevo.';
    }
    return 'Error al subir la imagen. Inténtalo de nuevo.';
  }

  void clearError() {
    _error = null;
    _uploadError = null;
    notifyListeners();
  }

  // ── Independencia de cuentas ──────────────────────────────
  /// Conecta el [AuthProvider] global para descartar la caché del dashboard
  /// al cerrar sesión. Idempotente. Llamar al montar el panel.
  void attachAuth(AuthProvider auth) {
    if (identical(_auth, auth)) return;
    _auth?.removeListener(_onAuthChanged);
    _auth = auth;
    _auth!.addListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    if (_auth != null && !_auth!.isAuthenticated) _clearAll();
  }

  /// Resetea todo el estado (logout / cambio de cuenta) — evita que el
  /// stale-while-revalidate muestre datos del usuario anterior.
  void _clearAll() {
    _profile = null;
    _analytics = null;
    _reviews = [];
    _services = [];
    _notifications = [];
    _unreadNotifications = 0;
    _status = DashboardStatus.idle;
    _error = null;
    _currentProviderType = null;
    _pendingPaymentPlan = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _auth?.removeListener(_onAuthChanged);
    super.dispose();
  }

  // ── HELPERS ───────────────────────────────────────────────

  List<ServiceItem> _parseServices(Map<String, dynamic>? scheduleJson) {
    if (scheduleJson == null) return [];
    final raw = scheduleJson['services'];
    if (raw is! List) return [];
    try {
      return raw
          .map((e) => ServiceItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  String _formatError(Object e) {
    final msg = e.toString();
    if (msg.contains('SocketException') || msg.contains('DioException')) {
      return 'Sin conexión a internet';
    }
    if (msg.contains('404')) return 'Perfil no encontrado';
    if (msg.contains('401')) return 'Sesión expirada';
    return 'Error inesperado';
  }
}
