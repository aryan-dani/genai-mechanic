import React, { useState } from "react";
import {
  Camera,
  Activity,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import "./Sidebar.css";
import ImageUpload from "./ImageUpload";
import logo from "../assets/tata.png";

const Sidebar = ({ sessionData, setSessionData }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSessionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setSessionData({
      vehicleModel: "",
      symptoms: "",
      operatingCondition: "",
      rpm: 0,
      speed: 0,
      load: 0,
      temp: 0,
      dtc: "",
    });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="OPI Logo" className="brand-icon" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2>Engineering Console</h2>
        </div>
      </div>

      <details className="sidebar-section" open>
        <summary className="accordion-summary">
          <Camera size={16} /> Vision Telemetry
        </summary>
        <div className="accordion-content">
          <p className="subsection-desc">Upload OBD-II or Dashboard Image</p>
          <ImageUpload setSessionData={setSessionData} />
        </div>
      </details>

      <details className="sidebar-section manual-context" open>
        <summary className="accordion-summary">
          <Activity size={16} /> Manual Context
        </summary>
        <div className="accordion-content">
          <div className="input-group">
            <label className="label">Vehicle Model</label>
            <input
              type="text"
              name="vehicleModel"
              className="input-field"
              placeholder="e.g., Tata Safari 2024"
              value={sessionData.vehicleModel}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label className="label">Active DTC Codes</label>
            <input
              type="text"
              name="dtc"
              className="input-field"
              placeholder="e.g., P0171"
              value={sessionData.dtc}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label className="label">Symptoms</label>
            <textarea
              className="input-field"
              name="symptoms"
              rows="2"
              placeholder="Customer complaint..."
              value={sessionData.symptoms}
              onChange={handleChange}
            ></textarea>
          </div>
          <div className="input-group">
            <label className="label">Operating Condition</label>
            <input
              type="text"
              name="operatingCondition"
              className="input-field"
              placeholder="e.g., Engine idle, driving"
              value={sessionData.operatingCondition || ""}
              onChange={handleChange}
            />
          </div>
        </div>
      </details>

      <details className="sidebar-section live-sensors" open>
        <summary className="accordion-summary">
          <Activity size={16} /> Live Sensors
        </summary>
        <div className="accordion-content">
          <div className="sensor-grid">
            <div className="sensor-item">
              <span className="sensor-value">{sessionData.rpm}</span>
              <span className="sensor-label">RPM</span>
            </div>
            <div className="sensor-item">
              <span className="sensor-value">{sessionData.speed}</span>
              <span className="sensor-label">km/h</span>
            </div>
            <div className="sensor-item">
              <span className="sensor-value">{sessionData.load}</span>
              <span className="sensor-label">% Load</span>
            </div>
            <div className="sensor-item">
              <span className="sensor-value">{sessionData.temp}</span>
              <span className="sensor-label">°C Temp</span>
            </div>
          </div>
        </div>
      </details>

      <div className="sidebar-footer">
        <button
          className="btn btn-secondary w-full reset-btn"
          onClick={handleReset}
        >
          <RefreshCw size={16} /> Reset Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
