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

interface Competitor {
  name: string;
  revenue: number;
  marketShare?: number;
  isTarget?: boolean;
}

interface CompetitorBarChartProps {
  competitors: Competitor[];
  className?: string;
  showMarketShare?: boolean;
}

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(142, 71%, 45%)",
  "hsl(24, 95%, 53%)",
  "hsl(45, 93%, 47%)",
  "hsl(var(--primary))",
];

const formatCurrency = (value: number) => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

export function CompetitorBarChart({
  competitors,
  className,
  showMarketShare = false,
}: CompetitorBarChartProps) {
  // Sort by revenue descending
  const sortedCompetitors = [...competitors].sort((a, b) => b.revenue - a.revenue);

  // Calculate market shares if not provided
  const totalRevenue = sortedCompetitors.reduce((sum, c) => sum + c.revenue, 0);
  const dataWithShares = sortedCompetitors.map((c, index) => ({
    ...c,
    marketShare: c.marketShare ?? (c.revenue / totalRevenue) * 100,
    fill: c.isTarget ? "hsl(var(--primary))" : COLORS[index % COLORS.length],
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={Math.max(200, competitors.length * 45)}>
        <BarChart
          data={dataWithShares}
          layout="vertical"
          margin={{ top: 10, right: 80, left: 80, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => {
              const numValue = typeof value === "number" ? value : 0;
              if (name === "revenue") return [formatCurrency(numValue), "Revenue"];
              return [numValue, name];
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {dataWithShares.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="revenue"
              position="right"
              formatter={(value) => typeof value === "number" ? formatCurrency(value) : String(value)}
              style={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {showMarketShare && (
        <div className="mt-4 space-y-1">
          {dataWithShares.map((c, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: c.fill }}
                />
                <span>{c.name}</span>
              </div>
              <span className="text-muted-foreground">
                {c.marketShare.toFixed(1)}% share
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground mt-2">
        Total Vended Market: {formatCurrency(totalRevenue)}
      </p>
    </div>
  );
}
