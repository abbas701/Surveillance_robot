import { useState } from 'react';
import '../styles/capsuleWidget.css';

function LocomotionMode({ onModeChange }) {
    const [mode, setMode] = useState("manual-precise");
    const handleModeChange = (e) => {
        setMode(e.currentTarget.dataset.mode);
        onModeChange(e.currentTarget.dataset.mode);
    };
    return (
        <div className="switcher-widget">
            <div className="switcher-capsule">
                <button className="capsule-btn left active" data-mode="light" onClick={handleModeChange}>
                    <img className='capsule-img' src="src/assets/Mode/manual-precise.svg" alt="manual-precise" />
                </button>
                <button className="capsule-btn right" onClick={handleModeChange} data-mode="dark">
                    <img className='capsule-img' src="src/assets/Mode/manual-free.svg" alt="manual-free" />
                </button>
            </div>
        </div>
    );
}

export default LocomotionMode;