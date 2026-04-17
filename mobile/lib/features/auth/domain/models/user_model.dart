/// Modelo del usuario autenticado
class UserModel {
  final int id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? avatarUrl;
  final String? phone;
  final String? dni;
  final bool isEmailVerified;

  const UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.avatarUrl,
    this.phone,
    this.dni,
    this.isEmailVerified = false,
  });

  String get fullName => '$firstName $lastName';
  bool get isProvider => role == 'PROVEEDOR';
  bool get isAdmin    => role == 'ADMIN';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id:        json['userId'] as int? ?? json['id'] as int,
      email:     json['email'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName:  json['lastName'] as String? ?? '',
      role:      json['role'] as String? ?? 'USUARIO',
      avatarUrl: json['avatarUrl'] as String?,
      phone:     json['phone'] as String?,
      dni:       json['dni'] as String?,
      isEmailVerified: json['isEmailVerified'] ?? false,
    );
  }

  UserModel copyWith({
    String? firstName,
    String? lastName,
    String? role,
    String? dni,
    String? phone,
    String? avatarUrl, 
    bool? isEmailVerified,
  }) {
    return UserModel(
      id:        id,
      email:     email,
      firstName: firstName ?? this.firstName,
      lastName:  lastName  ?? this.lastName,
      role:      role      ?? this.role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      phone:     phone     ?? this.phone,
      dni:       dni       ?? this.dni,
      isEmailVerified: isEmailVerified ?? this.isEmailVerified,
    );
  }

  Map<String, dynamic> toJson() => {
    'id':        id,
    'email':     email,
    'firstName': firstName,
    'lastName':  lastName,
    'role':      role,
    'avatarUrl': avatarUrl,
    'phone':     phone,
    'dni':       dni,
  };
}