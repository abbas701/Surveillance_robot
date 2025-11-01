import React, { useState } from "react";
import SensorWidget from "./sensorWidget";
import WifiWidget from "./wifiWidget";
import BatteryWidget from "./batteryWidget";
import ThemeWidget from "./themeWidget";

const VitalStrip = ({ currentVitals, setTheme }) => {
    const [vitals, setVitals] = useState(currentVitals || {});
    console.log("Vitals:", vitals);
    return (<div>
        {typeof vitals.battery.error === Object && (
            <div>
                <SensorWidget sensorData={{ type: "Timestamp", value: vitals.timestamp ? new Date(vitals.timestamp).toLocaleString() : 'N/A', unit: "", }} />
                <SensorWidget sensorData={{ type: "Voltage", value: vitals.battery.battery_voltage.voltage, unit: "V" }} />
                <SensorWidget sensorData={{ type: "Current", value: vitals.battery.battery_current.voltage, unit: "mA" }} />
                {/* <SensorWidget sensorData={{ type: "Inclination", value: , unit: "°" }} /> */}
                <SensorWidget sensorData={{ type: "Temperature", value: vitals.environment.temperature?.toFixed(2) || 'N/A', unit: "°C", }} />
                <SensorWidget sensorData={{ type: "Pressure", value: vitals.environment.pressure?.toFixed(2) || 'N/A', unit: "hPa", }} />
                <SensorWidget sensorData={{ type: "Altitude", value: vitals.environment.altitude?.toFixed(2) || 'N/A', unit: "m", }} />
                <BatteryWidget percent={vitals.battery.battery_voltage.voltage / 15 * 100} charging={false} />
            </div>
        )}
        <WifiWidget bars="4" />
        <ThemeWidget onThemeChange={setTheme} />
    </div>)
}
export default VitalStrip;