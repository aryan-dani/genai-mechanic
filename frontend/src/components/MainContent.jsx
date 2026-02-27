import React, { useState } from 'react';
import DiagnosticChat from './DiagnosticChat';
import './MainContent.css';

const MainContent = ({ sessionData }) => {
    return (
        <div className="main-content">
            <div className="top-nav">
                <h1 className="page-title">Diagnostic Terminal <span className="badge">v2.0</span></h1>
                <div className="connection-status">
                    <div className="status-dot online"></div>
                    <span>OBD-II Link Active</span>
                </div>
            </div>

            <div className="workspace">
                <DiagnosticChat sessionData={sessionData} />
            </div>
        </div>
    );
};

export default MainContent;
