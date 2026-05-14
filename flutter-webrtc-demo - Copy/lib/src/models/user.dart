class User {
  final int id;
  final String username;
  final String email;
  final String displayName;
  final String? hobby;
  final String? company;
  final String? location;
  final String? occupation;
  final String? mainOccupation;
  final String role;
  final String? avatar;
  final String? profileVisibility;
  final String? phone;
  final bool? emailPublic;
  final bool? hobbyPublic;
  final bool? companyPublic;
  final bool? locationPublic;
  final bool? phonePublic;
  final bool? occupationPublic;
  final bool? mainOccupationPublic;
  final bool isFriend;
  final bool friendRequestSent;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.displayName,
    this.hobby,
    this.company,
    this.location,
    this.occupation,
    this.mainOccupation,
    required this.role,
    this.avatar,
    this.profileVisibility,
    this.phone,
    this.emailPublic,
    this.hobbyPublic,
    this.companyPublic,
    this.locationPublic,
    this.phonePublic,
    this.occupationPublic,
    this.mainOccupationPublic,
    this.isFriend = false,
    this.friendRequestSent = false,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    // Handle both 'id' and 'ID' fields (WordPress uses 'ID')
    final userId = json['id'] ?? json['ID'];

    // Convert to int if it's a string
    final int id = userId is int ? userId : int.parse(userId.toString());

    return User(
      id: id,
      username: json['username'] as String? ?? json['user_login'] as String? ?? '',
      email: json['email'] as String? ?? json['user_email'] as String? ?? '',
      displayName: json['display_name'] as String? ?? json['user_nicename'] as String? ?? '',
      hobby: json['hobby'] as String?,
      company: json['company'] as String?,
      location: json['location'] as String?,
      occupation: json['occupation'] as String?,
      mainOccupation: json['main_occupation'] as String?,
      role: json['role'] as String? ?? 'user',
      avatar: json['avatar'] as String?,
      profileVisibility: json['profile_visibility'] as String?,
      phone: json['phone'] as String?,
      emailPublic: _parseBool(json['email_public']),
      hobbyPublic: _parseBool(json['hobby_public']),
      companyPublic: _parseBool(json['company_public']),
      locationPublic: _parseBool(json['location_public']),
      phonePublic: _parseBool(json['phone_public']),
      occupationPublic: _parseBool(json['occupation_public']),
      mainOccupationPublic: _parseBool(json['main_occupation_public']),
      isFriend: json['is_friend'] == true || json['is_friend'] == 1 || json['is_friend'] == '1',
      friendRequestSent: json['friend_request_sent'] == true || json['friend_request_sent'] == 1 || json['friend_request_sent'] == '1',
    );
  }

  // Helper to parse bool from various types (bool, int, String)
  static bool? _parseBool(dynamic value) {
    if (value == null) return null;
    if (value is bool) return value;
    if (value is int) return value == 1;
    if (value is String) return value == '1' || value.toLowerCase() == 'true';
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'display_name': displayName,
      'hobby': hobby,
      'company': company,
      'location': location,
      'occupation': occupation,
      'main_occupation': mainOccupation,
      'role': role,
      'avatar': avatar,
      'profile_visibility': profileVisibility,
      'phone': phone,
      'email_public': emailPublic,
      'hobby_public': hobbyPublic,
      'company_public': companyPublic,
      'location_public': locationPublic,
      'phone_public': phonePublic,
      'occupation_public': occupationPublic,
      'main_occupation_public': mainOccupationPublic,
      'is_friend': isFriend,
      'friend_request_sent': friendRequestSent,
    };
  }

  // Helper to check if a field is public (null defaults to public)
  bool isPublic(bool? value) => value == null || value == true;
}
