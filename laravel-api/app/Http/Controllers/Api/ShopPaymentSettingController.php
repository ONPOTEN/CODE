<?php

namespace App\Http\Controllers\Api;

use App\Models\Shop;
use App\Models\ShopPaymentSetting;
use App\Http\Resources\ShopPaymentSettingResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class ShopPaymentSettingController extends Controller
{
    /**
     * Get payment settings for a specific shop
     */
    public function show(int $shopId): JsonResponse
    {
        $paymentSetting = ShopPaymentSetting::where('shop_id', $shopId)->first();

        if (!$paymentSetting) {
            return response()->json([
                'message' => 'Payment settings not found',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'message' => 'Payment settings retrieved successfully',
            'data' => new ShopPaymentSettingResource($paymentSetting),
        ], 200);
    }

    /**
     * Save or update payment settings for a specific shop
     */
    public function store(Request $request, int $shopId): JsonResponse
    {
        // Verify user owns this shop
        $shop = Shop::findOrFail($shopId);
        $user = $request->user();

        if ($shop->user_id !== $user->ID) {
            return response()->json([
                'message' => 'Unauthorized: You do not own this shop',
            ], 403);
        }

        // Validate input
        $validated = $request->validate([
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:100',
            'account_holder' => 'nullable|string|max:255',
            'upi_id' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'qr_code' => 'nullable|string',
        ]);

        try {
            // Find existing or create new payment setting
            $paymentSetting = ShopPaymentSetting::firstOrCreate(
                ['shop_id' => $shopId],
                $validated
            );

            // Update with new values
            $paymentSetting->update($validated);

            return response()->json([
                'message' => 'Payment settings saved successfully',
                'data' => new ShopPaymentSettingResource($paymentSetting),
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Shop payment settings save error', [
                'shop_id' => $shopId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to save payment settings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete payment settings for a specific shop
     */
    public function destroy(Request $request, int $shopId): JsonResponse
    {
        // Verify user owns this shop
        $shop = Shop::findOrFail($shopId);
        $user = $request->user();

        if ($shop->user_id !== $user->ID) {
            return response()->json([
                'message' => 'Unauthorized: You do not own this shop',
            ], 403);
        }

        try {
            $paymentSetting = ShopPaymentSetting::where('shop_id', $shopId)->firstOrFail();
            $paymentSetting->delete();

            return response()->json([
                'message' => 'Payment settings deleted successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete payment settings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
