import React, { useState } from 'react';
import ReactSpeedometer from "react-d3-speedometer";

function Speedometer({ speed, direction }) {
  const getDirectionColor = () => {
    switch (direction) {
      case "F": return "green";
      case "B": return "red";
      case "L": return "orange";
      case "R": return "blue";
      case "S": return "gray";
      default: return "black";
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>

      <ReactSpeedometer
        value={speed}
        minValue={0}
        maxValue={100}
        segments={10}
        needleColor={getDirectionColor()}
        startColor="green"
        endColor="red"
        height={200}
        currentValueText={`${speed}% - ${getDirectionText(direction)}`}
      />

    </div>
  );
}

function getDirectionText(dir) {
  switch (dir) {
    case "F": return "Forward";
    case "B": return "Backward";
    case "L": return "Left";
    case "R": return "Right";
    case "S": return "Stopped";
    default: return "Unknown";
  }
}

export default Speedometer;