import { useState, useEffect, useRef } from 'react';
import { ResponsiveLine } from '@nivo/line';

function LineGraph({ rawData, theme }) {
    const [selectedYFields, setSelectedYFields] = useState(['environment.temperature']);
    const [selectedXField, setSelectedXField] = useState('timestamp');
    const [chartData, setChartData] = useState([]);

    // FIX: Initialize with a valid timeRange value that exists in timeRangeOptions
    const [timeRange, setTimeRange] = useState(5); // Use numeric value instead of string

    const [isFullScreen, setIsFullScreen] = useState(false);
    const graphContainerRef = useRef(null);

    // Store complete historical data
    const [completeHistory, setCompleteHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);

    // Available fields for both X and Y axes
    const fieldOptions = [
        'timestamp',
        'environment.temperature',
        'environment.pressure',
        'environment.altitude',
        'imu.accel.x',
        'imu.accel.y',
        'imu.accel.z',
        'imu.gyro.x',
        'imu.gyro.y',
        'imu.gyro.z',
        'imu.tilt.roll',
        'imu.tilt.pitch',
        'encoders.left_encoder.rpm',
        'encoders.right_encoder.rpm',
        'battery.battery_current.voltage',
        'battery.battery_voltage.voltage'
    ];

    // FIX: Time range options - ensure values are consistent
    const timeRangeOptions = [
        { value: 1, label: '1 Minute' },
        { value: 5, label: '5 Minutes' },
        { value: 15, label: '15 Minutes' },
        { value: 30, label: '30 Minutes' },
        { value: 60, label: '1 Hour' },
        { value: 1000, label: 'All Data' }
    ];

    // FIX: Safe function to get time range option
    const getTimeRangeOption = (rangeValue) => {
        return timeRangeOptions.find(opt => opt.value === rangeValue) || timeRangeOptions[1]; // Fallback to 5 minutes
    };

    // Fullscreen toggle
    const toggleFullScreen = () => {
        const elem = graphContainerRef.current;

        if (!isFullScreen) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('msfullscreenchange', handleFullScreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
            document.removeEventListener('msfullscreenchange', handleFullScreenChange);
        };
    }, []);

    // Append new data point when rawData updates
    useEffect(() => {
        if (rawData && rawData.timestamp) {
            setCompleteHistory((prev) => {
                const newData = {
                    ...rawData,
                    // Round numeric values for better plotting
                    environment: rawData.environment ? {
                        temperature: Math.round(rawData.environment.temperature * 100) / 100,
                        pressure: Math.round(rawData.environment.pressure * 100) / 100,
                        altitude: Math.round(rawData.environment.altitude * 100) / 100,
                        MQ2: rawData.environment.MQ2,
                        MQ135: rawData.environment.MQ135
                    } : null,
                    imu: rawData.imu ? {
                        accel: rawData.imu.accel ? {
                            x: Math.round(rawData.imu.accel.x * 1000) / 1000,
                            y: Math.round(rawData.imu.accel.y * 1000) / 1000,
                            z: Math.round(rawData.imu.accel.z * 1000) / 1000
                        } : null,
                        gyro: rawData.imu.gyro ? {
                            x: Math.round(rawData.imu.gyro.x * 1000) / 1000,
                            y: Math.round(rawData.imu.gyro.y * 1000) / 1000,
                            z: Math.round(rawData.imu.gyro.z * 1000) / 1000
                        } : null,
                        tilt: rawData.imu.tilt ? {
                            roll: Math.round(rawData.imu.tilt.roll * 1000) / 1000,
                            pitch: Math.round(rawData.imu.tilt.pitch * 1000) / 1000
                        } : null
                    } : null,
                    encoders: rawData.encoders ? {
                        left_encoder: rawData.encoders.left_encoder ? {
                            rpm: Math.round(rawData.encoders.left_encoder.rpm * 100) / 100,
                            ticks: rawData.encoders.left_encoder.ticks
                        } : null,
                        right_encoder: rawData.encoders.right_encoder ? {
                            rpm: Math.round(rawData.encoders.right_encoder.rpm * 100) / 100,
                            ticks: rawData.encoders.right_encoder.ticks
                        } : null
                    } : null
                };
                return [...prev, newData];
            });
        }
    }, [rawData]);

    // Process chart data when filtered history or selected fields change
    useEffect(() => {
        const processed = selectedYFields.map((field) => {
            const getFieldValue = (data, fieldPath) => {
                const path = fieldPath.split('.');
                let value = data;
                for (const key of path) {
                    if (value && typeof value === 'object' && key in value) {
                        value = value[key];
                    } else {
                        return null;
                    }
                }
                return value;
            };

            const getXValue = (data) => {
                if (selectedXField === 'timestamp') {
                    return new Date(data.timestamp * 1000).toLocaleTimeString();
                }
                return getFieldValue(data, selectedXField);
            };

            return {
                id: field,
                data: filteredHistory
                    .map((d, index) => {
                        const yValue = getFieldValue(d, field);
                        const xValue = getXValue(d);

                        // FIX: Handle both numbers and convert strings to numbers if possible
                        let numericYValue = null;

                        if (typeof yValue === 'number' && !isNaN(yValue)) {
                            numericYValue = yValue;
                        } else if (typeof yValue === 'string') {
                            // Try to convert string to number, or use 0 as fallback
                            const parsed = parseFloat(yValue);
                            numericYValue = isNaN(parsed) ? 0 : parsed;
                        }

                        if (numericYValue !== null && xValue !== null) {
                            return {
                                x: xValue,
                                y: numericYValue,
                                originalData: d
                            };
                        }
                        return null;
                    })
                    .filter(point => point !== null)
            };
        }).filter(series => series.data.length > 0);

        // console.log('Processed Chart Data:', processed);
        setChartData(processed);
    }, [filteredHistory, selectedYFields, selectedXField]);

    // Add this useEffect to filter data based on time range
    useEffect(() => {
        if (completeHistory.length === 0) {
            setFilteredHistory([]);
            return;
        }

        const currentTimeRange = getTimeRangeOption(timeRange);

        if (currentTimeRange.value === 1000) {
            // Show all data
            setFilteredHistory(completeHistory);
        } else {
            // Filter data based on time range
            const now = Date.now() / 1000; // Current time in seconds
            const cutoffTime = now - (currentTimeRange.value * 60);

            const filtered = completeHistory.filter(dataPoint => {
                return dataPoint.timestamp >= cutoffTime;
            });

            setFilteredHistory(filtered);
        }
    }, [completeHistory, timeRange]); // Add this dependency

    // In your LineGraph component, add this:
    // useEffect(() => {
    //     console.log('LineGraph received rawData:', rawData);
    //     console.log('completeHistory:', completeHistory);
    //     console.log('filteredHistory:', filteredHistory);
    // }, [rawData, completeHistory, filteredHistory]);

    // In the append new data point useEffect:
    useEffect(() => {
        if (rawData && rawData.timestamp) {
            // console.log('📈 Processing new data point:', rawData);

            // Ensure the data has the expected structure
            const processedData = {
                timestamp: rawData.timestamp,
                environment: rawData.environment || {},
                imu: rawData.imu || {},
                encoders: rawData.encoders || {},
                battery: rawData.battery || {}
            };

            setCompleteHistory((prev) => [...prev, processedData]);
        }
    }, [rawData]);

    const toggleYField = (field) => {
        setSelectedYFields((prev) =>
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    // Format field name for display
    const formatFieldName = (field) => {
        if (field === 'timestamp') return 'Time';
        return field.split('.').pop().replace(/_/g, ' ');
    };

    const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
    const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const buttonColor = theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600';

    // FIX: Get current time range option safely
    const currentTimeRange = getTimeRangeOption(timeRange);

    return (
        <div
            ref={graphContainerRef}
            className={`relative ${bgColor} ${textColor} ${borderColor} border rounded-xl w-full h-full min-h-[500px] p-4 transition-colors duration-200`}
        >
            {/* Header with Controls */}
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">X-Axis:</label>
                        <select
                            value={selectedXField}
                            onChange={(e) => setSelectedXField(e.target.value)}
                            className={`px-3 py-2 rounded-lg border ${borderColor} ${bgColor} ${textColor} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                            {fieldOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {formatFieldName(opt)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Time Range:</label>
                        <select
                            value={timeRange} // FIX: Use numeric value
                            onChange={(e) => setTimeRange(Number(e.target.value))} // FIX: Convert to number
                            className={`px-3 py-2 rounded-lg border ${borderColor} ${bgColor} ${textColor} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                            {timeRangeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}> {/* FIX: Use numeric value */}
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={toggleFullScreen}
                    className={`px-4 py-2 rounded-lg ${buttonColor} text-white font-medium transition-colors duration-200 flex items-center gap-2`}
                >
                    {isFullScreen ? (
                        <>
                            <MinimizeIcon className="w-4 h-4" />
                            Minimize
                        </>
                    ) : (
                        <>
                            <ExpandIcon className="w-4 h-4" />
                            Fullscreen
                        </>
                    )}
                </button>
            </div>

            {/* Y-Axis Field Selection */}
            <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Y-Axis Fields:</label>
                <div className="flex flex-wrap gap-2">
                    {fieldOptions.filter(opt => opt !== 'timestamp').map((field) => (
                        <button
                            key={field}
                            onClick={() => toggleYField(field)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedYFields.includes(field)
                                ? 'bg-blue-500 text-white shadow-md'
                                : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                                }`}
                        >
                            {formatFieldName(field)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-96 rounded-lg overflow-hidden">
                {chartData.length > 0 ? (
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 20, right: 120, bottom: 60, left: 60 }}
                        xScale={{ type: 'point' }}
                        yScale={{
                            type: 'linear',
                            min: 'auto',
                            max: 'auto',
                            stacked: false
                        }}
                        axisBottom={{
                            tickSize: 5,
                            tickPadding: 10,
                            tickRotation: -45,
                            legend: formatFieldName(selectedXField),
                            legendOffset: 50,
                            legendPosition: 'middle',
                        }}
                        axisLeft={{
                            tickSize: 5,
                            tickPadding: 5,
                            legend: 'Value',
                            legendOffset: -50,
                            legendPosition: 'middle',
                        }}
                        colors={{ scheme: 'category10' }}
                        pointSize={6}
                        pointColor={{ theme: 'background' }}
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'serieColor' }}
                        useMesh={true}
                        curve="monotoneX"
                        enableGridX={false}
                        enableGridY={true}
                        enableArea={false}
                        animate={true}
                        motionStiffness={90}
                        motionDamping={15}
                        legends={[
                            {
                                anchor: 'bottom-right',
                                direction: 'column',
                                justify: false,
                                translateX: 120,
                                translateY: 0,
                                itemsSpacing: 2,
                                itemDirection: 'left-to-right',
                                itemWidth: 100,
                                itemHeight: 20,
                                itemOpacity: 0.75,
                                symbolSize: 12,
                                symbolShape: 'circle',
                            },
                        ]}
                        theme={{
                            textColor: theme === 'dark' ? '#e5e7eb' : '#374151',
                            fontSize: 11,
                            axis: {
                                domain: {
                                    line: {
                                        stroke: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                        strokeWidth: 1
                                    }
                                },
                                ticks: {
                                    line: {
                                        stroke: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                        strokeWidth: 1
                                    },
                                    text: {
                                        fill: theme === 'dark' ? '#e5e7eb' : '#374151',
                                    }
                                },
                                legend: {
                                    text: {
                                        fill: theme === 'dark' ? '#e5e7eb' : '#374151',
                                        fontSize: 12
                                    }
                                }
                            },
                            grid: {
                                line: {
                                    stroke: theme === 'dark' ? '#374151' : '#e5e7eb',
                                    strokeWidth: 1,
                                }
                            },
                            legends: {
                                text: {
                                    fill: theme === 'dark' ? '#e5e7eb' : '#374151'
                                }
                            },
                            tooltip: {
                                container: {
                                    background: theme === 'dark' ? '#1f2937' : '#ffffff',
                                    color: theme === 'dark' ? '#e5e7eb' : '#374151',
                                    fontSize: 12,
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }
                            }
                        }}
                    />
                ) : (
                    <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className="text-center">
                            <div className="text-lg font-medium mb-2">No data to display</div>
                            <div className="text-sm">
                                {completeHistory.length === 0
                                    ? 'Waiting for sensor data...'
                                    : 'No valid data points for selected fields and time range'
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FIX: Data Summary - use safe currentTimeRange */}
            <div className="mt-4 text-sm text-gray-500">
                Showing {filteredHistory.length} of {completeHistory.length} data points
                {currentTimeRange.value !== 1000 && ` (Last ${currentTimeRange.label.toLowerCase()})`}
            </div>
        </div>
    );
}

// Icon components
const ExpandIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
);

const MinimizeIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default LineGraph;