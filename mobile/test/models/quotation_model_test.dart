/// Tests del modelo Quotation (incluye el gating de WhatsApp por showWhatsapp).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/quotation/domain/models/quotation_model.dart';

void main() {
  group('Quotation.fromJson — shape cliente (/mine)', () {
    test('toma provider + expone WhatsApp si showWhatsapp != false', () {
      final q = Quotation.fromJson({
        'id': 1,
        'providerId': 7,
        'userId': 5,
        'description': 'Pintar casa',
        'status': 'RESPONDIDA',
        'response': 'Te cuesta S/ 500',
        'estimatedPrice': 500,
        'provider': {
          'businessName': 'Pintores X',
          'type': 'OFICIO',
          'whatsapp': '+51 999',
          'showWhatsapp': true,
        },
      });
      expect(q.providerName, 'Pintores X');
      expect(q.providerWhatsapp, '+51 999');
      expect(q.isResponded, true);
      expect(q.estimatedPrice, 500);
      expect(q.statusLabel, 'Respondida');
    });

    test('oculta WhatsApp si showWhatsapp == false', () {
      final q = Quotation.fromJson({
        'id': 1,
        'providerId': 7,
        'userId': 5,
        'description': 'x',
        'status': 'PENDIENTE',
        'provider': {
          'businessName': 'X',
          'whatsapp': '+51999',
          'showWhatsapp': false,
        },
      });
      expect(q.providerWhatsapp, isNull);
      expect(q.isPending, true);
    });

    test('cae a whatsappBiz si no hay whatsapp', () {
      final q = Quotation.fromJson({
        'id': 1,
        'providerId': 7,
        'userId': 5,
        'description': 'x',
        'status': 'RESPONDIDA',
        'provider': {'businessName': 'X', 'whatsappBiz': '+51888'},
      });
      expect(q.providerWhatsapp, '+51888');
    });
  });

  group('Quotation.fromJson — shape proveedor (/provider/mine)', () {
    test('toma datos del user', () {
      final q = Quotation.fromJson({
        'id': 2,
        'providerId': 7,
        'userId': 5,
        'description': 'x',
        'status': 'PENDIENTE',
        'user': {'firstName': 'Juan', 'lastName': 'Pérez', 'phone': '999'},
      });
      expect(q.clientName, 'Juan Pérez');
      expect(q.clientPhone, '999');
      expect(q.providerWhatsapp, isNull);
    });
  });

  group('quotationStatusLabel', () {
    test('mapea estados', () {
      expect(quotationStatusLabel('PENDIENTE'), 'Pendiente');
      expect(quotationStatusLabel('RESPONDIDA'), 'Respondida');
      expect(quotationStatusLabel('RECHAZADA'), 'Rechazada');
      expect(quotationStatusLabel('ZZZ'), 'ZZZ');
    });
  });
}
