import { useState } from "react";
import CameraJoystick from "./cameraJoystick";

function CameraControls({ mode, onButtonPress, theme }) {
    const [direction, setDirection] = useState("Stop");
    const [flashOn, setFlashOn] = useState(false);

    const handleJoystickMove = (position) => {
        // Convert joystick position (-1 to 1) to camera control values (-100 to 100)
        const x = position.x * 100;
        const y = position.y * 100;
        
        // Send camera control command through backend API
        onButtonPress({ 
            action: "camera_move", 
            x: x, 
            y: -y  // Invert Y for intuitive control
        });
    };

    const handleJoystickEnd = () => {
        // Return camera to center when joystick is released
        onButtonPress({ 
            action: "camera_center"
        });
    };

    const handleDirectionChange = (e) => {
        if (mode === "manual") {
            setDirection(e.target.alt);
            onButtonPress(e.target.alt);
        }
    };
    
    const returnToStop = () => {
        if (mode === "manual") {
            setDirection("Stop");
            onButtonPress("Stop");
        }
    }
    
    const toggleflash = () => {
        if (mode === "manual") {
            setFlashOn((prev) => {
                const newState = !prev;
                onButtonPress(`Flash ${newState ? "On" : "Off"}`);
                return newState;
            });
        }
    };

    const centerCamera = () => {
        onButtonPress({ action: "camera_center" });
    };

    return (
        <div className={`rounded-2xl shadow-md p-5 transition-all duration-300 
            ${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}>
            <h2 className="text-lg font-semibold tracking-wide mb-4">Camera Controls</h2>
            
            {/* Camera Joystick */}
            <div className="flex flex-col items-center gap-4 mb-4">
                <CameraJoystick 
                    onMove={handleJoystickMove}
                    onEnd={handleJoystickEnd}
                />
                
                {/* Center Button */}
                <button
                    onClick={centerCamera}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition 
                        ${theme === 'dark'
                            ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                >
                    🎯 Center Camera
                </button>
            </div>
            
            {/* Old Button Controls - Kept for compatibility */}
            {/* <div className="control-group hidden">
                <img src="src/assets/Controls/up.svg" alt="Forward" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/down.svg" alt="Backward" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/left.svg" alt="Left" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/right.svg" alt="Right" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/flash.svg" alt="Flash" style={{opacity: flashOn ? 1 : 0.5 }} onClick={toggleflash} />
            </div> */}
        </div>
    );
}
export default CameraControls;