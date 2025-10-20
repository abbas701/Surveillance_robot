import { useState, useEffect } from "react";
function BatteryWidget({ percent, charging }) {
    const [batteryLevel, setBatteryLevel] = useState(percent);
    const [chargingStatus, setCharging] = useState(charging);
    const level = (Math.floor(batteryLevel / 10)) * 10;

    useEffect(() => {
        setBatteryLevel(level);
        setCharging(charging);
    })
    const imgStyle = {
        width: '24px',
        height: '24px'
    };
    return (
        <div className="battery-widget">
            {batteryLevel === NaN ? <p>?</p> : (
                <div>
                    <img src={`src/assets/Battery/${level}${chargingStatus ? "charging" : ""}.svg`} alt="Battery" style={imgStyle} />
                    <div className="battery-level">
                        <div className="battery-bar" style={{ width: `${batteryLevel}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default BatteryWidget;