/// Modelos del sistema de referidos.
class ReferralStats {
  final String code;
  final int coins;
  final int totalInvited;
  final int approvedInvited;
  final int pendingInvited;
  final List<ReferralHistory> history;

  ReferralStats({
    required this.code,
    required this.coins,
    required this.totalInvited,
    required this.approvedInvited,
    required this.pendingInvited,
    required this.history,
  });

  factory ReferralStats.fromJson(Map<String, dynamic> json) {
    return ReferralStats(
      code: json['code'] as String? ?? '',
      coins: json['coins'] as int? ?? 0,
      totalInvited: json['totalInvited'] as int? ?? 0,
      approvedInvited: json['approvedInvited'] as int? ?? 0,
      pendingInvited: json['pendingInvited'] as int? ?? 0,
      history: (json['history'] as List<dynamic>? ?? [])
          .map((e) => ReferralHistory.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ReferralHistory {
  final int id;
  final String status; // PENDING | APPROVED | REJECTED
  final int coinsAwarded;
  final DateTime createdAt;
  final DateTime? approvedAt;
  final ReferralUser? invitedUser;
  final ReferralProvider? invitedProvider;

  ReferralHistory({
    required this.id,
    required this.status,
    required this.coinsAwarded,
    required this.createdAt,
    this.approvedAt,
    this.invitedUser,
    this.invitedProvider,
  });

  factory ReferralHistory.fromJson(Map<String, dynamic> json) {
    return ReferralHistory(
      id: json['id'] as int,
      status: json['status'] as String? ?? 'PENDING',
      coinsAwarded: json['coinsAwarded'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      approvedAt: json['approvedAt'] == null
          ? null
          : DateTime.tryParse(json['approvedAt'].toString()),
      invitedUser: json['invitedUser'] == null
          ? null
          : ReferralUser.fromJson(json['invitedUser'] as Map<String, dynamic>),
      invitedProvider: json['invitedProvider'] == null
          ? null
          : ReferralProvider.fromJson(
              json['invitedProvider'] as Map<String, dynamic>),
    );
  }
}

class ReferralUser {
  final int id;
  final String firstName;
  final String lastName;
  final String? avatarUrl;

  ReferralUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.avatarUrl,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory ReferralUser.fromJson(Map<String, dynamic> json) {
    return ReferralUser(
      id: json['id'] as int,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}

class ReferralProvider {
  final int id;
  final String businessName;
  final String type;
  final String verificationStatus;

  ReferralProvider({
    required this.id,
    required this.businessName,
    required this.type,
    required this.verificationStatus,
  });

  factory ReferralProvider.fromJson(Map<String, dynamic> json) {
    return ReferralProvider(
      id: json['id'] as int,
      businessName: json['businessName'] as String? ?? '',
      type: json['type'] as String? ?? 'OFICIO',
      verificationStatus: json['verificationStatus'] as String? ?? 'PENDIENTE',
    );
  }
}

/// Servicio canjeable definido por el admin.
class ReferralReward {
  final int id;
  final String title;
  final String description;
  final int coinsCost;
  final bool isActive;
  final RewardProvider provider;

  ReferralReward({
    required this.id,
    required this.title,
    required this.description,
    required this.coinsCost,
    required this.isActive,
    required this.provider,
  });

  factory ReferralReward.fromJson(Map<String, dynamic> json) {
    return ReferralReward(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      coinsCost: json['coinsCost'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      provider: RewardProvider.fromJson(
        (json['provider'] as Map<String, dynamic>?) ?? {},
      ),
    );
  }
}

class RewardProvider {
  final int id;
  final String businessName;
  final String? phone;
  final String? whatsapp;
  final double averageRating;
  final String? coverUrl;
  final String? categoryName;

  RewardProvider({
    required this.id,
    required this.businessName,
    this.phone,
    this.whatsapp,
    this.averageRating = 0,
    this.coverUrl,
    this.categoryName,
  });

  factory RewardProvider.fromJson(Map<String, dynamic> json) {
    final images = json['images'] as List<dynamic>? ?? [];
    String? cover;
    if (images.isNotEmpty) {
      final coverImg = images.firstWhere(
        (img) =>
            img is Map<String, dynamic> && img['isCover'] == true,
        orElse: () => images.first,
      );
      if (coverImg is Map<String, dynamic>) cover = coverImg['url'] as String?;
    }
    return RewardProvider(
      id: json['id'] as int? ?? 0,
      businessName: json['businessName'] as String? ?? '',
      phone: json['phone'] as String?,
      whatsapp: json['whatsapp'] as String?,
      averageRating:
          (json['averageRating'] as num?)?.toDouble() ?? 0,
      coverUrl: cover,
      categoryName: (json['category'] as Map<String, dynamic>?)?['name']
          as String?,
    );
  }
}

/// Canje del usuario.
class CoinRedemption {
  final int id;
  final int? rewardId;
  final String? plan;
  final int coinsSpent;
  final String status; // PENDING | COMPLETED | CANCELLED
  final DateTime createdAt;
  final ReferralReward? reward;

  CoinRedemption({
    required this.id,
    this.rewardId,
    this.plan,
    required this.coinsSpent,
    required this.status,
    required this.createdAt,
    this.reward,
  });

  factory CoinRedemption.fromJson(Map<String, dynamic> json) {
    return CoinRedemption(
      id: json['id'] as int,
      rewardId: json['rewardId'] as int?,
      plan: json['plan'] as String?,
      coinsSpent: json['coinsSpent'] as int? ?? 0,
      status: json['status'] as String? ?? 'PENDING',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      reward: json['reward'] == null
          ? null
          : ReferralReward.fromJson(json['reward'] as Map<String, dynamic>),
    );
  }
}
