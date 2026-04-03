# Deployment Guide

This guide covers deploying the Medical Agent full-stack application to production.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                          │
│  ├─ Next.js React App                                       │
│  ├─ Tailwind CSS Styling                                    │
│  └─ API calls to backend                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           │ API calls to:
                           │ POST /chat
                           │ GET /health
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend Server (Render/Railway/Heroku)               │
│  ├─ FastAPI Server                                          │
│  ├─ LangGraph Medical Agent                                 │
│  └─ OpenAI API Integration                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  OpenAI API  │
                    └──────────────┘
```

## Step 1: Prepare Your Repository

### 1a. Update .env files

Make sure these are configured:
- `backend/.env` - Has `OPENAI_API_KEY`
- `frontend/.env.local` - Has `NEXT_PUBLIC_API_URL` (leave as default for local testing)

### 1b. Commit and push to GitHub

```bash
git add .
git commit -m "Split into backend/frontend structure for Vercel deployment"
git push origin main
```

## Step 2: Deploy Backend

### Option A: Render.com (Recommended - Free Tier)

1. **Sign up** at [render.com](https://render.com)

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name**: `medical-agent-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   - Click "Environment"
   - Add:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `OPENAI_MODEL`: `gpt-4o`
     - `FRONTEND_URL`: (add after frontend is deployed)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Copy the service URL (e.g., `https://medical-agent-api.onrender.com`)

### Option B: Railway.app

1. **Sign up** at [railway.app](https://railway.app)

2. **Create New Project**
   - Click "New Project" → "Deploy from GitHub"
   - Choose your repository

3. **Configure Environment Variables**
   - Add `OPENAI_API_KEY`
   - Railway auto-detects Python projects
   - Set root directory to `backend` if needed

4. **Create Start Script**
   - Create `railway.json` in backend:
     ```json
     {
       "build": {
         "builder": "nixpacks"
       },
       "deploy": {
         "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
       }
     }
     ```

5. **Deploy**
   - Railway automatically builds and deploys
   - Get your API URL from the deployments tab

### Option C: Heroku (Credit card required)

1. **Create Procfile** (already created):
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

2. **Deploy via Heroku CLI**:
   ```bash
   heroku login
   heroku create medical-agent-api
   heroku config:set OPENAI_API_KEY=sk-...
   git push heroku main
   ```

## Step 3: Deploy Frontend

### Deploy to Vercel (Native Next.js Support)

1. **Sign up** at [vercel.com](https://vercel.com)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add:
     - **Key**: `NEXT_PUBLIC_API_URL`
     - **Value**: Your backend URL (e.g., `https://medical-agent-api.onrender.com`)
     - Select "Production" environment

5. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically
   - Get your URL (e.g., `https://medical-agent.vercel.app`)

## Step 4: Verify Deployment

### Test Backend Health
```bash
curl https://your-backend-url/health
```

Should return:
```json
{"status": "healthy"}
```

### Test API
```bash
curl -X POST https://your-backend-url/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I have chest pain"}'
```

### Test Frontend
Visit: `https://your-frontend-url.vercel.app`

## Step 5: Update Configurations

### Backend - Add Frontend URL
Update your backend environment variable on Render/Railway/Heroku:
- `FRONTEND_URL`: `https://your-frontend.vercel.app`

This allows CORS from your frontend URL.

### Frontend - Verify API Connection
The frontend should now connect to:
```
https://your-backend-url
```

## Troubleshooting

### "CORS Error" or "Failed to connect to backend"
- Check `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check backend `FRONTEND_URL` environment variable is set
- Backend must have CORS middleware configured (it does)

### "OpenAI API Key error"
- Verify `OPENAI_API_KEY` is set in backend service
- Check API key is valid and has access to GPT-4o

### "Build fails on Vercel"
- Ensure `frontend/` directory exists with `package.json`
- Check Node.js version (14+ required)
- Run `npm run build` locally to verify

### "Backend returns 502 Bad Gateway"
- Check backend logs on Render/Railway
- Verify OpenAI API key is set
- Restart the service

## Cost Estimates (as of 2024)

- **Vercel Frontend**: Free tier (generous limits)
- **Render Backend**: Free tier (spins down after inactivity)
- **OpenAI API**: Pay-as-you-go ($0.01-0.05 per request depending on model)

## Monitoring

### Vercel
- Dashboard shows deployment history and analytics
- Performance metrics on each deployment

### Render
- Real-time logs in dashboard
- Email alerts for deployment failures

### OpenAI
- Monitor API usage in [OpenAI dashboard](https://platform.openai.com/account/usage)
- Set usage limits to prevent overspending

## Next Steps

1. ✅ Deploy backend
2. ✅ Deploy frontend
3. ✅ Test both in production
4. Consider adding:
   - Authentication (NextAuth.js)
   - Database for conversation history (PostgreSQL)
   - Caching (Redis)
   - Analytics/tracing (Langsmith)

## Support

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
