import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/shop.dart';
import '../services/shop_service.dart';

class ShopPaymentSettingsScreen extends StatefulWidget {
  final Shop shop;

  const ShopPaymentSettingsScreen({
    Key? key,
    required this.shop,
  }) : super(key: key);

  @override
  State<ShopPaymentSettingsScreen> createState() => _ShopPaymentSettingsScreenState();
}

class _ShopPaymentSettingsScreenState extends State<ShopPaymentSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isGeneratingQR = false;

  // Form controllers
  late TextEditingController _bankNameController;
  late TextEditingController _accountNumberController;
  late TextEditingController _accountHolderController;
  late TextEditingController _upiIdController;
  late TextEditingController _phoneController;

  // QR Code
  String? _qrCodeUrl;

  // Bank code mapping for VietQR
  static const Map<String, String> _bankCodes = {
    'vietcombank': '970436',
    'techcombank': '970407',
    'agribank': '970405',
    'tpbank': '970423',
    'mbbank': '970422',
    'mb bank': '970422',
    'acb': '970416',
    'bidv': '970418',
    'vib': '970441',
    'scb': '970429',
    'sacombank': '970403',
    'seabank': '970440',
    'eximbank': '970431',
    'vpbank': '970432',
    'vietinbank': '970415',
  };

  // Popular banks for quick selection
  static const List<Map<String, String>> _popularBanks = [
    {'name': 'Vietcombank', 'code': '970436'},
    {'name': 'Techcombank', 'code': '970407'},
    {'name': 'MB Bank', 'code': '970422'},
    {'name': 'BIDV', 'code': '970418'},
    {'name': 'VietinBank', 'code': '970415'},
    {'name': 'Agribank', 'code': '970405'},
    {'name': 'TPBank', 'code': '970423'},
    {'name': 'ACB', 'code': '970416'},
    {'name': 'VPBank', 'code': '970432'},
    {'name': 'Sacombank', 'code': '970403'},
  ];

  @override
  void initState() {
    super.initState();
    _bankNameController = TextEditingController();
    _accountNumberController = TextEditingController();
    _accountHolderController = TextEditingController();
    _upiIdController = TextEditingController();
    _phoneController = TextEditingController();
    _loadPaymentSettings();
  }

  @override
  void dispose() {
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _accountHolderController.dispose();
    _upiIdController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadPaymentSettings() async {
    try {
      final result = await ShopService.getPaymentSettings(widget.shop.id);

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true && result['data'] != null) {
            final data = result['data'];
            _bankNameController.text = data['bank_name'] ?? '';
            _accountNumberController.text = data['account_number'] ?? '';
            _accountHolderController.text = data['account_holder'] ?? '';
            _upiIdController.text = data['upi_id'] ?? '';
            _phoneController.text = data['phone'] ?? '';
            _qrCodeUrl = data['qr_code'];

            // Auto-generate QR if bank info exists but no QR saved
            if (_qrCodeUrl == null &&
                _bankNameController.text.isNotEmpty &&
                _accountNumberController.text.isNotEmpty &&
                _accountHolderController.text.isNotEmpty) {
              _generateQRCode();
            }
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String? _getBankCode(String bankName) {
    final lowerName = bankName.toLowerCase().trim();
    for (final entry in _bankCodes.entries) {
      if (lowerName.contains(entry.key)) {
        return entry.value;
      }
    }
    // If no match, return bank name as-is (in case user provides BIN directly)
    return bankName;
  }

  void _generateQRCode() {
    if (_bankNameController.text.isEmpty || _accountNumberController.text.isEmpty) {
      _showErrorSnackBar('Vui lòng điền tên ngân hàng và số tài khoản');
      return;
    }

    setState(() {
      _isGeneratingQR = true;
    });

    try {
      final bankCode = _getBankCode(_bankNameController.text);
      final accountNumber = _accountNumberController.text.trim();
      final accountHolder = _accountHolderController.text.trim();

      // Build VietQR image URL
      final qrImageUrl = 'https://img.vietqr.io/image/'
          '${Uri.encodeComponent(bankCode ?? '')}-'
          '${Uri.encodeComponent(accountNumber)}-'
          'qr_only.png?accountName=${Uri.encodeComponent(accountHolder)}';

      setState(() {
        _qrCodeUrl = qrImageUrl;
        _isGeneratingQR = false;
      });

      _showSuccessSnackBar('Đã tạo mã QR thành công!');
    } catch (e) {
      setState(() {
        _isGeneratingQR = false;
      });
      _showErrorSnackBar('Lỗi tạo mã QR: ${e.toString()}');
    }
  }

  Future<void> _savePaymentSettings() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_bankNameController.text.isEmpty ||
        _accountNumberController.text.isEmpty ||
        _accountHolderController.text.isEmpty) {
      _showErrorSnackBar('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final result = await ShopService.savePaymentSettings(
        shopId: widget.shop.id,
        bankName: _bankNameController.text.trim(),
        accountNumber: _accountNumberController.text.trim(),
        accountHolder: _accountHolderController.text.trim(),
        upiId: _upiIdController.text.trim().isNotEmpty ? _upiIdController.text.trim() : null,
        phone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
        qrCode: _qrCodeUrl,
      );

      if (mounted) {
        setState(() {
          _isSaving = false;
        });

        if (result['success'] == true) {
          _showSuccessSnackBar('Đã lưu cài đặt thanh toán thành công!');
          Navigator.of(context).pop(true);
        } else {
          _showErrorSnackBar(result['message'] ?? 'Lưu cài đặt thất bại');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
        _showErrorSnackBar('Lỗi: ${e.toString()}');
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  void _showBankSelector() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chọn ngân hàng',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _popularBanks.length,
                itemBuilder: (context, index) {
                  final bank = _popularBanks[index];
                  return ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.account_balance, color: Colors.amber),
                    ),
                    title: Text(bank['name']!),
                    subtitle: Text('BIN: ${bank['code']}', style: const TextStyle(fontSize: 12)),
                    onTap: () {
                      _bankNameController.text = bank['name']!;
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cài đặt thanh toán'),
        backgroundColor: Colors.amber.shade700,
        foregroundColor: Colors.white,
        actions: [
          if (!_isLoading && !_isSaving)
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _savePaymentSettings,
              tooltip: 'Lưu',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Shop Info
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.amber.shade600, Colors.amber.shade700],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.store, color: Colors.white, size: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Cửa hàng',
                                  style: TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                                Text(
                                  widget.shop.name,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Bank Details Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.shade200,
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.account_balance, color: Colors.amber.shade700),
                              const SizedBox(width: 8),
                              const Text(
                                'Thông tin tài khoản ngân hàng',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Bank Name
                          TextFormField(
                            controller: _bankNameController,
                            decoration: InputDecoration(
                              labelText: 'Tên ngân hàng *',
                              hintText: 'VD: Vietcombank, Techcombank',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              prefixIcon: const Icon(Icons.account_balance),
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.arrow_drop_down),
                                onPressed: _showBankSelector,
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Vui lòng nhập tên ngân hàng';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          // Account Number
                          TextFormField(
                            controller: _accountNumberController,
                            decoration: InputDecoration(
                              labelText: 'Số tài khoản *',
                              hintText: 'Nhập số tài khoản ngân hàng của bạn',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              prefixIcon: const Icon(Icons.credit_card),
                            ),
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Vui lòng nhập số tài khoản';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          // Account Holder
                          TextFormField(
                            controller: _accountHolderController,
                            decoration: InputDecoration(
                              labelText: 'Tên chủ tài khoản *',
                              hintText: 'Tên trên tài khoản ngân hàng',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              prefixIcon: const Icon(Icons.person),
                            ),
                            textCapitalization: TextCapitalization.words,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Vui lòng nhập tên chủ tài khoản';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          // UPI ID (Optional)
                          TextFormField(
                            controller: _upiIdController,
                            decoration: InputDecoration(
                              labelText: 'UPI ID (Tùy chọn)',
                              hintText: 'UPI ID cho thanh toán di động',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              prefixIcon: const Icon(Icons.qr_code),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Phone (Optional)
                          TextFormField(
                            controller: _phoneController,
                            decoration: InputDecoration(
                              labelText: 'Số điện thoại (Tùy chọn)',
                              hintText: 'Số điện thoại liên hệ',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              prefixIcon: const Icon(Icons.phone),
                            ),
                            keyboardType: TextInputType.phone,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // QR Code Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.shade200,
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.qr_code_2, color: Colors.amber.shade700),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Mã VietQR',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              ElevatedButton.icon(
                                onPressed: _isGeneratingQR ? null : _generateQRCode,
                                icon: _isGeneratingQR
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      )
                                    : const Icon(Icons.refresh, size: 18),
                                label: Text(_isGeneratingQR ? 'Đang tạo...' : 'Tạo mã QR'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          if (_qrCodeUrl != null && _qrCodeUrl!.isNotEmpty) ...[
                            Center(
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.amber.shade200, width: 4),
                                  borderRadius: BorderRadius.circular(12),
                                  color: Colors.white,
                                ),
                                child: Image.network(
                                  _qrCodeUrl!,
                                  width: 200,
                                  height: 200,
                                  fit: BoxFit.contain,
                                  loadingBuilder: (context, child, loadingProgress) {
                                    if (loadingProgress == null) return child;
                                    return SizedBox(
                                      width: 200,
                                      height: 200,
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
                                  errorBuilder: (context, error, stackTrace) => Container(
                                    width: 200,
                                    height: 200,
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade200,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.error_outline, size: 40, color: Colors.grey),
                                          SizedBox(height: 8),
                                          Text('Không tải được QR', style: TextStyle(color: Colors.grey)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Center(
                              child: Text(
                                'Mã QR đã được tạo thành công.\nHiển thị mã này để nhận thanh toán qua VietQR.',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ] else ...[
                            Container(
                              padding: const EdgeInsets.all(32),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                              ),
                              child: Column(
                                children: [
                                  Icon(Icons.qr_code_2, size: 64, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Chưa có mã QR',
                                    style: TextStyle(fontWeight: FontWeight.w500),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Điền thông tin ngân hàng và nhấn "Tạo mã QR"',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Info Box
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Lưu ý',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'VietQR cho phép khách hàng quét và chuyển tiền trực tiếp vào tài khoản ngân hàng của bạn.',
                            style: TextStyle(color: Colors.blue.shade900, fontSize: 13),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Ngân hàng hỗ trợ: Vietcombank, Techcombank, Agribank, TPBank, MB Bank, ACB, BIDV, VIB, SCB, Sacombank, SeABank, Eximbank, VPBank, VietinBank và nhiều hơn nữa.',
                            style: TextStyle(color: Colors.blue.shade800, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _savePaymentSettings,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber.shade700,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: _isSaving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check),
                                  SizedBox(width: 8),
                                  Text(
                                    'Lưu cài đặt',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Cancel Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Hủy'),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}
