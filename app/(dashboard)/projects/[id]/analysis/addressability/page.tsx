"use client";

import { useState, useRef, useEffect } from "react";
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
import { Play, Target, Info, Loader2, Send, Bot, User, Plus, X } from "lucide-react";
import { AnalysisNav } from "@/components/analysis-nav";
import { AddressabilityWaterfallChart } from "@/components/charts";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolResult?: unknown;
}

interface Filter {
  id: string;
  name: string;
  percentage: string;
}

interface Assumption {
  id: string;
  variable: string;
  value: number;
  unit?: string;
  source: string;
  confidence?: string;
  rationale?: string;
}

export default function AddressabilityPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [results, setResults] = useState<{
    totalUniverse?: number;
    addressableMarket?: number;
    penetrationRate?: number;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form inputs
  const [totalUniverse, setTotalUniverse] = useState("");
  const [filters, setFilters] = useState<Filter[]>([
    { id: "1", name: "Technology Adoption", percentage: "60" },
    { id: "2", name: "Budget Availability", percentage: "40" },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addFilter = () => {
    setFilters([
      ...filters,
      { id: crypto.randomUUID(), name: "", percentage: "" },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, field: "name" | "percentage", value: string) => {
    setFilters(
      filters.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const runAnalysis = async (userMessage?: string) => {
    const filterList = filters
      .filter((f) => f.name && f.percentage)
      .map((f) => `${f.name}: ${f.percentage}%`)
      .join("\n");

    const message =
      userMessage ||
      `Run an addressability analysis with the following parameters:
- Total Universe: ${totalUniverse || "Not specified"}
- Addressability Filters:
${filterList || "No filters specified"}

Please:
1. Apply each filter sequentially to the universe
2. Calculate the final addressable market
3. Estimate penetration rates by segment
4. Identify any gaps in the filtering logic
5. Save all assumptions with sources and rationale`;

    setRunning(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "addressability",
          user_message: message,
          context: {
            total_universe: totalUniverse,
            filters: filters.filter((f) => f.name && f.percentage),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "text") {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.content = assistantMessage;
                  } else {
                    newMessages.push({
                      role: "assistant",
                      content: assistantMessage,
                    });
                  }
                  return newMessages;
                });
              } else if (data.type === "tool_call") {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "tool",
                    content: `Calling ${data.name}...`,
                    toolName: data.name,
                  },
                ]);
              } else if (data.type === "tool_result") {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastToolMsg = newMessages
                    .reverse()
                    .find((m) => m.toolName === data.name);
                  if (lastToolMsg) {
                    lastToolMsg.content = `${data.name}: ${JSON.stringify(data.result.data, null, 2)}`;
                    lastToolMsg.toolResult = data.result.data;
                  }
                  return [...newMessages.reverse()];
                });

                // Extract TAM results if present
                if (
                  data.name === "calculate_tam" &&
                  data.result.data?.addressable_count
                ) {
                  setResults((prev) => ({
                    ...prev,
                    totalUniverse: data.result.data.universe_count,
                    addressableMarket: data.result.data.addressable_count,
                  }));
                }

                // Extract saved assumptions
                if (
                  data.name === "save_assumption" &&
                  data.result.data?.saved
                ) {
                  setAssumptions((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      variable: data.result.data.variable,
                      value: data.result.data.value,
                      source: "Analysis",
                    },
                  ]);
                }
              } else if (data.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `Error: ${data.message}` },
                ]);
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error running analysis: ${error}`,
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || running) return;
    runAnalysis(inputMessage);
    setInputMessage("");
  };

  const formatNumber = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="container py-8">
      <AnalysisNav projectId={projectId} currentModule="addressability" />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Inputs panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Addressability Inputs
            </CardTitle>
            <CardDescription>
              Define universe and addressability filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Total Universe</Label>
              <Input
                placeholder="e.g., 125,000 companies"
                value={totalUniverse}
                onChange={(e) => setTotalUniverse(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Addressability Filters</Label>
                <Button variant="ghost" size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Filter name"
                      value={filter.name}
                      onChange={(e) =>
                        updateFilter(filter.id, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="%"
                      value={filter.percentage}
                      onChange={(e) =>
                        updateFilter(filter.id, "percentage", e.target.value)
                      }
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => runAnalysis()}
              disabled={running}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Addressability Results</CardTitle>
            <CardDescription>
              Filtered market and penetration analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.totalUniverse ? (
              <div className="space-y-6 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Total Universe</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(results.totalUniverse)}
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Addressable</p>
                    <p className="text-2xl font-bold text-primary">
                      {results.addressableMarket
                        ? formatNumber(results.addressableMarket)
                        : "--"}
                    </p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Penetration</p>
                    <p className="text-2xl font-bold text-green-600">
                      {results.penetrationRate
                        ? `${results.penetrationRate.toFixed(1)}%`
                        : "--"}
                    </p>
                  </div>
                </div>
                {filters.filter(f => f.name && f.percentage).length > 0 && results.totalUniverse && (
                  <AddressabilityWaterfallChart
                    universeCount={results.totalUniverse}
                    filterSteps={filters
                      .filter(f => f.name && f.percentage)
                      .reduce((acc, filter, idx) => {
                        const prevRemaining = idx === 0
                          ? results.totalUniverse!
                          : acc[idx - 1]?.remaining ?? results.totalUniverse!;
                        const pct = parseFloat(filter.percentage) / 100;
                        acc.push({
                          name: filter.name,
                          percentage: parseFloat(filter.percentage),
                          remaining: Math.round(prevRemaining * pct),
                        });
                        return acc;
                      }, [] as { name: string; percentage: number; remaining: number }[])}
                    className="border rounded-lg p-4"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground mb-6">
                <div className="text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run analysis to see addressability results</p>
                </div>
              </div>
            )}

            {/* Chat interface */}
            <div className="border rounded-lg">
              <div className="h-64 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>
                      Claude will help analyze addressability. Click
                      &quot;Run Analysis&quot; or ask a question.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "justify-end" : ""
                      }`}
                    >
                      {msg.role !== "user" && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.role === "tool"
                            ? "bg-yellow-50 border border-yellow-200 text-sm font-mono"
                            : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">
                          {msg.content}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask Claude about addressability..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                    disabled={running}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={running || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assumptions panel */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Filter Assumptions
          </CardTitle>
          <CardDescription>
            All filter assumptions tracked with sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assumptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No assumptions recorded yet. Run an analysis to see tracked
              assumptions.
            </p>
          ) : (
            <div className="space-y-2">
              {assumptions.map((assumption) => (
                <div
                  key={assumption.id}
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{assumption.variable}</p>
                    <p className="text-sm text-muted-foreground">
                      Source: {assumption.source}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {typeof assumption.value === "number"
                        ? assumption.value.toLocaleString()
                        : assumption.value}
                      {assumption.unit && ` ${assumption.unit}`}
                    </p>
                    {assumption.confidence && (
                      <p className="text-xs text-muted-foreground">
                        Confidence: {assumption.confidence}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
