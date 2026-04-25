import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/yape_payment_model.dart';

class PaymentsRepository {
  final Dio _dio = DioClient.instance.dio;

  AppException _handleDio(DioException e, String fallback) =>
      e.error is AppException ? e.error as AppException : ServerException(e.message ?? fallback);

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
  Future<ApiResult<YapePaymentModel>> submitYapePayment({
    required String plan,
    required double amount,
    required String voucherUrl,
    required String verificationCode,
    String? note,
  }) async {
    try {
      final res = await _dio.post('/payments/yape', data: {
        'plan':             plan,
        'amount':           amount,
        'voucherUrl':       voucherUrl,
        'verificationCode': verificationCode,
        'note': note,
      });
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
}
