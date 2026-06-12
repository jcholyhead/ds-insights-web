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

const TAB20_COLORS = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
  '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
  '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5',
]

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

export default function GuidesBarChart({ guideData }) {
  // guideData is already sorted descending; in Recharts layout="vertical"
  // the first array item renders at the top, so no reversal needed.
  const data = guideData

  const height = Math.max(300, data.length * 42 + 60)

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
            <Cell key={`cell-${index}`} fill={TAB20_COLORS[index % TAB20_COLORS.length]} />
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
