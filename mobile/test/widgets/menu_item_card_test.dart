/// Widget tests de [MenuItemCard] (tarjeta de plato en la carta pública).
/// Se usan ítems SIN photoUrl para no tocar la red en los tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/menu/domain/models/menu_item_model.dart';
import 'package:mobile/features/menu/presentation/widgets/menu_item_card.dart';

void main() {
  Widget host(MenuItemModel item) => MaterialApp(
    home: Scaffold(body: MenuItemCard(item: item)),
  );

  testWidgets('muestra nombre y precio', (tester) async {
    await tester.pumpWidget(
      host(const MenuItemModel(id: 1, name: 'Lomo Saltado', price: 25)),
    );
    expect(find.text('Lomo Saltado'), findsOneWidget);
    expect(find.text('S/ 25.00'), findsOneWidget);
  });

  testWidgets('oferta: muestra precio normal (tachado) y el de oferta', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(const MenuItemModel(id: 1, name: 'X', price: 20, offerPrice: 15)),
    );
    expect(find.text('S/ 20.00'), findsOneWidget);
    expect(find.text('S/ 15.00'), findsOneWidget);
  });

  testWidgets('agotado: muestra badge "Agotado"', (tester) async {
    await tester.pumpWidget(
      host(
        const MenuItemModel(id: 1, name: 'X', price: 10, isAvailable: false),
      ),
    );
    expect(find.text('Agotado'), findsOneWidget);
  });

  testWidgets('disponible + onAdd: muestra "Agregar"', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MenuItemCard(
            item: const MenuItemModel(id: 1, name: 'X', price: 10),
            onAdd: () {},
            onRemove: () {},
          ),
        ),
      ),
    );
    expect(find.text('Agregar'), findsOneWidget);
  });

  testWidgets('quantity>0: muestra la cantidad y el stepper', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MenuItemCard(
            item: const MenuItemModel(id: 1, name: 'X', price: 10),
            quantity: 2,
            onAdd: () {},
            onRemove: () {},
          ),
        ),
      ),
    );
    expect(find.text('2'), findsOneWidget);
    expect(find.text('Agregar'), findsNothing);
    expect(find.byIcon(Icons.add), findsOneWidget);
    expect(find.byIcon(Icons.remove), findsOneWidget);
  });

  testWidgets('agotado: NO muestra control de carrito aunque haya onAdd', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MenuItemCard(
            item: const MenuItemModel(
              id: 1,
              name: 'X',
              price: 10,
              isAvailable: false,
            ),
            onAdd: () {},
            onRemove: () {},
          ),
        ),
      ),
    );
    expect(find.text('Agregar'), findsNothing);
  });
}
