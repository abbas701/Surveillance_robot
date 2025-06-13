import { useState } from "react";
import Speedometer from './speedometer';
import LocomotionMode from './locomotionMode';
import JoystickControl from "./joystick";

function LocomotiveControls({ onButtonPress }) {
  const [mode, setMode] = useState("manual-precise");
  const [direction, setDirection] = useState("S");
  const [speed, setSpeed] = useState(0);
  const [headlightsOn, setHeadlightsOn] = useState(false);
  const [hornOn, setHornOn] = useState(false);

  const handleDirectionChange = (value) => {
    setDirection(value);
    onButtonPress({ action: "move", value, speed, mode });
  };

  const returnToStop = () => {
    // setDirection("S");
    // onButtonPress({ action: "move", value: "stop", speed: 0, mode });
  };

  const toggleHeadlights = () => {
    if (mode.includes("manual")) {
      setHeadlightsOn((prev) => {
        const newState = !prev;
        onButtonPress({ action: "headlights", value: newState ? "on" : "off", speed: 0, mode });
        return newState;
      });
    }
  };

  const toggleHorn = () => {
    if (mode.includes("manual")) {
      setHornOn((prev) => {
        const newState = !prev;
        onButtonPress({ action: "horn", value: newState ? "on" : "off", speed: 0, mode });
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
        onClick={() => onButtonPress({ action: "screen", value: "fullscreen", speed: 0, mode })}
      />
      <LocomotionMode onModeChange={(newMode) => {
        setMode(newMode);
        onButtonPress({ action: "mode", value: newMode, speed: 0, mode: newMode });
      }} />
      <Speedometer
        speed={speed}
        onUserChange={(newSpeed) => {
          setSpeed(newSpeed);
          if (direction !== "S") {
            handleDirectionChange(direction);
          }
        }}
      />

<JoystickControl
  onMove={(data) => {
    // Send data to backend (via WebSocket or HTTP)
    console.log("Moving", data);
  }}
  onEnd={() => {
    // Send stop command to backend
    console.log("Stopped");
  }}
/>

      {/* <div className="control-group">
        <img
          src="src/assets/Controls/up.svg"
          alt="F"
          onMouseDown={() => handleDirectionChange("forward")}
          onMouseUp={returnToStop}
        />
        <img
          src="src/assets/Controls/stop.svg"
          alt="S"
          onMouseDown={() => handleDirectionChange("stop")}
          onMouseUp={returnToStop}
        />
        <img
          src="src/assets/Controls/down.svg"
          alt="B"
          onMouseDown={() => handleDirectionChange("backward")}
          onMouseUp={returnToStop}
        />
        <img
          src="src/assets/Controls/left.svg"
          alt="L"
          onMouseDown={() => handleDirectionChange("left")}
          onMouseUp={returnToStop}
        />
        <img
          src="src/assets/Controls/right.svg"
          alt="R"
          onMouseDown={() => handleDirectionChange("right")}
          onMouseUp={returnToStop}
        />
        <img
          src="src/assets/Controls/clockwise.svg"
          alt="RR"
          onMouseDown={() => handleDirectionChange("rotate_right")}
          onMouseUp={returnToStop}
        />
        <img
          src="src/assets/Controls/anticlockwise.svg"
          alt="RL"
          onMouseDown={() => handleDirectionChange("rotate_left")}
          onMouseUp={returnToStop}
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
      </div> */}
    </div>
  );
}

export default LocomotiveControls;