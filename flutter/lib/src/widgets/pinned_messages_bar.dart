import 'package:flutter/material.dart';
import '../models/message.dart';

class PinnedMessagesBar extends StatelessWidget {
  final List<Message> pinnedMessages;
  final Function(int) onScrollTo;
  final Function(Message) onUnpin;

  const PinnedMessagesBar({
    Key? key,
    required this.pinnedMessages,
    required this.onScrollTo,
    required this.onUnpin,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (pinnedMessages.isEmpty) return const SizedBox.shrink();

    final lastPinned = pinnedMessages.last;
    final messageSnippet = lastPinned.message.replaceAll(RegExp(r'\[IMAGE\].*?\[\/IMAGE\]'), '📷 Hình ảnh');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.push_pin,
              color: Colors.indigo.shade600,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () => onScrollTo(lastPinned.id),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'TIN NHẮN ĐÃ GHIM',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: Colors.indigo.shade600,
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (pinnedMessages.length > 1) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '+${pinnedMessages.length - 1}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    messageSnippet,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: () => onUnpin(lastPinned),
            icon: const Icon(Icons.close),
            iconSize: 18,
            color: Colors.grey.shade400,
            splashRadius: 20,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }
}
