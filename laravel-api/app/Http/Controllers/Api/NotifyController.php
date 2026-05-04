<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NotifyController extends Controller
{
    /**
     * Get notification count for authenticated user (where ownid = current user)
     */
    public function getCount(Request $request): JsonResponse
    {
        $userId = $request->user()->ID;

        $count = Notify::where('ownid', $userId)
            ->where('status', 0)
            ->count();

        return response()->json([
            'count' => $count,
        ]);
    }

    /**
     * Get notifications for authenticated user (where ownid = current user)
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->ID;
        $perPage = $request->input('per_page', 20);

        $notifications = Notify::where('ownid', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $notifications->items(),
            'pagination' => [
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $userId = $request->user()->ID;

        $notification = Notify::where('id', $id)
            ->where('userid', $userId)
            ->first();

        if (!$notification) {
            return response()->json([
                'message' => 'Notification not found',
            ], 404);
        }

        $notification->update(['status' => 1]);

        return response()->json([
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $userId = $request->user()->ID;

        Notify::where('userid', $userId)
            ->where('status', 0)
            ->update(['status' => 1]);

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Emit notification via Socket.IO
     */
    public static function emitNotification($recipientId, $notificationData)
    {
        try {
            $socketUrl = env('SOCKET_IO_URL', 'http://localhost:3000');
            $fullUrl = $socketUrl . '/api/emit-notification';

            // DEBUG: Log before sending
            \Log::info('[SOCKET.IO DEBUG] Attempting to emit notification', [
                'timestamp' => now()->toIso8601String(),
                'recipientId' => $recipientId,
                'notificationType' => $notificationData['type'] ?? 'unknown',
                'postType' => $notificationData['posttype'] ?? 'unknown',
                'postId' => $notificationData['postid'] ?? 'unknown',
                'socketUrl' => $fullUrl,
                'fullNotificationData' => $notificationData,
            ]);

            $response = Http::timeout(5)->post($fullUrl, [
                'recipientId' => $recipientId,
                'notificationData' => $notificationData,
            ]);

            // DEBUG: Log response
            \Log::info('[SOCKET.IO DEBUG] Socket.IO server response', [
                'statusCode' => $response->status(),
                'body' => $response->body(),
                'success' => $response->successful(),
            ]);
        } catch (\Exception $e) {
            \Log::error('[SOCKET.IO ERROR] Notification emit failed: ' . $e->getMessage(), [
                'recipientId' => $recipientId,
                'notificationData' => $notificationData,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
