/// Tests del `SubastasProvider`.
///
/// Mismo patrón: mockear el HttpClientAdapter del Dio singleton para
/// que el repo concreto (instanciado dentro del provider) hable con
/// nuestro mock sin red ni modificar la lógica.
///
/// Cubre:
///   • Estado inicial idle, listas vacías.
///   • loadMyRequests success / error.
///   • createRequest success → suma al inicio + flag submitting.
///   • acceptOffer success → mutación local de offers (ACCEPTED + REJECTED).
///   • loadOpportunities success / error.
///   • submitOffer success → la opportunity NO desaparece (se recarga).
///   • deleteRequest success → quita del estado.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/subastas/domain/models/service_request_model.dart';
import 'package:mobile/features/subastas/presentation/providers/subastas_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  // Helper para armar shape de request de la BD/mock.
  Map<String, dynamic> requestJson({
    int id = 1,
    int userId = 99,
    int categoryId = 5,
    String status = 'OPEN',
    List<Map<String, dynamic>> offers = const [],
  }) => {
    'id': id,
    'userId': userId,
    'categoryId': categoryId,
    'category': {'name': 'Gasfitería'},
    'description': 'Necesito plomero',
    'status': status,
    'maxOffers': 5,
    'expiresAt': DateTime.now()
        .add(const Duration(hours: 24))
        .toIso8601String(),
    'createdAt': DateTime.now().toIso8601String(),
    'offers': offers,
  };

  Map<String, dynamic> offerJson({
    int id = 100,
    int providerId = 7,
    String status = 'PENDING',
  }) => {
    'id': id,
    'serviceRequestId': 1,
    'providerId': providerId,
    'price': 150,
    'message': 'voy mañana',
    'status': status,
    'createdAt': DateTime.now().toIso8601String(),
    'provider': {
      'businessName': 'Provider $providerId',
      'averageRating': 4.5,
      'totalReviews': 10,
      'isTrusted': true,
      'user': {'avatarUrl': null},
    },
  };

  group('Estado inicial', () {
    test('arranca idle, listas vacías, sin error', () {
      final p = SubastasProvider();
      expect(p.state, SubastasState.idle);
      expect(p.myRequests, isEmpty);
      expect(p.opportunities, isEmpty);
      expect(p.submitting, false);
      expect(p.error, isNull);
    });
  });

  group('loadMyRequests', () {
    test('success: rellena myRequests + state=success', () async {
      adapter.onGet(
        '/subastas/requests/mine',
        body: {
          'data': <dynamic>[requestJson(id: 1), requestJson(id: 2)],
          'total': 2,
          'page': 1,
          'lastPage': 1,
        },
      );

      final p = SubastasProvider();
      await p.loadMyRequests();

      expect(p.state, SubastasState.success);
      expect(p.myRequests, hasLength(2));
      expect(p.myRequests.first.id, 1);
      expect(p.error, isNull);
    });

    test('soporta payload como lista plana (compat retro)', () async {
      adapter.onGet(
        '/subastas/requests/mine',
        body: <dynamic>[requestJson(id: 1)],
      );

      final p = SubastasProvider();
      await p.loadMyRequests();

      expect(p.myRequests, hasLength(1));
      expect(p.state, SubastasState.success);
    });

    test('failure: state=error + mensaje', () async {
      adapter.onGet(
        '/subastas/requests/mine',
        status: 500,
        body: {'message': 'server boom'},
      );

      final p = SubastasProvider();
      await p.loadMyRequests();

      expect(p.state, SubastasState.error);
      expect(p.error, isNotNull);
      expect(p.myRequests, isEmpty);
    });
  });

  group('createRequest', () {
    test('success: prepend a myRequests + submitting vuelve a false', () async {
      adapter.onPost('/subastas/requests', body: requestJson(id: 42));

      final p = SubastasProvider();
      final ok = await p.createRequest(
        categoryId: 5,
        description: 'Necesito plomero',
      );

      expect(ok, true);
      expect(p.submitting, false);
      expect(p.myRequests, hasLength(1));
      expect(p.myRequests.first.id, 42);
      expect(p.error, isNull);
    });

    test('failure: devuelve false + error seteado + lista intacta', () async {
      adapter.onPost(
        '/subastas/requests',
        status: 403,
        body: {'message': 'bloqueado por no-pick'},
      );

      final p = SubastasProvider();
      final ok = await p.createRequest(categoryId: 5, description: 'x');

      expect(ok, false);
      expect(p.submitting, false);
      expect(p.error, isNotNull);
      expect(p.myRequests, isEmpty);
    });
  });

  group('acceptOffer (mutación local optimista)', () {
    test(
      'success: marca offer ACCEPTED + las demás PENDING como REJECTED + request CLOSED',
      () async {
        // Seed: una request con 2 ofertas pendientes.
        adapter.onGet(
          '/subastas/requests/mine',
          body: {
            'data': <dynamic>[
              requestJson(
                id: 1,
                offers: [
                  offerJson(id: 100, providerId: 7, status: 'PENDING'),
                  offerJson(id: 101, providerId: 8, status: 'PENDING'),
                ],
              ),
            ],
          },
        );

        final p = SubastasProvider();
        await p.loadMyRequests();
        expect(p.myRequests.first.offers, hasLength(2));

        // Acepta la oferta 100.
        adapter.onPost('/subastas/requests/accept', body: {'success': true});
        final ok = await p.acceptOffer(100, 1);

        expect(ok, true);
        final r = p.myRequests.first;
        expect(r.status, ServiceRequestStatus.closed);

        final accepted = r.offers.firstWhere((o) => o.id == 100);
        final rejected = r.offers.firstWhere((o) => o.id == 101);
        expect(accepted.status, OfferStatus.accepted);
        expect(rejected.status, OfferStatus.rejected);
      },
    );

    test('failure: no toca estado local + setea error', () async {
      adapter.onGet(
        '/subastas/requests/mine',
        body: {
          'data': <dynamic>[
            requestJson(
              id: 1,
              offers: [offerJson(id: 100, providerId: 7, status: 'PENDING')],
            ),
          ],
        },
      );
      final p = SubastasProvider();
      await p.loadMyRequests();

      adapter.onPost(
        '/subastas/requests/accept',
        status: 400,
        body: {'message': 'ya adjudicada'},
      );
      final ok = await p.acceptOffer(100, 1);

      expect(ok, false);
      expect(p.error, isNotNull);
      // Estado intacto.
      expect(p.myRequests.first.status, ServiceRequestStatus.open);
      expect(p.myRequests.first.offers.first.status, OfferStatus.pending);
    });
  });

  group('loadOpportunities + submitOffer', () {
    test('loadOpportunities success: lista cargada', () async {
      adapter.onGet(
        '/subastas/opportunities/me',
        body: <dynamic>[
          <String, dynamic>{
            'id': 1,
            'description': 'x',
            'category': {'name': 'Cerrajería'},
            'offersCount': 1,
            'maxOffers': 5,
            'expiresAt': DateTime.now()
                .add(const Duration(hours: 12))
                .toIso8601String(),
            'canParticipate': true,
          },
        ],
      );

      final p = SubastasProvider();
      await p.loadOpportunities();

      expect(p.state, SubastasState.success);
      expect(p.opportunities, hasLength(1));
    });

    test(
      'submitOffer success: la opportunity NO desaparece (se recarga)',
      () async {
        // Seed
        adapter.onGet(
          '/subastas/opportunities/me',
          body: <dynamic>[
            <String, dynamic>{
              'id': 1,
              'description': 'x',
              'category': {'name': 'Gas'},
              'offersCount': 0,
              'maxOffers': 5,
              'expiresAt': DateTime.now()
                  .add(const Duration(hours: 12))
                  .toIso8601String(),
              'canParticipate': true,
            },
            <String, dynamic>{
              'id': 2,
              'description': 'y',
              'category': {'name': 'Gas'},
              'offersCount': 0,
              'maxOffers': 5,
              'expiresAt': DateTime.now()
                  .add(const Duration(hours: 12))
                  .toIso8601String(),
              'canParticipate': true,
            },
          ],
        );
        final p = SubastasProvider();
        await p.loadOpportunities();
        expect(p.opportunities, hasLength(2));

        adapter.onPost('/subastas/offers', body: {'success': true});
        final ok = await p.submitOffer(
          serviceRequestId: 1,
          price: 100,
          message: 'voy',
        );

        expect(ok, true);
        // Nuevo comportamiento: tras postular NO se elimina — se recarga y la
        // solicitud sigue visible (en producción con estado "Oferta enviada").
        expect(p.opportunities, hasLength(2));
      },
    );

    test('submitOffer failure: lista intacta + error seteado', () async {
      adapter.onGet(
        '/subastas/opportunities/me',
        body: <dynamic>[
          <String, dynamic>{
            'id': 1,
            'description': 'x',
            'category': {'name': 'Gas'},
            'offersCount': 0,
            'maxOffers': 5,
            'expiresAt': DateTime.now()
                .add(const Duration(hours: 12))
                .toIso8601String(),
            'canParticipate': true,
          },
        ],
      );
      final p = SubastasProvider();
      await p.loadOpportunities();

      adapter.onPost(
        '/subastas/offers',
        status: 400,
        body: {'message': 'Ya enviaste una oferta'},
      );
      final ok = await p.submitOffer(
        serviceRequestId: 1,
        price: 100,
        message: 'voy',
      );

      expect(ok, false);
      expect(p.opportunities, hasLength(1));
      expect(p.error, isNotNull);
    });
  });

  group('deleteRequest', () {
    test('success: remueve la request de myRequests + opportunities', () async {
      adapter.onGet(
        '/subastas/requests/mine',
        body: {
          'data': <dynamic>[requestJson(id: 1), requestJson(id: 2)],
        },
      );
      final p = SubastasProvider();
      await p.loadMyRequests();
      expect(p.myRequests, hasLength(2));

      adapter.onDelete(
        '/subastas/requests/1',
        body: {'success': true, 'hadOffers': false},
      );
      final result = await p.deleteRequest(1);

      expect(result, isNotNull);
      expect(result!['success'], true);
      expect(p.myRequests, hasLength(1));
      expect(p.myRequests.first.id, 2);
    });

    test('failure: devuelve null + estado intacto', () async {
      adapter.onGet(
        '/subastas/requests/mine',
        body: {
          'data': <dynamic>[requestJson(id: 1)],
        },
      );
      final p = SubastasProvider();
      await p.loadMyRequests();

      adapter.onDelete(
        '/subastas/requests/1',
        status: 403,
        body: {'message': 'no es tuya'},
      );
      final result = await p.deleteRequest(1);

      expect(result, isNull);
      expect(p.myRequests, hasLength(1));
      expect(p.error, isNotNull);
    });
  });
}
