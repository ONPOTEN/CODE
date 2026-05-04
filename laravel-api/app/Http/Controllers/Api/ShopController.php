<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShopResource;
use App\Models\Shop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        $query = Shop::with('owner');

        // Only show active shops for public, unless admin
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            $query->where('status', 'active');
        } elseif ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $perPage = min($request->input('per_page', 15), 100);
        $shops = $query->latest()->paginate($perPage);

        return ShopResource::collection($shops);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'banner' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_1' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_2' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_3' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_4' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_5' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        // Handle logo upload - store relative path, ShopResource will convert to URL
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('shops/logos', 's3');
            $validated['logo'] = $logoPath;
        }

        // Handle banner upload - store relative path, ShopResource will convert to URL
        if ($request->hasFile('banner')) {
            $bannerPath = $request->file('banner')->store('shops/banners', 's3');
            $validated['banner'] = $bannerPath;
        }

        // Handle 5 image uploads - store relative paths, ShopResource will convert to URLs
        for ($i = 1; $i <= 5; $i++) {
            $imageKey = 'image_' . $i;
            if ($request->hasFile($imageKey)) {
                $imagePath = $request->file($imageKey)->store('shops/images', 's3');
                $validated[$imageKey] = $imagePath;
            }
        }

        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;

        while (Shop::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $shop = Shop::create([
            'user_id' => $request->user()->ID,
            'slug' => $slug,
            'status' => 'pending',
            ...$validated,
        ]);

        return response()->json([
            'message' => 'Shop created successfully. Pending admin approval.',
            'shop' => new ShopResource($shop->load('owner')),
        ], 201);
    }

    public function show($id)
    {
        $shop = Shop::with('owner')->findOrFail($id);
        return new ShopResource($shop);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $shop = Shop::findOrFail($id);

        if ($shop->user_id !== $request->user()->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only edit your own shop.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'status' => 'sometimes|in:active,inactive,pending',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'banner' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_1' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_2' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_3' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_4' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_5' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        // Handle logo upload - store relative path, ShopResource will convert to URL
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('shops/logos', 's3');
            $validated['logo'] = $logoPath;
        }

        // Handle banner upload - store relative path, ShopResource will convert to URL
        if ($request->hasFile('banner')) {
            $bannerPath = $request->file('banner')->store('shops/banners', 's3');
            $validated['banner'] = $bannerPath;
        }

        // Handle 5 image uploads - store relative paths, ShopResource will convert to URLs
        for ($i = 1; $i <= 5; $i++) {
            $imageKey = 'image_' . $i;
            if ($request->hasFile($imageKey)) {
                $imagePath = $request->file($imageKey)->store('shops/images', 's3');
                $validated[$imageKey] = $imagePath;
            }
        }

        if (isset($validated['name']) && $validated['name'] !== $shop->name) {
            $slug = Str::slug($validated['name']);
            $originalSlug = $slug;
            $counter = 1;

            while (Shop::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            $shop->slug = $slug;
        }

        $shop->update($validated);

        return response()->json([
            'message' => 'Shop updated successfully',
            'shop' => new ShopResource($shop->load('owner')),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $shop = Shop::findOrFail($id);

        if ($shop->user_id !== request()->user()->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only delete your own shop.',
            ], 403);
        }

        $shop->delete();

        return response()->json([
            'message' => 'Shop deleted successfully',
        ]);
    }

    public function myShops(Request $request)
    {
        $user = $request->user();
        $query = Shop::where('user_id', $user->ID)->with('owner');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min($request->input('per_page', 15), 100);
        $shops = $query->latest()->paginate($perPage);

        return ShopResource::collection($shops);
    }

    /**
     * Get all pending shops (Admin only)
     */
    public function pendingShops(Request $request)
    {
        $query = Shop::where('status', 'pending')->with('owner');

        $perPage = min($request->input('per_page', 15), 100);
        $shops = $query->latest()->paginate($perPage);

        return ShopResource::collection($shops);
    }

    /**
     * Approve a shop (Admin only)
     */
    public function approve($id): JsonResponse
    {
        $shop = Shop::findOrFail($id);

        if ($shop->status !== 'pending') {
            return response()->json([
                'message' => 'Shop is not pending approval',
            ], 400);
        }

        $shop->update(['status' => 'active']);

        return response()->json([
            'message' => 'Shop approved successfully',
            'shop' => new ShopResource($shop->load('owner')),
        ]);
    }

    /**
     * Reject a shop (Admin only)
     */
    public function reject($id): JsonResponse
    {
        $shop = Shop::findOrFail($id);

        if ($shop->status !== 'pending') {
            return response()->json([
                'message' => 'Shop is not pending approval',
            ], 400);
        }

        $shop->update(['status' => 'inactive']);

        return response()->json([
            'message' => 'Shop rejected',
            'shop' => new ShopResource($shop->load('owner')),
        ]);
    }
}
