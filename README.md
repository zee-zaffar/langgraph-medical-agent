# LangGraph Medical Agent - Full Stack

A modern full-stack medical assistant powered by LangGraph and OpenAI, ready for Vercel deployment.

## Project Structure

```
.
├── backend/              # FastAPI backend (Python)
│   ├── main.py          # FastAPI application
│   ├── agent.py         # LangGraph agent logic
│   ├── requirements.txt  # Python dependencies
│   ├── pyproject.toml    # uv project config
│   └── README.md        # Backend setup guide
│
├── frontend/            # Next.js frontend (React)
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   ├── lib/             # Utilities
│   ├── package.json     # Node dependencies
│   └── README.md        # Frontend setup guide
│
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Features

✅ **LangGraph Agent** - Multi-specialist medical routing agent
✅ **FastAPI Backend** - Production-ready Python API
✅ **Next.js Frontend** - Modern React UI with Tailwind CSS
✅ **Vercel Ready** - Deploy frontend instantly
✅ **CORS Enabled** - Secure cross-origin requests
✅ **Type Safe** - TypeScript on frontend, Python type hints on backend

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OPENAI_API_KEY
python main.py
```

Backend runs at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend runs at `http://localhost:3000`

## Deployment

### Frontend → Vercel (Free)

1. Push both `frontend/` and `backend/` to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Select `frontend` as root directory
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL (e.g., `https://medical-agent-api.render.com`)
6. Deploy!

### Backend → Render.com (Free)

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `backend`
   - **Environment Variables**:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `OPENAI_MODEL`: `gpt-4o`

5. Deploy!

### Alternative Backend Hosts

- **Railway.app** - Free tier available
- **Heroku** - Requires payment
- **AWS** / **Google Cloud** / **Azure** - Enterprise options

## API Integration

The frontend communicates with the backend via:

```typescript
POST /chat
Request: { "message": "user question" }
Response: { "response": "agent response", "message_type": "cardiologist|dentist|general" }
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000  # Local dev
# Production: https://your-api-domain.com
```

### Backend (.env)
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
PORT=8000
```

## Agent Capabilities

The medical agent routes queries to specialized agents:

- **Cardiologist Agent** - Heart and cardiovascular issues
- **Dentist Agent** - Dental and oral health
- **General Health Agent** - Other health concerns

## Development

### Making Changes

1. **Backend**: Edit `backend/agent.py` or `backend/main.py`
2. **Frontend**: Edit files in `frontend/app/` or `frontend/components/`
3. **API Contract**: Keep request/response matching the schema

### Testing

```bash
# Backend
cd backend
python main.py  # Runs on 8000

# Frontend (in new terminal)
cd frontend
npm run dev     # Runs on 3000
```

Visit `http://localhost:3000` to test

## Next Steps

- [ ] Add authentication (NextAuth.js)
- [ ] Add conversation history/persistence
- [ ] Add more specialized agents
- [ ] Add streaming responses
- [ ] Deploy to production

## Support

For issues, see:
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [Next.js Docs](https://nextjs.org/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
