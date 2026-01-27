import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';

interface AreaChartProps {
	data: Record<string, number>;
}

const COLORS = [
	'#8b5cf6', // purple
	'#6366f1', // indigo
	'#3b82f6', // blue
	'#0ea5e9', // sky
	'#14b8a6', // teal
	'#22c55e', // green
	'#eab308', // yellow
	'#f97316', // orange
];

export function AreaChart({ data }: AreaChartProps) {
	const chartData = Object.entries(data)
		.map(([name, count]) => ({
			name: name.replace('area:', ''),
			count,
		}))
		.sort((a, b) => b.count - a.count);

	if (chartData.length === 0) {
		return (
			<div className="text-center text-gray-500 py-8">
				No area data available
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={200}>
			<BarChart
				data={chartData}
				layout="vertical"
				margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
			>
				<XAxis type="number" hide />
				<YAxis
					type="category"
					dataKey="name"
					width={80}
					tick={{ fill: '#9ca3af', fontSize: 12 }}
					tickLine={false}
					axisLine={false}
				/>
				<Tooltip
					contentStyle={{
						backgroundColor: '#21262d',
						border: '1px solid #30363d',
						borderRadius: '6px',
						color: '#c9d1d9',
					}}
					cursor={{ fill: 'rgba(255,255,255,0.05)' }}
				/>
				<Bar dataKey="count" radius={[0, 4, 4, 0]}>
					{chartData.map((_, index) => (
						<Cell
							key={`cell-${index}`}
							fill={COLORS[index % COLORS.length]}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
