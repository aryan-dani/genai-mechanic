import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import DiagnosticChat from "./DiagnosticChat";
import "./MainContent.css";

const MainContent = ({ sessionData, updateStats }) => {
  return (
    <div className="main-content">
      <div className="top-nav">
        <div className="nav-left"></div>
        <div className="nav-actions">
          <button className="btn-deploy">Deploy</button>
          <button className="btn-icon">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="workspace">
        <DiagnosticChat sessionData={sessionData} updateStats={updateStats} />
      </div>
    </div>
  );
};

export default MainContent;
