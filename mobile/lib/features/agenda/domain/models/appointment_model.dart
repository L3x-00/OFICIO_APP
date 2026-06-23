// Modelos de la Agenda de Citas. Reflejan los endpoints `/appointments`.

/// Horario disponible (bloque de 30 min) devuelto por el backend.
/// `iso` ya viene con offset de Perú (-05:00): se envía TAL CUAL al crear la
/// cita (no re-derivar desde la hora del dispositivo).
class AppointmentSlot {
  final String time; // "08:00"
  final String iso; // "2026-06-25T08:00:00-05:00"

  const AppointmentSlot({required this.time, required this.iso});

  factory AppointmentSlot.fromJson(Map<String, dynamic> json) =>
      AppointmentSlot(time: json['time'] as String, iso: json['iso'] as String);
}

/// Estados posibles de una cita (deben coincidir con el backend).
const String kApptPendiente = 'PENDIENTE';
const String kApptConfirmada = 'CONFIRMADA';
const String kApptRechazada = 'RECHAZADA';
const String kApptCancelada = 'CANCELADA';
const String kApptCompletada = 'COMPLETADA';

String appointmentStatusLabel(String status) {
  switch (status) {
    case kApptPendiente:
      return 'Pendiente';
    case kApptConfirmada:
      return 'Confirmada';
    case kApptRechazada:
      return 'Rechazada';
    case kApptCancelada:
      return 'Cancelada';
    case kApptCompletada:
      return 'Completada';
    default:
      return status;
  }
}

class Appointment {
  final int id;
  final int providerId;
  final int userId;
  final String date; // ISO 8601 (UTC con 'Z')
  final String status;
  final String? description;

  // Datos del proveedor (en /appointments/mine).
  final String? providerName;
  final String? providerType;

  // Datos del cliente (en /appointments/provider/mine y /history).
  final String? clientName;
  final String? clientPhone;

  const Appointment({
    required this.id,
    required this.providerId,
    required this.userId,
    required this.date,
    required this.status,
    this.description,
    this.providerName,
    this.providerType,
    this.clientName,
    this.clientPhone,
  });

  bool get isActive => status == kApptPendiente || status == kApptConfirmada;
  String get statusLabel => appointmentStatusLabel(status);

  factory Appointment.fromJson(Map<String, dynamic> json) {
    final provider = json['provider'] as Map<String, dynamic>?;
    final user = json['user'] as Map<String, dynamic>?;
    return Appointment(
      id: json['id'] as int,
      providerId: json['providerId'] as int,
      userId: json['userId'] as int,
      date: json['date'] as String,
      status: json['status'] as String? ?? kApptPendiente,
      description: json['description'] as String?,
      providerName: provider?['businessName'] as String?,
      providerType: provider?['type'] as String?,
      clientName: user == null
          ? null
          : '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
      clientPhone: user?['phone'] as String?,
    );
  }
}
