import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const OTHER_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
]

function getColor(index) {
  if (index === 0) return '#FF6F00'
  return OTHER_COLORS[(index - 1) % OTHER_COLORS.length]
}

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

export default function ContentSplitChart({ slices, totalHours }) {
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
            <Cell key={`cell-${index}`} fill={getColor(index)} />
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
