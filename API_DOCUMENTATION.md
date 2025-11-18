# Training Management API Documentation

## Authentication

All endpoints require authentication via Laravel Sanctum.

**Header**:
```
Authorization: Bearer {token}
```

## Base URL

```
http://localhost:8000/api/training-management
```

---

## Endpoints

### Microcycles

#### Get or Create Microcycle
```http
GET /microcycles/{weekIdentifier}
```

**Parameters**:
- `weekIdentifier` (string, path) - ISO week format "YYYY-WW" (e.g., "2025-44")

**Response** (200 OK):
```json
{
  "id": "01H1234567890ABCDEFGHJ",
  "start_date": "2025-10-27",
  "end_date": "2025-11-02",
  "week_identifier": "2025-44",
  "sessions": [
    {
      "id": "01H234...",
      "date": "2025-10-27",
      "day_name": "Segunda",
      "blocks": [...]
    }
  ]
}
```

---

### Sessions

#### Get Session
```http
GET /sessions/{id}
```

**Response** (200 OK):
```json
{
  "id": "01H234...",
  "microcycle_id": "01H123...",
  "date": "2025-10-27",
  "day_name": "Segunda",
  "blocks": [...],
  "files": [...]
}
```

#### Update Session Blocks
```http
PUT /sessions/{id}
```

**Request Body**:
```json
{
  "blocks": [
    {
      "id": "01H345...",
      "activity": {
        "title_id": "01H456...",
        "content_ids": ["01H567...", "01H678..."],
        "groups": ["G1", "G3"],
        "duration_minutes": 45,
        "is_rest": false,
        "stages": [
          {"name": "1ª fase", "order": 1},
          {"name": "2ª fase", "order": 2}
        ]
      }
    }
  ]
}
```

**Response** (200 OK): Updated session object

---

### Activities

#### Create Activity
```http
POST /activities
```

**Request Body**:
```json
{
  "block_id": "01H345...",
  "title_id": "01H456...",
  "content_ids": ["01H567..."],
  "groups": ["G1", "G2"],
  "duration_minutes": 30,
  "is_rest": false
}
```

**Response** (201 Created): Activity object

#### Update Activity
```http
PUT /activities/{id}
```

**Request Body**: Same as create (without block_id)

**Response** (200 OK): Updated activity object

#### Delete Activity
```http
DELETE /activities/{id}
```

**Response** (204 No Content)

---

### Titles

#### List Titles
```http
GET /titles?content_id={id}&per_page=15
```

**Query Parameters**:
- `content_id` (optional) - Filter by content category
- `per_page` (optional) - Pagination size (default: 15, "all" for no pagination)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "01H456...",
      "title": "Posse de Bola",
      "content_id": "01H567...",
      "content": {...},
      "description": "..."
    }
  ],
  "current_page": 1,
  "last_page": 3
}
```

#### Create Title
```http
POST /titles
```

**Request Body**:
```json
{
  "title": "Posse de Bola",
  "content_id": "01H567...",
  "description": "Exercício de manutenção de posse"
}
```

**Response** (201 Created): Title object

#### Update Title
```http
PUT /titles/{id}
```

**Request Body**: Same as create

**Response** (200 OK): Updated title object

#### Delete Title
```http
DELETE /titles/{id}
```

**Response** (204 No Content)

---

### Contents

#### List All Contents
```http
GET /contents
```

**Response** (200 OK):
```json
[
  {
    "id": "01H567...",
    "name": "Organização Ofensiva",
    "description": "...",
    "color": "#4CAF50"
  }
]
```

---

### Athletes

#### List Athletes
```http
GET /athletes?group={group}&status={status}
```

**Query Parameters**:
- `group` (optional) - Filter by group (G1, G2, G3, G4)
- `status` (optional) - Filter by status (active, inactive, injured)

**Response** (200 OK): Array of athlete objects

#### Create Athlete
```http
POST /athletes
```

**Request Body**:
```json
{
  "name": "João Silva",
  "position": "Atacante",
  "jersey_number": 10,
  "group": "G1",
  "status": "active"
}
```

**Response** (201 Created): Athlete object

#### Update Athlete
```http
PUT /athletes/{id}
```

**Request Body**: Same as create

**Response** (200 OK): Updated athlete object

#### Batch Update Groups
```http
POST /athletes/batch-update-groups
```

**Request Body**:
```json
{
  "athletes": [
    {"id": "01H678...", "group": "G1"},
    {"id": "01H789...", "group": "G2"}
  ]
}
```

**Response** (200 OK):
```json
{
  "message": "Grupos atualizados com sucesso",
  "updated": 2
}
```

---

### Files

#### Upload File
```http
POST /files/upload
```

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file` (file) - Video (mp4/mov/avi, max 200MB) or PDF (max 50MB)
- `file_type` (string) - "video" or "pdf"
- `phase` (string) - "pre", "post", or "none"
- `session_id` (string, optional) - Session ULID (XOR with activity_id)
- `activity_id` (string, optional) - Activity ULID (XOR with session_id)

**Response** (201 Created):
```json
{
  "id": "01H789...",
  "file_name": "treino-video.mp4",
  "file_type": "video",
  "phase": "pre",
  "url": "http://localhost:8000/storage/training/01H123.../videos/treino-video.mp4",
  "creator": {
    "id": "01H890...",
    "name": "Coach Silva"
  }
}
```

#### Delete File
```http
DELETE /files/{id}
```

**Response** (204 No Content)

---

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
  "message": "This action is unauthorized."
}
```

### 404 Not Found
```json
{
  "message": "Resource not found."
}
```

### 422 Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title field is required."],
    "content_id": ["The selected content id is invalid."]
  }
}
```

### 500 Internal Server Error
```json
{
  "message": "Server Error"
}
```
