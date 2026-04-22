# API Documentation

## Authentication

### POST /api/auth/register
Register a new user.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "phone": "+919876543210"
}
\`\`\`

**Response:** 201
\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "citizen"
  },
  "message": "User registered successfully"
}
\`\`\`

---

## Complaints

### GET /api/complaints
List all complaints (paginated).

**Query Parameters:**
- \`ward\` (optional) - Filter by ward
- \`status\` (optional) - Filter by status
- \`limit\` (optional, default: 50) - Results per page
- \`offset\` (optional, default: 0) - Page offset

**Response:** 200
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "title": "Pothole on Main Street",
      "status": "submitted",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "ward": "Ward 1",
      "created_at": "2026-04-20T10:00:00Z"
    }
  ],
  "count": 50,
  "limit": 50,
  "offset": 0
}
\`\`\`

---

### POST /api/complaints
Create a new complaint.

**Headers:**
\`Authorization: Bearer <jwt_token>\`

**Request:**
\`\`\`json
{
  "title": "Broken streetlight",
  "description": "Light is not working",
  "category": "lighting",
  "severity": "medium",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "ward": "Ward 1"
}
\`\`\`

**Response:** 201
\`\`\`json
{
  "data": {
    "id": "uuid",
    "title": "Broken streetlight",
    "status": "submitted",
    "created_at": "2026-04-20T10:00:00Z"
  },
  "message": "Complaint created successfully"
}
\`\`\`

---

### PATCH /api/complaints/:id/status
Update complaint status.

**Headers:**
\`Authorization: Bearer <jwt_token>\`

**Request:**
\`\`\`json
{
  "new_status": "resolved",
  "reason": "Issue fixed"
}
\`\`\`

**Response:** 200
\`\`\`json
{
  "message": "Status updated successfully",
  "complaint": {
    "id": "uuid",
    "status": "resolved"
  }
}
\`\`\`

---

### GET /api/complaints/geojson
Get complaints as GeoJSON.

**Query Parameters:**
- \`ward\` (optional)
- \`status\` (optional)

**Response:** 200
\`\`\`json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      },
      "properties": {
        "id": "uuid",
        "title": "Pothole",
        "status": "submitted"
      }
    }
  ]
}
\`\`\`
