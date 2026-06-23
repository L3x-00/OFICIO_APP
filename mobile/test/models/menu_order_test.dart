/// Tests de los helpers PUROS del carrito de la carta (pedido por WhatsApp).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/menu/domain/menu_order.dart';
import 'package:mobile/features/menu/domain/models/menu_item_model.dart';

void main() {
  const lomo = MenuItemModel(id: 1, name: 'Lomo', price: 25);
  const chicha = MenuItemModel(id: 2, name: 'Chicha', price: 5, offerPrice: 4);

  group('extractWhatsappNumber', () {
    test('extrae los dígitos del link wa.me', () {
      expect(
        extractWhatsappNumber('https://wa.me/51999111222?text=hola'),
        '51999111222',
      );
    });
    test('null si no hay url o no matchea', () {
      expect(extractWhatsappNumber(null), isNull);
      expect(extractWhatsappNumber('https://example.com'), isNull);
    });
  });

  group('totales del carrito', () {
    final lines = [const CartLine(lomo, 2), const CartLine(chicha, 1)];
    test('cartCount suma unidades', () => expect(cartCount(lines), 3));
    test('cartTotal usa precio efectivo (oferta)', () {
      // 2*25 + 1*4 (chicha en oferta) = 54
      expect(cartTotal(lines), 54);
    });
  });

  group('buildOrderMessage', () {
    test('incluye cada línea y el total', () {
      final msg = buildOrderMessage('Resto', [const CartLine(lomo, 2)]);
      expect(msg, contains('Resto'));
      expect(msg, contains('2x Lomo'));
      expect(msg, contains('Total: S/ 50.00'));
    });
  });

  group('buildOrderUrl', () {
    test('null si no hay número o carrito vacío', () {
      expect(
        buildOrderUrl(
          number: null,
          businessName: 'X',
          lines: [const CartLine(lomo, 1)],
        ),
        isNull,
      );
      expect(
        buildOrderUrl(number: '519', businessName: 'X', lines: const []),
        isNull,
      );
    });
    test('arma wa.me con el texto url-encoded', () {
      final url = buildOrderUrl(
        number: '51999',
        businessName: 'X',
        lines: [const CartLine(lomo, 1)],
      );
      expect(url, startsWith('https://wa.me/51999?text='));
      expect(url, contains('Lomo'));
      expect(url, isNot(contains(' '))); // espacios codificados
    });
  });
}
