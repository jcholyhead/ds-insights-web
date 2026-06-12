import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts'

function getTagColor(i, total) {
  const lightness = 25 + (i / Math.max(total - 1, 1)) * 50
  return `hsl(210, 70%, ${lightness}%)`
}

function BarLabel(props) {
  const { x, y, width, height, value, videos } = props
  if (!value) return null
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="central"
      fontSize={11}
      fill="#333"
    >
      {`${Number(value).toFixed(1)}h  (${videos} videos)`}
    </text>
  )
}

export default function TagsBarChart({ tagData }) {
  // tagData is already sorted descending; in Recharts layout="vertical"
  // the first array item renders at the top, so no reversal needed.
  const data = tagData

  const height = Math.max(400, data.length * 42 + 60)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 10, right: 200, left: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
        <XAxis type="number" label={{ value: 'Hours watched', position: 'insideBottom', offset: -5 }} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}h`, 'Hours']} />
        <Bar dataKey="hours" isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getTagColor(index, data.length)}
            />
          ))}
          <LabelList
            content={(props) => (
              <BarLabel {...props} videos={data[props.index]?.videos ?? ''} />
            )}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
