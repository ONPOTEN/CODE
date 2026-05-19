/// Engagement Buttons Widget
/// Displays like, dislike, share, and comment buttons for posts

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/engagement_provider.dart';

class EngagementButtons extends StatefulWidget {
  final int postId;
  final String postTitle;
  final String? postSlug;
  final String? postText;
  final VoidCallback? onCommentPressed;
  final bool showLabels;
  final bool compact;

  const EngagementButtons({
    Key? key,
    required this.postId,
    required this.postTitle,
    this.postSlug,
    this.postText,
    this.onCommentPressed,
    this.showLabels = true,
    this.compact = false,
  }) : super(key: key);

  @override
  State<EngagementButtons> createState() => _EngagementButtonsState();
}

class _EngagementButtonsState extends State<EngagementButtons> {
  late EngagementProvider _engagementProvider;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<EngagementProvider>().fetchEngagementStats(widget.postId);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _engagementProvider = Provider.of<EngagementProvider>(context, listen: false);
  }

  void _showShareBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Share Post',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 24),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                mainAxisSpacing: 24,
                crossAxisSpacing: 16,
                children: [
                  _ShareOption(
                    platform: 'facebook',
                    icon: '📘',
                    label: 'Facebook',
                    onPressed: () => _handleShare('facebook', context),
                  ),
                  _ShareOption(
                    platform: 'twitter',
                    icon: '𝕏',
                    label: 'Twitter',
                    onPressed: () => _handleShare('twitter', context),
                  ),
                  _ShareOption(
                    platform: 'whatsapp',
                    icon: '💬',
                    label: 'WhatsApp',
                    onPressed: () => _handleShare('whatsapp', context),
                  ),
                  _ShareOption(
                    platform: 'linkedin',
                    icon: '💼',
                    label: 'LinkedIn',
                    onPressed: () => _handleShare('linkedin', context),
                  ),
                  _ShareOption(
                    platform: 'email',
                    icon: '✉️',
                    label: 'Email',
                    onPressed: () => _handleShare('email', context),
                  ),
                  _ShareOption(
                    platform: 'direct',
                    icon: '🔗',
                    label: 'Copy Link',
                    onPressed: () => _handleShare('direct', context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handleShare(String platform, BuildContext context) async {
    try {
      // Close the bottom sheet
      Navigator.pop(context);

      // Track share in backend
      await _engagementProvider.sharePost(
        widget.postId,
        platform: platform,
      );

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Shared to $platform!'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<EngagementProvider>(
      builder: (context, provider, _) {
        final engagement = provider.getEngagement(widget.postId);

        if (engagement == null) {
          // Loading state
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // Like Button
            _EngagementButton(
              icon: '👍',
              label: 'Like',
              count: engagement.likeCount,
              isActive: engagement.userLiked,
              isLoading: provider.isLoadingLikeAction(widget.postId),
              onPressed: () => provider.toggleLike(widget.postId),
              showLabel: widget.showLabels,
              compact: widget.compact,
            ),

            // Dislike Button
            _EngagementButton(
              icon: '👎',
              label: 'Dislike',
              count: engagement.dislikeCount,
              isActive: engagement.userDisliked,
              isLoading: provider.isLoadingDislikeAction(widget.postId),
              onPressed: () => provider.toggleDislike(widget.postId),
              showLabel: widget.showLabels,
              compact: widget.compact,
            ),

            // Share Button
            _EngagementButton(
              icon: '📤',
              label: 'Share',
              count: engagement.shareCount,
              isActive: false,
              isLoading: false,
              onPressed: () => _showShareBottomSheet(context),
              showLabel: widget.showLabels,
              compact: widget.compact,
            ),

            // Comment Button
            _EngagementButton(
              icon: '💬',
              label: 'Comment',
              count: engagement.commentCount,
              isActive: false,
              isLoading: false,
              onPressed: widget.onCommentPressed ?? () {},
              showLabel: widget.showLabels,
              compact: widget.compact,
            ),
          ],
        );
      },
    );
  }
}

/// Individual Engagement Button Widget
class _EngagementButton extends StatelessWidget {
  final String icon;
  final String label;
  final int count;
  final bool isActive;
  final bool isLoading;
  final VoidCallback onPressed;
  final bool showLabel;
  final bool compact;

  const _EngagementButton({
    Key? key,
    required this.icon,
    required this.label,
    required this.count,
    required this.isActive,
    required this.isLoading,
    required this.onPressed,
    required this.showLabel,
    required this.compact,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 8 : 12,
            vertical: compact ? 6 : 8,
          ),
          decoration: BoxDecoration(
            color: isActive ? Colors.blue.shade50 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isActive ? Colors.blue : Colors.transparent,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                icon,
                style: TextStyle(
                  fontSize: compact ? 16 : 18,
                ),
              ),
              const SizedBox(width: 6),
              if (isLoading)
                SizedBox(
                  width: compact ? 12 : 16,
                  height: compact ? 12 : 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      isActive ? Colors.blue : Colors.grey[600]!,
                    ),
                  ),
                )
              else
                Text(
                  '$count',
                  style: TextStyle(
                    color: isActive ? Colors.blue : Colors.grey[700],
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                    fontSize: compact ? 12 : 14,
                  ),
                ),
              if (showLabel && !compact) ...[
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: isActive ? Colors.blue : Colors.grey[700],
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Share Option Button for Bottom Sheet
class _ShareOption extends StatelessWidget {
  final String platform;
  final String icon;
  final String label;
  final VoidCallback onPressed;

  const _ShareOption({
    Key? key,
    required this.platform,
    required this.icon,
    required this.label,
    required this.onPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                icon,
                style: const TextStyle(fontSize: 32),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
