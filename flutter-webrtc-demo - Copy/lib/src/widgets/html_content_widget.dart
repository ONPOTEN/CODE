import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_config.dart';

/// A widget that renders HTML content with support for:
/// - Line breaks (<br>, <div>, \n)
/// - Images with max width/height settings
/// - Video embeds (YouTube, Vimeo, Facebook, TikTok)
/// - Links
/// - Basic HTML formatting
class HtmlContentWidget extends StatelessWidget {
  final String content;
  final double? maxImageWidth;
  final double? maxImageHeight;
  final double? maxVideoWidth;
  final double? maxVideoHeight;
  final TextStyle? defaultTextStyle;
  final bool truncate;
  final int maxWords;

  const HtmlContentWidget({
    Key? key,
    required this.content,
    this.maxImageWidth,
    this.maxImageHeight,
    this.maxVideoWidth,
    this.maxVideoHeight,
    this.defaultTextStyle,
    this.truncate = false,
    this.maxWords = 50,
  }) : super(key: key);

  /// Normalize content - convert line breaks and div tags to <br>
  String _normalizeContent(String htmlContent) {
    if (htmlContent.isEmpty) return '';

    String normalized = htmlContent
        // Convert newlines to <br>
        .replaceAll('\n', '<br>')
        // Convert consecutive divs to line breaks
        .replaceAll(RegExp(r'</div>\s*<div>', caseSensitive: false), '<br>')
        // Remove opening div tags
        .replaceAll(RegExp(r'<div>', caseSensitive: false), '')
        // Convert closing div to <br>
        .replaceAll(RegExp(r'</div>', caseSensitive: false), '<br>');

    // Clean up multiple consecutive <br> tags (max 2)
    normalized = normalized.replaceAll(
      RegExp(r'(<br\s*/?>\s*){3,}', caseSensitive: false),
      '<br><br>',
    );

    // Remove leading and trailing <br> tags
    normalized = normalized
        .replaceAll(RegExp(r'^(<br\s*/?>\s*)+', caseSensitive: false), '')
        .replaceAll(RegExp(r'(<br\s*/?>\s*)+$', caseSensitive: false), '');

    return normalized;
  }

  /// Process video URLs and convert them to embedded iframes
  String _processVideoContent(String htmlContent) {
    String processed = htmlContent;

    // YouTube URL patterns - convert to embed
    // Match: youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID
    final youtubeRegex = RegExp(
      r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
      caseSensitive: false,
    );

    processed = processed.replaceAllMapped(youtubeRegex, (match) {
      final videoId = match.group(1);
      return '<div class="video-container"><iframe src="https://www.youtube.com/embed/$videoId" frameborder="0" allowfullscreen></iframe></div>';
    });

    // Vimeo URL patterns
    final vimeoRegex = RegExp(
      r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)',
      caseSensitive: false,
    );

    processed = processed.replaceAllMapped(vimeoRegex, (match) {
      final videoId = match.group(1);
      return '<div class="video-container"><iframe src="https://player.vimeo.com/video/$videoId" frameborder="0" allowfullscreen></iframe></div>';
    });

    return processed;
  }

  /// Strip HTML tags and get plain text
  String _stripHtml(String htmlContent) {
    return htmlContent
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// Get truncated plain text for preview
  String _getTruncatedText(String htmlContent, int wordLimit) {
    final plainText = _stripHtml(htmlContent);
    final words = plainText.split(' ').where((w) => w.isNotEmpty).toList();

    if (words.length <= wordLimit) return plainText;

    return '${words.take(wordLimit).join(' ')}...';
  }

  @override
  Widget build(BuildContext context) {
    if (content.isEmpty) {
      return const SizedBox.shrink();
    }

    // For truncated content, show plain text only
    if (truncate) {
      final truncatedText = _getTruncatedText(content, maxWords);
      return Text(
        truncatedText,
        style: defaultTextStyle ??
            TextStyle(
              fontSize: 15,
              color: Colors.grey[800],
              height: 1.5,
            ),
      );
    }

    // Process content for full HTML rendering
    String processedContent = _normalizeContent(content);
    processedContent = _processVideoContent(processedContent);

    return Html(
      data: processedContent,
      style: {
        'body': Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(defaultTextStyle?.fontSize ?? 15),
          color: defaultTextStyle?.color ?? Colors.grey[800],
          lineHeight: LineHeight(defaultTextStyle?.height ?? 1.5),
        ),
        'p': Style(
          margin: Margins.only(bottom: 8),
        ),
        'br': Style(
          display: Display.block,
          margin: Margins.only(bottom: 4),
        ),
        'img': Style(
          width: maxImageWidth != null ? Width(maxImageWidth!) : Width.auto(),
          height: maxImageHeight != null ? Height(maxImageHeight!) : Height.auto(),
          margin: Margins.symmetric(vertical: 8),
        ),
        'a': Style(
          color: Colors.blue[700],
          textDecoration: TextDecoration.underline,
        ),
        'strong': Style(
          fontWeight: FontWeight.bold,
        ),
        'b': Style(
          fontWeight: FontWeight.bold,
        ),
        'em': Style(
          fontStyle: FontStyle.italic,
        ),
        'i': Style(
          fontStyle: FontStyle.italic,
        ),
        'u': Style(
          textDecoration: TextDecoration.underline,
        ),
        '.video-container': Style(
          width: Width(maxVideoWidth ?? double.infinity),
          margin: Margins.symmetric(vertical: 12),
        ),
        'iframe': Style(
          width: Width(maxVideoWidth ?? double.infinity),
          height: Height(maxVideoHeight ?? 200),
        ),
      },
      onLinkTap: (url, attributes, element) {
        if (url != null && url.isNotEmpty) {
          _launchUrl(url);
        }
      },
      extensions: [
        // Custom extension for images to handle API URLs
        TagExtension(
          tagsToExtend: {'img'},
          builder: (extensionContext) {
            final src = extensionContext.attributes['src'] ?? '';
            if (src.isEmpty) return const SizedBox.shrink();

            final imageUrl = ApiConfig.getImageUrl(src);

            return Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              constraints: BoxConstraints(
                maxWidth: maxImageWidth ?? double.infinity,
                maxHeight: maxImageHeight ?? double.infinity,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.broken_image, color: Colors.grey[400], size: 40),
                          const SizedBox(height: 8),
                          Text(
                            'Image could not be loaded',
                            style: TextStyle(color: Colors.grey[600], fontSize: 12),
                          ),
                        ],
                      ),
                    );
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      width: 200,
                      height: 150,
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: CircularProgressIndicator(
                          value: loadingProgress.expectedTotalBytes != null
                              ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                              : null,
                        ),
                      ),
                    );
                  },
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
