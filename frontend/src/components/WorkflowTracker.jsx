import React from 'react';
import { Activity, Database, Globe, BrainCircuit, CheckCircle, Search } from 'lucide-react';
import './WorkflowTracker.css';

const nodeIcons = {
    'START': <Activity size={16} />,
    'reasoner': <BrainCircuit size={16} />,
    'tools': <Database size={16} />,
    'logger': <Search size={16} />,
    'END': <CheckCircle size={16} />
};

const WorkflowTracker = ({ workflow }) => {
    if (!workflow) return null;

    return (
        <div className="workflow-tracker glass-panel">
            <div className="workflow-header">
                <Activity size={18} className="text-primary" />
                <h4>Agent Execution Live</h4>
            </div>

            <div className="workflow-path">
                {workflow.history.map((node, idx) => (
                    <React.Fragment key={idx}>
                        <div className={`workflow-node ${workflow.activeNode === node ? 'active' : 'completed'}`}>
                            <span className="node-icon">{nodeIcons[node] || <Activity size={16} />}</span>
                            <span className="node-label">{node}</span>
                            {workflow.activeNode === node && <div className="spinner"></div>}
                        </div>
                        {idx < workflow.history.length - 1 && <div className="workflow-line"></div>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default WorkflowTracker;
