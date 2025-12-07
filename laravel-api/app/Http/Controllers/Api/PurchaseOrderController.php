<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\OrderItem;
use App\Models\PurchaseOrder;
use App\Models\ShopPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class PurchaseOrderController extends Controller
{
    /**
     * Get all orders for the authenticated user
     * Can return:
     * - Customer's orders (default): orders where user_id = authenticated user
     * - Shop's orders: if shop_id is provided and user owns that shop
     */
    public function index(Request $request): ResourceCollection
    {
        $user = $request->user();

        // Check if filtering by shop_id
        if ($request->has('shop_id')) {
            $shopId = $request->shop_id;

            // Verify user owns this shop
            $shop = \App\Models\Shop::where('id', $shopId)
                ->where('user_id', $user->ID)
                ->first();

            if (!$shop) {
                // Return empty collection if user doesn't own the shop
                return PurchaseOrderResource::collection(
                    PurchaseOrder::where('id', -1)->paginate(15) // Empty query
                );
            }

            // Get orders for this shop
            $query = PurchaseOrder::where('shop_id', $shopId)
                ->with(['items', 'shop', 'customer']);
        } else {
            // Get customer's own orders
            $query = PurchaseOrder::where('user_id', $user->ID)
                ->with(['items', 'shop', 'customer']);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min($request->input('per_page', 15), 100);
        $orders = $query->latest()->paginate($perPage);

        return PurchaseOrderResource::collection($orders);
    }

    /**
     * Get a specific order
     */
    public function show(Request $request, $orderId): PurchaseOrderResource|JsonResponse
    {
        $order = PurchaseOrder::with(['items', 'shop', 'customer'])->find($orderId);

        if (!$order) {
            return response()->json([
                'message' => 'Order not found',
            ], 404);
        }

        // Check if user owns this order
        if ($order->user_id !== $request->user()->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only view your own orders.',
            ], 403);
        }

        return new PurchaseOrderResource($order);
    }

    /**
     * Create a new purchase order
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.shop_post_id' => 'required|integer|exists:shop_posts,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.variant_options' => 'nullable|array',
            'subtotal' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'shipping_fee' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'total_amount' => 'nullable|numeric',
            'notes' => 'nullable|string|max:1000',
            'shipping_address' => 'required|array',
            'shipping_address.full_name' => 'required|string|max:255',
            'shipping_address.email' => 'required|email',
            'shipping_address.phone' => 'required|string|max:20',
            'shipping_address.address' => 'required|string',
            'shipping_address.city' => 'required|string|max:100',
            'shipping_address.state' => 'required|string|max:100',
            'shipping_address.postal_code' => 'required|string|max:20',
            'billing_address' => 'nullable|array',
            'payment_method' => 'required|in:cod,qr,bank_transfer',
            'order_reference' => 'nullable|string|max:50',
            'bank_transfer_details' => 'nullable|array',
            'bank_transfer_details.bank_name' => 'nullable|string|max:255',
            'bank_transfer_details.account_number' => 'nullable|string|max:50',
            'bank_transfer_details.account_holder' => 'nullable|string|max:255',
            'bank_transfer_details.transfer_reference' => 'nullable|string|max:255',
        ]);

        try {
            // Determine order status based on payment method
            $orderStatus = 'pending';
            if ($validated['payment_method'] === 'cod') {
                $orderStatus = 'pending';
            } elseif ($validated['payment_method'] === 'qr' || $validated['payment_method'] === 'bank_transfer') {
                $orderStatus = 'pending';
            }

            // Get shop_id from first item
            $firstProduct = ShopPost::findOrFail($validated['items'][0]['shop_post_id']);
            $shopId = $firstProduct->shop_id;

            // Generate unique order number
            $orderNumber = PurchaseOrder::generateOrderNumber();

            // Create the purchase order with shop_id
            $order = PurchaseOrder::create([
                'user_id' => $user->ID,
                'shop_id' => $shopId,
                'order_number' => $orderNumber,
                'order_reference' => $validated['order_reference'] ?? null,
                'status' => $orderStatus,
                'subtotal' => $validated['subtotal'],
                'tax' => $validated['tax'] ?? 0,
                'shipping_fee' => $validated['shipping_fee'] ?? 0,
                'discount' => $validated['discount'] ?? 0,
                'total_amount' => $validated['total_amount'] ?? 0,
                'notes' => $validated['notes'] ?? null,
                'shipping_address' => $validated['shipping_address'],
                'billing_address' => $validated['billing_address'] ?? $validated['shipping_address'],
                'payment_method' => $validated['payment_method'],
            ]);

            // Create order items
            foreach ($validated['items'] as $itemData) {
                $product = ShopPost::findOrFail($itemData['shop_post_id']);

                $itemPrice = $product->sale_price ?? $product->price ?? 0;
                $quantity = $itemData['quantity'];
                $itemSubtotal = $itemPrice * $quantity;

                OrderItem::create([
                    'purchase_order_id' => $order->id,
                    'shop_post_id' => $product->id,
                    'product_name' => $product->title,
                    'product_type' => $product->product_type,
                    'quantity' => $quantity,
                    'unit_price' => $itemPrice,
                    'subtotal' => $itemSubtotal,
                    'variant_options' => $itemData['variant_options'] ?? null,
                    'download_files' => $product->product_type === 'Tải xuống' ? $product->download_files : null,
                    'link_files' => $product->product_type === 'Tải xuống' ? $product->link_files : null,
                ]);
            }

            // Reload with relationships
            $order->load(['items', 'shop', 'customer']);

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => new PurchaseOrderResource($order),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update order status (admin/seller only)
     */
    public function updateStatus(Request $request, $orderId): JsonResponse
    {
        $order = PurchaseOrder::find($orderId);

        if (!$order) {
            return response()->json([
                'message' => 'Order not found',
            ], 404);
        }

        $user = $request->user();

        // Check authorization - only order owner or shop owner can update
        if ($order->user_id !== $user->ID && ($order->shop_id && $order->shop->user_id !== $user->ID)) {
            return response()->json([
                'message' => 'Unauthorized to update this order',
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,processing,completed,cancelled',
        ]);

        $order->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Order status updated',
            'order' => new PurchaseOrderResource($order->load(['items', 'shop', 'customer'])),
        ]);
    }

    /**
     * Get orders by status
     */
    public function byStatus(Request $request, $status): ResourceCollection
    {
        $validStatuses = ['pending', 'processing', 'completed', 'cancelled'];

        if (!in_array($status, $validStatuses)) {
            return response()->json([
                'message' => 'Invalid status',
            ], 400);
        }

        $user = $request->user();
        $perPage = min($request->input('per_page', 15), 100);

        $orders = PurchaseOrder::where('user_id', $user->ID)
            ->where('status', $status)
            ->with(['items', 'shop', 'customer'])
            ->latest()
            ->paginate($perPage);

        return PurchaseOrderResource::collection($orders);
    }

    /**
     * Get simple product orders
     */
    public function simpleProducts(Request $request): ResourceCollection
    {
        $user = $request->user();
        $perPage = min($request->input('per_page', 15), 100);

        $orders = PurchaseOrder::where('user_id', $user->ID)
            ->with(['items' => function ($query) {
                $query->where('product_type', 'Đơn giản');
            }, 'shop', 'customer'])
            ->latest()
            ->paginate($perPage);

        return PurchaseOrderResource::collection($orders);
    }

    /**
     * Get variant product orders
     */
    public function variantProducts(Request $request): ResourceCollection
    {
        $user = $request->user();
        $perPage = min($request->input('per_page', 15), 100);

        $orders = PurchaseOrder::where('user_id', $user->ID)
            ->with(['items' => function ($query) {
                $query->where('product_type', 'Biến thể');
            }, 'shop', 'customer'])
            ->latest()
            ->paginate($perPage);

        return PurchaseOrderResource::collection($orders);
    }

    /**
     * Get download product orders
     */
    public function downloadProducts(Request $request): ResourceCollection
    {
        $user = $request->user();
        $perPage = min($request->input('per_page', 15), 100);

        $orders = PurchaseOrder::where('user_id', $user->ID)
            ->with(['items' => function ($query) {
                $query->where('product_type', 'Tải xuống');
            }, 'shop', 'customer'])
            ->latest()
            ->paginate($perPage);

        return PurchaseOrderResource::collection($orders);
    }
}
