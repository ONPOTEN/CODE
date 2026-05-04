<?php

namespace App\Jobs;

use App\Models\ShopPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessVideoUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 600; // 10 minutes timeout for large videos

    /**
     * @var int
     */
    protected $shopId;

    /**
     * @var int
     */
    protected $postId;

    /**
     * @var string|null
     */
    protected $tempPath;

    /**
     * Create a new job instance.
     *
     * @param int $shopId
     * @param int $postId
     * @param string|null $tempPath Temporary path of uploaded video file
     */
    public function __construct($shopId, $postId, $tempPath = null)
    {
        $this->shopId = $shopId;
        $this->postId = $postId;
        $this->tempPath = $tempPath;

        // Set queue name for video processing
        $this->onQueue('video-uploads');
    }

    /**
     * Execute job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            $shopPost = ShopPost::find($this->postId);

            if (!$shopPost) {
                Log::error('[ProcessVideoUpload] Shop post not found', [
                    'post_id' => $this->postId,
                    'shop_id' => $this->shopId,
                ]);
                return;
            }

            // Guard: tempPath must be set
            if (!$this->tempPath) {
                Log::error('[ProcessVideoUpload] No temp path provided', [
                    'post_id' => $this->postId,
                    'shop_id' => $this->shopId,
                ]);
                $shopPost->video_upload_status = 'failed';
                $shopPost->video_upload_error = 'No temp video path provided';
                $shopPost->save();
                return;
            }

            // Update status to uploading
            $shopPost->video_upload_status = 'uploading';
            $shopPost->save();

            Log::info('[ProcessVideoUpload] Starting video upload', [
                'post_id'   => $this->postId,
                'shop_id'   => $this->shopId,
                'temp_path' => $this->tempPath,
            ]);

            // Check existence using the Storage facade (no physical path needed)
            if (!Storage::disk('local')->exists($this->tempPath)) {
                throw new \Exception(
                    'Temp video file not found in local storage: ' . $this->tempPath .
                    ' (disk root: ' . Storage::disk('local')->path('') . ')'
                );
            }

            // Generate filename and S3 directory
            $now = now();
            $directory = "shop_videos/{$this->shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";
            $extension = pathinfo($this->tempPath, PATHINFO_EXTENSION) ?: 'mp4';
            $filename  = time() . '_' . Str::random(10) . '.' . $extension;
            $s3Key     = "{$directory}/{$filename}";

            Log::info('[ProcessVideoUpload] Uploading to S3 via stream', [
                'post_id'   => $this->postId,
                'temp_path' => $this->tempPath,
                'disk_root' => Storage::disk('local')->path(''),
                's3_key'    => $s3Key,
            ]);

            // Stream directly from local disk to S3 — no absolute path needed
            $stream = Storage::disk('local')->readStream($this->tempPath);
            $s3Path = Storage::disk('s3')->put($s3Key, $stream, 'public');

            if ($stream && is_resource($stream)) {
                fclose($stream);
            }

            if ($s3Path) {
                // Store relative path: shopid/year/month/day/filename
                $relativePath = "{$this->shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}";
                $shopPost->video = $relativePath;
                $shopPost->video_upload_status = 'completed';
                $shopPost->save();

                Log::info('[ProcessVideoUpload] Video uploaded successfully', [
                    'post_id'    => $this->postId,
                    'video_path' => $relativePath,
                    's3_path'    => $s3Path,
                ]);
            } else {
                throw new \Exception('Failed to upload video to S3 — putFileAs returned false');
            }

            // Clean up local temp file after successful upload
            if (Storage::disk('local')->exists($this->tempPath)) {
                Storage::disk('local')->delete($this->tempPath);
                Log::info('[ProcessVideoUpload] Local temp file deleted', ['temp_path' => $this->tempPath]);
            }
        } catch (\Exception $e) {
            Log::error('[ProcessVideoUpload] Exception occurred', [
                'post_id' => $this->postId,
                'shop_id' => $this->shopId,
                'error'   => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);

            // Update status to failed
            if ($shopPost = ShopPost::find($this->postId)) {
                $shopPost->video_upload_status = 'failed';
                $shopPost->video_upload_error  = $e->getMessage();
                $shopPost->save();
            }

            // Clean up temp file on failure
            if ($this->tempPath && Storage::disk('local')->exists($this->tempPath)) {
                Storage::disk('local')->delete($this->tempPath);
                Log::info('[ProcessVideoUpload] Temp file cleaned up after error', ['temp_path' => $this->tempPath]);
            }

            $this->fail($e);
        }
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception)
    {
        Log::error('[ProcessVideoUpload] Job failed', [
            'post_id' => $this->postId,
            'shop_id' => $this->shopId,
            'error' => $exception->getMessage(),
        ]);

        // Update post status to failed
        if ($shopPost = ShopPost::find($this->postId)) {
            $shopPost->video_upload_status = 'failed';
            $shopPost->video_upload_error = $exception->getMessage();
            $shopPost->save();
        }

        // Clean up temp file
        if ($this->tempPath && Storage::disk('local')->exists($this->tempPath)) {
            Storage::disk('local')->delete($this->tempPath);
            Log::info('[ProcessVideoUpload] Temp file cleaned up', ['temp_path' => $this->tempPath]);
        }
    }
}
