import React from 'react';
import ReactSpeedometer from "react-d3-speedometer";

function Speedometer({ speed, direction }) {
  const getDirectionColor = () => {
    switch (direction) {
      case "F": return "green";
      case "B": return "red";
      case "L": return "orange";
      case "R": return "blue";
      default: return "gray";
    }
  };

  const getDirectionText = (dir) => {
    switch (dir) {
      case "F": return "Forward";
      case "B": return "Backward";
      case "L": return "Left";
      case "R": return "Right";
      default: return "Stopped";
    }
  };

  return (
    <div className="flex justify-center items-center">
      <ReactSpeedometer
        value={speed}
        minValue={0}
        maxValue={100}
        segments={10}
        needleColor={getDirectionColor()}
        startColor="green"
        endColor="red"
        width={140}
        height={100}
        ringWidth={15}
        valueTextFontSize="10px"
        labelFontSize="8px"
        currentValueText={`${speed}% - ${getDirectionText(direction)}`}
      />
    </div>
  );
}

export default Speedometer;
