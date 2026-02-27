import React from 'react';
import { Camera, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import './Sidebar.css';
import ImageUpload from './ImageUpload';

const Sidebar = ({ sessionData, setSessionData }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setSessionData(prev => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setSessionData({
            vehicleModel: '',
            symptoms: '',
            rpm: 0,
            speed: 0,
            load: 0,
            temp: 0,
            dtc: ''
        });
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <Activity className="brand-icon" size={28} />
                <h2>GenAI Mechanic</h2>
            </div>

            <div className="sidebar-section">
                <h3><Camera size={16} /> Vision Telemetry</h3>
                <p className="subsection-desc">Upload OBD-II or Dashboard Image</p>
                <ImageUpload setSessionData={setSessionData} />
            </div>

            <div className="sidebar-section manual-context">
                <h3>Manual Context</h3>
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
            </div>

            <div className="sidebar-section live-sensors">
                <h3>Live Sensors</h3>
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

            <div className="sidebar-footer">
                <button className="btn btn-secondary w-full reset-btn" onClick={handleReset}>
                    <RefreshCw size={16} /> Reset Session
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
