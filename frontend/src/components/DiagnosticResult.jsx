import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import "./DiagnosticResult.css";

const DiagnosticResult = ({ result, duration }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!result) return null;

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="diagnostic-result glass-panel animate-slide-in">
      <div className="result-header">
        <h3 className="result-title">
          <CheckCircle className="text-success" size={20} />
          {result.main_heading}
        </h3>
        {duration && (
          <span className="duration-badge">
            {duration.toFixed(0)} ms latency
          </span>
        )}
      </div>

      <div className="confidence-row">
        <div className="confidence-card">
          <span className="conf-label">ML Prediction</span>
          <span className="conf-value text-primary">
            {result.ml_score != null
              ? result.ml_score + "%"
              : result.ml_evidence !== "None"
                ? "Active"
                : "N/A"}
          </span>
        </div>
        <div className="confidence-card">
          <span className="conf-label">RAG / Manuals</span>
          <span className="conf-value text-primary">
            {result.rag_score != null
              ? result.rag_score + "%"
              : result.rag_evidence !== "None"
                ? "Matched"
                : "N/A"}
          </span>
        </div>
        <div className="confidence-card">
          <span className="conf-label">Overall Confidence</span>
          <span className="conf-value text-success">
            {result.confidence_score != null
              ? result.confidence_score + "%"
              : result.confidence_level}
          </span>
        </div>
      </div>

      <div className="final-verdict">
        <h4>Final Verdict</h4>
        <p>{result.diagnosis}</p>
      </div>

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

      <div className="action-plan">
        <h4>{result.steps_heading}</h4>
        <div className="steps-list">
          {result.action_plan.map((step, idx) => (
            <div key={idx} className="step-item">
              <div className="step-number">{idx + 1}</div>
              <div className="step-content">
                <ReactMarkdown>{step}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      <div className="result-actions">
        <button
          className="btn btn-secondary"
          onClick={() => alert("Report successfully submitted to developers.")}
        >
          Report Incorrect
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Generate PDF Report
        </button>
      </div>
    </div>
  );
};

export default DiagnosticResult;
