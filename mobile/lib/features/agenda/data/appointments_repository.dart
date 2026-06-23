import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/appointment_model.dart';

/// Conecta con los endpoints `/appointments`. El JWT lo inyecta el interceptor.
class AppointmentsRepository {
  final Dio _dio = DioClient.instance.dio;

  Failure<T> _fail<T>(Object e, String fallback) {
    if (e is DioException) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? fallback),
      );
    }
    return Failure(ServerException('Error inesperado: $e'));
  }

  // ── CLIENTE ────────────────────────────────────────────────

  /// Horarios disponibles del proveedor para un día 'YYYY-MM-DD'.
  Future<ApiResult<List<AppointmentSlot>>> getSlots(
    int providerId,
    String date,
  ) async {
    try {
      final res = await _dio.get(
        '/appointments/provider/$providerId/slots',
        queryParameters: {'date': date},
      );
      final list = (res.data['slots'] as List? ?? [])
          .map((e) => AppointmentSlot.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return _fail(e, 'Error al cargar horarios');
    }
  }

  /// Crea una cita. `isoDate` = el `iso` del slot elegido (con offset Perú).
  Future<ApiResult<Appointment>> create({
    required int providerId,
    required String isoDate,
    String? description,
  }) async {
    try {
      final res = await _dio.post(
        '/appointments',
        data: {
          'providerId': providerId,
          'date': isoDate,
          if (description != null && description.trim().isNotEmpty)
            'description': description.trim(),
        },
      );
      return Success(Appointment.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return _fail(e, 'Error al agendar la cita');
    }
  }

  Future<ApiResult<List<Appointment>>> getMine() async {
    try {
      final res = await _dio.get('/appointments/mine');
      return Success(_parseList(res.data));
    } catch (e) {
      return _fail(e, 'Error al cargar tus citas');
    }
  }

  Future<ApiResult<void>> cancel(int id) async {
    try {
      await _dio.patch('/appointments/$id/cancel');
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al cancelar la cita');
    }
  }

  // ── PROVEEDOR ──────────────────────────────────────────────

  /// Citas solicitadas al proveedor (filtro opcional por status).
  Future<ApiResult<List<Appointment>>> getForProvider({String? status}) async {
    try {
      final res = await _dio.get(
        '/appointments/provider/mine',
        queryParameters: {'status': ?status},
      );
      return Success(_parseList(res.data));
    } catch (e) {
      return _fail(e, 'Error al cargar las citas');
    }
  }

  Future<ApiResult<List<Appointment>>> getProviderHistory() async {
    try {
      final res = await _dio.get('/appointments/provider/history');
      return Success(_parseList(res.data));
    } catch (e) {
      return _fail(e, 'Error al cargar el historial');
    }
  }

  Future<ApiResult<void>> confirm(int id) => _action('$id/confirm');
  Future<ApiResult<void>> complete(int id) => _action('$id/complete');

  Future<ApiResult<void>> reject(int id, {String? reason}) async {
    try {
      await _dio.patch(
        '/appointments/$id/reject',
        data: {
          if (reason != null && reason.trim().isNotEmpty)
            'reason': reason.trim(),
        },
      );
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al rechazar la cita');
    }
  }

  Future<ApiResult<void>> _action(String path) async {
    try {
      await _dio.patch('/appointments/$path');
      return const Success(null);
    } catch (e) {
      return _fail(e, 'No se pudo actualizar la cita');
    }
  }

  /// Horario semanal configurado (mapa día → rangos).
  Future<ApiResult<Map<String, String>>> getSchedule() async {
    try {
      final res = await _dio.get('/appointments/provider/schedule');
      final raw = (res.data['schedule'] as Map?) ?? {};
      return Success(raw.map((k, v) => MapEntry(k.toString(), v.toString())));
    } catch (e) {
      return _fail(e, 'Error al cargar el horario');
    }
  }

  Future<ApiResult<void>> setSchedule(Map<String, String> schedule) async {
    try {
      await _dio.put(
        '/appointments/provider/schedule',
        data: {'schedule': schedule},
      );
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al guardar el horario');
    }
  }

  List<Appointment> _parseList(dynamic data) => (data as List? ?? [])
      .map((e) => Appointment.fromJson(e as Map<String, dynamic>))
      .toList();
}
