/// Share Utilities for Flutter
/// Handles sharing posts to various social media platforms

import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class ShareUtils {
  /// Get the base URL for the app
  static String get _baseUrl {
    return 'https://centimet2.com';
  }

  /// Get the post share URL
  static String getPostShareUrl({
    required int postId,
    String? postSlug,
  }) {
    if (postSlug != null && postSlug.isNotEmpty) {
      return '$_baseUrl/posts/$postSlug';
    }
    return '$_baseUrl/posts/$postId';
  }

  /// Share to Facebook
  static Future<void> shareToFacebook({
    required String postUrl,
    String? title,
  }) async {
    final facebookUrl = 'https://www.facebook.com/sharer/sharer.php?u=${Uri.encodeComponent(postUrl)}';
    if (await canLaunchUrl(Uri.parse(facebookUrl))) {
      await launchUrl(Uri.parse(facebookUrl), mode: LaunchMode.externalApplication);
    } else {
      throw 'Could not launch Facebook share';
    }
  }

  /// Share to Twitter
  static Future<void> shareToTwitter({
    required String postUrl,
    required String title,
    List<String>? hashtags,
  }) async {
    final text = Uri.encodeComponent(title);
    final hashtagString = hashtags != null && hashtags.isNotEmpty ? '&hashtags=${hashtags.join(',')}' : '';
    final twitterUrl = 'https://twitter.com/intent/tweet?url=${Uri.encodeComponent(postUrl)}&text=$text$hashtagString';

    if (await canLaunchUrl(Uri.parse(twitterUrl))) {
      await launchUrl(Uri.parse(twitterUrl), mode: LaunchMode.externalApplication);
    } else {
      throw 'Could not launch Twitter share';
    }
  }

  /// Share to WhatsApp
  static Future<void> shareToWhatsApp({
    required String postUrl,
    required String title,
  }) async {
    final message = Uri.encodeComponent('$title\n\n$postUrl');
    final whatsappUrl = 'https://wa.me/?text=$message';

    if (await canLaunchUrl(Uri.parse(whatsappUrl))) {
      await launchUrl(Uri.parse(whatsappUrl), mode: LaunchMode.externalApplication);
    } else {
      throw 'Could not launch WhatsApp share';
    }
  }

  /// Share to LinkedIn
  static Future<void> shareToLinkedIn({
    required String postUrl,
    String? title,
  }) async {
    final linkedinUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=${Uri.encodeComponent(postUrl)}';

    if (await canLaunchUrl(Uri.parse(linkedinUrl))) {
      await launchUrl(Uri.parse(linkedinUrl), mode: LaunchMode.externalApplication);
    } else {
      throw 'Could not launch LinkedIn share';
    }
  }

  /// Share via Email
  static Future<void> shareViaEmail({
    required String postUrl,
    required String title,
    String? body,
  }) async {
    final subject = Uri.encodeComponent(title);
    final emailBody = Uri.encodeComponent(body ?? 'Check this out: $title\n\n$postUrl');
    final emailUrl = 'mailto:?subject=$subject&body=$emailBody';

    if (await canLaunchUrl(Uri.parse(emailUrl))) {
      await launchUrl(Uri.parse(emailUrl));
    } else {
      throw 'Could not launch email share';
    }
  }

  /// Copy link to clipboard and show native share sheet
  static Future<void> copyAndShare({
    required String postUrl,
    required String title,
    String? text,
  }) async {
    await SharePlus.instance.share(
      ShareParams(
        text: '${text ?? title}\n\n$postUrl',
        subject: title,
      ),
    );
  }

  /// Handle social share with specified platform
  static Future<void> handleShare({
    required String platform,
    required int postId,
    required String postTitle,
    String? postSlug,
    String? postText,
    List<String>? hashtags,
  }) async {
    final postUrl = getPostShareUrl(postId: postId, postSlug: postSlug);
    final shareText = postText ?? postTitle;

    switch (platform.toLowerCase()) {
      case 'facebook':
        await shareToFacebook(postUrl: postUrl, title: postTitle);
        break;
      case 'twitter':
        await shareToTwitter(
          postUrl: postUrl,
          title: postTitle,
          hashtags: hashtags ?? ['centimet2', 'marketplace'],
        );
        break;
      case 'whatsapp':
        await shareToWhatsApp(postUrl: postUrl, title: shareText);
        break;
      case 'linkedin':
        await shareToLinkedIn(postUrl: postUrl, title: postTitle);
        break;
      case 'email':
        await shareViaEmail(postUrl: postUrl, title: postTitle, body: shareText);
        break;
      case 'direct':
        await copyAndShare(
          postUrl: postUrl,
          title: postTitle,
          text: shareText,
        );
        break;
      default:
        throw 'Unknown share platform: $platform';
    }
  }

  /// Show share platform selection dialog
  static Future<String?> showShareDialog() async {
    return Future.value(null); // This will be implemented in the widget
  }
}
