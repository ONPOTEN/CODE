import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import '../services/api_config.dart';

class PostVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final bool autoPlay;
  final bool looping;
  final double? height;
  final BorderRadius? borderRadius;
  final bool showFullscreenButton;

  const PostVideoPlayer({
    Key? key,
    required this.videoUrl,
    this.autoPlay = false,
    this.looping = false,
    this.height,
    this.borderRadius,
    this.showFullscreenButton = true,
  }) : super(key: key);

  @override
  State<PostVideoPlayer> createState() => _PostVideoPlayerState();
}

class _PostVideoPlayerState extends State<PostVideoPlayer> {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  @override
  void dispose() {
    _chewieController?.dispose();
    _videoPlayerController?.dispose();
    super.dispose();
  }

  Future<void> _initializeVideo() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = null;
    });

    try {
      final videoUrl = ApiConfig.getImageUrl(widget.videoUrl);
      _videoPlayerController = VideoPlayerController.networkUrl(
        Uri.parse(videoUrl),
      );

      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: widget.autoPlay,
        looping: widget.looping,
        showControls: true,
        allowFullScreen: widget.showFullscreenButton,
        allowMuting: true,
        showOptions: false,
        placeholder: Container(
          color: Colors.black,
          child: const Center(
            child: CircularProgressIndicator(
              color: Colors.white,
              strokeWidth: 2,
            ),
          ),
        ),
        errorBuilder: (context, errorMessage) {
          return Container(
            color: Colors.black,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: Colors.red,
                    size: 48,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Không thể phát video',
                    style: TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _initializeVideo,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          );
        },
        materialProgressColors: ChewieProgressColors(
          playedColor: Colors.blue,
          handleColor: Colors.blue,
          backgroundColor: Colors.grey[700]!,
          bufferedColor: Colors.grey[500]!,
        ),
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error initializing video: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: widget.borderRadius ?? BorderRadius.circular(12),
      child: Container(
        height: widget.height ?? 250,
        width: double.infinity,
        color: Colors.black,
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: Colors.white,
          strokeWidth: 2,
        ),
      );
    }

    if (_hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 48,
            ),
            const SizedBox(height: 12),
            const Text(
              'Không thể phát video',
              style: TextStyle(color: Colors.white),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 4),
              Text(
                _errorMessage!,
                style: TextStyle(color: Colors.grey[400], fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _initializeVideo,
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    if (_chewieController != null && _videoPlayerController!.value.isInitialized) {
      return Chewie(controller: _chewieController!);
    }

    return const Center(
      child: CircularProgressIndicator(
        color: Colors.white,
        strokeWidth: 2,
      ),
    );
  }
}

// Simple video player for feed/list view (tap to play, no controls shown initially)
class FeedVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final double? height;
  final BorderRadius? borderRadius;

  const FeedVideoPlayer({
    Key? key,
    required this.videoUrl,
    this.height,
    this.borderRadius,
  }) : super(key: key);

  @override
  State<FeedVideoPlayer> createState() => _FeedVideoPlayerState();
}

class _FeedVideoPlayerState extends State<FeedVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isLoading = true;
  bool _hasError = false;
  bool _isPlaying = false;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializeVideo() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final videoUrl = ApiConfig.getImageUrl(widget.videoUrl);
      _controller = VideoPlayerController.networkUrl(Uri.parse(videoUrl));
      await _controller!.initialize();

      _controller!.addListener(() {
        if (mounted) {
          final isPlaying = _controller!.value.isPlaying;
          if (isPlaying != _isPlaying) {
            setState(() {
              _isPlaying = isPlaying;
            });
          }
        }
      });

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error initializing feed video: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    }
  }

  void _togglePlay() {
    if (_controller == null) return;

    setState(() {
      if (_controller!.value.isPlaying) {
        _controller!.pause();
      } else {
        _controller!.play();
      }
    });
  }

  void _toggleMute() {
    if (_controller == null) return;

    setState(() {
      _controller!.setVolume(_controller!.value.volume > 0 ? 0 : 1);
    });
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: widget.borderRadius ?? BorderRadius.circular(12),
      child: Container(
        height: widget.height ?? 200,
        width: double.infinity,
        color: Colors.black,
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return Stack(
        alignment: Alignment.center,
        children: [
          Container(color: Colors.grey[900]),
          const CircularProgressIndicator(
            color: Colors.white,
            strokeWidth: 2,
          ),
        ],
      );
    }

    if (_hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.videocam_off, color: Colors.grey[400], size: 40),
            const SizedBox(height: 8),
            Text(
              'Video không khả dụng',
              style: TextStyle(color: Colors.grey[400], fontSize: 12),
            ),
          ],
        ),
      );
    }

    if (_controller != null && _controller!.value.isInitialized) {
      return GestureDetector(
        onTap: () {
          setState(() {
            _showControls = !_showControls;
          });
          if (!_isPlaying) {
            _togglePlay();
          }
        },
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Video
            AspectRatio(
              aspectRatio: _controller!.value.aspectRatio > 0
                  ? _controller!.value.aspectRatio
                  : 16 / 9,
              child: VideoPlayer(_controller!),
            ),

            // Play/Pause overlay
            AnimatedOpacity(
              opacity: _showControls || !_isPlaying ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 200),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.3),
                ),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isPlaying ? Icons.pause : Icons.play_arrow,
                      color: Colors.white,
                      size: 40,
                    ),
                  ),
                ),
              ),
            ),

            // Video controls bar (bottom)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: AnimatedOpacity(
                opacity: _showControls || !_isPlaying ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 200),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withOpacity(0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Row(
                    children: [
                      // Play/Pause button
                      GestureDetector(
                        onTap: _togglePlay,
                        child: Icon(
                          _isPlaying ? Icons.pause : Icons.play_arrow,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Progress indicator
                      Expanded(
                        child: ValueListenableBuilder(
                          valueListenable: _controller!,
                          builder: (context, VideoPlayerValue value, child) {
                            return Row(
                              children: [
                                Text(
                                  _formatDuration(value.position),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: SliderTheme(
                                    data: SliderTheme.of(context).copyWith(
                                      trackHeight: 3,
                                      thumbShape: const RoundSliderThumbShape(
                                        enabledThumbRadius: 6,
                                      ),
                                      overlayShape: const RoundSliderOverlayShape(
                                        overlayRadius: 12,
                                      ),
                                    ),
                                    child: Slider(
                                      value: value.position.inMilliseconds.toDouble(),
                                      min: 0,
                                      max: value.duration.inMilliseconds.toDouble(),
                                      activeColor: Colors.blue,
                                      inactiveColor: Colors.grey[600],
                                      onChanged: (newValue) {
                                        _controller!.seekTo(
                                          Duration(milliseconds: newValue.toInt()),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _formatDuration(value.duration),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),

                      const SizedBox(width: 8),

                      // Mute button
                      GestureDetector(
                        onTap: _toggleMute,
                        child: ValueListenableBuilder(
                          valueListenable: _controller!,
                          builder: (context, VideoPlayerValue value, child) {
                            return Icon(
                              value.volume > 0
                                  ? Icons.volume_up
                                  : Icons.volume_off,
                              color: Colors.white,
                              size: 24,
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Video icon badge (top right)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.videocam, color: Colors.white, size: 16),
                    const SizedBox(width: 4),
                    ValueListenableBuilder(
                      valueListenable: _controller!,
                      builder: (context, VideoPlayerValue value, child) {
                        return Text(
                          _formatDuration(value.duration),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return const Center(
      child: CircularProgressIndicator(
        color: Colors.white,
        strokeWidth: 2,
      ),
    );
  }
}
