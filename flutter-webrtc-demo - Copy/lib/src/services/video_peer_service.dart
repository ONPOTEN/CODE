import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'socket_service.dart';

class VideoPeerService {
  static VideoPeerService? _instance;

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  final _localStreamController = StreamController<MediaStream>.broadcast();
  final _remoteStreamController = StreamController<MediaStream>.broadcast();
  final _callStateController = StreamController<CallState>.broadcast();

  Stream<MediaStream> get localStreamStream => _localStreamController.stream;
  Stream<MediaStream> get remoteStreamStream => _remoteStreamController.stream;
  Stream<CallState> get callStateStream => _callStateController.stream;

  bool _callActive = false;
  bool get isCallActive => _callActive;

  bool _isDisposed = false;
  bool get isDisposed => _isDisposed;

  String? _remoteSocketId;
  String? _localEmail;

  // Getter to check if remote user is available
  bool get hasRemoteUser => _remoteSocketId != null;
  String? get remoteSocketId => _remoteSocketId;

  final SocketService _socketService = SocketService();
  StreamSubscription? _socketEventSubscription;

  // Factory constructor
  factory VideoPeerService() {
    _instance ??= VideoPeerService._internal();
    return _instance!;
  }

  VideoPeerService._internal();

  /// Initialize video peer service and setup socket listeners
  Future<void> initialize({
    required String email,
    String serverUrl = 'https://socket.centimet2.com',
  }) async {
    if (_isDisposed) {
      print('VideoPeerService - Cannot initialize after dispose');
      return;
    }

    _localEmail = email;

    // Connect socket if not already connected
    if (!_socketService.isConnected) {
      await _socketService.connect(serverUrl);
    }

    // Listen for socket events and store subscription for cleanup
    _socketEventSubscription = _socketService.callStream.listen(_handleSocketEvent);
  }

  /// Handle socket events from backend
  void _handleSocketEvent(Map<String, dynamic> event) {
    final type = event['type'];
    final data = event['data'];

    print('VideoPeerService - Handling socket event: $type');

    switch (type) {
      case 'user:joined':
        _handleUserJoined(data);
        break;
      case 'room:join':
        _handleRoomJoin(data);
        break;
      case 'incoming:call':
        _handleIncomingCall(data);
        break;
      case 'call:accepted':
        _handleCallAccepted(data);
        break;
      case 'peer:nego:needed':
        _handlePeerNegoNeeded(data);
        break;
      case 'peer:nego:final':
        _handlePeerNegoFinal(data);
        break;
      case 'call:end':
        _handleCallEnd(data);
        break;
      case 'call:initiated':
        _handleCallInitiated(data);
        break;
    }
  }

  /// Handle user joined event - when remote user joins the room
  void _handleUserJoined(Map<String, dynamic> data) {
    if (_isDisposed) return;
    print('VideoPeerService - Remote user joined: $data');
    _remoteSocketId = data['id'];
    if (!_callStateController.isClosed) {
      _callStateController.add(CallState.remoteUserJoined);
    }
  }

  /// Handle room join confirmation
  void _handleRoomJoin(Map<String, dynamic> data) {
    if (_isDisposed) return;
    print('VideoPeerService - Room join confirmed: $data');
    if (!_callStateController.isClosed) {
      _callStateController.add(CallState.roomJoined);
    }
  }

  /// Handle incoming call from remote peer
  Future<void> _handleIncomingCall(Map<String, dynamic> data) async {
    if (_isDisposed) return;
    try {
      print('VideoPeerService - Incoming call from: ${data['from']}');
      _remoteSocketId = data['from'];

      final offerData = data['offer'];

      // Create peer connection if needed
      if (_peerConnection == null) {
        await _createPeerConnection();
      }

      // Get local stream if not already created
      if (_localStream == null) {
        await getLocalStream();
      }

      // Set remote description (the offer from remote peer)
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(offerData['sdp'], offerData['type']),
      );

      // Create answer
      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      // Send answer back
      _socketService.acceptCall(
        to: _remoteSocketId!,
        ans: {
          'sdp': answer.sdp,
          'type': answer.type,
        },
      );

      _callActive = true;
      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.connected);
      }
    } catch (e) {
      print('VideoPeerService - Error handling incoming call: $e');
      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.error);
      }
    }
  }

  /// Handle call acceptance from remote peer
  Future<void> _handleCallAccepted(Map<String, dynamic> data) async {
    if (_isDisposed) return;
    try {
      print('VideoPeerService - Call accepted');

      final answerData = data['ans'];

      // Set remote description (the answer from remote peer)
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(answerData['sdp'], answerData['type']),
      );

      _callActive = true;
      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.connected);
      }
    } catch (e) {
      print('VideoPeerService - Error handling call acceptance: $e');
      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.error);
      }
    }
  }

  /// Handle peer negotiation needed
  Future<void> _handlePeerNegoNeeded(Map<String, dynamic> data) async {
    if (_isDisposed) return;
    try {
      print('VideoPeerService - Peer negotiation needed');

      final offerData = data['offer'];

      if (_peerConnection == null) {
        return;
      }

      // Set remote description
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(offerData['sdp'], offerData['type']),
      );

      // Create answer
      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      // Send answer
      _socketService.sendPeerNegoDone(
        to: _remoteSocketId!,
        ans: {
          'sdp': answer.sdp,
          'type': answer.type,
        },
      );
    } catch (e) {
      print('VideoPeerService - Error handling peer negotiation: $e');
    }
  }

  /// Handle peer negotiation final
  Future<void> _handlePeerNegoFinal(Map<String, dynamic> data) async {
    if (_isDisposed) return;
    try {
      print('VideoPeerService - Peer negotiation final');

      final answerData = data['ans'];

      if (_peerConnection == null) {
        return;
      }

      // Set remote description
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(answerData['sdp'], answerData['type']),
      );
    } catch (e) {
      print('VideoPeerService - Error handling peer negotiation final: $e');
    }
  }

  /// Handle call end
  void _handleCallEnd(Map<String, dynamic> data) {
    if (_isDisposed) return;
    print('VideoPeerService - Call ended');
    _callActive = false;
    if (!_callStateController.isClosed) {
      _callStateController.add(CallState.ended);
    }
  }

  /// Handle call initiated (caller side notification)
  void _handleCallInitiated(Map<String, dynamic> data) {
    if (_isDisposed) return;
    print('VideoPeerService - Call initiated from: ${data['from']}');
    _remoteSocketId = data['from'];
    if (!_callStateController.isClosed) {
      _callStateController.add(CallState.calling);
    }
  }

  /// Join video room
  void joinVideoRoom(String roomId) {
    if (_localEmail != null) {
      _socketService.joinVideoRoom(
        email: _localEmail!,
        room: roomId,
      );
    }
  }

  /// Get local media stream
  Future<MediaStream> getLocalStream() async {
    if (_isDisposed) {
      throw StateError('VideoPeerService has been disposed');
    }

    if (_localStream != null) {
      return _localStream!;
    }

    try {
      final stream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': {
          'mandatory': {
            'minWidth': '640',
            'minHeight': '480',
            'minFrameRate': '30',
          },
          'facingMode': 'user',
          'optional': [],
        }
      });

      _localStream = stream;

      // Only add to controller if not disposed and controller is open
      if (!_isDisposed && !_localStreamController.isClosed) {
        _localStreamController.add(stream);
      }

      return stream;
    } catch (e) {
      print('VideoPeerService - Error getting local stream: $e');
      rethrow;
    }
  }

  /// Create peer connection
  Future<void> _createPeerConnection() async {
    try {
      final peerConnection = await createPeerConnection({
        'iceServers': [
          {'urls': ['stun:stun.l.google.com:19302']},
        ]
      });

      // Handle ICE candidates
      peerConnection.onIceCandidate = (RTCIceCandidate candidate) {
        if (candidate.candidate != null && _remoteSocketId != null) {
          print('VideoPeerService - New ICE candidate');
          // In production, send ICE candidates to remote peer
          // For now, we're bundling them in SDP which is handled by WebRTC internally
        }
      };

      // Handle remote stream (unified-plan)
      peerConnection.onTrack = (RTCTrackEvent event) {
        if (_isDisposed) return;
        print('VideoPeerService - Remote track received: ${event.track.kind}');
        if (!_remoteStreamController.isClosed) {
          _remoteStreamController.add(event.streams[0]);
        }
      };

      // Handle connection state changes
      peerConnection.onConnectionState = (RTCPeerConnectionState state) {
        if (_isDisposed) return;
        print('VideoPeerService - Connection state: $state');

        if (_callStateController.isClosed) return;

        switch (state) {
          case RTCPeerConnectionState.RTCPeerConnectionStateConnected:
            _callStateController.add(CallState.connected);
            break;
          case RTCPeerConnectionState.RTCPeerConnectionStateFailed:
            _callStateController.add(CallState.error);
            break;
          case RTCPeerConnectionState.RTCPeerConnectionStateDisconnected:
            _callStateController.add(CallState.ended);
            break;
          case RTCPeerConnectionState.RTCPeerConnectionStateClosed:
            _callStateController.add(CallState.ended);
            break;
          default:
            break;
        }
      };

      // Note: Negotiation is handled automatically by flutter_webrtc
      // We don't need to manually set onnegotiationneeded

      _peerConnection = peerConnection;
    } catch (e) {
      print('VideoPeerService - Error creating peer connection: $e');
      rethrow;
    }
  }

  /// Initiate call to remote user
  Future<void> initiateCall() async {
    if (_isDisposed) {
      print('VideoPeerService - Cannot initiate call after dispose');
      return;
    }

    if (_remoteSocketId == null) {
      final errorMsg = 'VideoPeerService - No remote user available in the room';
      print(errorMsg);
      throw StateError(errorMsg);
    }

    try {
      // Create peer connection if needed
      if (_peerConnection == null) {
        await _createPeerConnection();
      }

      // Get local stream if needed
      if (_localStream == null) {
        await getLocalStream();
      }

      // Add local stream tracks to peer connection
      _localStream!.getTracks().forEach((track) async {
        await _peerConnection!.addTrack(track, _localStream!);
      });

      // Create offer
      final offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);

      // Send offer to remote peer
      _socketService.initiateCall(
        to: _remoteSocketId!,
        offer: {
          'sdp': offer.sdp,
          'type': offer.type,
        },
      );

      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.calling);
      }
    } catch (e) {
      print('VideoPeerService - Error initiating call: $e');
      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.error);
      }
    }
  }

  /// End call
  Future<void> endCall() async {
    if (_isDisposed) return;

    try {
      if (_remoteSocketId != null) {
        _socketService.endCall(to: _remoteSocketId!);
      }

      await _closePeerConnection();
      _callActive = false;
      if (!_callStateController.isClosed) {
        _callStateController.add(CallState.ended);
      }
    } catch (e) {
      print('VideoPeerService - Error ending call: $e');
    }
  }

  /// Close peer connection and cleanup
  Future<void> _closePeerConnection() async {
    try {
      // Stop local stream
      if (_localStream != null) {
        _localStream!.getTracks().forEach((track) async {
          await track.stop();
        });
        await _localStream!.dispose();
        _localStream = null;
      }

      // Close peer connection
      if (_peerConnection != null) {
        await _peerConnection!.close();
        _peerConnection = null;
      }

      _remoteStream = null;
    } catch (e) {
      print('VideoPeerService - Error closing peer connection: $e');
    }
  }

  /// Dispose all resources
  Future<void> dispose() async {
    if (_isDisposed) return;

    print('VideoPeerService - Disposing');
    _isDisposed = true;

    // Cancel socket subscription
    await _socketEventSubscription?.cancel();
    _socketEventSubscription = null;

    // Close peer connection and cleanup streams
    await _closePeerConnection();

    // Close all stream controllers
    if (!_localStreamController.isClosed) {
      await _localStreamController.close();
    }
    if (!_remoteStreamController.isClosed) {
      await _remoteStreamController.close();
    }
    if (!_callStateController.isClosed) {
      await _callStateController.close();
    }

    print('VideoPeerService - Disposed successfully');
  }
}

enum CallState {
  idle,
  roomJoined,
  remoteUserJoined,
  calling,
  ringing,
  connected,
  ended,
  error,
}
