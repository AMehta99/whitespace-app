"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface TamFunnelChartProps {
  tam: number;
  sam?: number;
  som?: number;
  className?: string;
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  return `$${value.toLocaleString()}`;
};

export function TamFunnelChart({ tam, sam, som, className }: TamFunnelChartProps) {
  const data = [
    { name: "TAM", value: tam, fill: "hsl(var(--primary))" },
    { name: "SAM", value: sam || 0, fill: "hsl(221, 83%, 53%)" },
    { name: "SOM", value: som || 0, fill: "hsl(142, 71%, 45%)" },
  ].filter((d) => d.value > 0);

  const colors = ["hsl(var(--primary))", "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)"];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 80, left: 60, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis type="category" dataKey="name" />
          <Tooltip
            formatter={(value) => typeof value === "number" ? formatCurrency(value) : String(value)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => typeof value === "number" ? formatCurrency(value) : String(value)}
              style={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
