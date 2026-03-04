"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Plus,
  X,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";

interface Benchmark {
  id: string;
  name: string;
  category: string;
  yourValue: number | null;
  benchmarkValue: number;
  unit: string;
  source: string;
  percentile?: number;
}

interface ProjectMetrics {
  tam?: number;
  sam?: number;
  som?: number;
  vendedMarket?: number;
  whiteSpace?: number;
  penetrationRate?: number;
}

const BENCHMARK_CATEGORIES = [
  { value: "market-size", label: "Market Size" },
  { value: "growth-rate", label: "Growth Rate" },
  { value: "penetration", label: "Penetration" },
  { value: "pricing", label: "Pricing" },
  { value: "competition", label: "Competition" },
];

const INDUSTRY_BENCHMARKS: Benchmark[] = [
  {
    id: "1",
    name: "Average TAM Growth Rate",
    category: "growth-rate",
    yourValue: null,
    benchmarkValue: 12.5,
    unit: "%",
    source: "Industry Reports 2024",
  },
  {
    id: "2",
    name: "Market Penetration (Mature)",
    category: "penetration",
    yourValue: null,
    benchmarkValue: 35,
    unit: "%",
    source: "Gartner Analysis",
  },
  {
    id: "3",
    name: "Market Penetration (Emerging)",
    category: "penetration",
    yourValue: null,
    benchmarkValue: 8,
    unit: "%",
    source: "Gartner Analysis",
  },
  {
    id: "4",
    name: "White Space % of TAM",
    category: "market-size",
    yourValue: null,
    benchmarkValue: 45,
    unit: "%",
    source: "PE Industry Average",
  },
  {
    id: "5",
    name: "Average Deal Size Growth",
    category: "pricing",
    yourValue: null,
    benchmarkValue: 8.2,
    unit: "%",
    source: "SaaS Benchmarks 2024",
  },
  {
    id: "6",
    name: "Competitor Market Share (Leader)",
    category: "competition",
    yourValue: null,
    benchmarkValue: 25,
    unit: "%",
    source: "Market Analysis",
  },
];

export default function BenchmarksPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [metrics, setMetrics] = useState<ProjectMetrics>({});
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>(INDUSTRY_BENCHMARKS);
  const [customBenchmarks, setCustomBenchmarks] = useState<Benchmark[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Custom benchmark form
  const [newBenchmark, setNewBenchmark] = useState({
    name: "",
    category: "market-size",
    benchmarkValue: "",
    unit: "%",
    source: "",
  });

  useEffect(() => {
    loadProjectMetrics();
  }, [projectId]);

  const loadProjectMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/insights`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || {});

        // Update benchmarks with project values
        if (data.metrics) {
          setBenchmarks((prev) =>
            prev.map((b) => {
              if (b.name.includes("Penetration") && data.metrics.penetrationRate) {
                return { ...b, yourValue: data.metrics.penetrationRate };
              }
              if (b.name.includes("White Space") && data.metrics.whiteSpace && data.metrics.tam) {
                return { ...b, yourValue: (data.metrics.whiteSpace / data.metrics.tam) * 100 };
              }
              return b;
            })
          );
        }
      }
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIBenchmarks = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/benchmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.benchmarks) {
          setCustomBenchmarks(data.benchmarks);
        }
      }
    } catch (error) {
      console.error("Error generating benchmarks:", error);
    } finally {
      setGenerating(false);
    }
  };

  const addCustomBenchmark = () => {
    if (!newBenchmark.name || !newBenchmark.benchmarkValue) return;

    const benchmark: Benchmark = {
      id: crypto.randomUUID(),
      name: newBenchmark.name,
      category: newBenchmark.category,
      yourValue: null,
      benchmarkValue: parseFloat(newBenchmark.benchmarkValue),
      unit: newBenchmark.unit,
      source: newBenchmark.source || "Custom",
    };

    setCustomBenchmarks([...customBenchmarks, benchmark]);
    setNewBenchmark({
      name: "",
      category: "market-size",
      benchmarkValue: "",
      unit: "%",
      source: "",
    });
  };

  const removeCustomBenchmark = (id: string) => {
    setCustomBenchmarks(customBenchmarks.filter((b) => b.id !== id));
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const getComparisonIcon = (yourValue: number | null, benchmarkValue: number) => {
    if (yourValue === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const diff = ((yourValue - benchmarkValue) / benchmarkValue) * 100;
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-yellow-600" />;
  };

  const getComparisonText = (yourValue: number | null, benchmarkValue: number) => {
    if (yourValue === null) return "No data";
    const diff = ((yourValue - benchmarkValue) / benchmarkValue) * 100;
    if (diff > 0) return `+${diff.toFixed(1)}% above`;
    if (diff < 0) return `${diff.toFixed(1)}% below`;
    return "At benchmark";
  };

  const allBenchmarks = [...benchmarks, ...customBenchmarks];
  const filteredBenchmarks =
    selectedCategory === "all"
      ? allBenchmarks
      : allBenchmarks.filter((b) => b.category === selectedCategory);

  // Prepare chart data
  const chartData = filteredBenchmarks
    .filter((b) => b.yourValue !== null)
    .map((b) => ({
      name: b.name.length > 20 ? b.name.substring(0, 20) + "..." : b.name,
      "Your Value": b.yourValue,
      Benchmark: b.benchmarkValue,
    }));

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Benchmarks</h2>
          <p className="text-muted-foreground">
            Compare your analysis against industry benchmarks
          </p>
        </div>
        <Button onClick={generateAIBenchmarks} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate AI Benchmarks
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Your Key Metrics
          </CardTitle>
          <CardDescription>Current values from your analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">TAM</p>
                <p className="text-lg font-bold text-primary">
                  {metrics.tam ? formatCurrency(metrics.tam) : "--"}
                </p>
              </div>
              <div className="p-4 bg-blue-100 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">SAM</p>
                <p className="text-lg font-bold text-blue-600">
                  {metrics.sam ? formatCurrency(metrics.sam) : "--"}
                </p>
              </div>
              <div className="p-4 bg-indigo-100 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">SOM</p>
                <p className="text-lg font-bold text-indigo-600">
                  {metrics.som ? formatCurrency(metrics.som) : "--"}
                </p>
              </div>
              <div className="p-4 bg-emerald-100 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">White Space</p>
                <p className="text-lg font-bold text-emerald-600">
                  {metrics.whiteSpace ? formatCurrency(metrics.whiteSpace) : "--"}
                </p>
              </div>
              <div className="p-4 bg-amber-100 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Vended</p>
                <p className="text-lg font-bold text-amber-600">
                  {metrics.vendedMarket ? formatCurrency(metrics.vendedMarket) : "--"}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Penetration</p>
                <p className="text-lg font-bold">
                  {metrics.penetrationRate
                    ? `${metrics.penetrationRate.toFixed(1)}%`
                    : "--"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Benchmarks List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Industry Benchmarks</CardTitle>
                <CardDescription>
                  Compare your metrics against industry standards
                </CardDescription>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {BENCHMARK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredBenchmarks.map((benchmark) => (
                <div
                  key={benchmark.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{benchmark.name}</p>
                      {customBenchmarks.find((b) => b.id === benchmark.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeCustomBenchmark(benchmark.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {benchmark.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Your Value</p>
                      <p className="font-bold">
                        {benchmark.yourValue !== null
                          ? `${benchmark.yourValue.toFixed(1)}${benchmark.unit}`
                          : "--"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Benchmark</p>
                      <p className="font-bold text-primary">
                        {benchmark.benchmarkValue}
                        {benchmark.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      {getComparisonIcon(benchmark.yourValue, benchmark.benchmarkValue)}
                      <span
                        className={`text-sm ${
                          benchmark.yourValue === null
                            ? "text-muted-foreground"
                            : benchmark.yourValue > benchmark.benchmarkValue
                            ? "text-green-600"
                            : benchmark.yourValue < benchmark.benchmarkValue
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {getComparisonText(benchmark.yourValue, benchmark.benchmarkValue)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison Chart */}
            {chartData.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">Visual Comparison</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Your Value" fill="hsl(var(--primary))" />
                    <Bar dataKey="Benchmark" fill="hsl(221, 83%, 53%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Custom Benchmark */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add Custom Benchmark
            </CardTitle>
            <CardDescription>
              Define your own comparison metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Benchmark Name</Label>
              <Input
                placeholder="e.g., Industry Growth Rate"
                value={newBenchmark.name}
                onChange={(e) =>
                  setNewBenchmark({ ...newBenchmark, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newBenchmark.category}
                onValueChange={(value) =>
                  setNewBenchmark({ ...newBenchmark, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENCHMARK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Benchmark Value</Label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={newBenchmark.benchmarkValue}
                  onChange={(e) =>
                    setNewBenchmark({
                      ...newBenchmark,
                      benchmarkValue: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={newBenchmark.unit}
                  onValueChange={(value) =>
                    setNewBenchmark({ ...newBenchmark, unit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%">%</SelectItem>
                    <SelectItem value="x">x</SelectItem>
                    <SelectItem value="$">$</SelectItem>
                    <SelectItem value="M">$M</SelectItem>
                    <SelectItem value="B">$B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Source (optional)</Label>
              <Input
                placeholder="e.g., Industry Report 2024"
                value={newBenchmark.source}
                onChange={(e) =>
                  setNewBenchmark({ ...newBenchmark, source: e.target.value })
                }
              />
            </div>

            <Button
              className="w-full"
              onClick={addCustomBenchmark}
              disabled={!newBenchmark.name || !newBenchmark.benchmarkValue}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Benchmark
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            About Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Industry Standards</h4>
              <p className="text-muted-foreground">
                Default benchmarks are derived from industry reports, analyst
                research, and PE portfolio company averages.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">AI-Generated</h4>
              <p className="text-muted-foreground">
                Click &ldquo;Generate AI Benchmarks&rdquo; to get Claude&apos;s analysis of
                relevant benchmarks based on your specific market and company context.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Custom Benchmarks</h4>
              <p className="text-muted-foreground">
                Add your own benchmarks from deal team research, management
                presentations, or competitor analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
