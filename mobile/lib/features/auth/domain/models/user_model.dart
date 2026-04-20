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
  // Ubicación del usuario (para filtrar servicios en su zona)
  final String? department;
  final String? province;
  final String? district;

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
    this.department,
    this.province,
    this.district,
  });

  String get fullName => '$firstName $lastName';
  bool get isProvider => role == 'PROVEEDOR';
  bool get isAdmin    => role == 'ADMIN';

  /// true si el usuario tiene al menos el departamento configurado
  bool get hasLocation => department != null && department!.isNotEmpty;

  /// Texto legible de la ubicación, ej: "El Tambo, Huancayo, Junín"
  String get locationLabel {
    final parts = <String>[
      if (district   != null && district!.isNotEmpty)   district!,
      if (province   != null && province!.isNotEmpty)   province!,
      if (department != null && department!.isNotEmpty) department!,
    ];
    return parts.join(', ');
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id:         json['userId'] as int? ?? json['id'] as int,
      email:      json['email'] as String? ?? '',
      firstName:  json['firstName'] as String? ?? '',
      lastName:   json['lastName'] as String? ?? '',
      role:       json['role'] as String? ?? 'USUARIO',
      avatarUrl:  json['avatarUrl'] as String?,
      phone:      json['phone'] as String?,
      dni:        json['dni'] as String?,
      isEmailVerified: json['isEmailVerified'] ?? false,
      department: json['department'] as String?,
      province:   json['province'] as String?,
      district:   json['district'] as String?,
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
    String? department,
    String? province,
    String? district,
  }) {
    return UserModel(
      id:         id,
      email:      email,
      firstName:  firstName ?? this.firstName,
      lastName:   lastName  ?? this.lastName,
      role:       role      ?? this.role,
      avatarUrl:  avatarUrl ?? this.avatarUrl,
      phone:      phone     ?? this.phone,
      dni:        dni       ?? this.dni,
      isEmailVerified: isEmailVerified ?? this.isEmailVerified,
      department: department ?? this.department,
      province:   province   ?? this.province,
      district:   district   ?? this.district,
    );
  }

  Map<String, dynamic> toJson() => {
    'id':         id,
    'email':      email,
    'firstName':  firstName,
    'lastName':   lastName,
    'role':       role,
    'avatarUrl':  avatarUrl,
    'phone':      phone,
    'dni':        dni,
    'department': department,
    'province':   province,
    'district':   district,
  };
}