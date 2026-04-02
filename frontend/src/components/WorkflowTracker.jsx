import React from "react";
import { Activity, Database, CheckCircle, Cpu, BrainCircuit } from "lucide-react";
import "./WorkflowTracker.css";

const WorkflowTracker = ({ workflow }) => {
  if (!workflow) return null;

  const history = workflow.history || [];
  const decisions = workflow.decisions || [];

  const hasStarted = history.length > 0;
  const hasPlanned = history.includes("planner") || history.includes("router") || history.includes("reasoner");
  const hasFetched = history.includes("task_agent") || history.includes("tools");
  const hasSynthesized = history.includes("synthesizer") || history.includes("logger") || history.includes("END");
  const isComplete = workflow.isComplete;

  const phases = [
    {
      id: "init",
      label: "Initialize",
      icon: <Activity size={18} />,
      isActive: hasStarted && !hasPlanned,
      isDone: hasPlanned,
    },
    {
      id: "plan",
      label: "Strategize",
      icon: <Cpu size={18} />,
      isActive: hasPlanned && !hasFetched && !hasSynthesized && !isComplete,
      isDone: hasFetched || hasSynthesized || isComplete,
    },
    {
      id: "fetch",
      label: hasFetched ? "Retrieve Data" : "Skip Tools",
      icon: <Database size={18} />,
      isActive: hasFetched && !hasSynthesized && !isComplete,
      isDone: hasSynthesized || isComplete,
      highlight: hasFetched,
    },
    {
      id: "synth",
      label: "Synthesize",
      icon: <BrainCircuit size={18} />,
      isActive: hasSynthesized && !isComplete,
      isDone: isComplete,
    },
  ];

  return (
    <div
      className={`workflow-tracker glass-panel ${workflow.error ? "error" : ""} ${isComplete ? "complete" : "active"}`}
    >
      {/* Header */}
      <div
        className="workflow-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {workflow.error ? (
            <Activity size={18} className="text-danger" />
          ) : isComplete ? (
            <CheckCircle size={18} className="text-success" />
          ) : (
            <Activity size={18} className="text-primary spin-pulse" />
          )}
          <h4
            style={{
              margin: 0,
              textTransform: "uppercase",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            {workflow.error
              ? "Agent Execution Failed"
              : isComplete
              ? "Agent Execution Log"
              : "Agent Executing..."}
          </h4>
        </div>
        {isComplete && workflow.duration && (
          <span
            className="tracker-duration"
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {(workflow.duration / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Pipeline Phases */}
      <div className="tracker-phases">
        {phases.map((phase, idx) => {
          let statusClass = "pending";
          if (phase.isDone) statusClass = "done";
          else if (phase.isActive) statusClass = "current";

          if (
            phase.id === "fetch" &&
            (hasSynthesized || isComplete) &&
            !hasFetched
          ) {
            statusClass = "bypassed";
          }

          return (
            <React.Fragment key={phase.id}>
              <div
                className={`tracker-phase ${statusClass} ${phase.highlight ? "highlight" : ""}`}
              >
                <div className="phase-icon">
                  {phase.icon}
                  {phase.isActive && <div className="ping-indicator"></div>}
                </div>
                <span className="phase-label">{phase.label}</span>
              </div>
              {idx < phases.length - 1 && (
                <div className={`phase-connector ${statusClass}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Decision Log Entries (shown when complete and decisions exist) */}
      {isComplete && decisions.length > 0 && (
        <div className="wf-decision-log">
          {decisions.map((entry, idx) => {
            const arrowIdx = String(entry).indexOf("→");
            const before = arrowIdx > -1 ? entry.slice(0, arrowIdx).trim() : null;
            const after = arrowIdx > -1 ? entry.slice(arrowIdx + 1).trim() : String(entry);
            return (
              <div key={idx} className="wf-decision-entry">
                <span className="wf-decision-icon">🔸</span>
                <span className="wf-decision-text">
                  {before ? (
                    <>
                      <strong>{before}</strong>
                      {" → "}
                      {after}
                    </>
                  ) : (
                    after
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkflowTracker;
