/// Tests unitarios de los modelos de dominio.
///
/// Cubre:
///   • fromJson / toJson roundtrip (cuando aplica).
///   • Null safety: campos opcionales ausentes no rompen el parseo.
///   • Backwards compatibility: el backend a veces manda `userId`
///     en lugar de `id`, `message` en lugar de `body`, etc.
///   • Enums desconocidos caen a defaults sensatos (no lanzan).
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/features/auth/domain/models/user_model.dart';
import 'package:mobile/features/chat/domain/models/chat_message_model.dart';
import 'package:mobile/features/chat/domain/models/chat_room_model.dart';
import 'package:mobile/features/notifications/domain/models/notification_model.dart';
import 'package:mobile/features/providers_list/domain/models/provider_model.dart';
import 'package:mobile/features/providers_list/domain/models/review_model.dart';
import 'package:mobile/features/referrals/domain/models/referral_models.dart';
import 'package:mobile/features/subastas/domain/models/service_request_model.dart';

void main() {
  // ──────────────────────────────────────────────────────────────────
  group('UserModel', () {
    test('fromJson lee tanto `userId` (login) como `id` (/users/me)', () {
      final fromLogin = UserModel.fromJson({
        'userId':    7,
        'email':     'a@b.com',
        'firstName': 'Ana',
        'lastName':  'B',
        'role':      'USUARIO',
      });
      final fromMe = UserModel.fromJson({
        'id':        7,
        'email':     'a@b.com',
        'firstName': 'Ana',
        'lastName':  'B',
        'role':      'USUARIO',
      });
      expect(fromLogin.id, 7);
      expect(fromMe.id, 7);
    });

    test('campos opcionales ausentes no rompen el parseo', () {
      final u = UserModel.fromJson({'id': 1, 'email': 'x@y'});
      expect(u.id, 1);
      expect(u.firstName, '');
      expect(u.lastName, '');
      expect(u.role, 'USUARIO');     // default
      expect(u.isEmailVerified, false);
      expect(u.coins, 0);
      expect(u.avatarUrl, isNull);
      expect(u.phone, isNull);
      expect(u.dni, isNull);
      expect(u.department, isNull);
    });

    test('role desconocido NO se normaliza — se preserva tal cual lo manda backend', () {
      final u = UserModel.fromJson({
        'id': 1, 'email': 'x@y', 'role': 'ROL_FUTURO',
      });
      expect(u.role, 'ROL_FUTURO');
      expect(u.isProvider, false);
      expect(u.isAdmin, false);
    });

    test('fullName y locationLabel derivan correctamente', () {
      const u = UserModel(
        id: 1, email: 'x@y', firstName: 'Juan', lastName: 'Pérez',
        role: 'USUARIO', department: 'Junín', province: 'Huancayo',
        district: 'El Tambo',
      );
      expect(u.fullName, 'Juan Pérez');
      expect(u.hasLocation, true);
      expect(u.locationLabel, 'El Tambo, Huancayo, Junín');
    });

    test('locationLabel maneja campos nulos sin generar comas extra', () {
      const u = UserModel(
        id: 1, email: 'x@y', firstName: 'J', lastName: 'P',
        role: 'USUARIO', department: 'Junín',
      );
      expect(u.locationLabel, 'Junín');
      const empty = UserModel(
        id: 1, email: 'x@y', firstName: 'J', lastName: 'P', role: 'USUARIO',
      );
      expect(empty.hasLocation, false);
      expect(empty.locationLabel, '');
    });

    test('copyWith preserva email + id (no son sobrescribibles) y respeta defaults', () {
      const base = UserModel(
        id: 99, email: 'x@y', firstName: 'A', lastName: 'B', role: 'USUARIO',
        coins: 10,
      );
      final updated = base.copyWith(firstName: 'Z', coins: 25);
      expect(updated.id, 99);
      expect(updated.email, 'x@y');
      expect(updated.firstName, 'Z');
      expect(updated.lastName, 'B');
      expect(updated.coins, 25);
    });

    test('toJson incluye campos clave (no incluye isEmailVerified — no es persistido)', () {
      const u = UserModel(
        id: 1, email: 'x@y', firstName: 'A', lastName: 'B',
        role: 'PROVEEDOR', coins: 5,
      );
      final j = u.toJson();
      expect(j['id'], 1);
      expect(j['email'], 'x@y');
      expect(j['role'], 'PROVEEDOR');
      expect(j['coins'], 5);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('ChatMessageModel + MessageStatus', () {
    test('fromJson convierte status del enum del backend', () {
      final m = ChatMessageModel.fromJson({
        'id': 5, 'chatRoomId': 1, 'senderId': 9,
        'content': 'hi', 'status': 'READ',
        'createdAt': '2026-05-22T12:00:00Z',
      });
      expect(m.id, 5);
      expect(m.status, MessageStatus.read);
    });

    test('status desconocido del backend cae a SENT (compat forward)', () {
      final m = ChatMessageModel.fromJson({
        'chatRoomId': 1, 'senderId': 9, 'content': 'x',
        'status': 'STATUS_FUTURO',
      });
      expect(m.status, MessageStatus.sent);
    });

    test('createdAt malformado cae a DateTime.now sin lanzar', () {
      final before = DateTime.now();
      final m = ChatMessageModel.fromJson({
        'chatRoomId': 1, 'senderId': 1, 'content': 'x',
        'createdAt': 'not-a-date',
      });
      final after = DateTime.now();
      expect(m.createdAt.isAtSameMomentAs(before) || m.createdAt.isAfter(before), true);
      expect(m.createdAt.isBefore(after.add(const Duration(seconds: 2))), true);
    });

    test('apiName mapea correctamente — sending y failed nunca se mandan como otra cosa que SENT', () {
      expect(MessageStatus.sending.apiName, 'SENT');
      expect(MessageStatus.sent.apiName, 'SENT');
      expect(MessageStatus.delivered.apiName, 'DELIVERED');
      expect(MessageStatus.read.apiName, 'READ');
      expect(MessageStatus.failed.apiName, 'SENT');
    });

    test('key identidad: usa id real si existe, si no clientTempId, si no fallback timestamp', () {
      final withId = ChatMessageModel(
        id: 42, chatRoomId: 1, senderId: 1, content: 'a',
        status: MessageStatus.sent, createdAt: DateTime(2026, 1, 1),
      );
      expect(withId.key, '42');

      final withTemp = ChatMessageModel(
        chatRoomId: 1, senderId: 1, content: 'a',
        status: MessageStatus.sending, createdAt: DateTime(2026, 1, 1),
        clientTempId: 'tmp_x',
      );
      expect(withTemp.key, 'tmp_x');

      final noIds = ChatMessageModel(
        chatRoomId: 1, senderId: 7, content: 'a',
        status: MessageStatus.sending, createdAt: DateTime(2026, 1, 1),
      );
      expect(noIds.key, contains('_7'));
    });

    test('copyWith preserva el resto de campos al actualizar status', () {
      final base = ChatMessageModel(
        id: 1, chatRoomId: 9, senderId: 5, content: 'msg',
        status: MessageStatus.sending,
        createdAt: DateTime(2026, 1, 1),
        clientTempId: 'tmp_1',
      );
      final updated = base.copyWith(status: MessageStatus.failed);
      expect(updated.status, MessageStatus.failed);
      expect(updated.content, 'msg');
      expect(updated.chatRoomId, 9);
      expect(updated.clientTempId, 'tmp_1');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('ChatRoomSummary', () {
    Map<String, dynamic> roomJson({
      Map<String, dynamic>? lastMessage,
    }) => {
      'id': 100, 'clientId': 1, 'providerId': 2,
      'createdAt': '2026-01-01T00:00:00Z',
      'lastActivityAt': '2026-01-02T00:00:00Z',
      'unreadCount': 3,
      'client': {
        'id': 1, 'firstName': 'Carlos', 'lastName': 'Ramos', 'avatarUrl': null,
      },
      'provider': {
        'id': 2, 'userId': 7, 'businessName': 'Plomería Pérez',
        'images': [{'url': 'https://img/cover.jpg', 'isCover': true}],
      },
      'lastMessage': lastMessage,
    };

    test('fromJson construye estructura completa', () {
      final r = ChatRoomSummary.fromJson(roomJson());
      expect(r.id, 100);
      expect(r.unreadCount, 3);
      expect(r.client.firstName, 'Carlos');
      expect(r.provider.userId, 7);
      expect(r.provider.coverUrl, 'https://img/cover.jpg');
      expect(r.lastMessage, isNull);
    });

    test('otherParty(currentUserId) devuelve la contraparte correcta', () {
      final r = ChatRoomSummary.fromJson(roomJson());
      // Soy el cliente (id=1) → la otra parte es el provider.
      final asClient = r.otherParty(1);
      expect(asClient.isProvider, true);
      expect(asClient.title, 'Plomería Pérez');
      // Soy el dueño del provider (userId=7) → la otra parte es el cliente.
      // ChatRoom asume current==clientId solo cuando coincide con .clientId;
      // cualquier otro id cae al else (provider's user).
      final asProvider = r.otherParty(99);
      expect(asProvider.isProvider, false);
      expect(asProvider.title, 'Carlos Ramos');
    });

    test('unreadCount ausente cae a 0', () {
      final json = roomJson();
      json.remove('unreadCount');
      final r = ChatRoomSummary.fromJson(json);
      expect(r.unreadCount, 0);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('ProviderModel', () {
    test('lee categoryName desde providerCategories (M:N) y fallback legacy', () {
      final mn = ProviderModel.fromJson({
        'id': 1, 'businessName': 'X', 'phone': '999',
        'providerCategories': [
          {'category': {'name': 'Gasfitería'}},
          {'category': {'name': 'Plomería'}},
        ],
      });
      expect(mn.categoryName, 'Gasfitería');
      expect(mn.categoryNames, ['Gasfitería', 'Plomería']);
      expect(mn.secondaryCategoryNames, ['Plomería']);
      expect(mn.categoryLabel, 'Gasfitería  +1');

      // Legacy shape (un solo `category.name` sin array)
      final legacy = ProviderModel.fromJson({
        'id': 2, 'businessName': 'Y', 'phone': '999',
        'category': {'name': 'Electricidad'},
      });
      expect(legacy.categoryName, 'Electricidad');
      expect(legacy.categoryNames, ['Electricidad']);
      expect(legacy.secondaryCategoryNames, isEmpty);
      expect(legacy.categoryLabel, 'Electricidad');
    });

    test('enums caen al default cuando viene un valor desconocido', () {
      expect(AvailabilityStatus.fromString('SUPER_DISPONIBLE'),
          AvailabilityStatus.disponible);
      expect(AvailabilityStatus.fromString('OCUPADO'),
          AvailabilityStatus.ocupado);
      expect(AvailabilityStatus.fromString('CON_DEMORA'),
          AvailabilityStatus.conDemora);
      expect(ProviderType.fromString('NEGOCIO'), ProviderType.negocio);
      expect(ProviderType.fromString('cualquier-otra-cosa'),
          ProviderType.oficio);
    });

    test('coverImageUrl prefiere isCover==true; fallback a primera imagen', () {
      final withFlag = ProviderModel.fromJson({
        'id': 1, 'businessName': 'X', 'phone': '999',
        'images': [
          {'url': 'first.jpg', 'isCover': false},
          {'url': 'cover.jpg', 'isCover': true},
        ],
      });
      expect(withFlag.coverImageUrl, 'cover.jpg');
      expect(withFlag.thumbnailUrls, ['first.jpg']);

      final noFlag = ProviderModel.fromJson({
        'id': 1, 'businessName': 'X', 'phone': '999',
        'images': [
          {'url': 'a.jpg'},
          {'url': 'b.jpg'},
          {'url': 'c.jpg'},
        ],
      });
      expect(noFlag.coverImageUrl, 'a.jpg');
      expect(noFlag.thumbnailUrls, ['b.jpg', 'c.jpg']);
    });

    test('locationLabel: OFICIO solo distrito; NEGOCIO provincia + distrito', () {
      final oficio = ProviderModel.fromJson({
        'id': 1, 'businessName': 'X', 'phone': '999', 'type': 'OFICIO',
        'locality': {'province': 'Huancayo', 'district': 'El Tambo'},
      });
      expect(oficio.locationLabel, 'El Tambo');

      final negocio = ProviderModel.fromJson({
        'id': 2, 'businessName': 'Y', 'phone': '999', 'type': 'NEGOCIO',
        'locality': {'province': 'Huancayo', 'district': 'El Tambo'},
      });
      expect(negocio.locationLabel, 'HUANCAYO, El Tambo');

      final sinLocality = ProviderModel.fromJson({
        'id': 3, 'businessName': 'Z', 'phone': '999', 'type': 'OFICIO',
      });
      expect(sinLocality.locationLabel, isNull);
    });

    test('subscriptionPlan default GRATIS cuando no llega subscription', () {
      final p = ProviderModel.fromJson({
        'id': 1, 'businessName': 'X', 'phone': '999',
      });
      expect(p.subscriptionPlan, 'GRATIS');
    });

    test('copyWith permite toggle de favorito sin alterar resto', () {
      final p = ProviderModel.fromJson({
        'id': 1, 'businessName': 'X', 'phone': '999',
        'category': {'name': 'Gas'}, 'isFavorite': false,
      });
      final toggled = p.copyWith(isFavorite: true);
      expect(toggled.isFavorite, true);
      expect(toggled.id, 1);
      expect(toggled.businessName, 'X');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('ReviewModel + ReviewReplyModel', () {
    test('fromJson — user opcional + replies opcional', () {
      final r = ReviewModel.fromJson({
        'id': 1, 'providerId': 10, 'userId': 5,
        'rating': 5, 'photoUrl': 'p.jpg',
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(r.user, isNull);
      expect(r.replies, isEmpty);
      expect(r.isVisible, true); // default
      expect(r.comment, isNull);
    });

    test('isVisible falso se persiste; photoUrl no-string cae a ""', () {
      final r = ReviewModel.fromJson({
        'id': 1, 'providerId': 10, 'userId': 5,
        'rating': 3, 'isVisible': false,
        'photoUrl': null,
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(r.isVisible, false);
      expect(r.photoUrl, '');
    });

    test('replies se mapean a ReviewReplyModel', () {
      final r = ReviewModel.fromJson({
        'id': 1, 'providerId': 10, 'userId': 5,
        'rating': 4, 'photoUrl': '',
        'createdAt': '2026-01-01T00:00:00Z',
        'replies': [
          {
            'id': 9, 'reviewId': 1, 'userId': 10,
            'content': 'gracias!', 'createdAt': '2026-01-02T00:00:00Z',
          }
        ],
      });
      expect(r.replies, hasLength(1));
      expect(r.replies.first.content, 'gracias!');
      expect(r.replies.first.user, isNull);
    });

    test('ReviewUser.initial vacío usa ?', () {
      const u = ReviewUser(firstName: '', lastName: '');
      expect(u.initial, '?');
      const a = ReviewUser(firstName: 'Ana', lastName: 'P');
      expect(a.initial, 'A');
      expect(a.fullName, 'Ana P');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('ServiceRequestModel + OfferModel + OpportunityModel', () {
    test('status desconocido del backend cae a open (forward compat)', () {
      final r = ServiceRequestModel.fromJson({
        'id': 1, 'userId': 1, 'categoryId': 1,
        'description': 'x',
        'expiresAt': '2026-12-31T00:00:00Z',
        'createdAt': '2026-01-01T00:00:00Z',
        'status': 'CUSTOM_STATUS',
      });
      expect(r.status, ServiceRequestStatus.open);
    });

    test('offers ausentes se mapean como lista vacía', () {
      final r = ServiceRequestModel.fromJson({
        'id': 1, 'userId': 1, 'categoryId': 1,
        'description': 'x',
        'expiresAt': '2026-12-31T00:00:00Z',
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(r.offers, isEmpty);
      expect(r.isFull, false);
      expect(r.maxOffers, 5); // default
    });

    test('isExpired refleja la diferencia con DateTime.now()', () {
      final past = ServiceRequestModel.fromJson({
        'id': 1, 'userId': 1, 'categoryId': 1, 'description': 'x',
        'expiresAt': '2020-01-01T00:00:00Z',
        'createdAt': '2020-01-01T00:00:00Z',
      });
      expect(past.isExpired, true);

      final future = ServiceRequestModel.fromJson({
        'id': 2, 'userId': 1, 'categoryId': 1, 'description': 'x',
        'expiresAt': '2099-01-01T00:00:00Z',
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(future.isExpired, false);
    });

    test('OfferModel: status desconocido cae a pending; avatar fallback a image', () {
      final o = OfferModel.fromJson({
        'id': 1, 'serviceRequestId': 5, 'providerId': 7,
        'price': 100, 'message': 'msg',
        'status': 'FUTURE_STATUS',
        'createdAt': '2026-01-01T00:00:00Z',
        'provider': {
          'businessName': 'Plomería P',
          'averageRating': 4.5,
          'totalReviews': 10,
          'isTrusted': true,
          'images': [{'url': 'cover.jpg'}],
        },
      });
      expect(o.status, OfferStatus.pending);
      expect(o.providerName, 'Plomería P');
      expect(o.providerRating, 4.5);
      expect(o.providerIsTrusted, true);
      expect(o.providerAvatarUrl, 'cover.jpg');
    });

    test('OpportunityModel.isFull es true cuando offersCount alcanza maxOffers', () {
      final full = OpportunityModel.fromJson({
        'id': 1, 'description': 'x',
        'category': {'name': 'Gas'},
        'offersCount': 5, 'maxOffers': 5,
        'expiresAt': '2099-01-01T00:00:00Z',
        'canParticipate': true,
      });
      expect(full.isFull, true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('AppNotification', () {
    test('fromJson lee `body` o `message` (back-compat con BD)', () {
      final viaBody = AppNotification.fromJson({
        'id': 1, 'type': 'NEW_OFFER', 'title': 't',
        'body': 'tienes una oferta',
        'createdAt': '2026-05-01T00:00:00Z',
      });
      expect(viaBody.body, 'tienes una oferta');

      // El endpoint REST devuelve `message` en lugar de `body` + `sentAt`
      // en lugar de `createdAt`.
      final viaMessage = AppNotification.fromJson({
        'id': 2, 'type': 'NEW_OFFER', 'title': 't',
        'message': 'persisted in db',
        'sentAt': '2026-05-01T12:00:00Z',
      });
      expect(viaMessage.body, 'persisted in db');
    });

    test('fromSocket usa avatarUrl o senderAvatarUrl', () {
      final n = AppNotification.fromSocket({
        'type': 'CHAT_MESSAGE', 'title': 'Tienes un mensaje',
        'body': 'hola', 'senderAvatarUrl': 'https://avatar/x',
      });
      expect(n.avatarUrl, 'https://avatar/x');
      expect(n.isRead, false);
    });

    test('type desconocido NO rompe — icon/color caen al default', () {
      final n = AppNotification.fromJson({
        'id': 1, 'type': 'TIPO_FUTURO', 'title': 't', 'body': 'x',
      });
      expect(n.type, 'TIPO_FUTURO');
      // icon y iconColor solo verifican que NO lanzan al evaluar.
      expect(n.icon, isNotNull);
      expect(n.iconColor, isNotNull);
    });

    test('campos faltantes caen a defaults', () {
      final n = AppNotification.fromJson({});
      expect(n.title, 'Notificación');
      expect(n.body, '');
      expect(n.type, 'GENERIC');
      expect(n.isRead, false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  group('Referrals — ReferralStats / ReferralReward / CoinRedemption', () {
    test('ReferralStats.fromJson rellena defaults', () {
      final s = ReferralStats.fromJson({'code': 'ABCD1234'});
      expect(s.code, 'ABCD1234');
      expect(s.coins, 0);
      expect(s.totalInvited, 0);
      expect(s.history, isEmpty);
    });

    test('ReferralReward.fromJson + provider.coverUrl prefiere isCover', () {
      // Importante: usar literales tipados `<dynamic>[...]` para que la
      // List llegue al modelo como `List<dynamic>` — replica fielmente
      // la salida real de `jsonDecode` desde la API (vs un literal
      // tipo-fuerte que Dart inferiría como List<Map<String, Object>>).
      final r = ReferralReward.fromJson(<String, dynamic>{
        'id': 1, 'title': 'Corte', 'description': 'desc',
        'coinsCost': 200, 'isActive': true,
        'provider': <String, dynamic>{
          'id': 5, 'businessName': 'Peluquería',
          'phone': '999', 'averageRating': 4.2,
          'images': <dynamic>[
            <String, dynamic>{'url': 'p1.jpg', 'isCover': false},
            <String, dynamic>{'url': 'p2.jpg', 'isCover': true},
          ],
          'providerCategories': <dynamic>[
            <String, dynamic>{'category': <String, dynamic>{'name': 'Belleza'}},
          ],
        },
      });
      expect(r.provider.coverUrl, 'p2.jpg');
      expect(r.provider.categoryName, 'Belleza');
      expect(r.coinsCost, 200);
    });

    test('CoinRedemption.fromJson — null reward + status PENDING default', () {
      final c = CoinRedemption.fromJson({
        'id': 1, 'plan': 'PREMIUM', 'coinsSpent': 2000,
        'createdAt': '2026-05-01T00:00:00Z',
      });
      expect(c.status, 'PENDING');
      expect(c.reward, isNull);
      expect(c.plan, 'PREMIUM');
    });

    test('ReferralHistory.fromJson maneja invitedProvider null', () {
      final h = ReferralHistory.fromJson({
        'id': 1, 'status': 'APPROVED', 'coinsAwarded': 25,
        'createdAt': '2026-05-01T00:00:00Z',
      });
      expect(h.status, 'APPROVED');
      expect(h.coinsAwarded, 25);
      expect(h.invitedProvider, isNull);
      expect(h.invitedUser, isNull);
    });
  });
}
