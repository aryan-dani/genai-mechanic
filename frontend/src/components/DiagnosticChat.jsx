import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Command, Zap } from "lucide-react";
import DiagnosticResult from "./DiagnosticResult";
import WorkflowTracker from "./WorkflowTracker";
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
    setCurrentWorkflow({ activeNode: "START", history: [], isComplete: false });

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
                setCurrentWorkflow((prev) => {
                  if (!prev) return prev;
                  const updatedHistory = [...prev.history, data.node];
                  // Deduplicate consecutive nodes if SSE fires twice
                  const cleanHistory = updatedHistory.filter(
                    (val, i, arr) => i === 0 || val !== arr[i - 1],
                  );
                  return {
                    ...prev,
                    activeNode: data.node,
                    history: cleanHistory,
                  };
                });
              } else if (data.type === "complete") {
                setCurrentWorkflow((prev) =>
                  prev
                    ? {
                        ...prev,
                        isComplete: true,
                        duration: data.duration_ms,
                        activeNode: "END",
                      }
                    : null,
                );
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    type: "structured",
                    data: data.data,
                    duration: data.duration_ms,
                  },
                ]);
              } else if (data.type === "error") {
                setCurrentWorkflow((prev) =>
                  prev
                    ? {
                        ...prev,
                        isComplete: true,
                        error: true,
                        activeNode: null,
                      }
                    : null,
                );
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    type: "error",
                    content: data.message,
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
          <div className="empty-state">
            <Zap size={48} className="empty-icon text-primary mb-4" />
            <h2>System Ready</h2>
            <p>
              Describe the issue, provide DTCs, or upload telemetry to begin.
            </p>
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
                <p className="text-danger font-semibold">
                  Error: {msg.content}
                </p>
              )}
              {msg.type === "structured" && (
                <DiagnosticResult result={msg.data} duration={msg.duration} />
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

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a diagnostic query (e.g., 'Engine shakes at idle, code P0300')..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!inputValue.trim() || isProcessing}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DiagnosticChat;
