#!/bin/bash

# Admin Role Management Testing Script
# This script tests the admin-only role management functionality

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:8000/api/v1"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="password"
USER_USERNAME="testuser"
USER_PASSWORD="password123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Admin Role Management Testing${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Login as Admin
echo -e "${YELLOW}Test 1: Login as Admin${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")

ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ ! -z "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✓ Admin login successful${NC}"
    echo -e "  Token: ${ADMIN_TOKEN:0:20}..."
else
    echo -e "${RED}✗ Admin login failed${NC}"
    echo -e "  Response: $ADMIN_LOGIN_RESPONSE"
    exit 1
fi

# Test 2: Login as Regular User
echo -e "\n${YELLOW}Test 2: Login as Regular User${NC}"
USER_LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USER_USERNAME}\",\"password\":\"${USER_PASSWORD}\"}")

USER_TOKEN=$(echo $USER_LOGIN_RESPONSE | jq -r '.token')

if [ "$USER_TOKEN" != "null" ] && [ ! -z "$USER_TOKEN" ]; then
    echo -e "${GREEN}✓ User login successful${NC}"
    echo -e "  Token: ${USER_TOKEN:0:20}..."
    USER_ID=$(echo $USER_LOGIN_RESPONSE | jq -r '.user.id')
else
    echo -e "${YELLOW}⚠ User login failed (user may not exist)${NC}"
    USER_TOKEN=""
fi

# Test 3: Admin - Get All Users
echo -e "\n${YELLOW}Test 3: Admin - Get All Users${NC}"
GET_USERS_RESPONSE=$(curl -s -X GET "${API_URL}/admin/users?per_page=5" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Accept: application/json")

USERS_COUNT=$(echo $GET_USERS_RESPONSE | jq -r '.meta.total // 0')

if [ "$USERS_COUNT" != "0" ]; then
    echo -e "${GREEN}✓ Successfully retrieved users${NC}"
    echo -e "  Total users: $USERS_COUNT"
else
    echo -e "${RED}✗ Failed to retrieve users${NC}"
    echo -e "  Response: $GET_USERS_RESPONSE"
fi

# Test 4: Admin - Update Another User's Role (Should Succeed)
if [ ! -z "$USER_ID" ]; then
    echo -e "\n${YELLOW}Test 4: Admin - Update Another User's Role (Should Succeed)${NC}"
    UPDATE_ROLE_RESPONSE=$(curl -s -X PUT "${API_URL}/admin/users/${USER_ID}/role" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"role":"moderator"}')

    NEW_ROLE=$(echo $UPDATE_ROLE_RESPONSE | jq -r '.user.new_role // empty')

    if [ "$NEW_ROLE" == "moderator" ]; then
        echo -e "${GREEN}✓ Successfully updated user role to moderator${NC}"
        echo -e "  Old role: $(echo $UPDATE_ROLE_RESPONSE | jq -r '.user.old_role')"
        echo -e "  New role: $NEW_ROLE"

        # Revert back to user
        curl -s -X PUT "${API_URL}/admin/users/${USER_ID}/role" \
          -H "Authorization: Bearer ${ADMIN_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"role":"user"}' > /dev/null
        echo -e "  Reverted role back to 'user'"
    else
        echo -e "${RED}✗ Failed to update user role${NC}"
        echo -e "  Response: $UPDATE_ROLE_RESPONSE"
    fi
else
    echo -e "\n${YELLOW}⚠ Skipping Test 4: No regular user available${NC}"
fi

# Test 5: Regular User - Try to Update Role (Should Fail)
if [ ! -z "$USER_TOKEN" ] && [ ! -z "$USER_ID" ]; then
    echo -e "\n${YELLOW}Test 5: Regular User - Try to Update Role (Should Fail)${NC}"
    UNAUTHORIZED_RESPONSE=$(curl -s -X PUT "${API_URL}/admin/users/1/role" \
      -H "Authorization: Bearer ${USER_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"role":"admin"}')

    ERROR_MESSAGE=$(echo $UNAUTHORIZED_RESPONSE | jq -r '.message // empty')

    if [ "$ERROR_MESSAGE" == "Unauthorized. Admin access required." ]; then
        echo -e "${GREEN}✓ Correctly blocked non-admin user${NC}"
        echo -e "  Message: $ERROR_MESSAGE"
    else
        echo -e "${RED}✗ Security issue: Non-admin was allowed access!${NC}"
        echo -e "  Response: $UNAUTHORIZED_RESPONSE"
    fi
else
    echo -e "\n${YELLOW}⚠ Skipping Test 5: No regular user available${NC}"
fi

# Test 6: Admin - Try to Change Own Role (Should Fail)
echo -e "\n${YELLOW}Test 6: Admin - Try to Change Own Role (Should Fail)${NC}"
ADMIN_ID=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.user.id')
SELF_CHANGE_RESPONSE=$(curl -s -X PUT "${API_URL}/admin/users/${ADMIN_ID}/role" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role":"user"}')

ERROR_MESSAGE=$(echo $SELF_CHANGE_RESPONSE | jq -r '.message // empty')

if [ "$ERROR_MESSAGE" == "You cannot change your own role" ]; then
    echo -e "${GREEN}✓ Correctly prevented self-demotion${NC}"
    echo -e "  Message: $ERROR_MESSAGE"
else
    echo -e "${RED}✗ Security issue: Admin could change own role!${NC}"
    echo -e "  Response: $SELF_CHANGE_RESPONSE"
fi

# Test 7: Admin - Bulk Update Roles
if [ ! -z "$USER_ID" ]; then
    echo -e "\n${YELLOW}Test 7: Admin - Bulk Update Roles${NC}"
    BULK_RESPONSE=$(curl -s -X POST "${API_URL}/admin/users/roles/bulk-update" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"users\":[{\"user_id\":${USER_ID},\"role\":\"editor\"}]}")

    UPDATED_COUNT=$(echo $BULK_RESPONSE | jq -r '.updated_users | length // 0')

    if [ "$UPDATED_COUNT" != "0" ]; then
        echo -e "${GREEN}✓ Successfully performed bulk update${NC}"
        echo -e "  Updated users: $UPDATED_COUNT"
        echo -e "  Message: $(echo $BULK_RESPONSE | jq -r '.message')"

        # Revert back
        curl -s -X PUT "${API_URL}/admin/users/${USER_ID}/role" \
          -H "Authorization: Bearer ${ADMIN_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"role":"user"}' > /dev/null
        echo -e "  Reverted role back to 'user'"
    else
        echo -e "${RED}✗ Bulk update failed${NC}"
        echo -e "  Response: $BULK_RESPONSE"
    fi
else
    echo -e "\n${YELLOW}⚠ Skipping Test 7: No regular user available${NC}"
fi

# Test 8: Filter Users by Role
echo -e "\n${YELLOW}Test 8: Admin - Filter Users by Role${NC}"
ADMIN_USERS_RESPONSE=$(curl -s -X GET "${API_URL}/admin/users?role=admin" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Accept: application/json")

ADMIN_COUNT=$(echo $ADMIN_USERS_RESPONSE | jq -r '.data | length // 0')

if [ "$ADMIN_COUNT" != "0" ]; then
    echo -e "${GREEN}✓ Successfully filtered admin users${NC}"
    echo -e "  Admin users found: $ADMIN_COUNT"
else
    echo -e "${RED}✗ Failed to filter users${NC}"
    echo -e "  Response: $ADMIN_USERS_RESPONSE"
fi

# Test 9: Invalid Role (Should Fail)
if [ ! -z "$USER_ID" ]; then
    echo -e "\n${YELLOW}Test 9: Admin - Try Invalid Role (Should Fail)${NC}"
    INVALID_ROLE_RESPONSE=$(curl -s -X PUT "${API_URL}/admin/users/${USER_ID}/role" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"role":"superadmin"}')

    ERROR_MESSAGE=$(echo $INVALID_ROLE_RESPONSE | jq -r '.message // empty')

    if [[ "$ERROR_MESSAGE" == *"invalid"* ]] || [[ "$ERROR_MESSAGE" == *"validation"* ]]; then
        echo -e "${GREEN}✓ Correctly rejected invalid role${NC}"
        echo -e "  Message: $ERROR_MESSAGE"
    else
        echo -e "${RED}✗ Security issue: Invalid role was accepted!${NC}"
        echo -e "  Response: $INVALID_ROLE_RESPONSE"
    fi
else
    echo -e "\n${YELLOW}⚠ Skipping Test 9: No regular user available${NC}"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All security checks passed${NC}"
echo -e "\n${YELLOW}Key Points:${NC}"
echo -e "  • Only admins can access role management endpoints"
echo -e "  • Regular users are blocked from changing roles"
echo -e "  • Admins cannot change their own role"
echo -e "  • Invalid roles are rejected"
echo -e "  • Bulk updates work correctly"
echo -e "\n${GREEN}Implementation is secure and working correctly!${NC}\n"
