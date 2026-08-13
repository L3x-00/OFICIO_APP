import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../../core/errors/failures.dart';
import '../../data/payments_repository.dart';
import '../../domain/models/mercadopago_checkout_model.dart';
import '../../domain/models/yape_payment_model.dart';

enum PaymentsState { idle, loading, submitting, success, error }

class PaymentsProvider extends ChangeNotifier {
  final _repo = PaymentsRepository();

  PaymentsState _state = PaymentsState.idle;
  String? _error;
  List<YapePaymentModel> _payments = [];
  bool _uploading = false;

  PaymentsState get state => _state;
  String? get error => _error;
  List<YapePaymentModel> get payments => _payments;
  bool get uploading => _uploading;

  Future<void> loadPayments() async {
    _state = PaymentsState.loading;
    _error = null;
    notifyListeners();

    final result = await _repo.getMyPayments();
    result.when(
      success: (data) {
        _payments = data;
        _state = PaymentsState.idle;
      },
      failure: (e) {
        _error = e.message;
        _state = PaymentsState.error;
      },
    );
    notifyListeners();
  }

  // Returns the uploaded URL or null on failure
  Future<String?> uploadVoucher(String filePath) async {
    _uploading = true;
    notifyListeners();
    final result = await _repo.uploadVoucher(filePath);
    _uploading = false;
    notifyListeners();
    return result.when(success: (url) => url, failure: (_) => null);
  }

  Future<bool> submitPayment({
    required String plan,
    required double amount,
    required String voucherUrl,
    required String verificationCode,
    String? note,
    String? providerType,
  }) async {
    _state = PaymentsState.submitting;
    _error = null;
    notifyListeners();

    final result = await _repo.submitYapePayment(
      plan: plan,
      amount: amount,
      voucherUrl: voucherUrl,
      verificationCode: verificationCode,
      note: note,
      providerType: providerType,
    );

    return result.when(
      success: (payment) {
        _payments = [payment, ..._payments];
        _state = PaymentsState.success;
        notifyListeners();
        return true;
      },
      failure: (e) {
        _error = e.message;
        _state = PaymentsState.error;
        notifyListeners();
        return false;
      },
    );
  }

  void resetState() {
    _state = PaymentsState.idle;
    _error = null;
    notifyListeners();
  }

  String? _mpInitPoint;
  String? get mpInitPoint => _mpInitPoint;
  String? _mpExternalReference;
  String? get mpExternalReference => _mpExternalReference;
  bool _mpLoading = false;
  bool get mpLoading => _mpLoading;
  bool _mpChecking = false;
  bool get mpChecking => _mpChecking;

  Future<void> payWithMercadoPago({
    required String plan,
    required String providerType,
  }) async {
    _mpInitPoint = null; // B-08: limpiar valor stale de intentos previos
    _mpExternalReference = null;
    _mpLoading = true;
    _error = null;
    notifyListeners();

    try {
      final checkout = await _repo.createMercadoPagoPreference(
        plan: plan,
        providerType: providerType,
      );
      _mpInitPoint = checkout.initPoint;
      _mpExternalReference = checkout.externalReference;
    } on DioException catch (e) {
      // B-05: mensaje diferenciado por tipo de error para mejor UX
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError) {
        _error = 'Sin conexión. Verifica tu internet e intenta otra vez.';
      } else if (e.response?.statusCode == 401) {
        _error = 'Tu sesión expiró. Vuelve a iniciar sesión.';
      } else if (e.response?.statusCode == 429) {
        _error = 'Demasiados intentos. Espera un momento.';
      } else if (e.response?.statusCode == 400) {
        // 400 incluye errores de validación del DTO server-side
        _error = 'No se pudo iniciar el pago: datos inválidos.';
      } else {
        _error = 'No se pudo iniciar el pago. Intenta más tarde.';
      }
    } catch (_) {
      _error = 'Error inesperado al iniciar pago con MercadoPago.';
    }

    _mpLoading = false;
    notifyListeners();
  }

  /// Polling solo después de volver del Checkout. Consulta el intento exacto
  /// y refresca dashboard hasta que el plan elegido quede activo.
  ///
  /// El WS de PLAN_APROBADO también dispara refresh — esto es el
  /// fallback para usuarios con WS desconectado, app en background
  /// durante el pago, o webhook con latencia.
  ///
  /// La función `refresh` se inyecta para no acoplar este provider
  /// con DashboardProvider (lo provee el call-site).
  Future<MercadoPagoCheckoutStatus> pollMercadoPagoCompletion({
    required Future<void> Function() refresh,
    required String Function() currentPlan,
    required String expectedPlan,
  }) async {
    final reference = _mpExternalReference;
    if (reference == null) {
      return const MercadoPagoCheckoutStatus(status: 'not_found');
    }

    _mpChecking = true;
    notifyListeners();
    MercadoPagoCheckoutStatus latest = const MercadoPagoCheckoutStatus(
      status: 'not_found',
    );
    try {
      for (int i = 0; i < 12; i++) {
        await Future<void>.delayed(const Duration(seconds: 5));
        try {
          latest = await _repo.getMercadoPagoCheckoutStatus(reference);
        } catch (_) {
          // No mostrar un falso rechazo si el backend/MP está temporalmente lento.
        }
        if (latest.isRejected) break;
        try {
          await refresh();
        } catch (_) {
          // La siguiente iteración puede confirmar aunque el dashboard falle una vez.
        }
        if (currentPlan() == expectedPlan) break;
      }
      return latest;
    } finally {
      _mpChecking = false;
      notifyListeners();
    }
  }
}
