<?php
require 'vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

// Load .env credentials
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// --- CONFIG FROM .ENV --- //
$endpoint = $_ENV['AWS_ENDPOINT'] ?? 'https://atm288528-s3user.vcos1.cloudstorage.com.vn';
$region   = $_ENV['AWS_DEFAULT_REGION'] ?? 'us-east-1';
$bucket   = $_ENV['AWS_BUCKET'] ?? 'centimet2file';
$accessKey = $_ENV['AWS_ACCESS_KEY_ID'] ?? 'atm288528-s3user';
$secretKey = $_ENV['AWS_SECRET_ACCESS_KEY'] ?? 'uyGvK4sEyxebDG3FIkxWBuluOr4h/qqreLVkWQtq';

echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║          S3 CREDENTIALS DIAGNOSTIC TOOL                      ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

echo "📋 CREDENTIALS CHECK (from .env):\n";
echo "├─ Access Key ID: $accessKey\n";
echo "├─ Secret Key Length: " . strlen($secretKey) . " characters\n";
echo "├─ Secret Key (first 15 + last 5): " . substr($secretKey, 0, 15) . "..." . substr($secretKey, -5) . "\n";
echo "├─ Endpoint: $endpoint\n";
echo "├─ Region: $region\n";
echo "└─ Bucket: $bucket\n\n";

// Check for common issues
echo "🔍 VALIDATION CHECKS:\n";

// Check 1: Empty values
if (empty($accessKey) || empty($secretKey)) {
    echo "├─ ❌ ERROR: Empty Access Key or Secret Key!\n";
    exit(1);
}
echo "├─ ✅ Credentials are not empty\n";

// Check 2: Special characters
if (preg_match('/[^\w\+\/\=\-]/', $secretKey)) {
    echo "├─ ⚠️  WARNING: Secret Key contains unusual characters\n";
}
echo "├─ ✅ Credential format looks normal\n";

// Check 3: URL validation
if (!filter_var($endpoint, FILTER_VALIDATE_URL)) {
    echo "├─ ❌ ERROR: Invalid endpoint URL!\n";
    exit(1);
}
echo "├─ ✅ Endpoint URL is valid\n";

// Check 4: HTTPS requirement
if (!str_starts_with($endpoint, 'https://')) {
    echo "├─ ⚠️  WARNING: Endpoint should use HTTPS\n";
} else {
    echo "└─ ✅ Endpoint uses HTTPS\n";
}

echo "\n" . str_repeat("─", 62) . "\n\n";

// Try to test ListBuckets (simpler operation)
echo "🧪 TEST 1: LIST BUCKETS (No bucket parameter)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$s3 = new S3Client([
    'version'     => 'latest',
    'region'      => $region,
    'endpoint'    => $endpoint,
    'use_path_style_endpoint' => true,
    'credentials' => [
        'key'    => $accessKey,
        'secret' => $secretKey,
    ],
    'http' => [
        'verify' => false,
    ],
]);

$listError = null;
try {
    $result = $s3->listBuckets();
    echo "✅ SUCCESS: ListBuckets worked!\n";
    echo "Available buckets:\n";
    foreach ($result['Buckets'] as $bucket_info) {
        echo "  - " . $bucket_info['Name'] . "\n";
    }
} catch (AwsException $e) {
    $listError = $e;
    echo "❌ FAILED: ListBuckets returned error\n";
    echo "Error Code: " . $e->getAwsErrorCode() . "\n";
    echo "Message: " . $e->getMessage() . "\n\n";

    if ($e->getAwsErrorCode() === 'SignatureDoesNotMatch') {
        echo "🔴 DIAGNOSIS: Your credentials are INVALID or INCORRECT!\n";
        echo "   • Access Key ID may not exist\n";
        echo "   • Secret Access Key may be wrong\n";
        echo "   • Credentials may have been revoked\n";
        echo "   • Check ViettelCloud console to verify\n";
    }
}

echo "\n" . str_repeat("─", 62) . "\n\n";

// Try HeadBucket
echo "🧪 TEST 2: HEAD BUCKET (Check bucket exists)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$headError = null;
try {
    $result = $s3->headBucket([
        'Bucket' => $bucket,
    ]);
    echo "✅ SUCCESS: Bucket '$bucket' exists and is accessible!\n";
} catch (AwsException $e) {
    $headError = $e;
    echo "❌ FAILED: HeadBucket returned error\n";
    echo "Error Code: " . $e->getAwsErrorCode() . "\n";
    echo "Message: " . $e->getMessage() . "\n\n";

    if ($e->getAwsErrorCode() === 'NoSuchBucket') {
        echo "🔴 DIAGNOSIS: Bucket '$bucket' does not exist!\n";
    } elseif ($e->getAwsErrorCode() === 'SignatureDoesNotMatch') {
        echo "🔴 DIAGNOSIS: Your credentials are INVALID or INCORRECT!\n";
    } elseif ($e->getAwsErrorCode() === 'Forbidden') {
        echo "🔴 DIAGNOSIS: Access denied to bucket '$bucket'!\n";
        echo "   Check if your credentials have permissions for this bucket.\n";
    }
}

echo "\n" . str_repeat("─", 62) . "\n\n";

// Credential summary
echo "📊 DIAGNOSIS SUMMARY:\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

if ($listError && $listError->getAwsErrorCode() === 'SignatureDoesNotMatch') {
    echo "🔴 ISSUE IDENTIFIED: SignatureDoesNotMatch\n\n";
    echo "RECOMMENDED ACTIONS:\n";
    echo "1. Login to ViettelCloud S3 console\n";
    echo "2. Verify or regenerate credentials\n";
    echo "3. Copy the EXACT Access Key ID and Secret Access Key\n";
    echo "4. Update the credentials in .env file\n";
    echo "5. Run this diagnostic again\n";
} elseif (!$listError && !$headError) {
    echo "✅ All tests passed! Credentials are valid!\n";
    echo "You can now proceed with file uploads.\n";
} else {
    echo "⚠️  Some tests failed. Check the errors above.\n";
}

echo "\n";
