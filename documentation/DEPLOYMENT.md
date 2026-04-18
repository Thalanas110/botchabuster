# Deployment Guide

This repo is a monorepo with:

- `frontend/` for the Netlify deploy
- `backend/` for the Render deploy

The deployment config is already committed in:

- `netlify.toml`
- `render.yaml`

## Recommended Order

Use this order so the frontend URL and backend CORS settings line up cleanly:

1. Create the Netlify site first so you know its final domain.
2. Create the Render backend and set `ALLOWED_ORIGINS` to that Netlify domain.
3. Set `VITE_API_BASE_URL` in Netlify to the Render backend URL, then redeploy the frontend.

## Frontend on Netlify

### What Netlify Uses

The root `netlify.toml` tells Netlify to:

- build from `frontend/`
- run `npm run build`
- publish `frontend/dist`
- rewrite all SPA routes to `/index.html`

### Netlify Setup

1. Push this repo to GitHub.
2. In Netlify, choose **Add new project** and connect the same repo.
3. If Netlify asks which app in the monorepo to use, select `frontend`.
4. Verify the build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Before the final deploy, add this environment variable:
   - `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`
6. Deploy the site.

### Netlify Environment Variables

Copy from `frontend/.env.example`:

```env
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

## Backend on Render

### What Render Uses

The root `render.yaml` tells Render to:

- create one Node web service
- use `backend/` as the Render service root directory
- run `npm ci && npm run build`
- start with `npm run start`
- health check `GET /api/analysis/health`
- auto-deploy only when files in `backend/` change

### Render Setup

1. In Render, choose **New +** then **Blueprint**.
2. Connect the same GitHub repo.
3. Render will read `render.yaml` and create the backend service from the `backend/` directory in this repo.
4. Provide these environment variables when prompted:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ALLOWED_ORIGINS`
5. Wait for the backend deploy to finish, then copy the Render URL.

### Render Environment Variables

Copy from `backend/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
ALLOWED_ORIGINS=https://your-site.netlify.app,https://*--your-site.netlify.app
UPLOAD_DIR=/tmp/meatlens-uploads
```

Notes:

- `ALLOWED_ORIGINS` supports comma-separated values.
- Wildcards are supported, so `https://*--your-site.netlify.app` allows Netlify preview and branch deploys for the same site.
- Requests without an `Origin` header, such as health checks, are still allowed.

## Monorepo Notes

You do not need to split this repository.

- Netlify deploys only `frontend/`
- Render deploys only `backend/`
- both providers can stay connected to the same GitHub repo

## Existing Render Service

If your Render backend service already exists and is not managed by Blueprint yet, update it to either:

- sync from the root `render.yaml`, or
- use these manual settings in the Render Dashboard:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm run start
```

The repo root also now includes a Render-aware `npm run build` and `npm start`, so a root-based service can still build the backend only if Render is using root commands.

## First Production Wiring

After both services exist:

1. Copy the Render backend URL, for example `https://meatlens-backend.onrender.com`
2. In Netlify, set:
   - `VITE_API_BASE_URL=https://meatlens-backend.onrender.com/api`
3. In Render, set:
   - `ALLOWED_ORIGINS=https://your-site.netlify.app,https://*--your-site.netlify.app`
4. Trigger a fresh deploy on both services if needed.

## Quick Checks After Deployment

Run these checks in the browser after deployment:

1. Open the frontend Netlify URL.
2. Confirm login and API-backed pages load without CORS errors.
3. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/analysis/health` and confirm the health endpoint responds.
4. Test a direct deep link in the frontend, such as `/login`, to confirm Netlify SPA routing works.

## Troubleshooting

### Frontend still points to localhost

`VITE_API_BASE_URL` is missing or still set to a local value in Netlify.

### Browser shows CORS errors

`ALLOWED_ORIGINS` in Render does not include your Netlify production URL or preview URL pattern.

### Netlify deep links return 404

Make sure Netlify is using the root `netlify.toml` so the SPA redirect rule is applied.

### Render health checks fail

Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set and that the service is using the health check path `/api/analysis/health`.

## Reference Docs

- [Netlify monorepos](https://docs.netlify.com/build/configure-builds/monorepos/)
- [Netlify redirects and rewrites](https://docs.netlify.com/routing/redirects/)
- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
