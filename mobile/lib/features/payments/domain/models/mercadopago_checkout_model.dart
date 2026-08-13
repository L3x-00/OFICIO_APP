class MercadoPagoCheckout {
  final String initPoint;
  final String externalReference;

  const MercadoPagoCheckout({
    required this.initPoint,
    required this.externalReference,
  });

  factory MercadoPagoCheckout.fromJson(Map<String, dynamic> json) {
    return MercadoPagoCheckout(
      initPoint: json['initPoint'] as String,
      externalReference: json['externalReference'] as String,
    );
  }
}

class MercadoPagoCheckoutStatus {
  final String status;
  final String? message;

  const MercadoPagoCheckoutStatus({required this.status, this.message});

  factory MercadoPagoCheckoutStatus.fromJson(Map<String, dynamic> json) {
    return MercadoPagoCheckoutStatus(
      status: json['status'] as String? ?? 'not_found',
      message: json['message'] as String?,
    );
  }

  bool get isRejected => status == 'rejected';
  bool get isApproved => status == 'approved';
}
