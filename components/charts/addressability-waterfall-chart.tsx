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
  ReferenceLine,
} from "recharts";

interface FilterStep {
  name: string;
  percentage: number;
  remaining: number;
}

interface AddressabilityWaterfallChartProps {
  universeCount: number;
  filterSteps: FilterStep[];
  className?: string;
}

const formatNumber = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString();
};

interface ChartDataItem {
  name: string;
  value: number;
  reduction: number;
  percentage?: number;
  isStart?: boolean;
  isEnd?: boolean;
}

export function AddressabilityWaterfallChart({
  universeCount,
  filterSteps,
  className,
}: AddressabilityWaterfallChartProps) {
  // Build waterfall data
  const data: ChartDataItem[] = [
    {
      name: "Universe",
      value: universeCount,
      reduction: 0,
      isStart: true,
    },
  ];

  let currentCount = universeCount;
  for (const step of filterSteps) {
    const reduction = currentCount - step.remaining;
    data.push({
      name: step.name,
      value: step.remaining,
      reduction: reduction,
      percentage: step.percentage,
      isStart: false,
    });
    currentCount = step.remaining;
  }

  // Add final addressable
  data.push({
    name: "Addressable",
    value: currentCount,
    reduction: 0,
    isEnd: true,
  });

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value, name) => {
              const numValue = typeof value === "number" ? value : 0;
              if (name === "value") return [formatNumber(numValue), "Count"];
              if (name === "reduction") return [formatNumber(numValue), "Filtered Out"];
              return [numValue, name];
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Bar dataKey="value" stackId="a">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isStart
                    ? "hsl(var(--primary))"
                    : entry.isEnd
                    ? "hsl(142, 71%, 45%)"
                    : "hsl(221, 83%, 53%)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Starting Universe:</span>
          <span className="font-medium">{formatNumber(universeCount)}</span>
        </div>
        {filterSteps.map((step, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              After {step.name} ({step.percentage}%):
            </span>
            <span className="font-medium">{formatNumber(step.remaining)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-bold border-t pt-2">
          <span>Final Addressable:</span>
          <span className="text-green-600">
            {formatNumber(filterSteps[filterSteps.length - 1]?.remaining || universeCount)}
          </span>
        </div>
      </div>
    </div>
  );
}
