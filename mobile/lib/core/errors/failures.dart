import 'app_exception.dart';

/// Resultado de una operación: éxito o fallo
/// Patrón Either sin dependencias externas
sealed class ApiResult<T> {
  const ApiResult();
}

class Success<T> extends ApiResult<T> {
  final T data;
  const Success(this.data);
}

class Failure<T> extends ApiResult<T> {
  final AppException exception;
  const Failure(this.exception);

  String get message => exception.message;
}

/// Extensiones útiles para trabajar con ApiResult
extension ApiResultExtension<T> on ApiResult<T> {
  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is Failure<T>;

  T get data => (this as Success<T>).data;
  AppException get exception => (this as Failure<T>).exception;
  String get errorMessage => (this as Failure<T>).message;

  R when<R>({
    required R Function(T data) success,
    required R Function(AppException exception) failure,
  }) {
    return switch (this) {
      Success<T>(data: final d) => success(d),
      Failure<T>(exception: final e) => failure(e),
    };
  }
}