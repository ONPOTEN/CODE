<?php

namespace App\Http\Controllers\Api;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class S3Controller extends Controller
{
    private S3Client $s3Client;

    public function __construct()
    {
        // Initialize S3 client with environment configuration
        $this->s3Client = new S3Client([
            'version'     => 'latest',
            'region'      => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'endpoint'    => env('AWS_ENDPOINT', 'https://atm288528-s3user.vcos1.cloudstorage.com.vn'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'credentials' => [
                'key'    => env('AWS_ACCESS_KEY_ID', 'atm288528-s3user'),
                'secret' => env('AWS_SECRET_ACCESS_KEY', 'uyGvK4sEyxebDG3FIkxWBuluOr4h/qqreLVkWQtq'),
            ],
            'http' => [
                'verify' => false,
            ],
        ]);

        \Log::info('S3Client initialized', [
            'endpoint' => env('AWS_ENDPOINT'),
            'bucket' => env('AWS_BUCKET'),
            'region' => env('AWS_DEFAULT_REGION'),
        ]);
    }

    /**
     * Generate a presigned URL for direct S3 upload
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generatePresignedUrl(Request $request): JsonResponse
    {
        try {
            \Log::info('[S3] Presigned URL request received');

            // Validate request
            $validated = $request->validate([
                'filename' => 'required|string|max:255',
                'content_type' => 'required|string|max:100',
            ]);

            $filename = $validated['filename'];
            $contentType = $validated['content_type'];
            $bucket = env('AWS_BUCKET', 'centimet2file');

            \Log::info('[S3] Generating presigned URL', [
                'filename' => $filename,
                'content_type' => $contentType,
                'bucket' => $bucket,
            ]);

            // Generate unique key
            $timestamp = time();
            $userId = $request->user()->ID ?? 'anonymous';
            $fileKey = "posts/{$userId}/{$timestamp}-{$filename}";

            \Log::info('[S3] Generated file key', ['file_key' => $fileKey]);

            // Generate presigned URL (valid for 20 minutes)
            $cmd = $this->s3Client->getCommand('PutObject', [
                'Bucket' => $bucket,
                'Key'    => $fileKey,
                'ContentType' => $contentType,
                'ACL'    => 'private',
            ]);

            $presignedRequest = $this->s3Client->createPresignedRequest($cmd, '+20 minutes');
            $presignedUrl = (string)$presignedRequest->getUri();

            \Log::info('[S3] Presigned URL generated successfully', [
                'file_key' => $fileKey,
                'url_length' => strlen($presignedUrl),
            ]);

            return response()->json([
                'success' => true,
                'presigned_url' => $presignedUrl,
                'file_key' => $fileKey,
                'expires_in' => 1200, // 20 minutes in seconds
            ], 200);

        } catch (AwsException $e) {
            \Log::error('[S3] AWS Error', [
                'error' => $e->getMessage(),
                'code' => $e->getAwsErrorCode(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate presigned URL',
                'error' => $e->getMessage(),
                'aws_code' => $e->getAwsErrorCode(),
            ], 500);
        } catch (\Exception $e) {
            \Log::error('[S3] General Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while generating presigned URL',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload file directly to S3 (proxy to bypass CORS issues)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadFile(Request $request): JsonResponse
    {
        try {
            \Log::info('[S3] Direct upload request received');

            // Validate request
            $validated = $request->validate([
                'file' => 'required|file|max:10240|mimes:jpeg,jpg,png,gif,webp', // Max 10MB, image types
            ]);

            $file = $request->file('file');
            $bucket = env('AWS_BUCKET', 'centimet2file');
            $userId = $request->user()->ID ?? 'anonymous';

            // Generate unique key
            $timestamp = time();
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '', pathinfo($originalName, PATHINFO_FILENAME));
            $fileKey = "posts/{$userId}/{$timestamp}-{$safeName}.{$extension}";

            \Log::info('[S3] Uploading file', [
                'original_name' => $originalName,
                'file_key' => $fileKey,
                'content_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            // Upload to S3
            $result = $this->s3Client->putObject([
                'Bucket' => $bucket,
                'Key'    => $fileKey,
                'Body'   => fopen($file->getRealPath(), 'rb'),
                'ContentType' => $file->getMimeType(),
                'ACL'    => 'public-read',
            ]);

            // Build the public URL
            $endpoint = env('AWS_ENDPOINT', 'https://atm288528-s3user.vcos1.cloudstorage.com.vn');
            $fileUrl = "{$endpoint}/{$bucket}/{$fileKey}";

            \Log::info('[S3] File uploaded successfully', [
                'file_key' => $fileKey,
                'url' => $fileUrl,
            ]);

            return response()->json([
                'success' => true,
                'file_url' => $fileUrl,
                'file_key' => $fileKey,
            ], 200);

        } catch (AwsException $e) {
            \Log::error('[S3] AWS Upload Error', [
                'error' => $e->getMessage(),
                'code' => $e->getAwsErrorCode(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file to S3',
                'error' => $e->getMessage(),
            ], 500);
        } catch (\Exception $e) {
            \Log::error('[S3] Upload Error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while uploading file',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an object from S3
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function deleteObject(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'file_key' => 'required|string',
            ]);

            $this->s3Client->deleteObject([
                'Bucket' => env('AWS_BUCKET', 'centimet2file'),
                'Key'    => $validated['file_key'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'File deleted successfully',
            ], 200);

        } catch (AwsException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete file',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
