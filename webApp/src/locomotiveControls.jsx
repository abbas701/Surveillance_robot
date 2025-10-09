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
    var speedCalculated = Math.round(data["distance"]);
    var angleCalculated = Math.round(data["angle"]);
    onButtonPress({ action: "move", speed: speedCalculated, angle: angleCalculated, mode: mode });
  };

  const handleEmergencyStop = () => {
    // Send stop command
    onButtonPress({ action: "stop" });
    // Also reset the joystick state by sending zero values
    handleDirectionChange({ distance: 0, angle: 0 });
    console.log("🛑 Emergency stop activated");
  };

  const toggleHeadlights = () => {
    if (mode.includes("manual")) {
      setHeadlightsOn((prev) => {
        const newState = !prev;
        // FIX: Send boolean value instead of string
        onButtonPress({ action: "headlights", value: newState });
        return newState;
      });
    }
  };

  const toggleHorn = () => {
    if (mode.includes("manual")) {
      setHornOn((prev) => {
        const newState = !prev;
        // FIX: Send boolean value instead of string
        onButtonPress({ action: "horn", value: newState });
        return newState;
      });
    }
  };

  return (
    <div className="locomotive-controls">
      <h2>Locomotive Controls</h2>
      
      {/* Fullscreen Button */}
      <img
        src="src/assets/Screen/fullscreen.svg"
        alt="Fullscreen"
        onClick={() => onButtonPress({ action: "screen", value: "fullscreen" })}
      />
      
      {/* Locomotion Mode */}
      <LocomotionMode 
        onModeChange={(newMode) => {
          setMode(newMode);
          onButtonPress({ action: "mode", value: newMode, speed: 0, mode: newMode });
        }} 
      />
      <Speedometer
        speed={speed}
        onUserChange={(newSpeed) => {
          setSpeed(newSpeed);
          if (direction !== "S") {
            handleDirectionChange(direction);
          }
        }}
      />
      {/* Joystick Control */}
      {/* <JoystickControl
        onMove={(data) => {
          handleDirectionChange(data);
        }}
        onEnd={() => {
          handleDirectionChange({ distance: 0, angle: 0 });
        }}
      /> */}

      {/* Control Buttons */}
      <div className="control-buttons">
        {/* Headlights Button */}        
        <button 
          className={`control-button ${headlightsOn ? 'active' : ''}`}
          onClick={toggleHeadlights}
          title="Toggle Headlights"
        >
          <img
            src="src/assets/Controls/headlights.svg"
            alt="Headlights"
          />
          <span>Headlights</span>
        </button>

        {/* Horn Button */}
        <button 
          className={`control-button ${hornOn ? 'active' : ''}`}
          onClick={toggleHorn}
          title="Toggle Horn"
        >
          <img
            src="src/assets/Controls/horn.svg"
            alt="Horn"
          />
          <span>Horn</span>
        </button>

        {/* Emergency Stop Button */}
        <button 
          className="control-button emergency-stop"
          onClick={handleEmergencyStop}
          title="Emergency Stop"
        >
          <div className="stop-icon">🛑</div>
          <span>Emergency Stop</span>
        </button>
      </div>
    </div>
  );
}

export default LocomotiveControls;