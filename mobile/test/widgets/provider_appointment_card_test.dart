/// Widget tests de [ProviderAppointmentCard] (acciones según estado).
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/agenda/domain/models/appointment_model.dart';
import 'package:mobile/features/agenda/presentation/widgets/provider_appointment_card.dart';

void main() {
  Appointment appt(String status) => Appointment.fromJson({
    'id': 1,
    'providerId': 7,
    'userId': 5,
    'date': '2026-06-25T13:00:00.000Z',
    'status': status,
    'user': {'firstName': 'Juan', 'lastName': 'Pérez'},
  });

  Widget host(Widget c) => MaterialApp(home: Scaffold(body: c));

  testWidgets('pendiente: muestra Confirmar y Rechazar', (tester) async {
    await tester.pumpWidget(
      host(
        ProviderAppointmentCard(
          appt: appt('PENDIENTE'),
          onConfirm: () {},
          onReject: () {},
        ),
      ),
    );
    expect(find.text('Juan Pérez'), findsOneWidget);
    expect(find.text('Confirmar'), findsOneWidget);
    expect(find.text('Rechazar'), findsOneWidget);
    expect(find.text('Completar'), findsNothing);
  });

  testWidgets('confirmada: muestra Completar', (tester) async {
    await tester.pumpWidget(
      host(
        ProviderAppointmentCard(appt: appt('CONFIRMADA'), onComplete: () {}),
      ),
    );
    expect(find.text('Completar'), findsOneWidget);
    expect(find.text('Confirmar'), findsNothing);
  });

  testWidgets('historial (sin callbacks): sin botones de acción', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(ProviderAppointmentCard(appt: appt('COMPLETADA'))),
    );
    expect(find.text('Confirmar'), findsNothing);
    expect(find.text('Rechazar'), findsNothing);
    expect(find.text('Completar'), findsNothing);
    // El chip de estado sí aparece.
    expect(find.text('Completada'), findsOneWidget);
  });
}
