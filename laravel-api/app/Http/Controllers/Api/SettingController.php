<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get all settings (admin only)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Setting::query();

        // Filter by group
        if ($request->has('group')) {
            $query->where('group', $request->group);
        }

        $settings = $query->orderBy('group')->orderBy('key')->get();

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get settings by group (public for image settings)
     */
    public function getByGroup(string $group): JsonResponse
    {
        $settings = Setting::getByGroup($group);

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get a single setting by key
     */
    public function show(string $key): JsonResponse
    {
        $setting = Setting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    /**
     * Create or update a setting (admin only)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key' => 'required|string|max:255',
            'value' => 'nullable|string',
            'type' => 'sometimes|string|in:string,integer,boolean,json',
            'group' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $setting = Setting::setValue(
            $validated['key'],
            $validated['value'] ?? '',
            $validated['type'] ?? 'string',
            $validated['group'] ?? 'general',
            $validated['description'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Setting saved successfully',
            'data' => $setting,
        ]);
    }

    /**
     * Update multiple settings at once (admin only)
     */
    public function updateBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|max:255',
            'settings.*.value' => 'nullable|string',
            'settings.*.type' => 'sometimes|string|in:string,integer,boolean,json',
            'settings.*.group' => 'sometimes|string|max:255',
            'settings.*.description' => 'nullable|string|max:500',
        ]);

        $updated = [];

        foreach ($validated['settings'] as $settingData) {
            $setting = Setting::setValue(
                $settingData['key'],
                $settingData['value'] ?? '',
                $settingData['type'] ?? 'string',
                $settingData['group'] ?? 'general',
                $settingData['description'] ?? null
            );
            $updated[] = $setting;
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings saved successfully',
            'data' => $updated,
        ]);
    }

    /**
     * Delete a setting (admin only)
     */
    public function destroy(string $key): JsonResponse
    {
        $setting = Setting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found',
            ], 404);
        }

        $setting->delete();

        return response()->json([
            'success' => true,
            'message' => 'Setting deleted successfully',
        ]);
    }

    /**
     * Get image settings (public)
     */
    public function getImageSettings(): JsonResponse
    {
        $imageSettings = [
            'image_width' => Setting::getValue('image_width', 1200),
            'image_height' => Setting::getValue('image_height', 1200),
            'image_quality' => Setting::getValue('image_quality', 80),
            'max_file_size' => Setting::getValue('max_file_size', 10), // MB
        ];

        return response()->json([
            'success' => true,
            'data' => $imageSettings,
        ]);
    }

    /**
     * Update image settings (admin only)
     */
    public function updateImageSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image_width' => 'sometimes|integer|min:100|max:4096',
            'image_height' => 'sometimes|integer|min:100|max:4096',
            'image_quality' => 'sometimes|integer|min:10|max:100',
            'max_file_size' => 'sometimes|integer|min:1|max:100',
        ]);

        $updated = [];

        if (isset($validated['image_width'])) {
            $updated[] = Setting::setValue('image_width', $validated['image_width'], 'integer', 'image', 'Image max width in pixels');
        }

        if (isset($validated['image_height'])) {
            $updated[] = Setting::setValue('image_height', $validated['image_height'], 'integer', 'image', 'Image max height in pixels');
        }

        if (isset($validated['image_quality'])) {
            $updated[] = Setting::setValue('image_quality', $validated['image_quality'], 'integer', 'image', 'Image quality (10-100)');
        }

        if (isset($validated['max_file_size'])) {
            $updated[] = Setting::setValue('max_file_size', $validated['max_file_size'], 'integer', 'image', 'Max file size in MB');
        }

        return response()->json([
            'success' => true,
            'message' => 'Image settings updated successfully',
            'data' => $updated,
        ]);
    }

    /**
     * Get video settings (public)
     */
    public function getVideoSettings(): JsonResponse
    {
        $videoSettings = [
            'video_width' => Setting::getValue('video_width', 1920),
            'video_height' => Setting::getValue('video_height', 1080),
            'video_max_file_size' => Setting::getValue('video_max_file_size', 100), // MB
        ];

        return response()->json([
            'success' => true,
            'data' => $videoSettings,
        ]);
    }

    /**
     * Update video settings (admin only)
     */
    public function updateVideoSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'video_width' => 'sometimes|integer|min:320|max:4096',
            'video_height' => 'sometimes|integer|min:240|max:4096',
            'video_max_file_size' => 'sometimes|integer|min:1|max:500',
        ]);

        $updated = [];

        if (isset($validated['video_width'])) {
            $updated[] = Setting::setValue('video_width', $validated['video_width'], 'integer', 'video', 'Video max width in pixels');
        }

        if (isset($validated['video_height'])) {
            $updated[] = Setting::setValue('video_height', $validated['video_height'], 'integer', 'video', 'Video max height in pixels');
        }

        if (isset($validated['video_max_file_size'])) {
            $updated[] = Setting::setValue('video_max_file_size', $validated['video_max_file_size'], 'integer', 'video', 'Video max file size in MB');
        }

        return response()->json([
            'success' => true,
            'message' => 'Video settings updated successfully',
            'data' => $updated,
        ]);
    }
}
