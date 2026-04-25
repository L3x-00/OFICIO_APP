import 'package:flutter/material.dart';
import '../../../../core/errors/failures.dart';
import '../../data/payments_repository.dart';
import '../../domain/models/yape_payment_model.dart';

enum PaymentsState { idle, loading, submitting, success, error }

class PaymentsProvider extends ChangeNotifier {
  final _repo = PaymentsRepository();

  PaymentsState _state  = PaymentsState.idle;
  String?       _error;
  List<YapePaymentModel> _payments = [];
  bool _uploading = false;

  PaymentsState get state     => _state;
  String?       get error     => _error;
  List<YapePaymentModel> get payments => _payments;
  bool          get uploading => _uploading;

  Future<void> loadPayments() async {
    _state = PaymentsState.loading;
    _error = null;
    notifyListeners();

    final result = await _repo.getMyPayments();
    result.when(
      success: (data) {
        _payments = data;
        _state    = PaymentsState.idle;
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
  }) async {
    _state = PaymentsState.submitting;
    _error = null;
    notifyListeners();

    final result = await _repo.submitYapePayment(
      plan:             plan,
      amount:           amount,
      voucherUrl:       voucherUrl,
      verificationCode: verificationCode,
      note:             note,
    );

    return result.when(
      success: (payment) {
        _payments = [payment, ..._payments];
        _state    = PaymentsState.success;
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
}
