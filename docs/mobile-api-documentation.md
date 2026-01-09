# Mobile API Documentation

## Overview

This document describes the REST API endpoints available for mobile application integration with the Home Care Management System. All mobile endpoints are prefixed with `/api/mobile/`.

**Base URL:** `https://your-domain.com/api/mobile`

---

## Authentication

The mobile API uses JWT (JSON Web Token) bearer authentication. After successful login, include the token in the `Authorization` header for all protected endpoints.

```
Authorization: Bearer <token>
```

Tokens expire after **7 days**. Log out to invalidate the token early.

---

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password, returns JWT token |
| POST | `/auth/logout` | Invalidate current token |
| GET | `/auth/profile` | Get current caregiver profile |
| GET | `/schedules` | Get caregiver's scheduled shifts |
| GET | `/schedules/history` | Get completed shift history |
| GET | `/schedules/:id` | Get single schedule details |
| POST | `/clock/in` | Clock in with GPS location |
| POST | `/clock/out` | Clock out with GPS location |
| GET | `/clients` | Get assigned clients |

---

## Authentication Endpoints

### Login

Authenticate a caregiver with email and password.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "caregiver@example.com",
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d",
  "caregiver": {
    "id": "uuid-string",
    "firstName": "John",
    "lastName": "Doe",
    "email": "caregiver@example.com",
    "phone": "+1234567890",
    "officeId": "office-uuid",
    "isActive": true,
    "hhaxCaregiverCode": "HHA123"
  }
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `missing_credentials` | Email and password are required |
| 401 | `invalid_credentials` | Invalid email or password |
| 401 | `no_password` | Account uses Google sign-in, password not set |
| 403 | `not_caregiver` | Account is not registered as a caregiver |
| 403 | `account_inactive` | Caregiver account is not active |
| 500 | `server_error` | Internal server error |

---

### Logout

Invalidate the current JWT token.

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 401 | `unauthorized` | Missing or invalid Authorization header |
| 401 | `invalid_token` | Token is invalid or expired |
| 500 | `server_error` | Logout failed |

---

### Get Profile

Retrieve the authenticated caregiver's profile.

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": "uuid-string",
  "firstName": "John",
  "lastName": "Doe",
  "email": "caregiver@example.com",
  "phone": "+1234567890",
  "officeId": "office-uuid",
  "isActive": true,
  "hhaxCaregiverCode": "HHA123"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 401 | `unauthorized` | Missing or invalid Authorization header |
| 401 | `invalid_token` | Token is invalid or expired |
| 404 | `not_found` | Caregiver not found |
| 500 | `server_error` | Internal server error |

---

## Schedule Endpoints

### Get Scheduled Shifts

Retrieve the caregiver's upcoming scheduled shifts.

**Endpoint:** `GET /schedules`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| startDate | string (YYYY-MM-DD) | No | 7 days ago | Start of date range |
| endDate | string (YYYY-MM-DD) | No | 14 days from now | End of date range |

**Example Request:**
```
GET /api/mobile/schedules?startDate=2024-01-15&endDate=2024-01-31
```

**Success Response (200):**
```json
{
  "schedules": [
    {
      "id": "schedule-uuid",
      "scheduledDate": "2024-01-20",
      "startTime": "09:00",
      "endTime": "13:00",
      "serviceType": "Personal Care",
      "status": "scheduled",
      "notes": "Client prefers morning visits",
      "clockInTime": null,
      "clockOutTime": null,
      "clockInLatitude": null,
      "clockInLongitude": null,
      "clockOutLatitude": null,
      "clockOutLongitude": null,
      "clockInDistance": null,
      "clockOutDistance": null,
      "evvStatus": "pending",
      "client": {
        "id": "client-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "address": "123 Main St, City, ST 12345",
        "phone": "+1987654321",
        "status": "active"
      }
    }
  ],
  "meta": {
    "startDate": "2024-01-15",
    "endDate": "2024-01-31",
    "count": 1
  }
}
```

---

### Get Shift History

Retrieve completed shift history with pagination.

**Endpoint:** `GET /schedules/history`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| startDate | string (YYYY-MM-DD) | No | 30 days ago | Start of date range |
| endDate | string (YYYY-MM-DD) | No | Today | End of date range |
| limit | number | No | 50 | Max results per page (max 100) |
| offset | number | No | 0 | Number of results to skip |

**Example Request:**
```
GET /api/mobile/schedules/history?limit=20&offset=0
```

**Success Response (200):**
```json
{
  "schedules": [
    {
      "id": "schedule-uuid",
      "scheduledDate": "2024-01-18",
      "startTime": "09:00",
      "endTime": "13:00",
      "serviceType": "Personal Care",
      "status": "completed",
      "notes": "Visit went well",
      "clockInTime": "2024-01-18T09:05:00.000Z",
      "clockOutTime": "2024-01-18T13:02:00.000Z",
      "clockInLatitude": "40.7128",
      "clockInLongitude": "-74.0060",
      "clockOutLatitude": "40.7128",
      "clockOutLongitude": "-74.0060",
      "clockInDistance": "150",
      "clockOutDistance": "120",
      "evvStatus": "verified",
      "hoursWorked": "3.95",
      "client": {
        "id": "client-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "address": "123 Main St, City, ST 12345",
        "phone": "+1987654321",
        "status": "active"
      }
    }
  ],
  "meta": {
    "startDate": "2023-12-19",
    "endDate": "2024-01-18",
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Get Single Schedule

Retrieve details for a specific schedule.

**Endpoint:** `GET /schedules/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Schedule UUID |

**Success Response (200):**
```json
{
  "id": "schedule-uuid",
  "scheduledDate": "2024-01-20",
  "startTime": "09:00",
  "endTime": "13:00",
  "serviceType": "Personal Care",
  "status": "scheduled",
  "notes": "Client prefers morning visits",
  "clockInTime": "2024-01-20T09:05:00.000Z",
  "clockOutTime": null,
  "clockInLatitude": "40.7128",
  "clockInLongitude": "-74.0060",
  "clockOutLatitude": null,
  "clockOutLongitude": null,
  "clockInDistance": "150",
  "clockOutDistance": null,
  "evvStatus": "clocked_in",
  "client": {
    "id": "client-uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "address": "123 Main St, City, ST 12345",
    "phone": "+1987654321",
    "status": "active"
  }
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 403 | `forbidden` | You don't have access to this schedule |
| 404 | `not_found` | Schedule not found |

---

## Clock In/Out (EVV) Endpoints

### Clock In

Record clock-in time with GPS location for EVV compliance.

**Endpoint:** `POST /clock/in`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "scheduleId": "schedule-uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "distance": 150
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| scheduleId | string | Yes | Schedule UUID to clock into |
| latitude | number | Yes | GPS latitude coordinate |
| longitude | number | Yes | GPS longitude coordinate |
| distance | number | No | Distance from client address in meters |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully clocked in",
  "schedule": {
    "id": "schedule-uuid",
    "clockInTime": "2024-01-20T09:05:00.000Z",
    "clockInLatitude": "40.7128",
    "clockInLongitude": "-74.0060",
    "clockInDistance": "150",
    "evvStatus": "clocked_in"
  }
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `missing_schedule_id` | Schedule ID is required |
| 400 | `missing_location` | Latitude and longitude are required |
| 400 | `already_clocked_in` | Already clocked in for this schedule |
| 403 | `forbidden` | You don't have access to this schedule |
| 404 | `not_found` | Schedule not found |

---

### Clock Out

Record clock-out time with GPS location for EVV compliance.

**Endpoint:** `POST /clock/out`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "scheduleId": "schedule-uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "distance": 120
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| scheduleId | string | Yes | Schedule UUID to clock out of |
| latitude | number | Yes | GPS latitude coordinate |
| longitude | number | Yes | GPS longitude coordinate |
| distance | number | No | Distance from client address in meters |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully clocked out",
  "schedule": {
    "id": "schedule-uuid",
    "clockInTime": "2024-01-20T09:05:00.000Z",
    "clockOutTime": "2024-01-20T13:02:00.000Z",
    "clockOutLatitude": "40.7128",
    "clockOutLongitude": "-74.0060",
    "clockOutDistance": "120",
    "evvStatus": "verified",
    "hoursWorked": "3.95"
  }
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `missing_schedule_id` | Schedule ID is required |
| 400 | `missing_location` | Latitude and longitude are required |
| 400 | `not_clocked_in` | Must clock in before clocking out |
| 400 | `already_clocked_out` | Already clocked out for this schedule |
| 403 | `forbidden` | You don't have access to this schedule |
| 404 | `not_found` | Schedule not found |

---

## Clients Endpoint

### Get Assigned Clients

Retrieve all clients assigned to the authenticated caregiver.

**Endpoint:** `GET /clients`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "clients": [
    {
      "id": "client-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+1987654321",
      "email": "jane.smith@example.com",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "status": "active"
    }
  ]
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error description"
}
```

### Common Error Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 401 | `unauthorized` | Missing Authorization header |
| 401 | `invalid_token` | Token is expired or invalid |
| 403 | `account_inactive` | Caregiver account is deactivated |
| 403 | `forbidden` | Access denied to resource |
| 404 | `not_found` | Resource not found |
| 500 | `server_error` | Internal server error |

---

## EVV Status Values

The `evvStatus` field indicates the Electronic Visit Verification status:

| Value | Description |
|-------|-------------|
| `pending` | Visit not yet started |
| `clocked_in` | Caregiver has clocked in |
| `verified` | Visit completed with valid EVV data |
| `flagged` | Visit has EVV compliance issues |
| `manual_override` | Status manually adjusted by admin |

---

## Schedule Status Values

The schedule `status` field can have these values:

| Value | Description |
|-------|-------------|
| `scheduled` | Visit is scheduled |
| `confirmed` | Visit confirmed by caregiver |
| `in_progress` | Visit currently in progress |
| `completed` | Visit completed |
| `cancelled` | Visit was cancelled |
| `no_show` | Caregiver did not show up |

---

## Best Practices

### Token Management
- Store the JWT token securely (e.g., Keychain on iOS, EncryptedSharedPreferences on Android)
- Call `/auth/logout` when the user logs out to invalidate the token
- Handle 401 errors by redirecting to login

### Location Permissions
- Request location permissions before attempting clock-in/clock-out
- Use high-accuracy GPS for EVV compliance
- Calculate distance from client address on the device if needed

### Offline Support
- Cache schedule data for offline viewing
- Queue clock-in/clock-out requests when offline
- Sync when connectivity is restored

### Error Handling
- Parse the `error` field to handle specific error cases
- Display the `message` field to users
- Implement retry logic for 500 errors

### Pagination
- Use `limit` and `offset` parameters for history endpoints
- Check `hasMore` in response to determine if more pages exist
- Default to reasonable page sizes (20-50 items)

---

## Rate Limiting

API requests are rate-limited to prevent abuse:
- 100 requests per minute per token
- 1000 requests per hour per token

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705755600
```

---

## Support

For API support or to report issues, contact your system administrator or the development team.
