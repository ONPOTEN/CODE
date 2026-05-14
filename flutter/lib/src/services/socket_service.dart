import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/message.dart';
import 'auth_storage.dart';

class SocketService {
  static SocketService? _instance;
  IO.Socket? _socket;

  bool _isDisposed = false;
  bool get isDisposed => _isDisposed;

  // Stream controllers
  final _messageController = StreamController<Message>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  final _callController = StreamController<Map<String, dynamic>>.broadcast();

  // Getters for streams
  Stream<Message> get messageStream => _messageController.stream;
  Stream<Map<String, dynamic>> get typingStream => _typingController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;
  Stream<Map<String, dynamic>> get callStream => _callController.stream;

  // Singleton pattern
  factory SocketService() {
    _instance ??= SocketService._internal();
    return _instance!;
  }

  SocketService._internal();

  bool get isConnected => _socket?.connected ?? false;

  /// Wait for socket connection with timeout
  Future<void> _waitForConnection({Duration timeout = const Duration(seconds: 10)}) async {
    if (_socket?.connected ?? false) {
      return;
    }

    final startTime = DateTime.now();
    while (!(_socket?.connected ?? false)) {
      if (DateTime.now().difference(startTime) > timeout) {
        throw TimeoutException('Socket connection timeout after ${timeout.inSeconds}s');
      }
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }

  Future<void> connect(String serverUrl) async {
    if (_socket != null && _socket!.connected) {
      return;
    }

    final userId = await AuthStorage.getUserId();
    print('SocketService - Connecting to: $serverUrl');
    print('SocketService - User ID: $userId');

    _socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .setReconnectionAttempts(5)
          .build(),
    );

    _socket!.onConnect((_) {
      if (_isDisposed) return;
      print('SocketService - Socket connected: ${_socket!.id}');
      if (!_connectionController.isClosed) {
        _connectionController.add(true);
      }

      // Register user with socket server (matching Next.js implementation)
      if (userId != null) {
        print('SocketService - Registering user: $userId');
        _socket!.emit('chat:register', {'userId': userId});
      }
    });

    _socket!.onDisconnect((_) {
      if (_isDisposed) return;
      print('SocketService - Socket disconnected');
      if (!_connectionController.isClosed) {
        _connectionController.add(false);
      }
    });

    _socket!.onConnectError((data) {
      if (_isDisposed) return;
      print('SocketService - Connect error: $data');
      if (!_connectionController.isClosed) {
        _connectionController.add(false);
      }
    });

    _socket!.onError((data) {
      print('SocketService - Socket error: $data');
    });

    // Listen for new messages (matching videopeer backend: 'new:message')
    _socket!.on('new:message', (data) {
      if (_isDisposed) return;
      try {
        print('SocketService - Received new:message: $data');
        final message = Message.fromJson(data);
        if (!_messageController.isClosed) {
          _messageController.add(message);
        }
      } catch (e) {
        print('SocketService - Error parsing new:message: $e');
      }
    });

    // Listen for typing indicators (matching videopeer backend: 'user:typing')
    _socket!.on('user:typing', (data) {
      if (_isDisposed) return;
      print('SocketService - User typing: $data');
      if (!_typingController.isClosed) {
        _typingController.add(data);
      }
    });

    // Listen for online status updates (for presence indicators)
    _socket!.on('user:online-status', (data) {
      if (_isDisposed) return;
      print('SocketService - User online status: $data');
      if (!_typingController.isClosed) {
        _typingController.add({
          ...data,
          'type': 'online-status',
        });
      }
    });

    // Listen for message read receipts
    _socket!.on('chat:message-read', (data) {
      if (_isDisposed) return;
      print('SocketService - Message read receipt: $data');
      if (!_typingController.isClosed) {
        _typingController.add({
          ...data,
          'type': 'message-read',
        });
      }
    });

    // Listen for room join events
    _socket!.on('user:joined-room', (data) {
      print('SocketService - User joined room: $data');
    });

    // Listen for room leave events
    _socket!.on('user:left-room', (data) {
      print('SocketService - User left room: $data');
    });

    // Listen for video call events (matching videopeer backend)
    _socket!.on('user:joined', (data) {
      if (_isDisposed) return;
      print('SocketService - User joined video room: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'user:joined',
          'data': data,
        });
      }
    });

    _socket!.on('room:join', (data) {
      if (_isDisposed) return;
      print('SocketService - Room joined: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'room:join',
          'data': data,
        });
      }
    });

    _socket!.on('incoming:call', (data) {
      if (_isDisposed) return;
      print('SocketService - Incoming call: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'incoming:call',
          'data': data,
        });
      }
    });

    _socket!.on('call:accepted', (data) {
      if (_isDisposed) return;
      print('SocketService - Call accepted: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'call:accepted',
          'data': data,
        });
      }
    });

    _socket!.on('call:end', (data) {
      if (_isDisposed) return;
      print('SocketService - Call ended: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'call:end',
          'data': data,
        });
      }
    });

    _socket!.on('call:initiated', (data) {
      if (_isDisposed) return;
      print('SocketService - Call initiated: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'call:initiated',
          'data': data,
        });
      }
    });

    // WebRTC signaling events (matching videopeer backend)
    _socket!.on('peer:nego:needed', (data) {
      if (_isDisposed) return;
      print('SocketService - Peer negotiation needed: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'peer:nego:needed',
          'data': data,
        });
      }
    });

    _socket!.on('peer:nego:final', (data) {
      if (_isDisposed) return;
      print('SocketService - Peer negotiation final: $data');
      if (!_callController.isClosed) {
        _callController.add({
          'type': 'peer:nego:final',
          'data': data,
        });
      }
    });

    _socket!.connect();

    // Wait for connection to be established
    try {
      await _waitForConnection();
      print('SocketService - Connection established successfully');
    } catch (e) {
      print('SocketService - Failed to establish connection: $e');
      rethrow;
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  // Join chat room (matching videopeer backend: 'chat:join-room')
  void joinChatRoom(String roomName) {
    if (_socket?.connected == true) {
      print('SocketService - Joining chat room: $roomName');
      _socket!.emit('chat:join-room', {'roomName': roomName});
    } else {
      print('SocketService - Cannot join room, socket not connected');
    }
  }

  // Leave chat room (matching videopeer backend: 'chat:leave-room')
  void leaveChatRoom(String roomName) {
    if (_socket?.connected == true) {
      print('SocketService - Leaving chat room: $roomName');
      _socket!.emit('chat:leave-room', {'roomName': roomName});
    } else {
      print('SocketService - Cannot leave room, socket not connected');
    }
  }

  // Send message (matching videopeer backend: 'chat:message')
  // Note: The backend will emit 'new:message' to the room
  void sendChatMessage({
    required String roomName,
    required int recipientId,
    required Map<String, dynamic> messageData,
  }) {
    if (_socket?.connected == true) {
      print('SocketService - Sending message to room: $roomName');
      _socket!.emit('chat:message', {
        'roomName': roomName,
        'recipientId': recipientId,
        ...messageData,
      });
    } else {
      print('SocketService - Cannot send message, socket not connected');
    }
  }

  // Send typing indicator (matching videopeer backend: 'chat:typing')
  void sendTyping({
    required String roomName,
    required int userId,
    required bool isTyping,
  }) {
    if (_socket?.connected == true) {
      print('SocketService - Sending typing indicator: isTyping=$isTyping');
      _socket!.emit('chat:typing', {
        'roomName': roomName,
        'userId': userId,
        'isTyping': isTyping,
      });
    }
  }

  // Mark message as read
  void markMessageAsRead({
    required String roomName,
    required int messageId,
  }) {
    if (_socket?.connected == true) {
      print('SocketService - Marking message as read: $messageId');
      _socket!.emit('chat:message-read', {
        'roomName': roomName,
        'messageId': messageId,
      });
    }
  }

  // Notify online status (for presence indicators)
  void updateOnlineStatus({
    required bool isOnline,
  }) {
    if (_socket?.connected == true) {
      print('SocketService - Updating online status: isOnline=$isOnline');
      _socket!.emit('user:online-status', {
        'isOnline': isOnline,
      });
    }
  }

  // Video call methods (matching videopeer backend)

  // Join video room (matching videopeer backend: 'room:join')
  void joinVideoRoom({required String email, required String room}) {
    if (_socket?.connected == true) {
      print('SocketService - Joining video room: $room with email: $email');
      _socket!.emit('room:join', {
        'email': email,
        'room': room,
      });
    } else {
      print('SocketService - Cannot join video room, socket not connected');
    }
  }

  // Initiate call (matching videopeer backend: 'user:call')
  void initiateCall({required String to, required Map<String, dynamic> offer}) {
    if (_socket?.connected == true) {
      print('SocketService - Initiating call to: $to');
      _socket!.emit('user:call', {
        'to': to,
        'offer': offer,
      });
    } else {
      print('SocketService - Cannot initiate call, socket not connected');
    }
  }

  // Accept call (matching videopeer backend: 'call:accepted')
  void acceptCall({required String to, required Map<String, dynamic> ans}) {
    if (_socket?.connected == true) {
      print('SocketService - Accepting call to: $to');
      _socket!.emit('call:accepted', {
        'to': to,
        'ans': ans,
      });
    } else {
      print('SocketService - Cannot accept call, socket not connected');
    }
  }

  // End call (matching videopeer backend: 'call:end')
  void endCall({required String to}) {
    if (_socket?.connected == true) {
      print('SocketService - Ending call with: $to');
      _socket!.emit('call:end', {
        'to': to,
      });
    } else {
      print('SocketService - Cannot end call, socket not connected');
    }
  }

  // Initiated call notification (matching videopeer backend: 'call:initiated')
  void notifyCallInitiated({required String to}) {
    if (_socket?.connected == true) {
      print('SocketService - Notifying call initiated to: $to');
      _socket!.emit('call:initiated', {
        'to': to,
      });
    }
  }

  // WebRTC signaling (matching videopeer backend)

  // Peer negotiation needed (matching videopeer backend: 'peer:nego:needed')
  void sendPeerNegoNeeded({required String to, required Map<String, dynamic> offer}) {
    if (_socket?.connected == true) {
      print('SocketService - Sending peer negotiation needed to: $to');
      _socket!.emit('peer:nego:needed', {
        'to': to,
        'offer': offer,
      });
    }
  }

  // Peer negotiation done (matching videopeer backend: 'peer:nego:done')
  void sendPeerNegoDone({required String to, required Map<String, dynamic> ans}) {
    if (_socket?.connected == true) {
      print('SocketService - Sending peer negotiation done to: $to');
      _socket!.emit('peer:nego:done', {
        'to': to,
        'ans': ans,
      });
    }
  }

  Future<void> dispose() async {
    if (_isDisposed) return;

    print('SocketService - Disposing');
    _isDisposed = true;

    disconnect();

    // Close all stream controllers
    if (!_messageController.isClosed) {
      await _messageController.close();
    }
    if (!_typingController.isClosed) {
      await _typingController.close();
    }
    if (!_connectionController.isClosed) {
      await _connectionController.close();
    }
    if (!_callController.isClosed) {
      await _callController.close();
    }

    print('SocketService - Disposed successfully');
  }
}
