<?php

namespace App\Jobs;

use App\Models\WpPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessPostVideoUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 600;

    protected $postId;
    protected $tempPath;
    protected $userId;

    public function __construct($postId, $userId, $tempPath = null)
    {
        $this->postId = $postId;
        $this->userId = $userId;
        $this->tempPath = $tempPath;
        $this->onQueue('video-uploads');
    }

    public function handle()
    {
        try {
            $post = WpPost::find($this->postId);

            if (!$post) {
                Log::error('[ProcessPostVideoUpload] Post not found', ['post_id' => $this->postId]);
                return;
            }

            if (!$this->tempPath) {
                Log::error('[ProcessPostVideoUpload] No temp path provided', ['post_id' => $this->postId]);
                $this->updateStatus($post, 'failed', 'No temp video path provided');
                return;
            }

            $this->updateStatus($post, 'uploading');

            Log::info('[ProcessPostVideoUpload] Starting video upload', [
                'post_id' => $this->postId,
                'temp_path' => $this->tempPath,
            ]);

            if (!Storage::disk('local')->exists($this->tempPath)) {
                throw new \Exception('Temp video file not found in local storage: ' . $this->tempPath);
            }

            $now = now();
            $directory = "videos/{$this->userId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";
            $extension = pathinfo($this->tempPath, PATHINFO_EXTENSION) ?: 'mp4';
            $filename  = time() . '_' . Str::random(10) . '.' . $extension;
            $s3Key     = "{$directory}/{$filename}";

            $stream = Storage::disk('local')->readStream($this->tempPath);
            $s3Path = Storage::disk('s3')->put($s3Key, $stream, 'public');

            if ($stream && is_resource($stream)) {
                fclose($stream);
            }

            if ($s3Path) {
                // Update video path meta
                $post->meta()->updateOrCreate(
                    ['post_id' => $post->ID, 'meta_key' => '_post_video'],
                    ['meta_value' => $s3Key]
                );

                $this->updateStatus($post, 'completed');

                Log::info('[ProcessPostVideoUpload] Video uploaded successfully', [
                    'post_id' => $this->postId,
                    's3_path' => $s3Key,
                ]);
            } else {
                throw new \Exception('Failed to upload video to S3 — put returned false');
            }

            if (Storage::disk('local')->exists($this->tempPath)) {
                Storage::disk('local')->delete($this->tempPath);
            }
        } catch (\Exception $e) {
            Log::error('[ProcessPostVideoUpload] Exception occurred', [
                'post_id' => $this->postId,
                'error'   => $e->getMessage(),
            ]);

            if ($post = WpPost::find($this->postId)) {
                $this->updateStatus($post, 'failed', $e->getMessage());
            }

            if ($this->tempPath && Storage::disk('local')->exists($this->tempPath)) {
                Storage::disk('local')->delete($this->tempPath);
            }

            $this->fail($e);
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error('[ProcessPostVideoUpload] Job failed', [
            'post_id' => $this->postId,
            'error' => $exception->getMessage(),
        ]);

        if ($post = WpPost::find($this->postId)) {
            $this->updateStatus($post, 'failed', $exception->getMessage());
        }

        if ($this->tempPath && Storage::disk('local')->exists($this->tempPath)) {
            Storage::disk('local')->delete($this->tempPath);
        }
    }

    protected function updateStatus($post, $status, $error = null)
    {
        $post->meta()->updateOrCreate(
            ['post_id' => $post->ID, 'meta_key' => '_video_upload_status'],
            ['meta_value' => $status]
        );

        if ($error !== null) {
            $post->meta()->updateOrCreate(
                ['post_id' => $post->ID, 'meta_key' => '_video_upload_error'],
                ['meta_value' => $error]
            );
        } else {
            // Delete error meta if it exists
            $post->meta()->where('meta_key', '_video_upload_error')->delete();
        }
    }
}
