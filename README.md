# Fantasy Cricket Chatbot Assistant

A conversational AI-powered chatbot to help cricket fans make smarter Fantasy Cricket decisions.

## Project Structure
- `backend/`: Flask server handling API requests and chatbot logic.
- `frontend/`: React app with a chat interface.

## Setup Instructions
1. **Backend**:
   - Navigate to `backend/`.
   - Create a virtual environment: `python -m venv venv`.
   - Activate it: `source venv/bin/activate` (macOS/Linux) or `venv\Scripts\activate` (Windows).
   - Install dependencies: `pip install -r requirements.txt`.
   - Create `backend/.env` with `OPENAI_API_KEY` and `CRIC_API_KEY`.
   - Run: `python app.py`.

2. **Frontend**:
   - Navigate to `frontend/`.
   - Install dependencies: `npm install`.
   - Create `frontend/.env` with `REACT_APP_BACKEND_URL=http://localhost:5000`.
   - Run: `npm start`.

3. **Access**:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`

## Deployment
- Backend: Deploy to Render.
- Frontend: Deploy to Vercel.