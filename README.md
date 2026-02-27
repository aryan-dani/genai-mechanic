# 🚗 GenAI Mechanic — AI Vehicle Diagnostic Platform

An AI-powered vehicle diagnostic platform built with **Streamlit**, **LangChain**, **LangGraph**, and **Google Gemini**. It combines RAG (Retrieval-Augmented Generation), ML classification, web search, and computer vision to provide comprehensive vehicle diagnostics.

## Features

- **Agentic AI Advisor** — LangGraph-based multi-agent system for diagnostic reasoning
- **Vision-Based Data Extraction** — Upload OBD-II scanner images and auto-extract sensor data
- **RAG Pipeline** — Retrieves relevant info from service manuals and DTC code databases
- **ML Classifier** — XGBoost-based DTC code classification from sensor readings
- **Web Search** — Fetches real-time recall info and community insights
- **Interactive Chat** — Conversational diagnostic interface with follow-up support
- **PDF Reports** — Generate downloadable diagnostic reports

## Project Structure

```
genai-mechanic/
├── app.py                  # Main Streamlit application
├── main.py                 # CLI entry point
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── data/                   # Datasets, manuals, and reference files
├── models/                 # Trained ML model files
├── scripts/                # Utility & setup scripts
└── src/                    # Core application source
    ├── agents/             # LangGraph agent definitions
    ├── rag/                # RAG pipeline (ingest, retrieve)
    ├── tools/              # Agent tools (classifier, web search, vision)
    └── utils/              # Config, logging, validation, error handling
```

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/genai-mechanic.git
   cd genai-mechanic
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate   # Linux/Mac
   venv\Scripts\activate      # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. **Run the app**
   ```bash
   streamlit run app.py
   ```

   Or use the CLI:
   ```bash
   python main.py
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `TAVILY_API_KEY` | Tavily search API key |

## Tech Stack

- **Frontend**: Streamlit
- **LLM**: Google Gemini (via LangChain)
- **Orchestration**: LangGraph
- **Vector Store**: ChromaDB
- **ML**: XGBoost, scikit-learn
- **Search**: Tavily API
