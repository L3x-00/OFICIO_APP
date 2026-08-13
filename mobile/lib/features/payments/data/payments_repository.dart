import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/mercadopago_checkout_model.dart';
import '../domain/models/yape_payment_model.dart';

class PaymentsRepository {
  final Dio _dio = DioClient.instance.dio;

  AppException _handleDio(DioException e, String fallback) =>
      e.error is AppException
      ? e.error as AppException
      : ServerException(e.message ?? fallback);

  // ── Subir voucher ─────────────────────────────────────────────
  Future<ApiResult<String>> uploadVoucher(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: 'voucher.jpg'),
      });
      final res = await _dio.post('/upload/payment-voucher', data: formData);
      return Success(res.data['url'] as String);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al subir imagen'));
    }
  }

  // ── Enviar pago Yape ──────────────────────────────────────────
  /// `providerType` (OFICIO|NEGOCIO) es opcional pero necesario cuando
  /// el user tiene ambos perfiles: el backend lo usa para aplicar el
  /// pago al perfil correcto. Sin él toma el primero del user.
  Future<ApiResult<YapePaymentModel>> submitYapePayment({
    required String plan,
    required double amount,
    required String voucherUrl,
    required String verificationCode,
    String? note,
    String? providerType,
  }) async {
    try {
      final res = await _dio.post(
        '/payments/yape',
        data: {
          'plan': plan,
          'amount': amount,
          'voucherUrl': voucherUrl,
          'verificationCode': verificationCode,
          'note': note,
          'providerType': ?providerType,
        },
      );
      return Success(YapePaymentModel.fromJson(res.data));
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al enviar comprobante'));
    }
  }

  // ── Historial de pagos ─────────────────────────────────────────
  Future<ApiResult<List<YapePaymentModel>>> getMyPayments() async {
    try {
      final res = await _dio.get('/payments/yape/mine');
      final list = (res.data as List)
          .map((j) => YapePaymentModel.fromJson(j as Map<String, dynamic>))
          .toList();
      return Success(list);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al cargar pagos'));
    }
  }

  /// Crea una preferencia de pago en MercadoPago y devuelve la URL de pago.
  /// userId del JWT; precio y descripción los pone el servidor desde su
  /// catálogo (anti-tampering). providerType identifica a cuál perfil
  /// (OFICIO/NEGOCIO) aplicar el plan en usuarios con ambos.
  Future<MercadoPagoCheckout> createMercadoPagoPreference({
    required String plan,
    required String providerType,
  }) async {
    final res = await _dio.post(
      '/payments/mercadopago/create-preference',
      data: {'plan': plan, 'providerType': providerType},
    );
    return MercadoPagoCheckout.fromJson(res.data as Map<String, dynamic>);
  }

  /// Estado del intento actual. El backend valida que la referencia pertenezca
  /// al usuario autenticado antes de consultar Mercado Pago.
  Future<MercadoPagoCheckoutStatus> getMercadoPagoCheckoutStatus(
    String externalReference,
  ) async {
    final res = await _dio.get(
      '/payments/mercadopago/status',
      queryParameters: {'reference': externalReference},
    );
    return MercadoPagoCheckoutStatus.fromJson(res.data as Map<String, dynamic>);
  }
}
