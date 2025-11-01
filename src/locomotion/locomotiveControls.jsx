import { useState } from "react";
import Speedometer from './speedometer';
import LocomotionMode from './locomotionMode';
import JoystickControl from "./joystickControl";

function LocomotiveControls({ onButtonPress, theme }) {
  const [mode, setMode] = useState("manual-precise");
  const [direction, setDirection] = useState("stop");
  const [speed, setSpeed] = useState(0);
  const [headlightsOn, setHeadlightsOn] = useState(false);
  const [hornOn, setHornOn] = useState(false);

  const handleJoystickEnd = () => {
    handleDirectionChange({ distance: 0, angle: 0 });
  };

  const handleDirectionChange = (data) => {
    const speedCalculated = Math.round(data.distance);
    const angleCalculated = Math.round(data.angle);
    setSpeed(Math.floor((speedCalculated / 255) * 100));
    onButtonPress({ action: "move", speed: speedCalculated, angle: angleCalculated, mode });
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (direction !== "S") onButtonPress({ action: "move", speed: newSpeed, mode });
  };

  const handleEmergencyStop = () => {
    onButtonPress({ action: "stop" });
    handleDirectionChange({ distance: 0, angle: 0 });
  };

  const toggleHeadlights = () => {
    setHeadlightsOn((prev) => {
      const newState = !prev;
      onButtonPress({ action: "headlights", value: newState });
      return newState;
    });
  };

  const toggleHorn = () => {
    setHornOn((prev) => {
      const newState = !prev;
      onButtonPress({ action: "horn", value: newState });
      return newState;
    });
  };

  // const handleFullscreen = () => {
  //   const elem = document.documentElement;
  //   if (!document.fullscreenElement) elem.requestFullscreen();
  //   else document.exitFullscreen();
  // };

  return (
    <div
      className={`rounded-2xl shadow-md p-5 transition-all duration-300 
      ${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold tracking-wide">Locomotive Controls</h2>
        {/* <button
          onClick={handleFullscreen}
          title="Fullscreen"
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <img src="src/assets/Screen/fullscreen.svg" alt="Fullscreen" className="w-5 h-5" />
        </button> */}
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center mb-4">
        <LocomotionMode
          onModeChange={(newMode) => {
            setMode(newMode);
            onButtonPress({ action: "mode", value: newMode });
          }}
          theme={theme}
        />
      </div>

      {/* Speedometer */}
      <div className="flex justify-center mb-4">
        <Speedometer speed={speed} direction={direction} />
      </div>

      {/* Joystick */}
      <div className="flex justify-center mb-4">
        <JoystickControl onMove={handleDirectionChange} onEnd={handleJoystickEnd} />
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap justify-center items-center gap-3 mt-3">
        {/* Headlights */}
        <button
          onClick={toggleHeadlights}
          title="Headlights"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium transition 
            ${headlightsOn
              ? 'bg-blue-600 text-white border-blue-700 shadow-md'
              : theme === 'dark'
                ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
        >
          <img src="src/assets/Controls/headlights.svg" alt="Headlights" className="w-5 h-5" />
          <span>Headlights</span>
        </button>

        {/* Horn */}
        <button
          onClick={toggleHorn}
          title="Horn"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium transition 
            ${hornOn
              ? 'bg-yellow-500 text-white border-yellow-600 shadow-md'
              : theme === 'dark'
                ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
        >
          <img src="src/assets/Controls/horn.svg" alt="Horn" className="w-5 h-5" />
          <span>Horn</span>
        </button>

        {/* Emergency Stop */}
        <button
          onClick={handleEmergencyStop}
          title="Emergency Stop"
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg border border-red-600 
            text-red-600 hover:bg-red-600 hover:text-white font-medium transition shadow-sm"
        >
          <div className="text-lg">🛑</div>
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
}

export default LocomotiveControls;
