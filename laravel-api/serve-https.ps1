# Laravel HTTPS Development Server
# This script starts Laravel with HTTPS support on port 8000

Write-Host "Starting Laravel HTTPS Development Server on port 8000..." -ForegroundColor Green

# First, start the Laravel application on HTTP (internal)
$httpPort = 8080
Write-Host "Starting internal HTTP server on port $httpPort..." -ForegroundColor Yellow

# Start PHP built-in server in background
$phpProcess = Start-Process -FilePath "php" -ArgumentList "artisan", "serve", "--host=127.0.0.1", "--port=$httpPort" -NoNewWindow -PassThru -RedirectStandardOutput "storage\logs\php-server.log" -RedirectStandardError "storage\logs\php-server-error.log"

Write-Host "PHP server started (PID: $($phpProcess.Id))" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Laravel is running at: https://localhost:8000" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: You'll need to set up a reverse proxy for HTTPS." -ForegroundColor Yellow
Write-Host "The application is currently running on HTTP://127.0.0.1:$httpPort" -ForegroundColor Yellow
Write-Host ""
Write-Host "For full HTTPS support, consider using:" -ForegroundColor Cyan
Write-Host "  1. Laravel Valet (recommended for Windows)" -ForegroundColor White
Write-Host "  2. Docker with SSL certificates" -ForegroundColor White
Write-Host "  3. Nginx or Apache as reverse proxy" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow

# Wait for process to exit
Wait-Process -Id $phpProcess.Id
