import { useState } from "react";
import ReactSpeedometer from "react-d3-speedometer";
import LocomotionMode from './locomotionMode';
import JoystickControl from "./joystick";

function LocomotiveControls({ onButtonPress }) {
  const [mode, setMode] = useState("manual-precise");
  const [direction, setDirection] = useState("stop");
  const [speed, setSpeed] = useState(0);
  const [headlightsStatus, setHeadlightsStatus] = useState(false);
  const [hornStatus, setHornStatus] = useState(false);

  const handleDirectionChange = (data) => {
    // console.log(data)
    var speedCalculated = Math.round(data["speed"])
    var angleCalculated = Math.round(data["angle"])
    onButtonPress({ action: "move", speed: speedCalculated, angle: angleCalculated, mode: mode });
  };

  const setHeadlights = (status) => {
    if (mode.includes("manual")) {
      setHeadlightsStatus(status) 
      onButtonPress({ action: "headlights", value: headlightsStatus});
    }
  };

  const setHorn = (status) => {
    if (mode.includes("manual")) {
      setHornStatus(status)
      onButtonPress({ action: "horn", value: hornStatus});
    }
  };

  return (
    <div className="locomotive-controls">
      <h2>Locomotive Controls</h2>
      <img
        src="src/assets/Screen/fullscreen.svg"
        alt="Fullscreen"
        onClick={() => onButtonPress({ action: "screen", value: "fullscreen" })}
      />
      <LocomotionMode onModeChange={(newMode) => {
        setMode(newMode);
        onButtonPress({ action: "mode", value: newMode, speed: 0, mode: newMode });
      }} />
      <div><ReactSpeedometer
        value={speed}
        minValue={0}
        maxValue={100}
        segments={10}
        needleColor="black"
        startColor="green"
        endColor="red"
        height={200}
      /></div>
      
      <JoystickControl
        onMove={(data) => {
          // Send data to backend (via WebSocket or HTTP)
          console.log(data)
          handleDirectionChange(data);
        }}
        onEnd={() => {
          // Send stop command to backend
          handleDirectionChange({ speed: 0, angle: 0 })
        }}
      />


      <img
        src="src/assets/Controls/headlights.svg"
        alt="Headlights"
        style={{ opacity: headlightsStatus ? 1 : 0.5 }}
        onMouseDown={()=>setHeadlights(true)}
        onMouseUp={()=>setHeadlights(false)}
      />
      <img
        src="src/assets/Controls/horn.svg"
        alt="Horn"
        style={{ opacity: hornStatus ? 1 : 0.5 }}
        onMouseDown={()=>setHorn(true)}
        onMouseUp={()=>setHorn(false)}
      />
    </div>
  );
}

export default LocomotiveControls;