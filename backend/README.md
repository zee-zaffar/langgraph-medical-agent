# Medical Agent Backend

FastAPI server for the LangGraph medical agent.

## Setup

1. Create virtual environment:
   ```bash
   python -m venv .venv
   # Or use an existing backend/venv if you already created it earlier
   # On macOS/Linux:
   source .venv/bin/activate
   # On Windows PowerShell (from backend/, recommended):
   .\activate.ps1
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

4. Run the server:
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /health` - Health check
- `GET /` - API info
- `POST /chat` - Send message to medical agent
  - Request: `{"message": "Your question here"}`
  - Response: `{"response": "Agent response", "message_type": "cardiologist|dentist|general"}`

## Deployment

### To Render.com (Recommended for free tier)
1. Push to GitHub
2. Create new Web Service on Render
3. Connect your GitHub repository
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_MODEL`: gpt-4o (optional)

### To Railway.app
1. Push to GitHub
2. Create new project on Railway
3. Connect your GitHub repository
4. Railway will auto-detect Python and install dependencies
5. Set start command in railway.json or Procfile:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
6. Add environment variables

### To Heroku
1. Create Procfile:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
2. Deploy with git push
