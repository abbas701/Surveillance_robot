import { useState } from 'react';
import './capsuleWidget.css';

function ThemeWidget({ onThemeChange }) {
    const [theme, setTheme] = useState("light");
    const handleThemeChange = (e) => {
        setTheme(e.currentTarget.dataset.theme);
        onThemeChange(e.currentTarget.dataset.theme);

    };
    return (
        <div className="switcher-widget">
            <div className="switcher-capsule">
                <button className={`capsule-btn left ${theme === "light" ? "active" : ""}`}  data-theme="light" onClick={handleThemeChange}>
                <img className='capsule-img' src="src/assets/Theme/sun.svg" alt="Light" />
            </button>
            <button className={`capsule-btn right ${theme === "dark" ? "active" : ""}`} onClick={handleThemeChange} data-theme="dark">
                <img className='capsule-img' src="src/assets/Theme/moon.svg" alt="Dark" />
            </button>
        </div>
        </div>
    );
}

export default ThemeWidget;