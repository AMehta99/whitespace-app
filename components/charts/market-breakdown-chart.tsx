"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface MarketSegment {
  name: string;
  value: number;
  color?: string;
}

interface MarketBreakdownChartProps {
  segments: MarketSegment[];
  title?: string;
  className?: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = [
  "hsl(142, 71%, 45%)", // green - greenfield
  "hsl(45, 93%, 47%)",  // yellow - brownfield
  "hsl(24, 95%, 53%)",  // orange - jumpballs
  "hsl(221, 83%, 53%)", // blue
  "hsl(262, 83%, 58%)", // purple
  "hsl(var(--primary))",
];

const formatCurrency = (value: number) => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  return `$${value.toLocaleString()}`;
};

export function MarketBreakdownChart({
  segments,
  title,
  className,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 80,
}: MarketBreakdownChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const dataWithColors = segments.map((segment, index) => ({
    ...segment,
    color: segment.color || COLORS[index % COLORS.length],
  }));

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={className}>
      {title && (
        <p className="text-sm font-medium text-center mb-2">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? formatCurrency(value) : String(value),
              name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          {showLegend && (
            <Legend
              formatter={(value: string) => (
                <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>
                  {value}
                </span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-muted-foreground">
        Total: {formatCurrency(total)}
      </p>
    </div>
  );
}
