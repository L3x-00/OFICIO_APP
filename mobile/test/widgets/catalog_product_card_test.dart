/// Widget tests de [CatalogProductCard] (sin photoUrl para no tocar la red).
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/catalog/domain/models/catalog_product_model.dart';
import 'package:mobile/features/catalog/presentation/widgets/catalog_product_card.dart';

void main() {
  Widget host(Widget c) => MaterialApp(
    theme: AppThemeColors.buildDark(),
    home: Scaffold(body: c),
  );

  testWidgets('muestra nombre, precio y stock', (tester) async {
    await tester.pumpWidget(
      host(
        const CatalogProductCard(
          item: CatalogProductModel(
            id: 1,
            name: 'Martillo',
            price: 30,
            stock: 5,
          ),
        ),
      ),
    );
    expect(find.text('Martillo'), findsOneWidget);
    expect(find.text('S/ 30.00'), findsOneWidget);
    expect(find.text('5 disponibles'), findsOneWidget);
  });

  testWidgets('stock 0 → muestra "Agotado" y sin control de carrito', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        CatalogProductCard(
          item: const CatalogProductModel(
            id: 1,
            name: 'X',
            price: 10,
            stock: 0,
          ),
          onAdd: () {},
          onRemove: () {},
        ),
      ),
    );
    expect(find.text('Agotado'), findsOneWidget);
    expect(find.text('Agregar'), findsNothing);
  });

  testWidgets('disponible + onAdd → "Agregar"; quantity>0 → stepper', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        CatalogProductCard(
          item: const CatalogProductModel(
            id: 1,
            name: 'X',
            price: 10,
            stock: 3,
          ),
          onAdd: () {},
          onRemove: () {},
        ),
      ),
    );
    expect(find.text('Agregar'), findsOneWidget);

    await tester.pumpWidget(
      host(
        CatalogProductCard(
          item: const CatalogProductModel(
            id: 1,
            name: 'X',
            price: 10,
            stock: 3,
          ),
          quantity: 2,
          onAdd: () {},
          onRemove: () {},
        ),
      ),
    );
    expect(find.text('2'), findsOneWidget);
    expect(find.byIcon(Icons.add), findsOneWidget);
    expect(find.byIcon(Icons.remove), findsOneWidget);
  });

  testWidgets('oferta: precio tachado + precio de oferta', (tester) async {
    await tester.pumpWidget(
      host(
        const CatalogProductCard(
          item: CatalogProductModel(
            id: 1,
            name: 'X',
            price: 20,
            offerPrice: 15,
          ),
        ),
      ),
    );
    expect(find.text('S/ 20.00'), findsOneWidget);
    expect(find.text('S/ 15.00'), findsOneWidget);
  });
}
