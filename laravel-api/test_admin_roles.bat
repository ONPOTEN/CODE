@echo off
REM Admin Role Management Testing Script for Windows
REM This script tests the admin-only role management functionality

setlocal enabledelayedexpansion

REM Configuration
set API_URL=http://localhost:8000/api/v1
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=password
set USER_USERNAME=testuser
set USER_PASSWORD=password123

echo ========================================
echo Admin Role Management Testing
echo ========================================
echo.

REM Test 1: Login as Admin
echo Test 1: Login as Admin
curl -s -X POST "%API_URL%/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"%ADMIN_USERNAME%\",\"password\":\"%ADMIN_PASSWORD%\"}" > admin_login.json

REM Extract token (requires jq or manual parsing)
REM For simplicity, showing the response
echo Response saved to admin_login.json
type admin_login.json
echo.
echo Please extract the admin token from the response above and set it:
set /p ADMIN_TOKEN="Enter Admin Token: "

if "%ADMIN_TOKEN%"=="" (
    echo ERROR: Admin token is required
    exit /b 1
)

echo.
echo Test 2: Get All Users as Admin
curl -X GET "%API_URL%/admin/users?per_page=5" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Accept: application/json"
echo.

echo.
echo Test 3: Update User Role (Enter User ID to test)
set /p TEST_USER_ID="Enter User ID to update (or press Enter to skip): "

if not "%TEST_USER_ID%"=="" (
    echo Updating user %TEST_USER_ID% role to moderator...
    curl -X PUT "%API_URL%/admin/users/%TEST_USER_ID%/role" ^
      -H "Authorization: Bearer %ADMIN_TOKEN%" ^
      -H "Content-Type: application/json" ^
      -d "{\"role\":\"moderator\"}"
    echo.

    echo Reverting role back to user...
    curl -X PUT "%API_URL%/admin/users/%TEST_USER_ID%/role" ^
      -H "Authorization: Bearer %ADMIN_TOKEN%" ^
      -H "Content-Type: application/json" ^
      -d "{\"role\":\"user\"}"
    echo.
)

echo.
echo Test 4: Filter Users by Role (admin)
curl -X GET "%API_URL%/admin/users?role=admin" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Accept: application/json"
echo.

echo.
echo ========================================
echo Testing Complete
echo ========================================
echo.
echo To test as regular user:
echo 1. Login with regular user credentials
echo 2. Try to access: PUT %API_URL%/admin/users/{id}/role
echo 3. Should receive: 403 Forbidden
echo.

REM Cleanup
del admin_login.json 2>nul

endlocal
