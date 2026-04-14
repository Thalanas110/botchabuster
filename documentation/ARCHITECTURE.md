# MeatLens System Architecture

## High-Level Overview

MeatLens follows a **client-server architecture** with a React frontend communicating with an Express backend, backed by Supabase for database and file storage.

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   React Client  │◄──────►│  Express Server  │◄──────►│    Supabase      │
│  (Port 8080)    │  HTTP   │   (Port 3000)    │  REST   │  PostgreSQL+Auth │
│                 │         │                  │         │                  │
│ • Components    │         │ • Controllers    │         │ • Database       │
│ • Pages         │         │ • Services       │         │ • Authentication │
│ • State Mgmt    │         │ • Routes         │         │ • File Storage   │
└─────────────────┘         └──────────────────┘         └──────────────────┘
```

## Layered Architecture

### Frontend Layer (React)
```
┌──────────────────────────────┐
│      React Components         │
│  (UI, Forms, Display Logic)   │
├──────────────────────────────┤
│    Custom React Hooks         │
│  (useAuth, useInspection,etc) │
├──────────────────────────────┤
│    API Client Layer           │
│  (ProfileClient, InspectionClient, etc)
├──────────────────────────────┤
│    HTTP Transport (fetch/axios)
└──────────────────────────────┘
         ↓ HTTP/REST ↓
```

### Backend Layer (Express)
```
┌──────────────────────────────┐
│   Express Routes             │
│  (/api/*, route handlers)    │
├──────────────────────────────┤
│   Controllers                │
│  (Request processing)        │
├──────────────────────────────┤
│   Services                   │
│  (Business logic)            │
├──────────────────────────────┤
│   Data Access & Integration  │
│  (Supabase client)           │
└──────────────────────────────┘
         ↓ REST API ↓
```

### Database Layer (Supabase)
```
┌──────────────────────────────┐
│   PostgreSQL Database        │
│   (Tables, Views, Policies)  │
├──────────────────────────────┤
│   Row-Level Security (RLS)   │
│   (Access control policies)  │
├──────────────────────────────┤
│   Authentication Service     │
│   (Supabase Auth/JWT)        │
├──────────────────────────────┤
│   Object Storage (S3)        │
│   (Image files)              │
└──────────────────────────────┘
```

## Component Interaction Flow

### Typical User Flow: Inspection Creation

```
1. User clicks "New Inspection"
   └─> React Component (CameraCapture.tsx)

2. User captures/uploads image
   └─> Frontend calls uploadClient.uploadImage()

3. Frontend API Client makes HTTP POST
   └─> POST /api/upload/inspection-image

4. Backend Route Handler
   └─> uploadRoutes handles request

5. Express Controller (UploadController)
   └─> Validates request, processes file

6. Backend Service (StorageService)
   └─> Stores image in Supabase Storage
   └─> Returns image metadata

7. Controller returns response
   └─> HTTP 200 with image URL

8. Frontend receives response
   └─> Updates state, shows image

9. User analyzes image
   └─> Frontend calls analysisClient.analyze()

10. Backend Analysis Pipeline
    └─> ImageProcessingService loads image
    └─> ColorAnalysisService extracts Lab* values
    └─> TextureAnalysisService computes GLCM
    └─> ClassificationService evaluates NMIS
    └─> Returns freshness score

11. Frontend displays results
    └─> AnalysisResultCard shows metrics
```

## Frontend Architecture

### Directory Structure
```
frontend/src/
├── components/
│   ├── CameraCapture.tsx        # Camera/image upload component
│   ├── AnalysisResultCard.tsx   # Results display
│   ├── InspectionListItem.tsx   # List items
│   ├── BottomNav.tsx            # Navigation
│   ├── AIChatbot.tsx            # Chat interface
│   └── ... (other components)
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx
│   ├── InspectionPage.tsx
│   ├── AdminDashboard.tsx
│   └── ... (other pages)
├── contexts/
│   ├── AuthContext.tsx          # Auth state
│   ├── InspectionContext.tsx    # Inspection state
│   └── ... (other contexts)
├── hooks/
│   ├── useAuth.ts
│   ├── useInspection.ts
│   └── ... (custom hooks)
├── integrations/
│   ├── api/
│   │   ├── index.ts             # Export all clients
│   │   ├── ProfileClient.ts
│   │   ├── InspectionClient.ts
│   │   ├── AccessCodeClient.ts
│   │   ├── UploadClient.ts
│   │   └── StatsClient.ts
│   └── supabase.ts              # Supabase client
├── types/
│   ├── inspection.ts
│   ├── profile.ts
│   └── ... (type definitions)
└── App.tsx                      # Root component
```

### Component Hierarchy
```
App (Router setup)
├── LandingPage
│   ├── StatsSection (calls useStats hook -> StatsClient)
│   └── FeatureShowcase
├── LoginPage
├── SignupPage
├── AuthProtected
│   ├── DashboardPage
│   │   ├── InspectionList (uses InspectionContext)
│   │   └── NewInspectionFlow
│   │       └── CameraCapture
│   │           ├── ImageUpload
│   │           └── AnalysisResult
│   ├── ProfilePage
│   └── AdminDashboard (role-based)
│       ├── UserManagement
│       ├── InspectionBrowser
│       └── AccessCodeManager
└── NotFound
```

## Backend Architecture

### Directory Structure
```
backend/src/
├── server.ts                 # Express app setup
├── config/
│   └── index.ts              # Configuration singleton
├── controllers/
│   ├── UploadController.ts   # File upload handling
│   ├── AnalysisController.ts # Image analysis
│   ├── ProfileController.ts  # User profiles
│   ├── InspectionController.ts
│   ├── AccessCodeController.ts
│   ├── StatsController.ts
│   ├── AuthController.ts
│   └── ChatController.ts
├── services/
│   ├── StorageService.ts     # Supabase storage
│   ├── ImageProcessingService.ts  # Image ops
│   ├── ColorAnalysisService.ts    # Lab* analysis
│   ├── TextureAnalysisService.ts  # GLCM analysis
│   ├── ClassificationService.ts   # NMIS eval
│   ├── ProfileService.ts          # DB ops
│   ├── InspectionService.ts
│   ├── AccessCodeService.ts
│   ├── StatsService.ts
│   ├── AuthService.ts
│   └── CalibrationService.ts      # Color calibration
├── routes/
│   ├── upload.ts
│   ├── analysis.ts
│   ├── profiles.ts
│   ├── inspections.ts
│   ├── accessCodes.ts
│   ├── stats.ts
│   ├── auth.ts
│   └── chat.ts
├── middleware/
│   ├── upload.ts             # Multer config
│   ├── auth.ts               # JWT validation (optional)
│   └── ... (other middleware)
├── models/
│   ├── InspectionResult.ts
│   └── ... (data models)
├── types/
│   ├── inspection.ts
│   └── ... (TypeScript types)
└── integrations/
    └── supabase.ts           # Supabase client
```

### Request-Response Cycle
```
HTTP Request
    ↓
Express Route Handler
    ↓
Controller Method
    ├─ Validates input
    ├─ Checks authentication
    ├─ Calls Service layer
    ↓
Service Method
    ├─ Implements business logic
    ├─ Calls Supabase client
    ├─ Processes data
    ↓
Supabase Response
    ↓
Service returns result
    ↓
Controller formats response
    ↓
HTTP Response (JSON)
```

## Data Flow: Image Analysis

### 1. Upload Phase
```
User selects image
    ↓
UploadClient.uploadImage(file)
    ↓
POST /api/upload/inspection-image
    ↓
UploadController validates & calls StorageService
    ↓
Supabase Storage stores file at: images/{user_id}/{timestamp}.jpg
    ↓
Returns public URL & metadata
```

### 2. Analysis Phase
```
User requests analysis
    ↓
AnalysisClient.analyzeImage(imageUrl, meatType)
    ↓
POST /api/analysis/analyze
    ↓
AnalysisController calls services in sequence:
    ├─ ImageProcessingService
    │   └─ Downloads & loads image from URL
    ├─ ColorAnalysisService
    │   └─ Extracts Lab* color values
    ├─ TextureAnalysisService
    │   └─ Computes GLCM texture features
    └─ ClassificationService
        └─ Evaluates NMIS freshness score
    ↓
Returns analysis result JSON
```

### 3. Result Storage Phase
```
Frontend receives analysis result
    ↓
InspectionClient.createInspection(data)
    ↓
POST /api/inspections
    ↓
InspectionController creates record in DB
    ↓
Supabase stores:
{
  user_id: uuid
  image_url: string
  meat_type: string
  color_analysis: json
  texture_analysis: json
  freshness_score: float
  created_at: timestamp
  ...
}
```

## Authentication Flow

```
User enters credentials
    ↓
SignupPage/LoginPage calls supabaseAuth
    ↓
Supabase creates auth session
    ↓
Receives JWT token
    ↓
Profile Context stores token in state/localStorage
    ↓
All subsequent requests include token in header:
    Authorization: Bearer {jwt_token}
    ↓
Backend validates token (optional middleware)
    ↓
Request proceeds to controller
```

## Database Schema Overview

### Core Tables
```
profiles
├── id (UUID, Primary key)
├── user_id (UUID, Foreign key -> auth.users)
├── email (String, Unique)
├── full_name (String)
├── role (Enum: 'inspector', 'admin')
├── created_at (Timestamp)
└── updated_at (Timestamp)

inspections
├── id (UUID, Primary key)
├── user_id (UUID, Foreign key -> profiles)
├── image_url (String)
├── meat_type (Enum: 'beef', 'pork', 'chicken', etc)
├── color_analysis (JSON)
├── texture_analysis (JSON)
├── freshness_score (Float 0-1)
├── created_at (Timestamp)
└── updated_at (Timestamp)

access_codes
├── id (UUID, Primary key)
├── code (String, Unique)
├── created_by (UUID, Foreign key -> profiles)
├── max_uses (Integer)
├── current_uses (Integer)
├── is_active (Boolean)
├── created_at (Timestamp)
└── expires_at (Timestamp)
```

## Security Architecture

### Authentication
- **Provider**: Supabase Auth
- **Method**: JWT tokens
- **Storage**: localStorage (frontend), Authorization header (requests)

### Authorization
- **Row-Level Security (RLS)**: Database-enforced policies
- **Role-Based Access Control (RBAC)**: Inspector, Admin roles
- **Bucket Policies**: Storage access by user_id folders

### Data Protection
```
┌─────────────────────────────────────────┐
│  User Request with JWT                  │
├─────────────────────────────────────────┤
│ ✓ Backend validates JWT signature       │
│ ✓ Extracts user_id from token          │
│ ✓ Database RLS enforces row-level access│
│ ✓ Storage policies enforce bucket access│
└─────────────────────────────────────────┘
```

## Scalability Considerations

### Current Limitations
- Local file uploads during development
- In-memory image processing (no queue)
- Sequential analysis (not parallelized)

### Future Improvements
- **Message Queue** (e.g., Bull/Redis) for async analysis
- **Worker Processes** for parallel image processing
- **CDN** for image serving
- **Caching** (Redis) for frequently accessed data
- **Load Balancer** for horizontal scaling
- **Database Read Replicas** for analytics queries

## Deployment Architecture

### Development
```
localhost:8080 (Frontend)
localhost:3000 (Backend)
Supabase Cloud (DB/Auth/Storage)
```

### Production
```
Recommended:
├── Frontend: Vercel/Netlify (static hosting)
├── Backend: Heroku/Railway/Azure App Service
└── Database: Supabase (managed)
```

## Error Handling

### Frontend
- Try-catch blocks in API clients
- User-friendly error messages in components
- Error boundary for catastrophic failures

### Backend
- Express error middleware
- Service-level validation
- 400/401/403/404/500 status codes with error messages

## Performance Considerations

- **Image Size Limits**: 10MB max
- **Analysis Time**: ~2-5 seconds per image (depends on size)
- **Database Queries**: Indexed on user_id, created_at for fast lookups
- **Caching**: Consider caching static assets, API responses

---

See [BACKEND.md](BACKEND.md) and [FRONTEND.md](FRONTEND.md) for detailed component documentation.
