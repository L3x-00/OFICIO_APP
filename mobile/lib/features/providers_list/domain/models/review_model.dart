/// Modelo de una respuesta a reseña
class ReviewReplyModel {
  final int id;
  final int reviewId;
  final int userId;
  final String content;
  final String? photoUrl;
  final DateTime createdAt;
  final ReviewUser? user;

  const ReviewReplyModel({
    required this.id,
    required this.reviewId,
    required this.userId,
    required this.content,
    this.photoUrl,
    required this.createdAt,
    this.user,
  });

  factory ReviewReplyModel.fromJson(Map<String, dynamic> json) {
    return ReviewReplyModel(
      id:        json['id'] as int,
      reviewId:  json['reviewId'] as int,
      userId:    json['userId'] as int,
      content:   json['content'] as String,
      photoUrl:  json['photoUrl'] as String?,
      createdAt: _parseDate(json['createdAt']),
      user: json['user'] is Map<String, dynamic>
          ? ReviewUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
    );
  }

  static DateTime _parseDate(dynamic value) {
    if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
    return DateTime.now();
  }
}

/// Modelo de una reseña
class ReviewModel {
  final int id;
  final int providerId;
  final int userId;
  final int rating;
  final String? comment;
  final String photoUrl;
  final bool isVisible;
  final DateTime createdAt;
  final ReviewUser? user;
  final List<ReviewReplyModel> replies;

  const ReviewModel({
    required this.id,
    required this.providerId,
    required this.userId,
    required this.rating,
    this.comment,
    required this.photoUrl,
    required this.isVisible,
    required this.createdAt,
    this.user,
    this.replies = const [],
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id:         json['id'] as int,
      providerId: json['providerId'] as int,
      userId:     json['userId'] as int,
      rating:     json['rating'] as int,
      comment:    json['comment'] as String?,
      photoUrl:   json['photoUrl'] is String ? json['photoUrl'] as String : '',
      isVisible:  json['isVisible'] as bool? ?? true,
      createdAt:  _parseDate(json['createdAt']),
      user: json['user'] is Map<String, dynamic>
          ? ReviewUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      replies: json['replies'] is List
          ? (json['replies'] as List)
              .map((r) => ReviewReplyModel.fromJson(r as Map<String, dynamic>))
              .toList()
          : const [],
    );
  }

  static DateTime _parseDate(dynamic value) {
    if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
    return DateTime.now();
  }

  ReviewModel copyWithReplies(List<ReviewReplyModel> replies) {
    return ReviewModel(
      id: id,
      providerId: providerId,
      userId: userId,
      rating: rating,
      comment: comment,
      photoUrl: photoUrl,
      isVisible: isVisible,
      createdAt: createdAt,
      user: user,
      replies: replies,
    );
  }
}

class ReviewUser {
  final String firstName;
  final String lastName;
  final String? avatarUrl;

  const ReviewUser({
    required this.firstName,
    required this.lastName,
    this.avatarUrl,
  });

  String get fullName => '$firstName $lastName';
  String get initial => firstName.isNotEmpty ? firstName[0].toUpperCase() : '?';

  factory ReviewUser.fromJson(Map<String, dynamic> json) {
    return ReviewUser(
      firstName: json['firstName'] as String,
      lastName:  json['lastName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}
