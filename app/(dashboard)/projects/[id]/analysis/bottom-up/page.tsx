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
import { Play, ArrowUpRight, Info, Loader2, Send, Bot, User, Plus, X } from "lucide-react";
import { AnalysisNav } from "@/components/analysis-nav";
import { CompetitorBarChart } from "@/components/charts";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolResult?: unknown;
}

interface Competitor {
  id: string;
  name: string;
  revenue: string;
  marketShare?: string;
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

export default function BottomUpPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [results, setResults] = useState<{
    vendedMarket?: number;
    estimatedTAM?: number;
    penetrationRate?: number;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form inputs
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { id: "1", name: "", revenue: "" },
    { id: "2", name: "", revenue: "" },
    { id: "3", name: "", revenue: "" },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addCompetitor = () => {
    setCompetitors([
      ...competitors,
      { id: crypto.randomUUID(), name: "", revenue: "" },
    ]);
  };

  const removeCompetitor = (id: string) => {
    setCompetitors(competitors.filter((c) => c.id !== id));
  };

  const updateCompetitor = (
    id: string,
    field: "name" | "revenue" | "marketShare",
    value: string
  ) => {
    setCompetitors(
      competitors.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const runAnalysis = async (userMessage?: string) => {
    const competitorList = competitors
      .filter((c) => c.name && c.revenue)
      .map((c) => `${c.name}: $${c.revenue}`)
      .join("\n");

    const message =
      userMessage ||
      `Run a bottom-up revenue triangulation analysis with the following competitors:
${competitorList || "No competitors specified"}

Please:
1. Query SEC EDGAR for public company revenue data where available
2. Sum competitor revenues to estimate the vended market
3. Estimate market share distribution
4. Compare to top-down TAM to identify white space
5. Identify any missing competitors
6. Save all assumptions with sources`;

    setRunning(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "bottom_up",
          user_message: message,
          context: {
            competitors: competitors.filter((c) => c.name && c.revenue),
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

                // Extract SEC EDGAR results
                if (
                  data.name === "query_sec_edgar" &&
                  data.result.data?.revenue
                ) {
                  // Update competitor with real data if available
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

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="container py-8">
      <AnalysisNav projectId={projectId} currentModule="bottom_up" />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Inputs panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowUpRight className="mr-2 h-5 w-5" />
              Competitor Inputs
            </CardTitle>
            <CardDescription>
              Enter known competitors and revenues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Competitors</Label>
                <Button variant="ghost" size="sm" onClick={addCompetitor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {competitors.map((competitor) => (
                  <div key={competitor.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Company name"
                      value={competitor.name}
                      onChange={(e) =>
                        updateCompetitor(competitor.id, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Revenue ($M)"
                      value={competitor.revenue}
                      onChange={(e) =>
                        updateCompetitor(competitor.id, "revenue", e.target.value)
                      }
                      className="w-28"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(competitor.id)}
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
            <CardTitle>Bottom-Up Results</CardTitle>
            <CardDescription>
              Vended market and triangulation analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.vendedMarket ? (
              <div className="space-y-6 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Vended Market</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(results.vendedMarket)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-100 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Implied TAM</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {results.estimatedTAM
                        ? formatCurrency(results.estimatedTAM)
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
                {competitors.filter(c => c.name && c.revenue).length > 0 && (
                  <CompetitorBarChart
                    competitors={competitors
                      .filter(c => c.name && c.revenue)
                      .map(c => ({
                        name: c.name,
                        revenue: parseFloat(c.revenue) * 1_000_000, // Convert from $M
                      }))}
                    showMarketShare
                    className="border rounded-lg p-4"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground mb-6">
                <div className="text-center">
                  <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run analysis to see bottom-up results</p>
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
                      Claude will help triangulate revenues. Click
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
                    placeholder="Ask Claude about competitors..."
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
            Competitor Assumptions
          </CardTitle>
          <CardDescription>
            Revenue assumptions tracked with sources
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
