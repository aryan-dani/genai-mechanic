import React from "react";
import {
  Camera,
  Activity,
  RefreshCw,
  BarChart2,
  Cpu,
} from "lucide-react";
import "./Sidebar.css";
import ImageUpload from "./ImageUpload";
import logo from "../assets/tata.png";

const Sidebar = ({ sessionData, setSessionData, sessionStats }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSessionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSensorChange = (e) => {
    const { name, value } = e.target;
    setSessionData((prev) => ({ ...prev, [name]: Number(value) }));
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

  const stats = sessionStats || {};

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Tata Logo" className="brand-icon" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2>Engineering Console</h2>
        </div>
      </div>

      {/* ── Session Stats ── */}
      <details className="sidebar-section" open>
        <summary className="accordion-summary">
          <BarChart2 size={16} /> Session Stats
        </summary>
        <div className="accordion-content">
          <div className="stats-grid">
            <div className="stats-item">
              <span className="stats-value">{stats.messageCount ?? 0}</span>
              <span className="stats-label">Messages</span>
            </div>
            <div className="stats-item">
              <span className="stats-value">
                {stats.lastLatencyMs ?? 0}
                <small>ms</small>
              </span>
              <span className="stats-label">Latency</span>
            </div>
            <div className="stats-item session-id-item">
              <span className="stats-value mono">{stats.sessionId ?? "—"}</span>
              <span className="stats-label">Session ID</span>
            </div>
          </div>
        </div>
      </details>

      {/* ── Vision Telemetry ── */}
      <details className="sidebar-section" open>
        <summary className="accordion-summary">
          <Camera size={16} /> Vision Telemetry
        </summary>
        <div className="accordion-content">
          <p className="subsection-desc">Upload OBD-II or Dashboard Image</p>
          <ImageUpload setSessionData={setSessionData} />
        </div>
      </details>

      {/* ── Manual Context ── */}
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

      {/* ── Live Sensors (editable) ── */}
      <details className="sidebar-section live-sensors" open>
        <summary className="accordion-summary">
          <Cpu size={16} /> Live Sensor Data
        </summary>
        <div className="accordion-content">
          <div className="sensor-inputs-grid">
            <div className="sensor-input-group">
              <label className="label">Engine RPM</label>
              <input
                type="number"
                name="rpm"
                className="input-field"
                min="0"
                max="8000"
                value={sessionData.rpm}
                onChange={handleSensorChange}
              />
            </div>
            <div className="sensor-input-group">
              <label className="label">Speed (km/h)</label>
              <input
                type="number"
                name="speed"
                className="input-field"
                min="0"
                max="300"
                value={sessionData.speed}
                onChange={handleSensorChange}
              />
            </div>
            <div className="sensor-input-group">
              <label className="label">Engine Load (%)</label>
              <input
                type="number"
                name="load"
                className="input-field"
                min="0"
                max="100"
                value={sessionData.load}
                onChange={handleSensorChange}
              />
            </div>
            <div className="sensor-input-group">
              <label className="label">Coolant Temp (°C)</label>
              <input
                type="number"
                name="temp"
                className="input-field"
                min="-40"
                max="130"
                value={sessionData.temp}
                onChange={handleSensorChange}
              />
            </div>
          </div>
          {/* Read-only summary tiles */}
          <div className="sensor-grid" style={{ marginTop: "12px" }}>
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
