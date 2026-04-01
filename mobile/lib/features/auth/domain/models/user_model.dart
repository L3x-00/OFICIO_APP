/// Modelo del usuario autenticado
class UserModel {
  final int id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? avatarUrl;
  final String? phone;

  const UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.avatarUrl,
    this.phone,
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
  };
}