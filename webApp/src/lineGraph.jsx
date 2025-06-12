import { useState } from 'react';
import { ResponsiveLine } from '@nivo/line';


function LineGraph() {
    const [data, setData] = useState([{
        id: 'Temperature',
        data: [
            { x: '10:00', y: 22 },
            { x: '10:05', y: 24 },
            { x: '10:10', y: 23 },
        ],
    },
    {
        id: 'Humidity',
        data: [
            { x: '10:00', y: 60 },
            { x: '10:05', y: 63 },
            { x: '10:10', y: 65 },
        ],
    }]);
    
    return (
        <div style={{ height: 400 }}>
            <ResponsiveLine
                data={data}
                margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                axisBottom={{ legend: 'Time', legendPosition: 'middle', legendOffset: 32 }}
                axisLeft={{ legend: 'Value', legendPosition: 'middle', legendOffset: -40 }}
                colors={{ scheme: 'category10' }}
                pointSize={10}
                pointBorderWidth={2}
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
            />
        </div>
    );
}
export default LineGraph;