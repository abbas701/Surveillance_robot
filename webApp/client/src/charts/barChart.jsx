import { useState } from "react";
import { ResponsiveBar } from '@nivo/bar';

function BarChart() {
    const [data, setData] = useState([
        { country: 'USA', surveillance: 80, temperature: 22 },
        { country: 'Pakistan', surveillance: 60, temperature: 28 },
    ]);

    return (<div>
        X axis:
        <select name="" id="">
            <option></option>
        </select>
        Y axis:<select name="" id=""></select>
        <div style={{ height: 400 }}>
            <ResponsiveBar
                data={data}
                keys={['surveillance', 'temperature']}
                indexBy="country"
                margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                padding={0.3}
                colors={{ scheme: 'spectral' }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{ legend: 'Country', legendPosition: 'middle', legendOffset: 32 }}
                axisLeft={{ legend: 'Values', legendPosition: 'middle', legendOffset: -40 }}
                legends={[
                    {
                        dataFrom: 'keys',
                        anchor: 'bottom-right',
                        direction: 'column',
                        translateX: 120,
                        itemWidth: 100,
                        itemHeight: 20,
                        symbolSize: 20,
                    },
                ]}
            /></div>
    </div>
    );
}

export default BarChart;