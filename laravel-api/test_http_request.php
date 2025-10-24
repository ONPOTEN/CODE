<?php
// Test HTTP request handling
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';

// Create a request
$phone = '+840867631313';
$request = \Illuminate\Http\Request::create(
    '/api/v1/users/by-phone?phone=' . urlencode($phone),
    'GET'
);

// Dispatch the request
$response = $app->handle($request);

echo "Response Status: " . $response->getStatusCode() . "\n";
echo "Response Body:\n";
echo $response->getContent() . "\n";
