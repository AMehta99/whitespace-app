"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface SensitivityVariable {
  name: string;
  lowValue: number;
  highValue: number;
  baseValue: number;
}

interface TornadoChartProps {
  variables: SensitivityVariable[];
  baseCase: number;
  className?: string;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  return `$${value.toLocaleString()}`;
};

export function TornadoChart({ variables, baseCase, className }: TornadoChartProps) {
  // Transform data for tornado chart
  // Each variable shows the range from low to high impact
  const data = variables
    .map((v) => ({
      name: v.name,
      low: v.lowValue - baseCase,
      high: v.highValue - baseCase,
      lowAbs: Math.abs(v.lowValue - baseCase),
      highAbs: Math.abs(v.highValue - baseCase),
      range: Math.abs(v.highValue - v.lowValue),
    }))
    .sort((a, b) => b.range - a.range); // Sort by impact range

  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground text-center mb-2">
        Base Case: {formatCurrency(baseCase)}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 60, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(value + baseCase)}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis type="category" dataKey="name" width={90} />
          <Tooltip
            formatter={(value) => typeof value === "number" ? formatCurrency(value + baseCase) : String(value)}
            labelFormatter={(label) => `Variable: ${label}`}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
          <Bar dataKey="low" stackId="a" radius={[4, 0, 0, 4]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-low-${index}`}
                fill={entry.low < 0 ? "hsl(0, 84%, 60%)" : "hsl(142, 71%, 45%)"}
              />
            ))}
          </Bar>
          <Bar dataKey="high" stackId="a" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-high-${index}`}
                fill={entry.high < 0 ? "hsl(0, 84%, 60%)" : "hsl(142, 71%, 45%)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
          <span>Downside</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
          <span>Upside</span>
        </div>
      </div>
    </div>
  );
}
