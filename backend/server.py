import os
import sys
import json
import base64
import time
import asyncio
from datetime import datetime
from io import BytesIO
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

# Ensure internal modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# --- Internal Imports ---
try:
    from src.utils import CONFIG, get_logger, diagnostic_history
    from src.agents.advisor import langgraph_app, parser as diagnostic_parser
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage
    from langchain_core.output_parsers import PydanticOutputParser
except ImportError as e:
    print(f"CRITICAL IMPORT ERROR in server.py: {e}")
    sys.exit(1)

logger = get_logger(__name__)

# --- App Setup ---
app = FastAPI(
    title="GenAI Mechanic Backend",
    version="2.0.0",
    description="FastAPI Backend for Smart Vehicle Diagnostic Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM for Vision/Triage
llm_flash = ChatGoogleGenerativeAI(model=CONFIG.model_name, temperature=CONFIG.temperature)

# --- Pydantic Models for Requests ---
class DiagnosisRequest(BaseModel):
    user_text: str
    vehicle_model: str = ""
    dtc_codes: str = ""
    symptoms: str = ""
    operating_condition: str = ""
    rpm: float = 0
    speed: float = 0
    load: float = 0
    temp: float = 0
    session_id: str = "default_session"

class TriageRequest(BaseModel):
    user_text: str
    vehicle_model: str = ""
    dtc_codes: str = ""
    rpm: float = 0
    speed: float = 0
    load: float = 0
    temp: float = 0

class TriageResponse(BaseModel):
    is_diagnostic: bool
    is_follow_up: bool
    is_sufficient: bool
    response: str
    missing: list
    ui_main_heading: str
    ui_steps_heading: str

triage_parser = PydanticOutputParser(pydantic_object=TriageResponse)

# --- Endpoints ---

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/stats")
async def get_stats():
    """Retrieve platform statistics"""
    try:
        stats = diagnostic_history.get_statistics()
        return stats
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/api/history")
async def get_history(limit: int = 50):
    """Retrieve recent diagnostic history"""
    try:
        import sqlite3
        import pandas as pd
        with sqlite3.connect(CONFIG.db_path) as conn:
            df = pd.read_sql_query("SELECT id, timestamp, vehicle_model, dtc_codes, diagnosis, confidence_score FROM diagnostics ORDER BY timestamp DESC LIMIT ?", conn, params=[limit])
            # Return as a list of dicts
            return df.to_dict(orient='records')
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.post("/api/triage", response_model=TriageResponse)
async def perform_triage(req: TriageRequest):
    """Determine UI intent (Start diagnostic vs Answer Follow-up vs Need More Info)"""
    try:
        t_prompt = (
            f"User Input: '{req.user_text}' | Vehicle: {req.vehicle_model} | DTC: {req.dtc_codes} | "
            f"Sensors: RPM={req.rpm}, Speed={req.speed}, Load={req.load}%, Temp={req.temp}C\n"
            "CRITICAL RULES:\n"
            "1. If user describes a NEW issue, set is_diagnostic=True and is_follow_up=False.\n"
            "2. If user asks a FOLLOW-UP question, set is_diagnostic=False, is_follow_up=True, and write the answer in 'response'.\n"
            "3. If general chat, set is_diagnostic=False and reply in 'response'.\n"
            "4. If is_diagnostic=True BUT the input is vague and lacks technical details, set is_sufficient=False. In 'response', act as a helpful mechanic and ask a specific CLARIFYING QUESTION.\n"
            f"{triage_parser.get_format_instructions()}"
        )
        
        t_res = await llm_flash.ainvoke(t_prompt)
        intent = triage_parser.parse(t_res.content.replace('```json','').replace('```','').strip())
        return intent

    except Exception as e:
        logger.error(f"Triage error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/vision/extract")
async def extract_vision(file: UploadFile = File(...)):
    """Process uploaded scanner image and extract telemetry"""
    try:
        content = await file.read()
        encoded = base64.b64encode(content).decode('utf-8')

        vision_prompt = """You MUST extract automotive sensor data from the image and return ONLY valid JSON.
        Extract exactly these values:
        - rpm: Engine RPM (integer, 0-8000)
        - speed: Vehicle speed (integer, km/h, 0-300)
        - load: Engine load (integer, 0-100%)
        - temp: Coolant temperature (integer, Celsius, -40 to 130)
        - dtc: Diagnostic code (string like P0100 or null)
        
        CONVERSION RULES:
        - mph to km/h: multiply by 1.609
        - Fahrenheit to Celsius: (F-32) * 5/9
        - Return null for missing values
        - Numbers ONLY, no units
        
        RESPOND WITH ONLY THIS JSON FORMAT:
        {"rpm": number, "speed": number, "load": number, "temp": number, "dtc": null or string}"""

        v_res = await llm_flash.ainvoke([HumanMessage(content=[
            {"type": "text", "text": vision_prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}}
        ])])

        # Extract JSON from response
        import re
        clean_json = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', v_res.content, re.DOTALL)
        if clean_json:
            v_data = json.loads(clean_json.group())
            # Replace nulls with 0 or ""
            v_data = {k: v if v is not None else (0 if k != 'dtc' else "") for k, v in v_data.items()}
            return v_data
        else:
             raise Exception("No JSON detected in vision response")

    except Exception as e:
        logger.error(f"Vision extract error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/diagnose")
async def run_diagnostic(req: Request):
    """Stream LangGraph Agent Execution using SSE"""
    try:
        body = await req.json()
        diagnosis_req = DiagnosisRequest(**body)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")

    full_input = (
        f"Vehicle: {diagnosis_req.vehicle_model} | DTC: {diagnosis_req.dtc_codes} | "
        f"Symptom: {diagnosis_req.symptoms} | Condition: {diagnosis_req.operating_condition} | "
        f"Sensors: RPM={diagnosis_req.rpm}, Speed={diagnosis_req.speed}, "
        f"Load={diagnosis_req.load}%, Temp={diagnosis_req.temp}C | User: {diagnosis_req.user_text}"
    )

    async def event_generator():
        start_time = time.time()
        final_state = None

        try:
            # Yield initial start event
            yield f"data: {json.dumps({'type': 'status', 'node': 'START', 'message': 'Agent Initialized'})}\n\n"
            
            # Using async streaming for langgraph
            async for output in langgraph_app.astream({"messages": [HumanMessage(content=full_input)]}):
                for node_name, state_update in output.items():
                    # Yield the node step to the frontend
                    yield f"data: {json.dumps({'type': 'step', 'node': node_name, 'message': f'Executing {node_name.upper()}...'})}\n\n"
                    # Small delay to let frontend animate if needed, otherwise it's very fast
                    await asyncio.sleep(0.1) 
                    final_state = state_update
            
            duration_ms = (time.time() - start_time) * 1000

            # Once done, get final message and parse it
            if final_state and "messages" in final_state:
                raw_content = final_state["messages"][-1].content
                try:
                    # Clean up json format marks
                    clean_content = raw_content.replace("```json", "").replace("```", "").strip()
                    validated = diagnostic_parser.parse(clean_content)
                    
                    # Construct structured data payload
                    structured_data = {
                        "id": str(datetime.now().timestamp()),
                        "main_heading": "Diagnostic Analysis Results",
                        "diagnosis": validated.diagnosis,
                        "rag_evidence": validated.rag_evidence,
                        "web_evidence": validated.web_evidence,
                        "ml_evidence": getattr(validated, 'ml_evidence', 'N/A'),
                        "steps_heading": "Action Plan",
                        "action_plan": validated.action_plan,
                        "safety_warning": validated.safety_warning,
                        "confidence_level": validated.confidence_level,
                        "vehicle_model": diagnosis_req.vehicle_model,
                        "dtc_codes": diagnosis_req.dtc_codes,
                        "symptoms": diagnosis_req.symptoms,
                        "sensor_readings": {
                            "rpm": diagnosis_req.rpm,
                            "speed": diagnosis_req.speed,
                            "load": diagnosis_req.load,
                            "temp": diagnosis_req.temp
                        }
                    }

                    # Output final result via standard SSE text event
                    yield f"data: {json.dumps({'type': 'complete', 'duration_ms': duration_ms, 'data': structured_data})}\n\n"
                    
                    # Attempt background save to DB (not blocking the SSE)
                    try:
                       diagnostic_history.save_diagnosis(structured_data)
                    except Exception as db_err:
                        logger.error(f"Background DB save failed: {db_err}")

                except Exception as parse_err:
                     logger.error(f"Error parsing final agent output: {parse_err}. Output: {raw_content}")
                     yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to parse structured output', 'raw_response': raw_content})}\n\n"
            else:
                 yield f"data: {json.dumps({'type': 'error', 'message': 'Agent did not return a response'})}\n\n"

        except Exception as flow_err:
             logger.error(f"Flow Error: {flow_err}", exc_info=True)
             yield f"data: {json.dumps({'type': 'error', 'message': str(flow_err)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    LOG_LEVEL = "info"
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, log_level=LOG_LEVEL)
