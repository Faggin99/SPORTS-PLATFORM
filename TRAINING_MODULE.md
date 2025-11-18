# Training Management Module Documentation

## Overview

The Training Management module is a comprehensive system for managing weekly training cycles (microcycles), daily training sessions, training activities, athlete rosters, and file uploads for a multi-tenant sports platform.

## Architecture

### Backend (Laravel 11 + PHP 8.4)

**Location**: `backend/app/Modules/TrainingManagement/`

#### Database Schema

**Tables (10 total)**:
- `training_microcycles` - Weekly training cycles
- `training_sessions` - Daily training sessions (7 per microcycle)
- `training_activity_blocks` - 6 blocks per session (Aquecimento, Preparatório, Atividade 1-3, Complementos)
- `contents` - Training content categories (7 seeded: Organização Ofensiva/Defensiva, Transições, Bolas Paradas, Descanso)
- `activity_titles` - Reusable activity titles linked to content
- `training_activities` - Actual training activity data for blocks
- `training_activity_contents` - Pivot table for activity ↔ content many-to-many
- `training_activity_stages` - Training phases (1ª fase, 2ª fase, Criação, Finalização)
- `training_activity_files` - File uploads (videos/PDFs) with XOR constraint (session OR activity)
- `athletes` - Player roster with group assignments (G1-G4)

**Key Database Features**:
- All tables use ULID primary keys (not auto-increment)
- Multi-tenancy enforced via `tenant_id` column with global scopes
- Lazy activity creation: blocks exist without activities until data is saved
- XOR constraint on files: `(session_id IS NULL AND activity_id IS NOT NULL) OR (session_id IS NOT NULL AND activity_id IS NULL)`
- Cascading deletes for tenant isolation

#### Models (10 total)

All models use:
- `HasUlids` trait for ULID generation
- `BelongsToTenant` trait for multi-tenancy (except TrainingActivityBlock and TrainingActivityStage)
- `protected $keyType = 'string'`
- `public $incrementing = false`

**Models**:
1. `TrainingMicrocycle` - hasMany sessions
2. `TrainingSession` - belongsTo microcycle, hasMany blocks and files
3. `TrainingActivityBlock` - belongsTo session, hasOne activity (NO BelongsToTenant)
4. `Content` - hasMany titles, belongsToMany activities
5. `ActivityTitle` - belongsTo content, hasMany activities
6. `TrainingActivity` - belongsTo block and title, belongsToMany contents, hasMany stages and files
7. `TrainingActivityContent` - Pivot model
8. `TrainingActivityStage` - belongsTo activity (NO BelongsToTenant)
9. `TrainingActivityFile` - belongsTo session/activity, belongsTo creator (User), has url accessor
10. `Athlete` - scopes: byGroup(), active()

#### Services (3 total)

**MicrocycleService**:
- `getOrCreateMicrocycle(string $weekIdentifier)` - Get or auto-create microcycle for ISO week (YYYY-WW)
- Creates microcycle + 7 sessions + 42 blocks in single transaction
- Block names: Aquecimento, Preparatório, Atividade 1, Atividade 2, Atividade 3, Complementos
- Day names: Segunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo

**SessionService**:
- `updateSessionBlocks(string $sessionId, array $blocksData)` - Batch update all blocks in a session
- Handles activity creation/update, content sync, stages management
- Validates is_rest flag: if true, clears title_id, content_ids, stages

**FileUploadService**:
- `uploadFile(...)` - Upload video (mp4/mov/avi, max 200MB) or PDF (max 50MB)
- Sanitizes filenames, stores in tenant-specific directories: `training/{tenant_id}/videos|pdfs/`
- Enforces XOR constraint validation
- `deleteFile(string $fileId)` - Deletes physical file and database record

#### Controllers (7 total)

1. **MicrocycleController**: GET /microcycles/{weekIdentifier}
2. **SessionController**: GET /sessions/{id}, PUT /sessions/{id}
3. **ActivityController**: POST /activities, PUT /activities/{id}, DELETE /activities/{id}
4. **TitleController**: GET /titles, POST /titles, PUT /titles/{id}, DELETE /titles/{id}
5. **ContentController**: GET /contents (read-only)
6. **AthleteController**: GET /athletes, POST /athletes, PUT /athletes/{id}, POST /athletes/batch-update-groups
7. **FileController**: POST /files/upload, DELETE /files/{id}

#### Form Requests (9 total)

- UpdateSessionRequest
- StoreActivityRequest (with custom rest validation)
- UpdateActivityRequest (with custom rest validation)
- StoreTitleRequest
- UpdateTitleRequest
- StoreAthleteRequest
- UpdateAthleteRequest
- BatchUpdateGroupsRequest
- UploadFileRequest (with XOR validation)

#### API Resources (9 total)

Transform Eloquent models to JSON with proper date formatting and relationship loading:
- MicrocycleResource
- SessionResource
- BlockResource
- ActivityResource
- TitleResource
- ContentResource
- StageResource
- FileResource (includes public URL)
- AthleteResource

#### Policies & Gates

**TrainingPolicy** with gates:
- `view-training` - Coaches, staff, admins
- `manage-training` - Coaches, admins
- `upload-files` - Coaches, admins
- `manage-athletes` - Admins only
- `view-athletes` - Coaches, staff, admins

### Frontend (React 18 + Vite)

**Location**: `frontend/src/modules/training-management/`

#### Services (6 files)

- `api.js` - Base axios client with auth token, error handling
- `microcycleService.js` - Microcycle API calls
- `sessionService.js` - Session API calls
- `activityService.js` - Activity CRUD
- `athleteService.js` - Athlete management
- `fileService.js` - File upload/delete with FormData

#### Custom Hooks (4 files)

- `useMicrocycle(weekIdentifier)` - Fetch microcycle with auto-refetch
- `useSession()` - Update session blocks
- `useAthletes()` - Fetch athletes and batch update groups
- `useFileUpload()` - Upload files with progress tracking

#### Components

**Calendar Components**:
- `WeekCalendar` - 7-day grid
- `DayColumn` - Individual day with blocks
- `BlockCard` - Training block card

**Modal Components**:
- `TrainingModal` - Edit training block
- `ActivityForm` - Create/edit activities
- `FileUploader` - Upload videos/PDFs

**Plantel Components**:
- `GroupColumn` - Athlete group column
- `AthleteCard` - Athlete card with drag-and-drop

**Pages**:
- `CalendarPage` - Weekly training calendar
- `PlantelPage` - Squad management with group assignments

## API Routes

All routes prefixed with `/api/training-management` and protected by `auth:sanctum`

### Microcycles
- `GET /microcycles/{weekIdentifier}` - Get or create microcycle for week

### Sessions
- `GET /sessions/{id}` - Get session with blocks, activities, files
- `PUT /sessions/{id}` - Update session blocks

### Activities
- `POST /activities` - Create activity
- `PUT /activities/{id}` - Update activity
- `DELETE /activities/{id}` - Delete activity

### Titles
- `GET /titles?content_id={id}` - List titles (optional filter)
- `POST /titles` - Create title
- `PUT /titles/{id}` - Update title
- `DELETE /titles/{id}` - Delete title

### Contents
- `GET /contents` - List all content categories (read-only)

### Athletes
- `GET /athletes?group={group}&status={status}` - List athletes (optional filters)
- `POST /athletes` - Create athlete
- `PUT /athletes/{id}` - Update athlete
- `POST /athletes/batch-update-groups` - Batch update groups

### Files
- `POST /files/upload` - Upload video/PDF
- `DELETE /files/{id}` - Delete file

## Business Rules

1. **Automatic Microcycle Creation**: When accessing a week that doesn't exist, the system automatically creates:
   - 1 microcycle
   - 7 training sessions (Monday-Sunday)
   - 42 activity blocks (6 per session)

2. **Lazy Activity Creation**: TrainingActivityBlock can exist without TrainingActivity. The activity is only created when the user saves data in the modal.

3. **Rest Activities**: When `is_rest` is true, the activity cannot have:
   - title_id
   - content_ids
   - stages

4. **File XOR Constraint**: Files can belong to either a session OR an activity, never both, never neither.

5. **Multi-Tenancy**: All operations are scoped to the authenticated user's tenant. Data is completely isolated between tenants.

6. **Athlete Groups**: Athletes can be assigned to groups G1, G2, G3, or G4. Group assignments can be batch updated via drag-and-drop.

## Setup Instructions

### Backend Setup

1. **Run Migrations**:
```bash
cd backend
php artisan migrate
```

2. **Seed Content Categories**:
```bash
php artisan db:seed --class=ContentSeeder
```

3. **Create Storage Link** (for file uploads):
```bash
php artisan storage:link
```

### Frontend Setup

1. **Install Dependencies**:
```bash
cd frontend
npm install
```

2. **Configure Environment**:
Create `.env` file:
```env
VITE_API_URL=http://localhost:8000/api
```

3. **Start Development Server**:
```bash
npm run dev
```

## Testing

### Manual Testing

1. **Test Microcycle Auto-Creation**:
```bash
# Via Postman/Insomnia
GET http://localhost:8000/api/training-management/microcycles/2025-44
Authorization: Bearer {token}
```

2. **Test File Upload**:
```bash
POST http://localhost:8000/api/training-management/files/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [select video file]
file_type: video
phase: pre
activity_id: {activity_ulid}
```

3. **Test Batch Group Update**:
```bash
POST http://localhost:8000/api/training-management/athletes/batch-update-groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "athletes": [
    {"id": "01H1234ABCD", "group": "G1"},
    {"id": "01H5678EFGH", "group": "G2"}
  ]
}
```

## File Structure

```
backend/app/Modules/TrainingManagement/
├── Controllers/
│   ├── MicrocycleController.php
│   ├── SessionController.php
│   ├── ActivityController.php
│   ├── TitleController.php
│   ├── ContentController.php
│   ├── AthleteController.php
│   └── FileController.php
├── Models/
│   ├── TrainingMicrocycle.php
│   ├── TrainingSession.php
│   ├── TrainingActivityBlock.php
│   ├── Content.php
│   ├── ActivityTitle.php
│   ├── TrainingActivity.php
│   ├── TrainingActivityContent.php
│   ├── TrainingActivityStage.php
│   ├── TrainingActivityFile.php
│   └── Athlete.php
├── Services/
│   ├── MicrocycleService.php
│   ├── SessionService.php
│   └── FileUploadService.php
├── Requests/
│   ├── UpdateSessionRequest.php
│   ├── StoreActivityRequest.php
│   ├── UpdateActivityRequest.php
│   ├── StoreTitleRequest.php
│   ├── UpdateTitleRequest.php
│   ├── StoreAthleteRequest.php
│   ├── UpdateAthleteRequest.php
│   ├── BatchUpdateGroupsRequest.php
│   └── UploadFileRequest.php
├── Resources/
│   ├── MicrocycleResource.php
│   ├── SessionResource.php
│   ├── BlockResource.php
│   ├── ActivityResource.php
│   ├── TitleResource.php
│   ├── ContentResource.php
│   ├── StageResource.php
│   ├── FileResource.php
│   └── AthleteResource.php
├── Policies/
│   └── TrainingPolicy.php
└── routes.php

frontend/src/modules/training-management/
├── pages/
│   ├── CalendarPage.jsx
│   └── PlantelPage.jsx
├── components/
│   ├── calendar/
│   ├── modals/
│   └── plantel/
├── services/
│   ├── api.js
│   ├── microcycleService.js
│   ├── sessionService.js
│   ├── activityService.js
│   ├── athleteService.js
│   └── fileService.js
├── hooks/
│   ├── useMicrocycle.js
│   ├── useSession.js
│   ├── useAthletes.js
│   └── useFileUpload.js
└── index.js
```

## Known Limitations

1. The TrainingModal, ActivityForm, and FileUploader components are basic stubs and need full implementation
2. GroupColumn and AthleteCard need drag-and-drop functionality implemented
3. No automated tests included (unit tests, integration tests)
4. File upload progress tracking is simulated (needs actual progress events)
5. Error handling in frontend components is basic

## Future Enhancements

1. Add real-time collaboration using WebSockets
2. Implement activity templates for reuse
3. Add PDF export for weekly training plans
4. Implement analytics dashboard for training load
5. Add video annotation capabilities
6. Implement attendance tracking for training sessions
7. Add mobile app support
