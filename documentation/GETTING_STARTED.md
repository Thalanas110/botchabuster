# Getting Started with MeatLens

Quick guide to set up and run MeatLens locally.

## Prerequisites

- **Node.js** v18 or higher ([download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- **Git** for version control
- A **Supabase account** ([free tier available](https://supabase.com))

## Clone the Repository

```bash
git clone https://github.com/Thalanas110/botchabuster.git
cd botchabuster
```

## Environment Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, retrieve:
   - **Project URL**: Settings > API > URL
   - **Service Role Key**: Settings > API > Service role secret (⚠️ Keep this secret!)

### 2. Configure Backend Environment

Create `.env` file in the `backend/` directory:

```env
# Backend port
PORT=3000

# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# File uploads
UPLOAD_DIR=./uploads
```

### 3. Configure Frontend Environment

Create `.env` file in the `frontend/` directory:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:3000/api

# Supabase credentials (if direct calls are needed)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Install Dependencies

```bash
# Install dependencies for all packages
npm install

# Or install specific packages
npm --workspace=frontend install
npm --workspace=backend install
```

## Database Setup

### Apply Migrations

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run migrations from `backend/supabase/migrations/` in order:
   - `20260313113439_*.sql`
   - `20260313114452_*.sql`
   - `20260313121403_*.sql`
   - `20260322000000_storage_policies.sql`
   - `20260414000000_add_inspector_code_to_profiles.sql`
   - `20260415001000_add_is_dark_mode_to_profiles.sql`

### Set Up Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket named `inspection-images`
3. Check "Public bucket"
4. See [STORAGE_SETUP.md](STORAGE_SETUP.md) for detailed bucket policy setup

## Start Development

### Option 1: Start Both Services Together

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3000

### Option 2: Start Services Separately

**Terminal 1 - Start Frontend:**
```bash
cd frontend
npm run dev
```
Open http://localhost:8080 in your browser

**Terminal 2 - Start Backend:**
```bash
cd backend
npm run dev
```

## Verify Setup

### Frontend Health Check
- Open http://localhost:8080 in your browser
- You should see the MeatLens login page

### Backend Health Check
```bash
curl http://localhost:3000/api/analysis/health
```

Expected response:
```json
{ "status": "ok" }
```

## Create Your First User

1. Go to http://localhost:8080
2. Click **Sign Up**
3. Enter email and password
4. Verify email (in development, check Supabase dashboard > Auth)
5. Log in

## Try an Inspection

1. Log in to the application
2. Go to "New Inspection"
3. Upload or capture an image
4. Select meat type
5. Click "Analyze" - the backend will process and return freshness metrics

## Troubleshooting

### Backend fails to start with "SUPABASE_URL not found"
```bash
# Make sure .env is in the backend/ directory
# Verify the keys are correct
cd backend
echo $SUPABASE_URL  # Should print your URL
```

### Frontend can't connect to backend
```bash
# Check backend is running
curl http://localhost:3000/api/analysis/health

# Verify VITE_API_BASE_URL in frontend/.env
# Default should be: http://localhost:3000/api
```

### Database migration fails
1. Ensure you're using the correct Supabase project
2. Check that migrations are run in correct order
3. Verify your account has permissions to alter database

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more common issues.

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design overview
- Check [API_REFERENCE.md](API_REFERENCE.md) for available endpoints
- See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for detailed development info
- Review [SECURITY.md](SECURITY.md) for auth and access control details

## Development Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review the [documentation folder](./documentation/)
- Check git history: `git log --oneline`
