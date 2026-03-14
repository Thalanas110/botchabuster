# MeatGuard Backend

Node.js/Express backend for meat freshness analysis using OpenCV.

## Setup

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

## Architecture

```
backend/
├── src/
│   ├── server.ts              # Express entry point
│   ├── config/
│   │   └── index.ts           # Configuration management
│   ├── controllers/
│   │   └── AnalysisController.ts
│   ├── services/
│   │   ├── ImageProcessingService.ts   # OpenCV operations
│   │   ├── ColorAnalysisService.ts     # Lab* color extraction
│   │   ├── TextureAnalysisService.ts   # GLCM feature extraction
│   │   ├── ClassificationService.ts    # DOH standards evaluation
│   │   └── CalibrationService.ts       # Color card calibration
│   ├── models/
│   │   └── InspectionResult.ts
│   ├── middleware/
│   │   └── upload.ts          # Multer file upload
│   └── routes/
│       └── analysis.ts
├── package.json
└── tsconfig.json
```

## API Endpoints

- `POST /api/analyze` - Analyze meat image (multipart form: image + meat_type)
- `GET /api/health` - Health check
