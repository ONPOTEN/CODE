<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class QRCodeController extends Controller
{
    /**
     * Generate VietQR code for payment
     * Acts as proxy to VietQR API to avoid CORS issues
     */
    public function generateVietQR(Request $request): JsonResponse
    {
        // Validate required fields
        $validated = $request->validate([
            'bank_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:50',
            'account_holder' => 'required|string|max:255',
            'amount' => 'nullable|string',
        ]);

        try {
            // Map Vietnamese bank names to their BIN codes
            $bankCodes = [
                'vietcombank' => '970436',
                'techcombank' => '970407',
                'agribank' => '970405',
                'tpbank' => '970423',
                'mbbank' => '970422',
                'acb' => '970416',
                'bidv' => '970418',
                'vib' => '970441',
                'scb' => '970429',
                'sacombank' => '970426',
                'seabank' => '970440',
                'eximbank' => '970431',
                'vpbank' => '970432',
                'vietinbank' => '970415',
            ];

            // Match bank name to code
            $bankName = strtolower(trim($validated['bank_name']));
            $bankCode = null;

            foreach ($bankCodes as $key => $code) {
                if (strpos($bankName, $key) !== false) {
                    $bankCode = $code;
                    break;
                }
            }

            // If no match found, try to use bank_name as-is (in case user provides BIN directly)
            if (!$bankCode) {
                $bankCode = $validated['bank_name'];
            }

            // Prepare parameters for VietQR API
            $description = 'Payment for order';
            $accountHolder = $validated['account_holder'];
            $accountNumber = $validated['account_number'];
            $amount = $validated['amount'] ?? '';

            // Build VietQR API URL
            $vietqrUrl = sprintf(
                'https://api.vietqr.vn/vi/api-vietqr-callback/generateVietQRCode?bank=%s&account=%s&amount=%s&description=%s&accountName=%s',
                urlencode($bankCode),
                urlencode($accountNumber),
                urlencode($amount),
                urlencode($description),
                urlencode($accountHolder)
            );

            // Make request to VietQR API using cURL to avoid CORS issues
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $vietqrUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            // Check for cURL errors
            if ($curlError) {
                return response()->json([
                    'message' => 'Failed to connect to VietQR service',
                    'error' => $curlError,
                ], 500);
            }

            // Check HTTP response code
            if ($httpCode !== 200) {
                return response()->json([
                    'message' => 'VietQR API returned error',
                    'status_code' => $httpCode,
                ], $httpCode >= 400 && $httpCode < 500 ? 400 : 500);
            }

            // Parse VietQR response
            $data = json_decode($response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'message' => 'Invalid JSON response from VietQR',
                    'error' => json_last_error_msg(),
                ], 500);
            }

            // Extract QR code from various possible response formats
            $qrImageUrl = null;

            if (isset($data['data']['qrDataURL'])) {
                $qrImageUrl = $data['data']['qrDataURL'];
            } elseif (isset($data['qrDataURL'])) {
                $qrImageUrl = $data['qrDataURL'];
            } elseif (isset($data['data']['image'])) {
                $qrImageUrl = $data['data']['image'];
            } elseif (isset($data['image'])) {
                $qrImageUrl = $data['image'];
            } elseif (isset($data['data'])) {
                // If data contains a string (direct image URL)
                if (is_string($data['data'])) {
                    $qrImageUrl = $data['data'];
                } else {
                    // Check all keys in data for image-like content
                    foreach ($data['data'] as $key => $value) {
                        if (is_string($value) && (
                            strpos($value, 'data:image') === 0 ||
                            strpos($value, 'http') === 0 ||
                            strlen($value) > 100
                        )) {
                            $qrImageUrl = $value;
                            break;
                        }
                    }
                }
            }

            if (!$qrImageUrl) {
                \Log::warning('VietQR response received but no QR image found', [
                    'response' => $data,
                    'url' => $vietqrUrl,
                ]);

                return response()->json([
                    'message' => 'QR code not found in VietQR response',
                    'response' => $data,
                ], 400);
            }

            return response()->json([
                'message' => 'QR code generated successfully',
                'data' => [
                    'qrDataURL' => $qrImageUrl,
                    'bank_code' => $bankCode,
                    'account_number' => $accountNumber,
                    'account_holder' => $accountHolder,
                ],
            ], 200);

        } catch (\Exception $e) {
            \Log::error('QR Code generation error', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
            ]);

            return response()->json([
                'message' => 'Failed to generate QR code',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get supported Vietnamese banks
     */
    public function getSupportedBanks(): JsonResponse
    {
        $banks = [
            [
                'name' => 'Vietcombank',
                'code' => '970436',
                'alias' => 'vietcombank',
            ],
            [
                'name' => 'Techcombank',
                'code' => '970407',
                'alias' => 'techcombank',
            ],
            [
                'name' => 'AgriBank',
                'code' => '970405',
                'alias' => 'agribank',
            ],
            [
                'name' => 'TPBank',
                'code' => '970423',
                'alias' => 'tpbank',
            ],
            [
                'name' => 'MBBank',
                'code' => '970422',
                'alias' => 'mbbank',
            ],
            [
                'name' => 'ACB',
                'code' => '970416',
                'alias' => 'acb',
            ],
            [
                'name' => 'BIDV',
                'code' => '970418',
                'alias' => 'bidv',
            ],
            [
                'name' => 'VIB',
                'code' => '970441',
                'alias' => 'vib',
            ],
            [
                'name' => 'SCB',
                'code' => '970429',
                'alias' => 'scb',
            ],
            [
                'name' => 'Sacombank',
                'code' => '970426',
                'alias' => 'sacombank',
            ],
            [
                'name' => 'SeaBank',
                'code' => '970440',
                'alias' => 'seabank',
            ],
            [
                'name' => 'Eximbank',
                'code' => '970431',
                'alias' => 'eximbank',
            ],
            [
                'name' => 'VPBank',
                'code' => '970432',
                'alias' => 'vpbank',
            ],
            [
                'name' => 'Vietinbank',
                'code' => '970415',
                'alias' => 'vietinbank',
            ],
        ];

        return response()->json([
            'message' => 'Supported banks retrieved',
            'data' => $banks,
        ], 200);
    }
}
