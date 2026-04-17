import 'package:flutter/material.dart';
import '../../data/dashboard_repository.dart';
import '../../domain/models/dashboard_profile_model.dart';
import '../../domain/models/service_item_model.dart';
import '../../../../features/providers_list/domain/models/review_model.dart';

export '../../data/dashboard_repository.dart'
    show ProviderNotification, ProviderNotificationsResult, ProfileImageRef;

enum DashboardStatus { idle, loading, loaded, error }

class DashboardProvider extends ChangeNotifier {
  final _repo = DashboardRepository();

  DashboardProfileModel?      _profile;
  DashboardAnalytics?         _analytics;
  List<ReviewModel>           _reviews = [];
  List<ServiceItem>           _services = [];
  List<ProviderNotification>  _notifications = [];
  int                         _unreadNotifications = 0;
  DashboardStatus             _status = DashboardStatus.idle;
  String?                     _error;
  bool                        _isUploadingPhoto = false;
  String?                     _currentProviderType;

  DashboardProfileModel?     get profile              => _profile;
  DashboardAnalytics?        get analytics            => _analytics;
  List<ReviewModel>          get reviews              => List.unmodifiable(_reviews);
  List<ServiceItem>          get services             => List.unmodifiable(_services);
  List<ProviderNotification> get notifications        => List.unmodifiable(_notifications);
  int                        get unreadNotifications  => _unreadNotifications;
  DashboardStatus            get status               => _status;
  String?                    get error                => _error;
  bool                       get isLoading            => _status == DashboardStatus.loading;
  bool                       get isUploadingPhoto     => _isUploadingPhoto;
  String?                    get currentProviderType  => _currentProviderType;

  // ── CARGA INICIAL ────────────────────────────────────────

  /// [providerType] 'OFICIO' | 'NEGOCIO' — si es null, carga el primer perfil.
  Future<void> loadDashboard({String? providerType}) async {
    if (_status == DashboardStatus.loading) return;

    _currentProviderType = providerType;
    _status = DashboardStatus.loading;
    _error  = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _repo.getMyProfile(type: providerType),
        _repo.getMyAnalytics(days: 30, type: providerType),
      ]);

      _profile   = results[0] as DashboardProfileModel;
      _analytics = results[1] as DashboardAnalytics;

      // Extraer servicios del scheduleJson
      _services = _parseServices(_profile!.scheduleJson);

      // Cargar reseñas del proveedor
      try {
        _reviews = await _repo.getMyReviews(_profile!.id, limit: 5);
      } catch (_) {
        _reviews = [];
      }

      _status = DashboardStatus.loaded;

      // Cargar notificaciones silenciosamente
      _loadNotificationsSilent();
    } catch (e) {
      _status = DashboardStatus.error;
      _error  = _formatError(e);
    }

    notifyListeners();
  }

  // Carga notificaciones sin afectar el estado principal
  Future<void> _loadNotificationsSilent() async {
    try {
      final result = await _repo.getMyNotifications();
      _notifications       = result.data;
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
        id: n.id, type: n.type, message: n.message,
        isRead: true, sentAt: n.sentAt,
      );

  // ── PERFIL ────────────────────────────────────────────────

  Future<bool> updateProfile({
    String? businessName,
    String? description,
    String? phone,
    String? whatsapp,
    String? address,
  }) async {
    try {
      final updated = await _repo.updateMyProfile(
        businessName: businessName,
        description:  description,
        phone:        phone,
        whatsapp:     whatsapp,
        address:      address,
        type:         _currentProviderType,
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
      await _repo.saveServices(services, _profile?.scheduleJson, type: _currentProviderType);
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
      final saved = await _repo.saveProviderImage(url, type: _currentProviderType);
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

  String _mapUploadError(Object e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('413') || msg.contains('file too large') || msg.contains('maxfilesize')) {
      return 'La imagen supera el límite de 5 MB. Elige una más pequeña.';
    }
    if (msg.contains('socketexception') || msg.contains('network') || msg.contains('connection')) {
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
