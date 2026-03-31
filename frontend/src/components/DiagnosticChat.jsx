import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Command,
  Zap,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import DiagnosticResult from "./DiagnosticResult";
import WorkflowTracker from "./WorkflowTracker";
import tataLogo from "../assets/tata.png";
import watermarkUrl from "../assets/OIP.webp";
import "./DiagnosticChat.css";

const DiagnosticChat = ({ sessionData }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState(null); // Tracks live nodes

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentWorkflow]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userText = inputValue;
    setInputValue("");

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", type: "text", content: userText },
    ]);
    setIsProcessing(true);
    let localWorkflow = { activeNode: "START", history: [], isComplete: false };
    setCurrentWorkflow(localWorkflow);

    try {
      // 1. First, call triage API to see intent
      const triageRes = await fetch("http://localhost:8000/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_text: userText,
          vehicle_model: sessionData.vehicleModel,
          dtc_codes: sessionData.dtc,
          rpm: sessionData.rpm,
          speed: sessionData.speed,
          load: sessionData.load,
          temp: sessionData.temp,
        }),
      });

      const triageData = await triageRes.json();

      if (!triageData.is_diagnostic || !triageData.is_sufficient) {
        // Conversational / follow-up / need more info
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "text",
            content: triageData.response,
          },
        ]);
        setIsProcessing(false);
        setCurrentWorkflow(null);
        return;
      }

      // 2. Intent is diagnostic, start SSE Stream for LangGraph agent
      const response = await fetch("http://localhost:8000/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_text: userText,
          vehicle_model: sessionData.vehicleModel,
          dtc_codes: sessionData.dtc,
          symptoms: sessionData.symptoms,
          operating_condition: sessionData.operatingCondition,
          rpm: sessionData.rpm,
          speed: sessionData.speed,
          load: sessionData.load,
          temp: sessionData.temp,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (let line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6);
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.type === "step" || data.type === "status") {
                const updatedHistory = [...localWorkflow.history, data.node];
                const cleanHistory = updatedHistory.filter(
                  (val, i, arr) => i === 0 || val !== arr[i - 1],
                );
                localWorkflow = {
                  ...localWorkflow,
                  activeNode: data.node,
                  history: cleanHistory,
                };
                setCurrentWorkflow(localWorkflow);
              } else if (data.type === "complete") {
                localWorkflow = {
                  ...localWorkflow,
                  isComplete: true,
                  duration: data.duration_ms,
                  activeNode: "END",
                };
                setCurrentWorkflow(null);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    type: "structured",
                    data: data.data,
                    duration: data.duration_ms,
                    workflow: localWorkflow,
                  },
                ]);
              } else if (data.type === "error") {
                localWorkflow = {
                  ...localWorkflow,
                  isComplete: true,
                  error: true,
                  activeNode: null,
                };
                setCurrentWorkflow(null);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    type: "error",
                    content: data.message,
                    workflow: localWorkflow,
                  },
                ]);
              }
            } catch (e) {
              console.error("SSE Parse error", e, dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "error",
          content: "Failed to connect to the diagnostic server.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="chat-container glass-card">
      <div className="chat-history">
        {messages.length === 0 && (
          <div className="dashboard-container">
            <div
              className="dashboard-hero"
              style={{
                backgroundImage: `url(${watermarkUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <div className="hero-overlay"></div>
              <div className="hero-content">
                <h1 className="hero-title">
                  Smart Vehicle
                  <br />
                  Diagnostic
                </h1>

                <div className="hero-stats">
                  <div className="stat-box">
                    <span className="stat-label">RPM</span>
                    <span className="stat-value">{sessionData.rpm || 0}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">SPEED</span>
                    <span className="stat-value">
                      {sessionData.speed || 0} <small>km/h</small>
                    </span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">LOAD</span>
                    <span className="stat-value">
                      {sessionData.load || 0} <small>%</small>
                    </span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">TEMP</span>
                    <span className="stat-value">
                      {sessionData.temp || 0} <small>°C</small>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-accordions">
              <details className="dash-accordion">
                <summary>
                  <div className="acc-title">
                    <Zap size={16} className="acc-icon" /> Test Agent Routing
                    Scenarios (Mentor Examples)
                  </div>
                  <ChevronRight size={16} className="acc-arrow" />
                </summary>
                <div className="acc-content">
                  <p>
                    Try queries like: "Engine shaking and misfiring", "Error
                    code P0171", etc.
                  </p>
                </div>
              </details>

              <details className="dash-accordion">
                <summary>
                  <div className="acc-title">
                    <BarChart2 size={16} className="acc-icon" /> Platform
                    Statistics
                  </div>
                  <ChevronRight size={16} className="acc-arrow" />
                </summary>
                <div className="acc-content">
                  <p>
                    System is operating normally. All diagnosis models are
                    active.
                  </p>
                </div>
              </details>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            <div className="avatar">
              {msg.role === "assistant" ? (
                <Bot size={20} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="message-content">
              {msg.type === "text" && <p>{msg.content}</p>}
              {msg.type === "error" && (
                <>
                  {msg.workflow && <WorkflowTracker workflow={msg.workflow} />}
                  <p className="text-danger font-semibold">
                    Error: {msg.content}
                  </p>
                </>
              )}
              {msg.type === "structured" && (
                <>
                  {msg.workflow && (
                    <div className="workflow-wrapper-in-msg">
                      <WorkflowTracker workflow={msg.workflow} />
                    </div>
                  )}
                  <DiagnosticResult result={msg.data} duration={msg.duration} />
                </>
              )}
            </div>
          </div>
        ))}

        {currentWorkflow && (
          <div className="message-wrapper assistant">
            <div className="avatar processing">
              <Command size={20} className="spinning" />
            </div>
            <div className="message-content workflow-content">
              <WorkflowTracker workflow={currentWorkflow} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        <div className="powered-by">
          <strong>Powered by Tata Technologies</strong>{" "}
          <img
            src={tataLogo}
            alt="Tata.png"
            style={{
              height: "20px",
              verticalAlign: "middle",
              marginRight: "4px",
              marginLeft: "4px",
            }}
          />{" "}
          | Smart Vehicle Diagnostic Platform
        </div>
        <div className="chat-input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Enter diagnostic query or request procedure..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="send-btn primary-btn"
              disabled={!inputValue.trim() || isProcessing}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticChat;
