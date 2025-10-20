import React, { useState } from 'react';

function CalibrationControls({ onCalibrate }) {
  const [sensor, setSensor] = useState('altitude');
  // const [reference, setReference] = useState(0);

  const handleCalibrate = () => {
    onCalibrate(sensor);
  };

  return (
    <div className="calibration-controls">
      <select value={sensor} onChange={(e) => setSensor(e.target.value)}>
        <option value="altitude">Altitude</option>
      </select>
      {/* <input
        type="number"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Reference value"
      /> */}
      <button onClick={handleCalibrate}>Calibrate</button>
    </div>
  );
}

export default CalibrationControls;