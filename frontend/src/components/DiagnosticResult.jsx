import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  ThumbsUp,
  Terminal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import "./DiagnosticResult.css";

/** Safely coerces a step (string | dict | list) to a plain string */
const cleanStep = (step) => {
  if (typeof step === "string") return step;
  if (typeof step === "object" && step !== null) {
    return (
      step.step ||
      step.action ||
      step.description ||
      step.text ||
      JSON.stringify(step)
    );
  }
  return String(step ?? "");
};

const DiagnosticResult = ({ result, duration }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (!result) return null;

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const ragScore = result.rag_score != null ? result.rag_score : null;
  const mlScore = result.ml_score != null ? result.ml_score : null;
  const webScore = result.web_score != null ? result.web_score : null;
  const overallScore =
    result.confidence_score != null
      ? result.confidence_score
      : result.confidence_level;

  const handleMarkHelpful = async () => {
    try {
      await fetch("http://localhost:8000/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis_id: result.id,
          feedback_score: 5,
          resolution: "User marked as helpful",
        }),
      });
    } catch (_) {
      // Fail silently — endpoint may not exist yet
    }
    setFeedbackSent(true);
  };

  const decisionPath = result.decision_path || [];

  return (
    <div className="diagnostic-result glass-panel animate-slide-in">
      <div className="result-header">
        <h3 className="result-title">
          <CheckCircle className="text-success" size={20} />
          {result.main_heading}
        </h3>
        {duration && (
          <span className="duration-badge">{duration.toFixed(0)} ms latency</span>
        )}
      </div>

      {/* ── Confidence Scores ── */}
      <div className="confidence-row">
        <div className="confidence-card">
          <span className="conf-label">ML Prediction</span>
          <span className="conf-value text-primary">
            {mlScore != null
              ? mlScore + "%"
              : result.ml_evidence !== "None"
              ? "Active"
              : "N/A"}
          </span>
        </div>
        <div className="confidence-card">
          <span className="conf-label">RAG / Manuals</span>
          <span className="conf-value text-primary">
            {ragScore != null
              ? ragScore + "%"
              : result.rag_evidence !== "None"
              ? "Matched"
              : "N/A"}
          </span>
        </div>
        <div className="confidence-card">
          <span className="conf-label">Web Research</span>
          <span className="conf-value text-accent">
            {webScore != null ? webScore + "%" : "N/A"}
          </span>
        </div>
        <div className="confidence-card">
          <span className="conf-label">Overall Confidence</span>
          <span className="conf-value text-success">
            {typeof overallScore === "number"
              ? overallScore + "%"
              : overallScore ?? "N/A"}
          </span>
        </div>
      </div>

      {/* ── Final Verdict ── */}
      <div className="final-verdict">
        <h4>Final Verdict</h4>
        <p>{result.diagnosis}</p>
      </div>

      {/* ── Safety Alert ── */}
      {result.safety_warning &&
        result.safety_warning.toLowerCase() !== "none" && (
          <div className="safety-alert">
            <ShieldAlert size={20} />
            <div>
              <strong>Safety Warning:</strong>
              <p>{result.safety_warning}</p>
            </div>
          </div>
        )}

      {/* ── Action Plan ── */}
      <div className="action-plan">
        <h4>{result.steps_heading || "Recommended Action Plan"}</h4>
        <div className="steps-list">
          {(result.action_plan || []).map((step, idx) => (
            <div key={idx} className="step-item">
              <div className="step-number">{idx + 1}</div>
              <div className="step-content">
                <ReactMarkdown>{cleanStep(step)}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Evidence Accordions ── */}
      <div className="evidence-accordion">
        <div className="accordion-item" onClick={() => toggleSection("rag")}>
          <div className="accordion-header">
            <span>
              <FileText size={16} /> View Service Manual Evidence (RAG)
            </span>
            {expandedSection === "rag" ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </div>
          {expandedSection === "rag" && (
            <div className="accordion-content">
              <ReactMarkdown>{result.rag_evidence}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="accordion-item" onClick={() => toggleSection("web")}>
          <div className="accordion-header">
            <span>
              <Globe size={16} /> View Live Web Evidence
            </span>
            {expandedSection === "web" ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </div>
          {expandedSection === "web" && (
            <div className="accordion-content">
              <ReactMarkdown>{result.web_evidence}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* ── Agent Execution Log ── */}
      {decisionPath.length > 0 && (
        <div
          className="accordion-item"
          onClick={() => toggleSection("execlog")}
          style={{ marginBottom: "24px" }}
        >
          <div className="accordion-header">
            <span>
              <Terminal size={16} /> Agent Execution Log
            </span>
            {expandedSection === "execlog" ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </div>
          {expandedSection === "execlog" && (
            <div className="accordion-content decision-log-content">
              {decisionPath.map((entry, idx) => {
                const [before, after] = String(entry).split("→");
                return (
                  <div key={idx} className="decision-log-entry">
                    <span className="decision-icon">🔸</span>
                    <span className="decision-text">
                      {after !== undefined ? (
                        <>
                          <strong>{before.trim()}</strong>
                          {" → "}
                          {after.trim()}
                        </>
                      ) : (
                        entry
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="result-actions">
        <button
          className={`btn ${feedbackSent ? "btn-success" : "btn-secondary"}`}
          onClick={handleMarkHelpful}
          disabled={feedbackSent}
        >
          <ThumbsUp size={14} />
          {feedbackSent ? "Feedback Sent!" : "Mark as Helpful"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => alert("Report successfully submitted to developers.")}
        >
          Report Incorrect
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print Report
        </button>
      </div>
    </div>
  );
};

export default DiagnosticResult;
