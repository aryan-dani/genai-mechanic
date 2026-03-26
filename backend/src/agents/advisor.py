# import os
# from dotenv import load_dotenv
# from typing import List
# from pydantic import BaseModel, Field, validator
# from langchain_core.output_parsers import PydanticOutputParser
# from langchain_core.prompts import PromptTemplate
# from langchain_classic.agents import create_tool_calling_agent, AgentExecutor
# from langchain_google_genai import ChatGoogleGenerativeAI

# # Import your custom tools
# from src.tools.classifier_tool import predict_root_cause
# from src.tools.rag_tool import vehicle_diagnostic_db
# from src.tools.web_search import vehicle_web_search

# load_dotenv()

# # ==========================================
# # 1. DEFINE THE STRICT VALIDATION SCHEMA
# # ==========================================
# class DiagnosticResponse(BaseModel):
#     # --- CLARIFICATION FIELDS ---
#     needs_more_info: bool = Field(description="Set to True ONLY IF the user prompt is too vague (no DTCs, no sensor data, generic complaint). False otherwise.")
#     clarifying_questions: List[str] = Field(description="If needs_more_info is True, list 1-3 specific questions to ask the mechanic. Else empty list.")
    
#     # --- EXISTING DIAGNOSTIC FIELDS ---
#     diagnosis: str = Field(description="The final diagnosis. Write 'Pending' if needs_more_info is True.")
#     confidence_level: str = Field(description="High, Medium, or Low. Write 'None' if needs_more_info is True.")
#     ml_evidence: str = Field(description="Summary of ML findings. Write 'None' if not used.")
#     rag_evidence: str = Field(description="Summary of RAG findings. Write 'None' if not used.")
#     web_evidence: str = Field(description="Summary of Web findings. Write 'None' if not used.")
#     action_plan: List[str] = Field(description="Step-by-step repair instructions. If needs_more_info is True, return ['Pending'].")
#     safety_warning: str = Field(description="Any critical safety warnings. If none, write 'None'.")

#     # Logical Cross-Check Validation
#     @validator('action_plan')
#     def validate_action_plan_sources(cls, action_plan, values):
#         """Ensures the LLM doesn't hallucinate an action plan without evidence."""
        
#         # BYPASS: If the AI just needs more info, skip the strict evidence validation
#         if values.get('needs_more_info') is True:
#             return action_plan
            
#         ml = values.get('ml_evidence', 'None')
#         rag = values.get('rag_evidence', 'None')
#         web = values.get('web_evidence', 'None')
        
#         if ml == 'None' and rag == 'None' and web == 'None':
#             raise ValueError("Validation Failed: Action plan generated without citing any tool evidence.")
        
#         if len(action_plan) == 0:
#             raise ValueError("Validation Failed: Action plan cannot be empty.")
            
#         return action_plan

# # Initialize the Parser
# parser = PydanticOutputParser(pydantic_object=DiagnosticResponse)

# # ==========================================
# # 2. INITIALIZE THE LLM & TOOLS
# # ==========================================
# # Using the stable Gemini 2.5 Flash model as requested
# llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)

# # List of tools the agent can use
# tools = [predict_root_cause, vehicle_diagnostic_db, vehicle_web_search]

# # ==========================================
# # 3. BUILD THE PROMPT TEMPLATE
# # ==========================================
# agent_template = """
# You are a Master Diagnostic Technician AI designed for COMPLEX vehicle troubleshooting.
# You are assisting a professional mechanic. Do not give basic, consumer-level advice (like "check the gas cap").

# Use your ML, RAG, and Web Search tools to find deep, technical root causes such as:
# - Wiring harness chafing or pin-fitment issues.
# - Corrupted module communications (U-codes).
# - Subtle sensor biases (e.g., O2 sensors stuck lean, MAP sensor skewed).
# - Complex mechanical failures (e.g., VVT phaser failure, DPF blockage, internal transmission leaks).

# Analyze the mechanic's provided UI Selections, DTCs, and live data to formulate a comprehensive verdict.

# CRITICAL INSTRUCTION: You MUST format your FINAL output exactly according to these rules:
# {format_instructions}
# Do not include any conversational text outside of the JSON block in your final answer.

# User Query: {input}
# {agent_scratchpad}
# """

# prompt = PromptTemplate(
#     template=agent_template,
#     input_variables=["input", "agent_scratchpad"],
#     partial_variables={"format_instructions": parser.get_format_instructions()}
# )

# # ==========================================
# # 4. CREATE THE AGENT EXECUTOR
# # ==========================================
# agent = create_tool_calling_agent(llm, tools, prompt)

# # The AgentExecutor handles the actual running and tool invoking
# agent_executor = AgentExecutor(
#     agent=agent, 
#     tools=tools, 
#     verbose=True, 
#     handle_parsing_errors=True,
#     max_iterations=5 # Prevents infinite loops
# )

import os
import json
import re

# Fix gRPC DNS + SSL issues on macOS Python 3.13
import certifi
os.environ.setdefault('GRPC_DNS_RESOLVER', 'native')
os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('GRPC_DEFAULT_SSL_ROOTS_FILE_PATH', certifi.where())
from dotenv import load_dotenv
from typing import List, Dict, Any, Annotated
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage, ToolMessage
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
import operator

# Import custom tools
from src.tools.classifier_tool import predict_root_cause
from src.tools.rag_tool import vehicle_diagnostic_db
from src.tools.web_search import vehicle_web_search

load_dotenv()

# ==========================================
# 1. TERMINAL FORMATTING HELPER
# ==========================================
class TerminalLogger:
    @staticmethod
    def header(title: str):
        print(f"\n{'='*20} {title.upper()} {'='*20}")

    @staticmethod
    def info(label: str, content: Any):
        print(f"🔹 [{label}]: {content}")

    @staticmethod
    def tool_result(tool_name: str, result: str):
        print(f"\n📦 [TOOL OUTPUT: {tool_name}]")
        print(f"{'-'*50}")
        print(str(result)[:800] + "..." if len(str(result)) > 800 else result)
        print(f"{'-'*50}\n")

# ==========================================
# 2. OUTPUT SCHEMA & STATE
# ==========================================
class DiagnosticResponse(BaseModel):
    needs_more_info: bool
    clarifying_questions: List[str]
    diagnosis: str
    confidence_level: str = Field(description="Overall confidence as a label: High, Medium, or Low.")
    confidence_score: int = Field(description="Overall confidence as an integer percentage 0-100, e.g. 87.")
    rag_score: int = Field(description="Integer 0-100 reflecting how well the RAG knowledge base matched this case.")
    ml_score: int = Field(description="Integer 0-100 reflecting the ML classifier confidence for the predicted root cause.")
    ml_evidence: str
    rag_evidence: str
    web_evidence: str
    action_plan: List[str]
    safety_warning: str

parser = PydanticOutputParser(pydantic_object=DiagnosticResponse)

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]

# ==========================================
# 3. MULTI-AGENT NODES
# ==========================================
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2,
    google_api_key=os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
)
tools = [predict_root_cause, vehicle_diagnostic_db, vehicle_web_search]
llm_with_tools = llm.bind_tools(tools)
basic_tool_node = ToolNode(tools)


def planner_agent(state: AgentState):
    TerminalLogger.header("Planner Agent (Router)")
    planner_prompt = """You are the Lead Workshop Manager and Planner Agent.
Your job is to read the user's initial vehicle complaint or telemetry data and formulate a concise Step-by-Step Plan for the Task Agent.
Identify what tools (predict_root_cause, vehicle_diagnostic_db, vehicle_web_search) are needed. 
If the user provides almost zero context (e.g. "my car is broken"), your plan should simply state: "PLAN: Request clarifying questions." 
Keep your response short and action-oriented."""
    
    messages = [SystemMessage(content=planner_prompt)] + state['messages']
    response = llm.invoke(messages)
    TerminalLogger.info("Plan Formulation", response.content[:200].replace('\n', ' ') + "...")
    return {"messages": [response]}


def task_agent(state: AgentState):
    TerminalLogger.header("Task Agent (Researcher)")
    task_prompt = """You are the Diagnostic Task Agent.
Review the Planner's step-by-step plan and EXECUTE it by calling the appropriate tools.
1. predict_root_cause: Needs a JSON string with exact numeric values (e.g. {"CAR_MODEL": "Tata", "ENGINE_RPM": 1200, "VEHICLE_SPEED": 0, "ENGINE_LOAD": 40, "COOLANT_TEMP": 95, "DTC": "P0171"})
2. vehicle_diagnostic_db: RAG manual lookup based on symptoms.
3. vehicle_web_search: Used for real-time recalls, forums, TSBs.

IMPORTANT: Do not invent missing parameters. Once you have called the tools mentioned in the plan, or if the plan says to request clarifying questions, do NOT continue analyzing. Just output 'RESEARCH COMPLETE'."""
    
    messages = [SystemMessage(content=task_prompt)] + state['messages']
    response = llm_with_tools.invoke(messages)
    
    if response.tool_calls:
        for t in response.tool_calls:
            TerminalLogger.info("Action Triggered", f"Delegating to tool: {t['name']}")
    else:
        TerminalLogger.info("Task Status", "Routing to Synthesizer Agent. (No further tools).")
        
    return {"messages": [response]}


def logging_tool_node(state: AgentState):
    TerminalLogger.header("Tool Execution Node")
    result = basic_tool_node.invoke(state)
    
    for msg in result.get('messages', []):
        if isinstance(msg, ToolMessage):
            name = getattr(msg, 'name', 'Tool')
            TerminalLogger.tool_result(name, msg.content)
            
    return result


def synthesizer_agent(state: AgentState):
    TerminalLogger.header("Synthesizer Agent (Final Output)")
    synth_prompt = f"""You are the Master Synthesizer Agent. Compile the Planner's initial strategy, the Task Agent's tool evidence, and user context into a final JSON technical report.

SCORING RULES (Use the gathered evidence context):
- From predict_root_cause -> extract "ml_score_hint", use as your integer ml_score (0-100).
- From vehicle_diagnostic_db -> extract "RAG_SCORE_HINT", use as your integer rag_score (0-100) (Use 5 if no match).
- confidence_score: (ml_score * 0.4) + (rag_score * 0.35) + web_quality.
- confidence_level: 'High', 'Medium', or 'Low' based on confidence_score.

If the planner suggested requesting clarifying info, set needs_more_info = true and provide the clarifying_questions.

CRITICAL FORMATTING: Output ONLY this exact JSON object format. No markdown, no explanations outside JSON.
{parser.get_format_instructions()}"""

    messages = [SystemMessage(content=synth_prompt)] + state['messages']
    response = llm.invoke(messages)
    
    print(f"\n[SYNTHESIZER output generated, length: {len(str(response.content))}]", flush=True)
    msg_preview = str(response.content)[:500] + "..." if len(str(response.content)) > 500 else str(response.content)
    print(msg_preview, flush=True)
    
    return {"messages": [response]}

# ==========================================
# 4. ARCHITECTURE GRAPH CONSTRUCTION
# ==========================================
workflow = StateGraph(AgentState)

# Add all specialized nodes
workflow.add_node("planner", planner_agent)
workflow.add_node("task_agent", task_agent)
workflow.add_node("tools", logging_tool_node)
workflow.add_node("synthesizer", synthesizer_agent)

# Map edge connections
workflow.add_edge(START, "planner")
workflow.add_edge("planner", "task_agent")

def route_task_agent(state: AgentState):
    last_msg = state['messages'][-1]
    # Check if the final message has any tool calls attached
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "tools"
    return "synthesizer"

workflow.add_conditional_edges("task_agent", route_task_agent)
workflow.add_edge("tools", "task_agent")  # Return to Task Agent once tools run
workflow.add_edge("synthesizer", END)

langgraph_app = workflow.compile()

# ==========================================
# 5. WRAPPER FOR API COMPATIBILITY
# ==========================================
class LegacyAgentExecutorWrapper:
    def invoke(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        TerminalLogger.header("New Session Initiated")
        TerminalLogger.info("User Input", inputs.get("input", "")[:100] + "...")
        
        result = langgraph_app.invoke({"messages": [HumanMessage(content=inputs.get("input", ""))]})
        final_content = result["messages"][-1].content
        if isinstance(final_content, list):
            final_content = " ".join([m.get("text", "") if isinstance(m, dict) else str(m) for m in final_content])

        TerminalLogger.header("Final Synthesizer Verdict")
        try:
            # Use regex to find JSON payload safely
            match = re.search(r'\{.*\}', final_content, re.DOTALL)
            if match:
                json_str = match.group(0)
            else:
                json_str = final_content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(json_str)
            print(json.dumps(parsed, indent=4), flush=True)
        except Exception as e:
            print(f"FAILED TO PARSE JSON: {e}", flush=True)
            print("Raw Content:", final_content, flush=True)
        print("="*50 + "\n", flush=True)
        
        return {"output": final_content}
    
    def get_graph(self):
        return langgraph_app.get_graph()

agent_executor = LegacyAgentExecutorWrapper()