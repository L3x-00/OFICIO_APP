// Modelos de Cotización. Reflejan los endpoints `/quotations`.

const String kQuotPendiente = 'PENDIENTE';
const String kQuotRespondida = 'RESPONDIDA';
const String kQuotRechazada = 'RECHAZADA';

String quotationStatusLabel(String status) {
  switch (status) {
    case kQuotPendiente:
      return 'Pendiente';
    case kQuotRespondida:
      return 'Respondida';
    case kQuotRechazada:
      return 'Rechazada';
    default:
      return status;
  }
}

class Quotation {
  final int id;
  final int providerId;
  final int userId;
  final String description;
  final String? photoUrl;
  final String status;
  final String? response;
  final double? estimatedPrice;

  // Datos del proveedor (en /quotations/mine).
  final String? providerName;
  final String? providerType;
  final String? providerWhatsapp; // null si oculto o sin número

  // Datos del cliente (en /quotations/provider/mine).
  final String? clientName;
  final String? clientPhone;

  const Quotation({
    required this.id,
    required this.providerId,
    required this.userId,
    required this.description,
    this.photoUrl,
    required this.status,
    this.response,
    this.estimatedPrice,
    this.providerName,
    this.providerType,
    this.providerWhatsapp,
    this.clientName,
    this.clientPhone,
  });

  bool get isPending => status == kQuotPendiente;
  bool get isResponded => status == kQuotRespondida;
  String get statusLabel => quotationStatusLabel(status);

  factory Quotation.fromJson(Map<String, dynamic> json) {
    final provider = json['provider'] as Map<String, dynamic>?;
    final user = json['user'] as Map<String, dynamic>?;
    // El número de WhatsApp solo si el proveedor lo expone.
    String? wa;
    if (provider != null && provider['showWhatsapp'] != false) {
      wa = (provider['whatsapp'] ?? provider['whatsappBiz']) as String?;
    }
    return Quotation(
      id: json['id'] as int,
      providerId: json['providerId'] as int,
      userId: json['userId'] as int,
      description: json['description'] as String? ?? '',
      photoUrl: json['photoUrl'] as String?,
      status: json['status'] as String? ?? kQuotPendiente,
      response: json['response'] as String?,
      estimatedPrice: (json['estimatedPrice'] as num?)?.toDouble(),
      providerName: provider?['businessName'] as String?,
      providerType: provider?['type'] as String?,
      providerWhatsapp: wa,
      clientName: user == null
          ? null
          : '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
      clientPhone: user?['phone'] as String?,
    );
  }
}
