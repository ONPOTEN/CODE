class ApiConfig {
  // Change this to your Laravel API base URL
  // For Android Emulator: Use api.centimet2.com
  // For iOS Simulator: Use localhost:8000 or 127.0.0.1:8000
  // For Physical Device: Use your computer's IP address (e.g., 192.168.1.100:8000)
  // For Web: Use localhost:8000
  static const String baseUrl = 'https://api.centimet2.com/api/v1';

  // Base URL for static files (images, etc.)
  // This should match the APP_URL in your Laravel .env file
  static const String storageBaseUrl = 'https://api.centimet2.com';

  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String logoutEndpoint = '/auth/logout';
  static const String userEndpoint = '/user';
  static const String updateProfileEndpoint = '/user/update';

  // Timeout duration
  static const Duration timeout = Duration(seconds: 30);

  // Get full URL
  static String getUrl(String endpoint) {
    return '$baseUrl$endpoint';
  }

  // Convert image URL from localhost to proper host
  static String getImageUrl(String imageUrl) {
    // If the URL contains localhost, replace it with the storage base URL
    if (imageUrl.contains('localhost:8000')) {
      return imageUrl.replaceFirst('http://localhost:8000', storageBaseUrl);
    }
    if (imageUrl.contains('127.0.0.1:8000')) {
      return imageUrl.replaceFirst('http://127.0.0.1:8000', storageBaseUrl);
    }
    // If it's already a full URL with proper host, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If it's a relative path, prepend the storage base URL
    return '$storageBaseUrl/$imageUrl';
  }
}
