import React, { useState } from 'react';
import ReactSpeedometer from "react-d3-speedometer";

function Speedometer({ speed, onUserChange }) {
  const [userSpeed, setUserSpeed] = useState(speed);

  const handleUserChange = (e) => {
    const newSpeed = parseInt(e.target.value);
    setUserSpeed(newSpeed);
    onUserChange(newSpeed);
  };

  return (
    <div>
      <ReactSpeedometer
        value={userSpeed}
        minValue={0}
        maxValue={100}
        segments={10}
        needleColor="black"
        startColor="green"
        endColor="red"
        height={200}
      />
      
        <input
          type="range"
          min="0"
          max="100"
          value={userSpeed}
          onChange={handleUserChange}
        />
      
    </div>
  );
}

export default Speedometer;
