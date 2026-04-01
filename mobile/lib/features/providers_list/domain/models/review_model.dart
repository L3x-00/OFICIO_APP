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
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id:         json['id'] as int,
      providerId: json['providerId'] as int,
      userId:     json['userId'] as int,
      rating:     json['rating'] as int,
      comment:    json['comment'] as String?,
      photoUrl:   json['photoUrl'] as String,
      isVisible:  json['isVisible'] as bool? ?? true,
      createdAt:  DateTime.parse(json['createdAt'] as String),
      user: json['user'] != null
          ? ReviewUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
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