import { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import "./App.css";

function App() {
  const [sessionData, setSessionData] = useState({
    vehicleModel: "",
    symptoms: "",
    operatingCondition: "",
    rpm: 0,
    speed: 0,
    load: 0,
    temp: 0,
    dtc: "",
  });

  // Session statistics — updated by DiagnosticChat via prop callback
  const [sessionStats, setSessionStats] = useState({
    messageCount: 0,
    lastLatencyMs: 0,
    sessionId: Math.random().toString(36).slice(2, 10).toUpperCase(),
  });

  const updateStats = useCallback((patch) => {
    setSessionStats((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        sessionData={sessionData}
        setSessionData={setSessionData}
        sessionStats={sessionStats}
      />
      <MainContent
        sessionData={sessionData}
        updateStats={updateStats}
      />
    </div>
  );
}

export default App;
