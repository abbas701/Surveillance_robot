// LineGraph.jsx
import { useState, useEffect, useRef } from 'react';
import { ResponsiveLine } from '@nivo/line';

function LineGraph({ rawData, theme }) {
    const [selectedYFields, setSelectedYFields] = useState(['temperature']);
    const [xField, setXField] = useState('timestamp');
    const [chartData, setChartData] = useState([]);
    const graphContainerRef = useRef(null);

    const handleFullScreen = () => {
        const elem = graphContainerRef.current;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen(); // Safari
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen(); // IE11
        }
    };


    // Store historical sensor data
    const [history, setHistory] = useState([]);

    // Append new data point every second
    useEffect(() => {
        if (rawData && rawData.timestamp) {
            setHistory((prev) => [...prev.slice(-59), rawData]);
        }
    }, [rawData]);

    // Process chart data when history or selected fields change
    useEffect(() => {
        const processed = selectedYFields.map((field) => ({
            id: field.charAt(0).toUpperCase() + field.slice(1),
            data: history.map((d) => ({
                x: new Date(d[xField]).toLocaleTimeString(),
                y: d[field],
            }))
        }));
        setChartData(processed);
    }, [history, selectedYFields, xField]);

    const yOptions = ['temperature', 'pressure', 'altitude'];
    const xOptions = ['timestamp', "temperature", "pressure", "altitude"]; // Can be expanded later

    const toggleYField = (field) => {
        setSelectedYFields((prev) =>
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    return (
        <div ref={graphContainerRef} style={{
            position: 'relative',
            backgroundColor: theme === 'dark' ? '#0a192f' : 'white',
            width: '100%',
            height: '100%',
            minHeight: 400,
        }}>
            <button
                onClick={handleFullScreen}
                style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 10,
                    padding: '6px 10px',
                    borderRadius: 4,
                    background: '#1e90ff',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                <img
                    src="src/assets/Screen/fullscreen.svg"
                    alt="R" />
            </button>
            <div style={{ marginBottom: 16 }}>
                <label htmlFor="x-select">X-Axis:</label>
                <select
                    id="x-select"
                    value={xField}
                    onChange={(e) => setXField(e.target.value)}
                >
                    {xOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>

                <div style={{ marginTop: 8 }}>
                    <label>Y-Axis:</label>
                    {yOptions.map((field) => (
                        <label key={field} style={{ marginRight: 10 }}>
                            <input
                                type="checkbox"
                                checked={selectedYFields.includes(field)}
                                onChange={() => toggleYField(field)}
                            />
                            {field}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ height: 400 }} date={chartData}>
                <ResponsiveLine
                    data={chartData}
                    margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                    xScale={{ type: 'point' }}
                    yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                    axisBottom={{ tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Time',
                        legendOffset: 36,
                        legendPosition: 'middle',
                        tickValues: 'every 2', }}
                    axisLeft={{ legend: 'Value', legendPosition: 'middle', legendOffset: -40 }}
                    colors={{ scheme: 'category10' }}
                    pointSize={6}
                    useMesh={true}
                    legends={[
                        {
                            anchor: 'bottom-right',
                            direction: 'column',
                            translateX: 100,
                            itemWidth: 80,
                            itemHeight: 20,
                            symbolSize: 12,
                        },
                    ]}
                    theme={{
  textColor: '#333',
  fontSize: 12,
  axis: {
    domain: {
      line: {
        stroke: '#777',
        strokeWidth: 1
      }
    },
    ticks: {
      line: {
        stroke: '#777',
        strokeWidth: 1
      },
      text: {
        fill: '#000',
        fontSize: 14
      }
    },
    legend: {
      text: {
        fill: '#1e90ff',
        fontSize: 16
      }
    }
  },
  grid: {
    line: {
      stroke: '#ccc',
      strokeWidth: 1,
      strokeDasharray: '4 4'
    }
  },
  legends: {
    text: {
      fill: '#444'
    }
  },
  tooltip: {
    container: {
      background: '#ffffff',
      color: '#333',
      fontSize: 13
    }
  }
}}
enableArea={true}
areaOpacity={0.1}
areaBaselineValue={0}
pointColor={{ theme: 'background' }}
pointBorderWidth={2}
pointBorderColor={{ from: 'serieColor' }}
curve="monotoneX"
enableGridX={false}
enableGridY={true}
animate={true}
motionStiffness={90}
motionDamping={15}


                />
            </div>
        </div>
    );
}

export default LineGraph;
