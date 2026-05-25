import 'dart:core';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'src/services/auth_service.dart';
import 'src/services/auth_storage.dart';
import 'src/services/socket_service.dart';
import 'src/services/api_config.dart';
import 'src/providers/auth_provider.dart';
import 'src/providers/engagement_provider.dart';
import 'src/providers/notification_provider.dart';
import 'src/screens/combined_login_screen.dart';
import 'src/screens/unified_login_screen.dart';
import 'src/screens/enhanced_login_screen.dart';
import 'src/screens/main_screen.dart';
import 'src/screens/create_post_screen.dart';
import 'src/screens/my_posts_screen.dart';
import 'src/screens/my_wall_screen.dart';
import 'src/screens/posts_feed_screen.dart';
import 'src/screens/firebase_phone_password_setup_screen.dart';
import 'src/screens/firebase_forgot_password_screen.dart';
import 'src/screens/groups_list_screen.dart';
import 'src/screens/group_detail_screen.dart';
import 'src/screens/group_post_detail_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (will work after flutter pub get)
  try {
    // Dynamic import to handle Firebase when packages are installed
    final Firebase = await _initializeFirebase();
    if (Firebase != null) {
      print('Main - Firebase initialized successfully');
    }
  } catch (e) {
    print('Main - Firebase initialization (optional): $e');
    // App will continue without Firebase - traditional auth still works
  }

  runApp(MyApp());
}

// Safely initialize Firebase when packages are available
Future<dynamic> _initializeFirebase() async {
  try {
    // This will only work after 'flutter pub get' installs Firebase packages
    // For now, we skip it
    return null;
  } catch (e) {
    print('Firebase packages not yet installed: $e');
    return null;
  }
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => AuthProvider()),
        ChangeNotifierProvider(create: (context) => EngagementProvider()),
        ChangeNotifierProvider(create: (context) => NotificationProvider()),
      ],
      child: MaterialApp(
        title: 'Flutter WebRTC Demo',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        debugShowCheckedModeBanner: false,
        home: AuthWrapper(),
        routes: {
          '/login': (context) => EnhancedLoginScreen(),
          '/unified-login': (context) => UnifiedLoginScreen(),
          '/combined-login': (context) => CombinedLoginScreen(),
          '/home': (context) => MainScreen(),
          '/posts-feed': (context) => const PostsFeedScreen(),
          '/create-post': (context) => const CreatePostScreen(),
          '/my-posts': (context) => const MyPostsScreen(),
          '/my-wall': (context) => const MyWallScreen(),
          '/firebase-phone-password-setup': (context) {
            final phoneNumber = ModalRoute.of(context)?.settings.arguments as String?;
            return FirebasePhonePasswordSetupScreen(
              phoneNumber: phoneNumber ?? '+1234567890',
            );
          },
          '/firebase-forgot-password': (context) => FirebaseForgotPasswordScreen(),
          '/groups': (context) => const GroupsListScreen(),
          '/group': (context) {
            final groupId = ModalRoute.of(context)?.settings.arguments as int?;
            return GroupDetailScreen(groupId: groupId ?? 0);
          },
          '/group-post': (context) {
            final postId = ModalRoute.of(context)?.settings.arguments as int?;
            return GroupPostDetailScreen(postId: postId ?? 0);
          },
        },
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  @override
  _AuthWrapperState createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isLoading = true;
  bool _isAuthenticated = false;
  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final isAuthenticated = await AuthService.isAuthenticated();

    // Connect to Socket.IO and initialize EngagementProvider if authenticated
    if (isAuthenticated) {
      // TODO: Update this URL to match your videopeer backend URL
      // For Android emulator: http://10.0.2.2:3000
      // For physical device: http://YOUR_IP:3000
      const socketUrl = 'https://socket.centimet2.com';
      print('Main - Connecting to Socket.IO: $socketUrl');
      await _socketService.connect(socketUrl);

      // Initialize EngagementProvider with API credentials
      final token = await AuthStorage.getToken();
      if (mounted && token != null) {
        final engagementProvider = context.read<EngagementProvider>();
        // EngagementService expects base URL without /api/v1
        final baseUrlWithoutApi = ApiConfig.baseUrl.replaceAll('/api/v1', '');
        await engagementProvider.initialize(
          apiUrl: baseUrlWithoutApi,
          socketUrl: socketUrl,
          token: token,
        );
        print('Main - EngagementProvider initialized');

        // Fetch initial notification count
        final notificationProvider = context.read<NotificationProvider>();
        await notificationProvider.fetchCount();
      }
    }

    setState(() {
      _isAuthenticated = isAuthenticated;
      _isLoading = false;
    });
  }

  @override
  void dispose() {
    // Dispose SocketService asynchronously
    _socketService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return _isAuthenticated ? MainScreen() : EnhancedLoginScreen();
  }
}
