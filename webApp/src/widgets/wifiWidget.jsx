import { useState, useEffect } from "react";


function WifiWidget({ bars }) {
  const [wifiStatus, setWifiStatus] = useState("Disconnected");
  const [wifiSignal, setWifiSignal] = useState(bars);
  const [wifiName, setWifiName] = useState("Unknown");
  useEffect(() => {
    setWifiStatus(bars>0?"Connected":"Disconnected");
    setWifiSignal(Number(bars));
    setWifiName("My WiFi Network");
  });
const imgStyle = {
    width: '24px',
    height: '24px'
  };
  return (
    <div className="wifi-widget">

      <img src={`src/assets/Wifi/${bars}Bar.svg`} alt={`WiFi Signal: ${wifiSignal}`} style={imgStyle}/>
      {/* <p>{wifiStatus}</p>
      <p>Signal Bars: {wifiSignal}</p>
      <p>Wifi Name: {wifiName}</p> */}
    </div>
  );
}

export default WifiWidget;
