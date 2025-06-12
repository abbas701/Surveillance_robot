import { useState, useEffect } from "react";


function WifiWidget({ bar }) {
  const [wifiStatus, setWifiStatus] = useState("Disconnected");
  const [wifiSignal, setWifiSignal] = useState(bar);
  const [wifiName, setWifiName] = useState("Unknown");
  useEffect(() => {
    setWifiStatus(bar>0?"Connected":"Disconnected");
    setWifiSignal(Number(bar));
    setWifiName("My WiFi Network");
  });
const imgStyle = {
    width: '24px',
    height: '24px'
  };
  return (
    <div className="wifi-widget">

      <img src={`src/assets/Wifi/${bar}Bar.svg`} alt={`WiFi Signal: ${wifiSignal}`} style={imgStyle}/>
      {/* <p>{wifiStatus}</p>
      <p>Signal Bars: {wifiSignal}</p>
      <p>Wifi Name: {wifiName}</p> */}
    </div>
  );
}

export default WifiWidget;
