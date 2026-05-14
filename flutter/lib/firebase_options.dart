// This file provides Firebase configuration for your app
// TODO: Replace these with your actual Firebase project credentials
// Get these from Firebase Console → Project Settings → General

// Placeholder class until packages are installed
// Once firebase_core is installed, use the proper FirebaseOptions import
class DefaultFirebaseOptions {
  static Map<String, dynamic> get web => {
    'apiKey': 'AIzaSyDHWBTQK58t86E30RUOYk7aV0v0XMzhuNQ',
    'appId': '1:235229805745:web:f02dd51e7febbe03e47690',
    'messagingSenderId': 'G-8YJRWS7HGY',
    'projectId': 'flutter-webrtc-app-9db6b',
  };

  static Map<String, dynamic> get android => {
    'apiKey': 'AIzaSyD6sfYsoozisBicHH0h4BrkvEidcPe3-k4',
    'appId': '1:235229805745:android:8122459605dfe7a0e47690',
    'messagingSenderId': '235229805745',
    'projectId': 'flutter-webrtc-app-9db6b',
  };

  static Map<String, dynamic> get ios => {
    'apiKey': 'YOUR_IOS_API_KEY',
    'appId': 'YOUR_IOS_APP_ID',
    'messagingSenderId': 'YOUR_MESSAGING_SENDER_ID',
    'projectId': 'YOUR_PROJECT_ID',
    'iosBundleId': 'com.example.flutterWebrtcDemo',
  };

  static Map<String, dynamic> get currentPlatform {
    // This will be replaced once firebase_core is installed
    // and Platform is available
    return android; // Default to Android
  }
}
