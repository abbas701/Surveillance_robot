import React, { useState } from 'react';
import ReactSpeedometer from "react-d3-speedometer";

function Speedometer({ speed }) {
  const [userSpeed, setUserSpeed] = useState(speed);

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
    </div>
  );
}

export default Speedometer;
