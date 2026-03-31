import { useState } from "react";
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

  return (
    <div className="app-container">
      <Sidebar sessionData={sessionData} setSessionData={setSessionData} />
      <MainContent sessionData={sessionData} />
    </div>
  );
}

export default App;
