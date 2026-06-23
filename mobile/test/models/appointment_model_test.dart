/// Tests de los modelos de Agenda (Appointment + Slot).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/agenda/domain/models/appointment_model.dart';

void main() {
  group('AppointmentSlot', () {
    test('fromJson', () {
      final s = AppointmentSlot.fromJson({
        'time': '08:00',
        'iso': '2026-06-25T08:00:00-05:00',
      });
      expect(s.time, '08:00');
      expect(s.iso, '2026-06-25T08:00:00-05:00');
    });
  });

  group('Appointment.fromJson', () {
    test('shape de cliente (/mine): toma datos del provider', () {
      final a = Appointment.fromJson({
        'id': 1,
        'providerId': 7,
        'userId': 5,
        'date': '2026-06-25T13:00:00.000Z',
        'status': 'PENDIENTE',
        'description': 'Corte de cabello',
        'provider': {'id': 7, 'businessName': 'Barbería X', 'type': 'NEGOCIO'},
      });
      expect(a.providerName, 'Barbería X');
      expect(a.providerType, 'NEGOCIO');
      expect(a.clientName, isNull);
      expect(a.isActive, true);
      expect(a.statusLabel, 'Pendiente');
    });

    test('shape de proveedor (/provider/mine): toma datos del user', () {
      final a = Appointment.fromJson({
        'id': 2,
        'providerId': 7,
        'userId': 5,
        'date': '2026-06-25T13:00:00.000Z',
        'status': 'CONFIRMADA',
        'user': {
          'id': 5,
          'firstName': 'Juan',
          'lastName': 'Pérez',
          'phone': '999',
        },
      });
      expect(a.clientName, 'Juan Pérez');
      expect(a.clientPhone, '999');
      expect(a.isActive, true);
    });

    test('isActive: solo PENDIENTE/CONFIRMADA', () {
      Appointment base(String s) => Appointment.fromJson({
        'id': 1,
        'providerId': 1,
        'userId': 1,
        'date': '2026-06-25T13:00:00.000Z',
        'status': s,
      });
      expect(base('PENDIENTE').isActive, true);
      expect(base('CONFIRMADA').isActive, true);
      expect(base('CANCELADA').isActive, false);
      expect(base('RECHAZADA').isActive, false);
      expect(base('COMPLETADA').isActive, false);
    });
  });

  group('appointmentStatusLabel', () {
    test('mapea estados', () {
      expect(appointmentStatusLabel('CONFIRMADA'), 'Confirmada');
      expect(appointmentStatusLabel('COMPLETADA'), 'Completada');
      expect(appointmentStatusLabel('XXX'), 'XXX');
    });
  });
}
