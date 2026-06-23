/// Tests de los modelos del Catálogo (incluye stock + auto-agotado).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/catalog/domain/models/catalog_product_model.dart';

void main() {
  group('CatalogProductModel', () {
    test('fromJson parsea campos incl. stock', () {
      final p = CatalogProductModel.fromJson({
        'id': 1,
        'name': 'Taladro',
        'price': 120.0,
        'offerPrice': 99.9,
        'stock': 4,
        'category': 'Herramientas',
        'isAvailable': true,
        'whatsappOrderUrl': 'https://wa.me/51999',
      });
      expect(p.name, 'Taladro');
      expect(p.stock, 4);
      expect(p.category, 'Herramientas');
      expect(p.hasOffer, true);
      expect(p.effectivePrice, 99.9);
    });

    test('isSoldOut: por toggle o por stock 0', () {
      const porStock = CatalogProductModel(
        id: 1,
        name: 'A',
        price: 10,
        stock: 0,
      );
      expect(porStock.isSoldOut, true);

      const porToggle = CatalogProductModel(
        id: 2,
        name: 'B',
        price: 10,
        isAvailable: false,
      );
      expect(porToggle.isSoldOut, true);

      const disponible = CatalogProductModel(
        id: 3,
        name: 'C',
        price: 10,
        stock: 3,
      );
      expect(disponible.isSoldOut, false);

      // stock null = no se considera agotado por stock.
      const sinStock = CatalogProductModel(id: 4, name: 'D', price: 10);
      expect(sinStock.isSoldOut, false);
    });
  });

  group('CatalogResponse', () {
    test('fromJson agrupa secciones + allItems + isEmpty', () {
      final r = CatalogResponse.fromJson({
        'providerId': 7,
        'sections': [
          {
            'section': 'Herramientas',
            'items': [
              {'id': 1, 'name': 'A', 'price': 10},
              {'id': 2, 'name': 'B', 'price': 12},
            ],
          },
        ],
      });
      expect(r.providerId, 7);
      expect(r.allItems.length, 2);
      expect(r.isEmpty, false);
      expect(r.sections.first.label, 'Herramientas');
    });

    test('sección "otros" → etiqueta "Otros"', () {
      final r = CatalogResponse.fromJson({
        'providerId': 1,
        'sections': [
          {
            'section': 'otros',
            'items': [
              {'id': 1, 'name': 'A', 'price': 1},
            ],
          },
        ],
      });
      expect(r.sections.first.label, 'Otros');
    });
  });
}
