import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/engagement_provider.dart';
import '../providers/auth_provider.dart';

/// Engagement Buttons Component
/// Displays Like, Dislike, Share, Comment buttons with real-time engagement stats
class EngagementButtons extends StatefulWidget {
  final int postId;
  final String? postTitle;
  final String? postSlug;
  final String? postText;
  final bool showLabels;
  final bool compact;
  final MainAxisAlignment alignment;

  const EngagementButtons({
    Key? key,
    required this.postId,
    this.postTitle = 'Check out this post',
    this.postSlug,
    this.postText,
    this.showLabels = true,
    this.compact = false,
    this.alignment = MainAxisAlignment.start,
  }) : super(key: key);

  @override
  State<EngagementButtons> createState() => _EngagementButtonsState();
}

class _EngagementButtonsState extends State<EngagementButtons> {
  bool _showShareMenu = false;
  bool _isShareToWallLoading = false;

  @override
  void initState() {
    super.initState();
    // Fetch engagement stats when widget mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final engagementProvider = context.read<EngagementProvider>();
      engagementProvider.fetchEngagementStats(widget.postId);
    });
  }

  void _handleLikeClick(EngagementProvider engagementProvider, bool isAuthenticated) {
    if (!isAuthenticated) {
      _showLoginDialog();
      return;
    }
    engagementProvider.toggleLike(widget.postId);
  }

  void _handleDislikeClick(EngagementProvider engagementProvider, bool isAuthenticated) {
    if (!isAuthenticated) {
      _showLoginDialog();
      return;
    }
    engagementProvider.toggleDislike(widget.postId);
  }

  void _handleShareClick(EngagementProvider engagementProvider, bool isAuthenticated) {
    if (!isAuthenticated) {
      _showLoginDialog();
      return;
    }
    setState(() => _showShareMenu = !_showShareMenu);
  }

  void _handleCommentClick(bool isAuthenticated) {
    if (!isAuthenticated) {
      _showLoginDialog();
      return;
    }
    // Scroll to comments section (if available)
    // For now, just show a message
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Comments feature coming soon!'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _handleShareToMyWall(
    EngagementProvider engagementProvider,
    AuthProvider authProvider,
  ) async {
    if (!authProvider.isAuthenticated || authProvider.user == null) {
      _showLoginDialog();
      return;
    }

    setState(() => _isShareToWallLoading = true);

    try {
      final wallId = authProvider.user!.id;
      print('[EngagementButtons] Sharing post to my wall: postId=${widget.postId}, wallId=$wallId');

      // TODO: Implement shareToWall if not already in posts service
      // For now, show a success message
      _showToast('Post shared to your wall!');
      setState(() => _showShareMenu = false);
    } catch (e) {
      _showToast('Failed to share post: $e');
    } finally {
      setState(() => _isShareToWallLoading = false);
    }
  }

  void _handleShare(EngagementProvider engagementProvider, String platform) {
    try {
      engagementProvider.sharePost(widget.postId, platform: platform);
      setState(() => _showShareMenu = false);

      if (platform == 'direct') {
        _showToast('Link copied to clipboard!');
      } else {
        _showToast('Post shared on $platform!');
      }
    } catch (e) {
      _showToast('Failed to share: $e');
    }
  }

  void _showLoginDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Login Required'),
        content: const Text('Please log in to use engagement features.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/login');
            },
            child: const Text('Login'),
          ),
        ],
      ),
    );
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<EngagementProvider, AuthProvider>(
      builder: (context, engagementProvider, authProvider, child) {
        // Get engagement stats for this post
        final engagement = engagementProvider.engagements[widget.postId];

        // Show loading state if engagement data not loaded
        if (engagement == null) {
          return Container(
            height: widget.compact ? 32 : 40,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }

        final isAuthenticated = authProvider.isAuthenticated;
        final likeCount = engagement.likeCount;
        final dislikeCount = engagement.dislikeCount;
        final shareCount = engagement.shareCount;
        final commentCount = engagement.commentCount;
        final userLiked = engagement.userLiked;
        final userDisliked = engagement.userDisliked;

        final buttonPadding = widget.compact
            ? const EdgeInsets.symmetric(horizontal: 8, vertical: 4)
            : const EdgeInsets.symmetric(horizontal: 12, vertical: 8);

        const buttonGap = 8.0;

        return Stack(
          children: [
            // Engagement buttons row
            Positioned.fill(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  mainAxisAlignment: widget.alignment,
                  children: [
                    // Like Button
                    _buildEngagementButton(
                      icon: '👍',
                      count: likeCount,
                      label: 'Like',
                      isActive: userLiked,
                      activeColor: Colors.blue,
                      onPressed: () => _handleLikeClick(engagementProvider, isAuthenticated),
                      padding: buttonPadding,
                    ),
                    SizedBox(width: buttonGap),

                    // Dislike Button
                    _buildEngagementButton(
                      icon: '👎',
                      count: dislikeCount,
                      label: 'Dislike',
                      isActive: userDisliked,
                      activeColor: Colors.red,
                      onPressed: () => _handleDislikeClick(engagementProvider, isAuthenticated),
                      padding: buttonPadding,
                    ),
                    SizedBox(width: buttonGap),

                    // Share Button
                    _buildEngagementButton(
                      icon: '📤',
                      count: shareCount,
                      label: 'Share',
                      isActive: false,
                      activeColor: Colors.green,
                      onPressed: () => _handleShareClick(engagementProvider, isAuthenticated),
                      padding: buttonPadding,
                    ),
                    SizedBox(width: buttonGap),

                    // Comment Button
                    _buildEngagementButton(
                      icon: '💬',
                      count: commentCount,
                      label: 'Comment',
                      isActive: false,
                      activeColor: Colors.orange,
                      onPressed: () => _handleCommentClick(isAuthenticated),
                      padding: buttonPadding,
                    ),
                  ],
                ),
              ),
            ),

            // Share Menu
            if (_showShareMenu)
              Positioned(
                right: 0,
                top: 0,
                child: GestureDetector(
                  onTap: () => setState(() => _showShareMenu = false),
                  child: Container(
                    color: Colors.transparent,
                    width: MediaQuery.of(context).size.width,
                    height: MediaQuery.of(context).size.height,
                  ),
                ),
              ),
            if (_showShareMenu)
              Positioned(
                right: 0,
                top: widget.compact ? 32 : 40,
                child: _buildShareMenu(engagementProvider, authProvider),
              ),
          ],
        );
      },
    );
  }

  /// Build individual engagement button
  Widget _buildEngagementButton({
    required String icon,
    required int count,
    required String label,
    required bool isActive,
    required Color activeColor,
    required VoidCallback onPressed,
    required EdgeInsets padding,
  }) {
    final backgroundColor = isActive ? activeColor.withValues(alpha: 0.1) : Colors.grey[200];
    final textColor = isActive ? activeColor : Colors.grey[700];

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(8),
            border: isActive ? Border.all(color: activeColor, width: 1) : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(icon, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 4),
              Text(
                '$count',
                style: TextStyle(
                  color: textColor,
                  fontSize: widget.compact ? 12 : 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (widget.showLabels) ...[
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: textColor,
                    fontSize: widget.compact ? 11 : 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// Build share menu dropdown
  Widget _buildShareMenu(EngagementProvider engagementProvider, AuthProvider authProvider) {
    return Material(
      elevation: 8,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[300]!),
        ),
        width: 220,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Share to My Wall (custom action)
            _buildShareMenuItem(
              icon: '📌',
              label: 'Share to My Wall',
              isLoading: _isShareToWallLoading,
              onTap: () => _handleShareToMyWall(engagementProvider, authProvider),
              backgroundColor: Colors.purple[50],
            ),
            Divider(height: 1, color: Colors.grey[300]),

            // Social Media Platforms
            _buildShareMenuItem(
              icon: '📘',
              label: 'Facebook',
              onTap: () => _handleShare(engagementProvider, 'facebook'),
            ),
            _buildShareMenuItem(
              icon: '𝕏',
              label: 'Twitter',
              onTap: () => _handleShare(engagementProvider, 'twitter'),
            ),
            _buildShareMenuItem(
              icon: '💚',
              label: 'WhatsApp',
              onTap: () => _handleShare(engagementProvider, 'whatsapp'),
            ),
            _buildShareMenuItem(
              icon: '💼',
              label: 'LinkedIn',
              onTap: () => _handleShare(engagementProvider, 'linkedin'),
            ),
            _buildShareMenuItem(
              icon: '✉️',
              label: 'Email',
              onTap: () => _handleShare(engagementProvider, 'email'),
            ),
            Divider(height: 1, color: Colors.grey[300]),

            // Direct Link
            _buildShareMenuItem(
              icon: '🔗',
              label: 'Copy Link',
              onTap: () => _handleShare(engagementProvider, 'direct'),
              backgroundColor: Colors.grey[50],
            ),
          ],
        ),
      ),
    );
  }

  /// Build share menu item
  Widget _buildShareMenuItem({
    required String icon,
    required String label,
    required VoidCallback onTap,
    bool isLoading = false,
    Color? backgroundColor,
  }) {
    return Material(
      color: backgroundColor ?? Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Text(
                isLoading ? '⏳' : icon,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    color: isLoading ? Colors.grey[500] : Colors.grey[800],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (isLoading)
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 1.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.grey[600]!),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
