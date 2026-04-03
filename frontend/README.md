# Medical Agent Frontend

Modern Next.js frontend for the LangGraph medical agent.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.local.example .env.local
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variable in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
4. Deploy
