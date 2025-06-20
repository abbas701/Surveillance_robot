import { useState } from "react";
import Speedometer from './speedometer';
import LocomotionMode from './locomotionMode';
import JoystickControl from "./joystick";

function LocomotiveControls({ onButtonPress }) {
  const [mode, setMode] = useState("manual-precise");
  const [direction, setDirection] = useState("stop");
  const [speed, setSpeed] = useState(0);
  const [headlightsOn, setHeadlightsOn] = useState(false);
  const [hornOn, setHornOn] = useState(false);

  const handleDirectionChange = (data) => {
    // console.log(data)
    var speedCalculated = Math.round(data["distance"])
    var angleCalculated = Math.round(data["angle"])
    onButtonPress({ action: "move", speed: speedCalculated, angle: angleCalculated, mode: mode });
  };

  const toggleHeadlights = () => {
    if (mode.includes("manual")) {
      setHeadlightsOn((prev) => {
        const newState = !prev;
        onButtonPress({ action: "headlights", value: newState ? "on" : "off" });
        return newState;
      });
    }
  };

  const toggleHorn = () => {
    if (mode.includes("manual")) {
      setHornOn((prev) => {
        const newState = !prev;
        onButtonPress({ action: "horn", value: newState ? "on" : "off" });
        return newState;
      });
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
      {/* <Speedometer
        speed={speed}
        onUserChange={(newSpeed) => {
          setSpeed(newSpeed);
          if (direction !== "S") {
            handleDirectionChange(direction);
          }
        }}
      /> */}
      <JoystickControl
        onMove={(data) => {
          // Send data to backend (via WebSocket or HTTP)
          handleDirectionChange(data);
        }}
        onEnd={() => {
          // Send stop command to backend
          handleDirectionChange({ distance: 0, angle: 0 })
        }}
      />


      <img
        src="src/assets/Controls/headlights.svg"
        alt="Headlights"
        style={{ opacity: headlightsOn ? 1 : 0.5 }}
        onClick={toggleHeadlights}
      />
      <img
        src="src/assets/Controls/horn.svg"
        alt="Horn"
        style={{ opacity: hornOn ? 1 : 0.5 }}
        onClick={toggleHorn}
      />
    </div>
  );
}

export default LocomotiveControls;