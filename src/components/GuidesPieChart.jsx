import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const TAB20_COLORS = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
  '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
  '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5',
]

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.03) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontWeight="bold"
      fontSize={13}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

export default function GuidesPieChart({ slices, totalHours }) {
  const legendFormatter = (value, entry) => {
    const hours = entry.payload.value / 3600
    return `${value}  (${hours.toFixed(1)}h)`
  }

  return (
    <ResponsiveContainer width="100%" height={560}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          cx="40%"
          cy="50%"
          outerRadius={200}
          labelLine={false}
          label={renderCustomLabel}
        >
          {slices.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={TAB20_COLORS[index % TAB20_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${(value / 3600).toFixed(1)}h`, name]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={legendFormatter}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
