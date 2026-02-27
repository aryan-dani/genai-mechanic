# 🚗 GenAI Mechanic — AI Vehicle Diagnostic Platform

An AI-powered vehicle diagnostic platform built with **FastAPI**, **React (Vite)**, **LangChain**, **LangGraph**, and **Google Gemini**. It combines RAG (Retrieval-Augmented Generation), ML classification, web search, and computer vision to provide comprehensive vehicle diagnostics.

## Features

- **Agentic AI Advisor** — LangGraph-based multi-agent system for diagnostic reasoning
- **Real-Time Visualization** — Frontend displays the LangGraph agent node execution via SSE streaming
- **Vision-Based Data Extraction** — Upload OBD-II scanner images and auto-extract sensor data
- **RAG Pipeline** — Retrieves relevant info from service manuals and DTC code databases
- **ML Classifier** — XGBoost-based DTC code classification from sensor readings
- **Web Search** — Fetches real-time recall info and community insights
- **Interactive Chat** — Conversational diagnostic interface with follow-up support

## Project Structure

```
genai-mechanic/
├── backend/
│   ├── server.py              # FastAPI entry point
│   ├── main.py                # Legacy CLI entry point
│   ├── requirements.txt       # Python dependencies
│   ├── data/                  # Datasets, manuals, and reference files
│   ├── models/                # Trained ML model files
│   ├── scripts/               # Utility & setup scripts
│   └── src/                   # Core application source
│       ├── agents/             # LangGraph agent definitions
│       ├── rag/                # RAG pipeline
│       ├── tools/              # Agent tools (classifier, web search, vision)
│       └── utils/              # Config, logging, validation, error handling
├── frontend/
│   ├── package.json           # npm dependencies
│   ├── vite.config.js         # Vite configuration
│   └── src/                   # React source code components & styles
└── .env                       # Environment variables (root level)
```

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/genai-mechanic.git
   cd genai-mechanic
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Google Gemini and Tavily API keys
   ```

3. **Start the FastAPI Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate         # Linux/Mac
   venv\Scripts\activate            # Windows
   pip install -r requirements.txt
   python server.py
   ```
   *The backend will be available at `http://localhost:8000`*

4. **Start the React Frontend**
   Open a new terminal session:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The UI will be available at `http://localhost:5173`*

## Environment Variables (.env)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `TAVILY_API_KEY` | Tavily search API key |

## Tech Stack

- **Frontend**: React, Vite, Vanilla CSS
- **Backend API**: FastAPI, Uvicorn
- **LLM**: Google Gemini
- **Orchestration**: LangGraph, LangChain
- **Vector Store**: AstraDB
- **ML**: XGBoost, scikit-learn
- **Search**: Tavily API
