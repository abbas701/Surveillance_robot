import { useState } from 'react';

function LocomotionMode({ onModeChange, theme }) {
  const [mode, setMode] = useState("manual-precise");

  const handleModeChange = (newMode) => {
    setMode(newMode);
    onModeChange(newMode);
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 overflow-hidden 
        ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
    >
      <button
        onClick={() => handleModeChange("manual-precise")}
        className={`px-3 py-2 flex items-center justify-center transition-all duration-300 
          ${mode === "manual-precise"
            ? "bg-blue-600 text-white"
            : theme === 'dark'
              ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
      >
        <img src="src/assets/Mode/manual-precise.svg" alt="Manual Precise" className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleModeChange("manual-free")}
        className={`px-3 py-2 flex items-center justify-center transition-all duration-300 
          ${mode === "manual-free"
            ? "bg-blue-600 text-white"
            : theme === 'dark'
              ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
      >
        <img src="src/assets/Mode/manual-free.svg" alt="Manual Free" className="w-5 h-5" />
      </button>
    </div>
  );
}

export default LocomotionMode;
