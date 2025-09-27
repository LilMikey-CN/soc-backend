# Client Profile API Documentation

## Overview

This document provides comprehensive API documentation for client-profile related endpoints in the Care Management system. The system has two sets of client profile APIs:

1. **Standalone Client Profiles API** (`/api/client-profiles/*`) - **DEPRECATED**
2. **User-embedded Client Profiles API** (`/api/users/client-profile*`) - **RECOMMENDED**

⚠️ **Important**: The standalone client profiles API (`/api/client-profiles/*`) is deprecated. Use the user-embedded client profiles API (`/api/users/client-profile*`) for all new implementations.

## Authentication

All endpoints require Firebase JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <firebase-jwt-token>
```

**Authentication Error Responses:**
- `401 Unauthorized` - No token provided or invalid token
- Token must be a valid Firebase ID token or custom token

## Base URLs

- **Production/Development**: `http://localhost:3000` (or your configured server URL)
- **Frontend CORS**: Configured for `http://localhost:3001` by default

---

## User-Embedded Client Profiles API (RECOMMENDED)

### Base Path: `/api/users/client-profile`

This API manages client profiles as embedded documents within user records, providing better data consistency and user-centric access control.

### 1. Create/Update Client Profile

**Endpoint:** `PUT /api/users/client-profile`
**Method:** PUT
**Description:** Creates or updates the client profile for the authenticated user

#### Request Body

```json
{
  "full_name": "string",              // Required
  "date_of_birth": "YYYY-MM-DD",     // Required (ISO date string)
  "sex": "string",                   // Required: "Male", "Female", "Other", "Prefer not to say"
  "age": "number",                   // Optional (auto-calculated from date_of_birth if not provided)
  "mobile_number": "string",         // Required
  "email_address": "string",         // Required
  "postal_address": "string",        // Optional
  "emergency_contacts": [            // Optional array
    {
      "name": "string",
      "relationship": "string",
      "phone": "string",
      "email": "string"
    }
  ],
  "notes": "string",                 // Optional
  "medical_conditions": "string",    // Optional
  "allergies": "string",            // Optional
  "medications": "string",          // Optional
  "accessibility_needs": "string",  // Optional
  "latest_vitals": {               // Optional object
    "heart_rate": "number",
    "blood_pressure": "string",
    "oxygen_saturation": "number",
    "temperature": "number",
    "recorded_date": "ISO-date-string"
  }
}
```

#### Response

**Success (200 OK):**
```json
{
  "message": "Client profile updated successfully",
  "user": {
    "uid": "string",
    "email": "string",
    "client_profile": {
      "full_name": "string",
      "date_of_birth": "ISO-date-string",
      "sex": "string",
      "age": "number",
      "mobile_number": "string",
      "email_address": "string",
      "postal_address": "string",
      "emergency_contacts": [...],
      "notes": "string",
      "medical_conditions": "string",
      "allergies": "string",
      "medications": "string",
      "accessibility_needs": "string",
      "latest_vitals": {...},
      "is_active": true,
      "created_at": "ISO-date-string",
      "updated_at": "ISO-date-string"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid data format
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error

### 2. Get Client Profile

**Endpoint:** `GET /api/users/client-profile`
**Method:** GET
**Description:** Retrieves the client profile for the authenticated user

#### Response

**Success (200 OK):**
```json
{
  "uid": "string",
  "email": "string",
  "client_profile": {
    "full_name": "string",
    "date_of_birth": "ISO-date-string",
    "sex": "string",
    "age": "number",
    "mobile_number": "string",
    "email_address": "string",
    "postal_address": "string",
    "emergency_contacts": [...],
    "notes": "string",
    "medical_conditions": "string",
    "allergies": "string",
    "medications": "string",
    "accessibility_needs": "string",
    "latest_vitals": {...},
    "is_active": true,
    "created_at": "ISO-date-string",
    "updated_at": "ISO-date-string"
  }
}
```

**Error Responses:**
- `404 Not Found` - Client profile not found for the user
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error

### 3. Update Client Profile (Partial)

**Endpoint:** `PATCH /api/users/client-profile`
**Method:** PATCH
**Description:** Updates specific fields in the client profile for the authenticated user

#### Request Body

```json
{
  // Any subset of the fields from PUT request
  "full_name": "string",
  "mobile_number": "string",
  "notes": "string"
  // ... any other fields to update
}
```

#### Response

**Success (200 OK):**
```json
{
  "message": "Client profile updated successfully",
  "user": {
    "uid": "string",
    "email": "string",
    "client_profile": {
      // Updated client profile data
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - Client profile not found
- `400 Bad Request` - Invalid data format
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error

### 4. Deactivate Client Profile

**Endpoint:** `DELETE /api/users/client-profile`
**Method:** DELETE
**Description:** Soft deletes (deactivates) the client profile for the authenticated user

#### Response

**Success (200 OK):**
```json
{
  "message": "Client profile deactivated successfully",
  "uid": "string"
}
```

**Error Responses:**
- `404 Not Found` - Client profile not found
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error

### 5. Reactivate Client Profile

**Endpoint:** `PATCH /api/users/client-profile/reactivate`
**Method:** PATCH
**Description:** Reactivates a previously deactivated client profile

#### Response

**Success (200 OK):**
```json
{
  "message": "Client profile reactivated successfully",
  "uid": "string"
}
```

**Error Responses:**
- `404 Not Found` - Client profile not found
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error

### 6. Get All Client Profiles (Admin)

**Endpoint:** `GET /api/users/all-client-profiles`
**Method:** GET
**Description:** Retrieves all users with client profiles (admin functionality)

#### Query Parameters

- `is_active` (string, optional): Filter by active status. Values: "true", "false", "all". Default: "true"
- `search` (string, optional): Search by name, email, or phone number
- `limit` (number, optional): Maximum number of results. Default: 50
- `offset` (number, optional): Number of records to skip. Default: 0

#### Response

**Success (200 OK):**
```json
{
  "users_with_client_profiles": [
    {
      "uid": "string",
      "email": "string",
      "client_profile": {
        // Client profile data
      }
    }
  ],
  "count": "number",
  "pagination": {
    "limit": "number",
    "offset": "number"
  }
}
```

### 7. Search Client Profiles (Admin)

**Endpoint:** `POST /api/users/search-client-profiles`
**Method:** POST
**Description:** Advanced search for users with client profiles

#### Request Body

```json
{
  "full_name": "string",              // Optional - partial name search
  "email_address": "string",          // Optional - partial email search
  "mobile_number": "string",          // Optional - partial phone search
  "age_min": "number",               // Optional - minimum age
  "age_max": "number",               // Optional - maximum age
  "sex": "string",                   // Optional - exact sex match
  "has_medical_conditions": "boolean", // Optional - filter by medical conditions presence
  "is_active": "boolean",            // Optional - filter by active status (default: true)
  "limit": "number"                  // Optional - max results (default: 50)
}
```

#### Response

**Success (200 OK):**
```json
{
  "users_with_client_profiles": [...],
  "count": "number",
  "search_criteria": {
    // Echo of search criteria
  }
}
```

---

## Standalone Client Profiles API (DEPRECATED)

### Base Path: `/api/client-profiles`

⚠️ **DEPRECATED**: This API is deprecated. All responses include deprecation headers:
- `X-Deprecated: true`
- `X-Deprecation-Message: "This endpoint is deprecated. Use /api/users/client-profile instead..."`

### Available Endpoints (For Legacy Support)

1. **POST `/api/client-profiles`** - Create client profile
2. **GET `/api/client-profiles`** - Get all client profiles with filtering
3. **GET `/api/client-profiles/:id`** - Get specific client profile
4. **PUT `/api/client-profiles/:id`** - Update client profile
5. **PATCH `/api/client-profiles/:id/vitals`** - Update vitals only
6. **DELETE `/api/client-profiles/:id`** - Soft delete client profile
7. **PATCH `/api/client-profiles/:id/reactivate`** - Reactivate client profile
8. **POST `/api/client-profiles/search`** - Advanced search

*Note: Detailed documentation for deprecated endpoints is available but not recommended for new implementations.*

---

## Data Models

### Client Profile Schema

```typescript
interface ClientProfile {
  full_name: string;                    // Required
  date_of_birth: Date;                 // Required
  sex: "Male" | "Female" | "Other" | "Prefer not to say"; // Required
  age: number;                         // Auto-calculated or manual
  mobile_number: string;               // Required
  email_address: string;               // Required
  postal_address: string;              // Optional
  emergency_contacts: EmergencyContact[]; // Optional
  notes: string;                       // Optional
  medical_conditions: string | null;    // Optional
  allergies: string | null;            // Optional
  medications: string | null;          // Optional
  accessibility_needs: string | null;  // Optional
  latest_vitals: VitalSigns | null;    // Optional
  is_active: boolean;                  // System field
  created_at: Date;                    // System field
  updated_at: Date;                    // System field
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface VitalSigns {
  heart_rate?: number;
  blood_pressure?: string;
  oxygen_saturation?: number;
  temperature?: number;
  recorded_date: Date;
}
```

## Error Handling

### Common Error Response Format

```json
{
  "error": "Error message",
  "message": "Additional details (in development mode)"
}
```

### HTTP Status Codes

- `200 OK` - Successful operation
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or failed
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Validation Rules

1. **Required Fields**: `full_name`, `date_of_birth`, `sex`, `mobile_number`, `email_address`
2. **Sex Field**: Must be one of: "Male", "Female", "Other", "Prefer not to say"
3. **Emergency Contacts**: Must be an array of objects if provided
4. **Latest Vitals**: Must be an object if provided
5. **Date Fields**: Must be valid ISO date strings
6. **Age Calculation**: Automatically calculated from `date_of_birth` if not provided

## Migration Guide

### From Standalone to User-Embedded API

1. **Update Base URLs**:
   - From: `/api/client-profiles/*`
   - To: `/api/users/client-profile*`

2. **Authentication Changes**:
   - User-embedded API operates on the authenticated user's profile
   - No need to pass client profile IDs in URLs

3. **Response Structure Changes**:
   - User-embedded API returns user object with embedded `client_profile`
   - Standalone API returned client profile directly

4. **Admin Functions**:
   - Use `/api/users/all-client-profiles` for listing all profiles
   - Use `/api/users/search-client-profiles` for advanced search

## Rate Limiting

- No specific rate limiting implemented
- Consider implementing rate limiting for production environments

## CORS Configuration

- Configured for `http://localhost:3001` by default
- Credentials are enabled
- Configure `FRONTEND_URL` environment variable for different origins

## Environment Variables

- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - Allowed CORS origin (default: http://localhost:3001)
- `NODE_ENV` - Environment (development/production)

## Testing

Use the provided test script `test_client_profile_apis.js` for testing endpoints. Ensure Firebase authentication is properly configured.

---

*API Version: 1.0.0*
