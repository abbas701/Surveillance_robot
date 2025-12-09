import { useState } from "react";

function SensorWidget({ sensorData }) {
    const [type, setType] = useState(sensorData.type);
    const [value, setValvue] = useState(sensorData.value);
    const [unit, setUnit] = useState(sensorData.unit);

    return (
        <div className="sensor-widget">
            <div>
                {/* {type}: */}
                {value}{unit}
            </div>
        </div>
    );
}
export default SensorWidget;