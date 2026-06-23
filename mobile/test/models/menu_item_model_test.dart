/// Tests unitarios de los modelos de Carta Digital + el campo `features`
/// del ProviderModel (descubrimiento de funcionalidades por categoría).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/menu/domain/models/menu_item_model.dart';
import 'package:mobile/features/providers_list/domain/models/provider_model.dart';

void main() {
  group('MenuItemModel', () {
    test('fromJson parsea todos los campos', () {
      final m = MenuItemModel.fromJson({
        'id': 1,
        'name': 'Ceviche',
        'description': 'Fresco',
        'price': 25.0,
        'offerPrice': 19.9,
        'category': 'fondo',
        'photoUrl': 'http://x/y.jpg',
        'isAvailable': true,
        'isFeatured': true,
        'order': 2,
        'whatsappOrderUrl': 'https://wa.me/51999',
      });
      expect(m.name, 'Ceviche');
      expect(m.price, 25.0);
      expect(m.offerPrice, 19.9);
      expect(m.category, 'fondo');
      expect(m.isFeatured, true);
      expect(m.whatsappOrderUrl, 'https://wa.me/51999');
    });

    test('hasOffer y effectivePrice', () {
      const conOferta = MenuItemModel(
        id: 1,
        name: 'A',
        price: 20,
        offerPrice: 15,
      );
      expect(conOferta.hasOffer, true);
      expect(conOferta.effectivePrice, 15);

      const sinOferta = MenuItemModel(id: 2, name: 'B', price: 20);
      expect(sinOferta.hasOffer, false);
      expect(sinOferta.effectivePrice, 20);

      // Oferta inválida (>= precio) NO cuenta.
      const ofertaMala = MenuItemModel(
        id: 3,
        name: 'C',
        price: 20,
        offerPrice: 25,
      );
      expect(ofertaMala.hasOffer, false);
      expect(ofertaMala.effectivePrice, 20);
    });

    test('defaults seguros con json mínimo', () {
      final m = MenuItemModel.fromJson({'id': 9, 'name': 'X', 'price': 10});
      expect(m.isAvailable, true);
      expect(m.isFeatured, false);
      expect(m.offerPrice, isNull);
      expect(m.whatsappOrderUrl, isNull);
    });
  });

  group('MenuResponse', () {
    test('fromJson agrupa secciones, allItems e isEmpty', () {
      final r = MenuResponse.fromJson({
        'providerId': 7,
        'sections': [
          {
            'section': 'fondo',
            'items': [
              {'id': 1, 'name': 'A', 'price': 10},
              {'id': 2, 'name': 'B', 'price': 12},
            ],
          },
          {
            'section': 'bebida',
            'items': [
              {'id': 3, 'name': 'C', 'price': 5},
            ],
          },
        ],
      });
      expect(r.providerId, 7);
      expect(r.sections.length, 2);
      expect(r.allItems.length, 3);
      expect(r.isEmpty, false);
    });

    test('isEmpty=true cuando no hay ítems', () {
      final r = MenuResponse.fromJson({'providerId': 1, 'sections': []});
      expect(r.isEmpty, true);
      expect(r.allItems, isEmpty);
    });
  });

  group('menuSectionLabel', () {
    test('mapea las secciones conocidas', () {
      expect(menuSectionLabel('entrada'), 'Entradas');
      expect(menuSectionLabel('fondo'), 'Platos de fondo');
      expect(menuSectionLabel('bebida'), 'Bebidas');
      expect(menuSectionLabel('promocion'), 'Promociones');
    });
    test('desconocida → Otros', () {
      expect(menuSectionLabel('xyz'), 'Otros');
    });
  });

  group('ProviderModel.features', () {
    test('parsea features y getters', () {
      final p = ProviderModel.fromJson({
        'id': 1,
        'businessName': 'Resto',
        'type': 'NEGOCIO',
        'averageRating': 4.0,
        'totalReviews': 3,
        'availability': 'DISPONIBLE',
        'isVerified': true,
        'hasCleanRecord': true,
        'features': ['carta_digital', 'cotizacion'],
      });
      expect(p.features, contains('carta_digital'));
      expect(p.hasMenu, true);
      expect(p.hasQuotation, true);
      expect(p.hasCatalog, false);
      expect(p.hasAgenda, false);
    });

    test('features ausente → [] y getters false', () {
      final p = ProviderModel.fromJson({
        'id': 1,
        'businessName': 'X',
        'type': 'OFICIO',
        'averageRating': 0.0,
        'totalReviews': 0,
        'availability': 'DISPONIBLE',
        'isVerified': false,
        'hasCleanRecord': false,
      });
      expect(p.features, isEmpty);
      expect(p.hasMenu, false);
    });
  });
}
