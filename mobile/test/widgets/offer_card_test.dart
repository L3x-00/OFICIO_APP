/// Widget tests del `OfferComparisonSheet` (cliente comparando ofertas
/// recibidas de proveedores).
///
/// El widget es el contenedor que renderiza las "tarjetas de oferta"
/// (`_OfferCard` privado, accesible solo a través del sheet). Lo
/// montamos directamente — su `static show()` usa
/// `showModalBottomSheet` pero el `build()` retorna un widget que
/// podemos pumpear si lo envolvemos en MaterialApp + Scaffold.
///
/// Validamos:
///   • Pinta el header con conteo correcto ("3 ofertas", singular/plural).
///   • Pinta el contenido de cada oferta (precio, mensaje, nombre del
///     proveedor) — renderizado condicional según `OfferStatus.pending`.
///   • Estado vacío: cuando no hay ofertas pending, muestra "Sin ofertas
///     aún".
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/subastas/domain/models/service_request_model.dart';
import 'package:mobile/features/subastas/presentation/providers/subastas_provider.dart';
import 'package:mobile/features/subastas/presentation/widgets/offer_comparison_sheet.dart';
import 'package:provider/provider.dart';

import '../helpers/test_setup.dart';

/// Construye un ServiceRequestModel con N ofertas en un estado dado.
ServiceRequestModel _request({
  int requestId = 1,
  int userId    = 99,
  List<OfferModel> offers = const [],
}) {
  return ServiceRequestModel(
    id:          requestId,
    userId:      userId,
    categoryId:  3,
    categoryName: 'Gasfitería',
    description: 'Necesito gasfitero urgente',
    status:      ServiceRequestStatus.open,
    maxOffers:   5,
    expiresAt:   DateTime.now().add(const Duration(hours: 6)),
    createdAt:   DateTime.now(),
    offers:      offers,
  );
}

OfferModel _offer({
  int id        = 10,
  int providerId = 7,
  double price  = 150,
  String name   = 'Plomería Pérez',
  String msg    = 'Voy mañana 9am',
  OfferStatus status = OfferStatus.pending,
}) {
  return OfferModel(
    id:                  id,
    serviceRequestId:    1,
    providerId:          providerId,
    providerName:        name,
    providerRating:      4.5,
    providerTotalReviews: 12,
    providerIsTrusted:   true,
    providerAvatarUrl:   null,
    price:               price,
    message:             msg,
    status:              status,
    createdAt:           DateTime.now(),
  );
}

Widget _harness(ServiceRequestModel req) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<SubastasProvider>(create: (_) => SubastasProvider()),
    ],
    child: MaterialApp(
      theme: AppThemeColors.buildLight(),
      home:  Scaffold(body: OfferComparisonSheet(request: req)),
    ),
  );
}

void main() {
  setUp(() {
    installTestBackend();
  });

  testWidgets('Header pluraliza correctamente: "1 oferta · Gasfitería"', (tester) async {
    final req = _request(offers: [_offer(id: 1)]);
    await tester.pumpWidget(_harness(req));
    await tester.pump();

    expect(find.text('Comparar ofertas'), findsOneWidget);
    // 1 oferta singular.
    expect(find.textContaining('1 oferta · Gasfitería'), findsOneWidget);
  });

  testWidgets('Header pluraliza: "3 ofertas · Gasfitería"', (tester) async {
    final req = _request(offers: [
      _offer(id: 1, price: 100, name: 'A'),
      _offer(id: 2, price: 200, name: 'B'),
      _offer(id: 3, price: 150, name: 'C'),
    ]);
    await tester.pumpWidget(_harness(req));
    await tester.pump();

    expect(find.textContaining('3 ofertas · Gasfitería'), findsOneWidget);
  });

  testWidgets('Renderiza nombre del proveedor + precio + mensaje de la oferta', (tester) async {
    // 1 sola oferta para garantizar que está dentro del viewport del
    // ListView interno (con 2+ y un viewport chico de test runner,
    // las siguientes no se montan hasta scrollear).
    final req = _request(offers: [
      _offer(id: 10, price: 99, name: 'Plomería A', msg: 'Hoy mismo'),
    ]);
    await tester.pumpWidget(_harness(req));
    await tester.pump();

    expect(find.text('Plomería A'),                 findsOneWidget);
    // El widget envuelve el mensaje entre comillas dobles
    // (`"${offer.message}"`), así que matchamos por sub-string.
    expect(find.textContaining('Hoy mismo'),         findsOneWidget);
    // El precio aparece como "S/ 99.00" con prefijo y 2 decimales.
    expect(find.textContaining('99.00'),             findsOneWidget);
    expect(find.textContaining('S/'),                findsAtLeastNWidgets(1));
  });

  testWidgets('Renderizado condicional: ofertas NO pendientes no aparecen en el sheet de comparación', (tester) async {
    // Mezcla: 1 PENDING + 1 ACCEPTED + 1 REJECTED. Solo PENDING se muestra.
    final req = _request(offers: [
      _offer(id: 1, price: 100, name: 'Pending Co',  status: OfferStatus.pending),
      _offer(id: 2, price: 200, name: 'Accepted Co', status: OfferStatus.accepted),
      _offer(id: 3, price: 150, name: 'Rejected Co', status: OfferStatus.rejected),
    ]);
    await tester.pumpWidget(_harness(req));
    await tester.pump();

    // Solo 1 PENDING → header "1 oferta".
    expect(find.textContaining('1 oferta'),  findsOneWidget);
    expect(find.text('Pending Co'),          findsOneWidget);
    expect(find.text('Accepted Co'),         findsNothing);
    expect(find.text('Rejected Co'),         findsNothing);
  });

  testWidgets('Estado vacío: sin ofertas PENDING muestra "Sin ofertas aún"', (tester) async {
    // Sin ofertas en absoluto.
    final empty = _request(offers: const []);
    await tester.pumpWidget(_harness(empty));
    await tester.pump();

    expect(find.text('Sin ofertas aún'), findsOneWidget);
  });

  testWidgets('Botón "X" de cerrar está presente en el header', (tester) async {
    final req = _request(offers: [_offer()]);
    await tester.pumpWidget(_harness(req));
    await tester.pump();

    expect(find.byIcon(Icons.close), findsOneWidget);
  });
}
