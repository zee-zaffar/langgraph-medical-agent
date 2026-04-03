#!/bin/bash

echo "🚀 Setting up Medical Agent Full Stack Project"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend
python -m venv venv

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

pip install -r requirements.txt
cp .env.example .env

echo "✅ Backend setup complete!"
echo "⚠️  Don't forget to add your OPENAI_API_KEY to backend/.env"
echo ""

# Frontend setup
cd ../frontend
echo "📦 Setting up frontend..."
npm install
cp .env.local.example .env.local

echo "✅ Frontend setup complete!"
echo ""

echo "🎉 Setup finished!"
echo ""
echo "📝 Next steps:"
echo "1. Update backend/.env with your OpenAI API key"
echo "2. Start backend: cd backend && python main.py"
echo "3. Start frontend: cd frontend && npm run dev"
echo "4. Open http://localhost:3000"
