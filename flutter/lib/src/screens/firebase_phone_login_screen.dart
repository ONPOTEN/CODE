import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class FirebasePhoneLoginScreen extends StatefulWidget {
  @override
  _FirebasePhoneLoginScreenState createState() => _FirebasePhoneLoginScreenState();
}

class _FirebasePhoneLoginScreenState extends State<FirebasePhoneLoginScreen> {
  final _phoneController = TextEditingController();
  final _smsCodeController = TextEditingController();
  String? _verificationId;
  bool _isLoading = false;
  bool _showSmsInput = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _smsCodeController.dispose();
    super.dispose();
  }

  Future<void> _startPhoneVerification(AuthProvider authProvider) async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a phone number')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final verificationId = await authProvider.startPhoneVerification(phone);

    setState(() {
      _isLoading = false;
      if (verificationId != null) {
        _verificationId = verificationId;
        _showSmsInput = true;
      }
    });

    if (verificationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage ?? 'Verification failed')),
      );
    }
  }

  Future<void> _completeSmsVerification(AuthProvider authProvider) async {
    if (_verificationId == null || _smsCodeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the SMS code')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final success = await authProvider.completePhoneVerification(
      verificationId: _verificationId!,
      smsCode: _smsCodeController.text,
      phoneNumber: _phoneController.text,
    );

    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SMS verification successful!')),
      );
      // ALWAYS navigate to password setup after SMS verification
      // This is a mandatory step for all phone logins (first-time and returning users)
      print('[Phone Login] SMS verification complete. Redirecting to mandatory password setup...');
      Navigator.of(context).pushReplacementNamed(
        '/firebase-phone-password-setup',
        arguments: _phoneController.text,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage ?? 'Verification failed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Phone Login'),
        elevation: 0,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                Text(
                  'Phone Authentication',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in with your phone number',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                if (!_showSmsInput) ...[
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: 'Phone Number',
                      hintText: '+1 (555) 123-4567',
                      prefixIcon: const Icon(Icons.phone),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : () => _startPhoneVerification(authProvider),
                      child: _isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Send Verification Code'),
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Verification Code Sent',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.blue[900],
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'A verification code has been sent to ${_phoneController.text}',
                          style: TextStyle(color: Colors.blue[800]),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _smsCodeController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'SMS Code',
                      hintText: '123456',
                      prefixIcon: const Icon(Icons.code),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : () => _completeSmsVerification(authProvider),
                      child: _isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Verify and Sign In'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _showSmsInput = false;
                          _smsCodeController.clear();
                          _verificationId = null;
                        });
                      },
                      child: const Text('Use Different Phone'),
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Back to login link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Back to '),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).pushReplacementNamed('/firebase-login');
                      },
                      child: const Text('Login'),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
