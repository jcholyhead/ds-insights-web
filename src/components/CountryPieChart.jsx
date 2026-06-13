import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

// Palette inspired loosely by the flags of each country
const COUNTRY_COLORS = {
  'Spain':              '#c60b1e',
  'Colombia':           '#fcd116',
  'Mexico':             '#006847',
  'Argentina':          '#74acdf',
  'Chile':              '#d52b1e',
  'Bolivia':            '#007a3d',
  'Uruguay':            '#5b92c9',
  'Venezuela':          '#003893',
  'Dominican Republic': '#002d62',
  'Panama':             '#da121a',
  'Nicaragua':          '#003f87',
  'Peru':               '#d91023',
  'Ecuador':            '#ffda00',
  'Paraguay':           '#d52b1e',
  'Guatemala':          '#4997d0',
  'Cuba':               '#002a8f',
  'Honduras':           '#0073cf',
  'El Salvador':        '#0f47af',
  'Costa Rica':         '#002b7f',
  'Puerto Rico':        '#ed0000',
}

const FALLBACK_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#9467bd', '#8c564b',
  '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8',
]

function getColor(country, index) {
  return COUNTRY_COLORS[country] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
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

export default function CountryPieChart({ slices }) {
  const legendFormatter = (value, entry) => {
    const hours = entry.payload.value / 3600
    return `${value}  (${hours.toFixed(1)}h)`
  }

  return (
    <ResponsiveContainer width="100%" height={500}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          cx="40%"
          cy="50%"
          outerRadius={190}
          labelLine={false}
          label={renderCustomLabel}
        >
          {slices.map((entry, index) => (
            <Cell key={`cell-${entry.name}`} fill={getColor(entry.name, index)} />
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
