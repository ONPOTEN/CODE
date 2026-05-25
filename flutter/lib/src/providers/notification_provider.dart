import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/notification.dart';
import '../models/user.dart';
import '../services/notification_service.dart';
import '../services/user_service.dart';
import '../services/socket_service.dart';
import '../services/auth_storage.dart';

class NotificationProvider extends ChangeNotifier {
  int _unreadCount = 0;
  List<NotificationModel> _notifications = [];
  Map<int, User> _userCache = {};
  bool _isLoading = false;
  StreamSubscription? _socketSubscription;

  int get unreadCount => _unreadCount;
  List<NotificationModel> get notifications => _notifications;
  Map<int, User> get userCache => _userCache;
  bool get isLoading => _isLoading;

  NotificationProvider() {
    _initSocketListener();
  }

  void _initSocketListener() {
    _socketSubscription = SocketService().notificationStream.listen((data) async {
      try {
        final currentUserId = await AuthStorage.getUserId();
        
        // Match Next.js logic: check if notification is for me
        if (currentUserId != null && data['ownid'] == currentUserId) {
          final notification = NotificationModel.fromJson(data);
          
          _notifications.insert(0, notification);
          _unreadCount++;
          
          // Pre-fetch user if not cached
          if (!_userCache.containsKey(notification.userid)) {
            await fetchUser(notification.userid);
          }
          
          notifyListeners();
        }
      } catch (e) {
        print('NotificationProvider Error parsing socket data: $e');
      }
    });
  }

  Future<void> fetchCount() async {
    final result = await NotificationService.getNotificationCount();
    if (result['success'] == true) {
      _unreadCount = result['count'] ?? 0;
      notifyListeners();
    }
  }

  Future<void> fetchNotifications({int perPage = 50}) async {
    _isLoading = true;
    notifyListeners();

    final result = await NotificationService.getNotifications(perPage: perPage);
    if (result['success'] == true) {
      _notifications = result['notifications'] ?? [];
      
      // Calculate unread count manually if need be
      _unreadCount = _notifications.where((n) => n.status == 0).length;
      
      // Fetch missing users
      await _fetchMissingUsers();
    }
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> _fetchMissingUsers() async {
    final missingIds = _notifications
        .map((n) => n.userid)
        .where((id) => !_userCache.containsKey(id))
        .toSet()
        .toList();

    if (missingIds.isEmpty) return;

    for (final id in missingIds) {
      await fetchUser(id);
    }
  }

  Future<void> fetchUser(int userId) async {
    if (_userCache.containsKey(userId)) return;

    try {
      final result = await UserService.getUserById(userId);
      if (result['success'] == true && result['user'] != null) {
        _userCache[userId] = result['user'];
        notifyListeners();
      }
    } catch (e) {
      print('Failed to fetch user $userId: $e');
    }
  }

  Future<void> markAsRead(int id) async {
    // Optimistic update
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1 && _notifications[index].status == 0) {
      _notifications[index] = _notifications[index].copyWith(status: 1);
      _unreadCount = (_unreadCount > 0) ? _unreadCount - 1 : 0;
      notifyListeners();

      final result = await NotificationService.markAsRead(id);
      if (result['success'] != true) {
        // Revert if failed
        _notifications[index] = _notifications[index].copyWith(status: 0);
        _unreadCount++;
        notifyListeners();
      }
    }
  }

  Future<void> markAllAsRead() async {
    final originalNotifications = List<NotificationModel>.from(_notifications);
    final originalCount = _unreadCount;

    // Optimistic update
    _notifications = _notifications.map((n) => n.copyWith(status: 1)).toList();
    _unreadCount = 0;
    notifyListeners();

    final result = await NotificationService.markAllAsRead();
    if (result['success'] != true) {
      // Revert if failed
      _notifications = originalNotifications;
      _unreadCount = originalCount;
      notifyListeners();
    }
  }

  User? getUser(int userId) {
    return _userCache[userId];
  }

  @override
  void dispose() {
    _socketSubscription?.cancel();
    super.dispose();
  }
}
