import React from "react";
import {
  Activity,
  Database,
  Globe,
  BrainCircuit,
  CheckCircle,
  Search,
} from "lucide-react";
import "./WorkflowTracker.css";

const nodeIcons = {
  START: <Activity size={16} />,
  planner: <Search size={16} />,
  task_agent: <Database size={16} />,
  tools: <Activity size={16} />,
  logger: <Search size={16} />,
  synthesizer: <BrainCircuit size={16} />,
  END: <CheckCircle size={16} />,
};

const nodeDisplayNames = {
  START: "Initialize",
  planner: "Plan Strategy",
  task_agent: "Data Fetch",
  tools: "Tool Exec",
  logger: "Parse Data",
  synthesizer: "Synthesize",
  END: "Complete",
};

const WorkflowTracker = ({ workflow }) => {
  if (!workflow) return null;

  return (
    <div
      className={`workflow-tracker glass-panel ${workflow.error ? "error" : ""} ${workflow.isComplete && !workflow.error ? "success" : ""}`}
    >
      <div className="workflow-header">
        {workflow.isComplete ? (
          workflow.error ? (
            <Activity size={18} className="text-danger" />
          ) : (
            <CheckCircle size={18} className="text-success" />
          )
        ) : (
          <Activity size={18} className="text-primary" />
        )}
        <h4>
          {workflow.error
            ? "Agent Execution Failed"
            : workflow.isComplete
              ? "Agent Execution Complete"
              : "Agent Execution Live"}
        </h4>
      </div>

      <div className="workflow-path">
        {workflow.history.map((node, idx) => {
          const displayName = nodeDisplayNames[node] || node;
          const isActive = workflow.activeNode === node && !workflow.isComplete;
          return (
            <React.Fragment key={idx}>
              <div
                className={`workflow-node ${isActive ? "active" : "completed"}`}
              >
                <span className="node-icon">
                  {nodeIcons[node] || <Activity size={16} />}
                </span>
                <span className="node-label">{displayName}</span>
                {isActive && <div className="spinner"></div>}
              </div>
              {idx < workflow.history.length - 1 && (
                <div className="workflow-line"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowTracker;
