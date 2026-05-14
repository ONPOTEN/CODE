import 'package:flutter/material.dart';
import '../models/shop.dart';

class ShopMessagesScreen extends StatefulWidget {
  final Shop shop;

  const ShopMessagesScreen({Key? key, required this.shop}) : super(key: key);

  @override
  State<ShopMessagesScreen> createState() => _ShopMessagesScreenState();
}

class _ShopMessagesScreenState extends State<ShopMessagesScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Tin nhắn - ${widget.shop.name}'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.message_outlined,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Tin nhắn cửa hàng',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Chức năng đang được phát triển',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[500],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Quay lại'),
            ),
          ],
        ),
      ),
    );
  }
}
