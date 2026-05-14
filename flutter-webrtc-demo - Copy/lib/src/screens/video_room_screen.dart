import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../services/video_peer_service.dart';
import '../services/auth_storage.dart';

class VideoRoomScreen extends StatefulWidget {
  final String roomId;
  final String? serverUrl;

  const VideoRoomScreen({
    Key? key,
    required this.roomId,
    this.serverUrl = 'https://socket.centimet2.com',
  }) : super(key: key);

  @override
  State<VideoRoomScreen> createState() => _VideoRoomScreenState();
}

class _VideoRoomScreenState extends State<VideoRoomScreen> {
  late VideoPeerService _videoPeerService;
  RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();

  String _userEmail = 'Loading...';
  String _connectionStatus = 'Connecting...';
  String _callStatus = 'Idle';
  bool _isMuted = false;
  bool _isVideoEnabled = true;
  bool _hasRemoteUser = false;

  MediaStream? _localStream;
  MediaStream? _remoteStream;

  @override
  void initState() {
    super.initState();
    _initializeRenderers();
    _initializeVideo();
  }

  Future<void> _initializeRenderers() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();
  }

  Future<void> _initializeVideo() async {
    try {
      // Get user email
      final userId = await AuthStorage.getUserId();
      final userEmail = await AuthStorage.getEmail();

      setState(() {
        _userEmail = userEmail ?? 'User $userId';
        _connectionStatus = 'Initializing...';
      });

      // Initialize video peer service
      _videoPeerService = VideoPeerService();
      await _videoPeerService.initialize(
        email: _userEmail,
        serverUrl: widget.serverUrl!,
      );

      // Listen to local stream
      _videoPeerService.localStreamStream.listen((stream) {
        setState(() {
          _localStream = stream;
          _localRenderer.srcObject = stream;
        });
      });

      // Listen to remote stream
      _videoPeerService.remoteStreamStream.listen((stream) {
        setState(() {
          _remoteStream = stream;
          _remoteRenderer.srcObject = stream;
        });
      });

      // Listen to call state changes
      _videoPeerService.callStateStream.listen((state) {
        setState(() {
          _callStatus = _getCallStateString(state);
          _hasRemoteUser = _videoPeerService.hasRemoteUser;

          if (state == CallState.remoteUserJoined) {
            _connectionStatus = 'Remote user joined - Ready to call';
            _hasRemoteUser = true;
          } else if (state == CallState.roomJoined) {
            _connectionStatus = 'Room joined - Waiting for remote user...';
          } else if (state == CallState.connected) {
            _connectionStatus = 'Connected';
          } else if (state == CallState.error) {
            _connectionStatus = 'Error';
          } else if (state == CallState.ended) {
            _connectionStatus = 'Call ended';
            _hasRemoteUser = false;
          }
        });
      });

      // Join video room
      _videoPeerService.joinVideoRoom(widget.roomId);

      setState(() {
        _connectionStatus = 'Joined room';
      });
    } catch (e) {
      print('Error initializing video: $e');
      setState(() {
        _connectionStatus = 'Error: $e';
      });
    }
  }

  String _getCallStateString(CallState state) {
    switch (state) {
      case CallState.idle:
        return 'Idle';
      case CallState.roomJoined:
        return 'Room Joined';
      case CallState.remoteUserJoined:
        return 'Remote User Joined';
      case CallState.calling:
        return 'Calling...';
      case CallState.ringing:
        return 'Ringing...';
      case CallState.connected:
        return 'Connected';
      case CallState.ended:
        return 'Call Ended';
      case CallState.error:
        return 'Error';
    }
  }

  Future<void> _initiateCall() async {
    try {
      await _videoPeerService.initiateCall();
    } catch (e) {
      print('Error initiating call: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error initiating call: $e')),
      );
    }
  }

  Future<void> _endCall() async {
    try {
      await _videoPeerService.endCall();
    } catch (e) {
      print('Error ending call: $e');
    }
  }

  void _toggleMute() {
    if (_localStream != null) {
      bool enabled = _localStream!.getAudioTracks()[0].enabled;
      _localStream!.getAudioTracks()[0].enabled = !enabled;
      setState(() {
        _isMuted = !enabled;
      });
    }
  }

  void _toggleVideo() {
    if (_localStream != null) {
      bool enabled = _localStream!.getVideoTracks()[0].enabled;
      _localStream!.getVideoTracks()[0].enabled = !enabled;
      setState(() {
        _isVideoEnabled = enabled;
      });
    }
  }

  @override
  void dispose() {
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    // Dispose VideoPeerService asynchronously
    _videoPeerService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Video Call Room'),
        backgroundColor: Colors.indigo,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header Info
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.indigo.shade50,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Room: ${widget.roomId}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'User: $_userEmail',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        'Status: $_connectionStatus',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.green[700],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        _callStatus,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.blue[700],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Video Grid
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Local Video
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      color: Colors.black,
                      child: AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Stack(
                          children: [
                            if (_localStream != null)
                              RTCVideoView(
                                _localRenderer,
                                mirror: true,
                              )
                            else
                              const Center(
                                child: CircularProgressIndicator(),
                              ),
                            Positioned(
                              top: 12,
                              left: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.black54,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  'You ($_userEmail)',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Remote Video
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      color: Colors.black,
                      child: AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Stack(
                          children: [
                            if (_remoteStream != null)
                              RTCVideoView(_remoteRenderer)
                            else
                              Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.videocam_off,
                                      size: 64,
                                      color: Colors.grey[400],
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      _videoPeerService.isCallActive
                                          ? 'Waiting for remote video...'
                                          : 'No remote video',
                                      style: TextStyle(
                                        color: Colors.grey[400],
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (_remoteStream != null)
                              Positioned(
                                top: 12,
                                left: 12,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'Remote User',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Control Buttons
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Mute Button
                      FloatingActionButton(
                        heroTag: 'mute',
                        onPressed: _toggleMute,
                        backgroundColor: _isMuted ? Colors.red : Colors.blue,
                        child: Icon(
                          _isMuted ? Icons.mic_off : Icons.mic,
                        ),
                      ),

                      // Video Toggle Button
                      FloatingActionButton(
                        heroTag: 'video',
                        onPressed: _toggleVideo,
                        backgroundColor:
                            _isVideoEnabled ? Colors.blue : Colors.red,
                        child: Icon(
                          _isVideoEnabled
                              ? Icons.videocam
                              : Icons.videocam_off,
                        ),
                      ),

                      // Call Button
                      if (!_videoPeerService.isCallActive)
                        FloatingActionButton(
                          heroTag: 'call',
                          onPressed: _hasRemoteUser ? _initiateCall : null,
                          backgroundColor: _hasRemoteUser ? Colors.green : Colors.grey,
                          child: const Icon(Icons.call),
                        ),

                      // End Call Button
                      if (_videoPeerService.isCallActive)
                        FloatingActionButton(
                          heroTag: 'endcall',
                          onPressed: _endCall,
                          backgroundColor: Colors.red,
                          child: const Icon(Icons.call_end),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey[600],
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Exit Room'),
                    ),
                  ),
                ],
              ),
            ),

            // Debug Info
            if (_localStream != null || _remoteStream != null)
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Debug Info',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Local Stream: ${_localStream != null ? "✓ Active" : "✗ Inactive"}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    Text(
                      'Remote Stream: ${_remoteStream != null ? "✓ Active" : "✗ Inactive"}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    Text(
                      'Call Active: ${_videoPeerService.isCallActive ? "✓ Yes" : "✗ No"}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
