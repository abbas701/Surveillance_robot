import { useState } from "react";
import { ResponsivePie } from '@nivo/pie';

function PieChart() {
    const [data, setData] = useState([
        { id: 'active', label: 'Active Robots', value: 3 },
        { id: 'inactive', label: 'Inactive Robots', value: 1 },
        { id: 'error', label: 'Error', value: 1 },
    ]);

    return (<ResponsivePie
        data={data}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5} // This makes it a donut
        padAngle={0.7}
        cornerRadius={3}
        colors={{ scheme: 'paired' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        legends={[
            {
                anchor: 'bottom',
                direction: 'row',
                translateY: 56,
                itemWidth: 100,
                itemHeight: 18,
                symbolSize: 18,
            },
        ]}
    />)
}

export default PieChart;