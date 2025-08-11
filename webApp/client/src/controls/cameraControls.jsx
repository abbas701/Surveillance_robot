import { useState } from "react";

function CameraControls({ mode, onButtonPress }) {
    const [direction, setDirection] = useState("Stop");
    const [flashOn, setFlashOn] = useState(false);

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
    return (
        <div className="locomotive-controls">
            <h2>Camera Controls</h2>
            <div className="control-group">
                <img src="src/assets/Controls/up.svg" alt="Forward" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/down.svg" alt="Backward" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/left.svg" alt="Left" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/right.svg" alt="Right" onMouseDown={handleDirectionChange} onMouseUp={returnToStop} />
                <img src="src/assets/Controls/flash.svg" alt="Flash" style={{opacity: flashOn ? 1 : 0.5 }} onClick={toggleflash} />
            </div>
        </div>
    );
}
export default CameraControls;