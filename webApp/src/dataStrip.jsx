import { useState } from "react";
function DataStrip(){
<div>
    <h1>Data Strip</h1>
    <div className="data-strip">
        <div className="data-item">
            <h2>Temperature</h2>
            <p>25°C</p>
        </div>
        <div className="data-item">
            <h2>Humidity</h2>
            <p>60%</p>
        </div>
        <div className="data-item">
            <h2>Light Intensity</h2>
            <p>300 Lux</p>
        </div>
        
    </div>
</div>
}
export default DataStrip;