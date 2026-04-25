class YapePaymentModel {
  final int id;
  final int providerId;
  final String plan;
  final double amount;
  final String voucherUrl;
  final String verificationCode;
  final String? note;
  final String status; // PENDING | APPROVED | REJECTED
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime? reviewedAt;

  const YapePaymentModel({
    required this.id,
    required this.providerId,
    required this.plan,
    required this.amount,
    required this.voucherUrl,
    required this.verificationCode,
    this.note,
    required this.status,
    this.rejectionReason,
    required this.createdAt,
    this.reviewedAt,
  });

  factory YapePaymentModel.fromJson(Map<String, dynamic> j) => YapePaymentModel(
        id:               j['id'] as int,
        providerId:       j['providerId'] as int,
        plan:             j['plan'] as String,
        amount:           (j['amount'] as num).toDouble(),
        voucherUrl:       j['voucherUrl'] as String,
        verificationCode: j['verificationCode'] as String,
        note:             j['note'] as String?,
        status:           j['status'] as String,
        rejectionReason:  j['rejectionReason'] as String?,
        createdAt:        DateTime.parse(j['createdAt'] as String),
        reviewedAt:       j['reviewedAt'] != null
                          ? DateTime.parse(j['reviewedAt'] as String)
                          : null,
      );

  bool get isPending  => status == 'PENDING';
  bool get isApproved => status == 'APPROVED';
  bool get isRejected => status == 'REJECTED';

  String get planLabel {
    return switch (plan.toUpperCase()) {
      'PREMIUM'  => 'Premium',
      'ESTANDAR' => 'Estándar',
      'BASICO'   => 'Básico',
      _          => plan,
    };
  }
}
