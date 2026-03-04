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
import { Play, Database, Info, Loader2, Send, Bot, User } from "lucide-react";
import { AnalysisNav } from "@/components/analysis-nav";
import { TamFunnelChart } from "@/components/charts";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolResult?: unknown;
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

export default function TopDownAnalysisPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [results, setResults] = useState<{
    tam?: number;
    sam?: number;
    som?: number;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form inputs
  const [targetMarket, setTargetMarket] = useState("");
  const [naicsCodes, setNaicsCodes] = useState("");
  const [geography, setGeography] = useState("United States");
  const [sizeFilters, setSizeFilters] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const runAnalysis = async (userMessage?: string) => {
    const message =
      userMessage ||
      `Run a top-down TAM analysis for the following market:
- Target Market: ${targetMarket || "Enterprise Software"}
- NAICS Codes: ${naicsCodes || "5112, 5415"}
- Geography: ${geography}
- Size Filters: ${sizeFilters || "Companies with 100+ employees"}

Please:
1. Query relevant data sources for market universe
2. Apply appropriate addressability filters
3. Calculate TAM, SAM, and SOM
4. Save all assumptions with sources
5. Provide a summary of findings`;

    setRunning(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "top_down",
          user_message: message,
          context: {
            target_market: targetMarket,
            naics_codes: naicsCodes,
            geography,
            size_filters: sizeFilters,
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
                  data.result.data?.tam
                ) {
                  setResults((prev) => ({
                    ...prev,
                    tam: data.result.data.tam,
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
              } else if (data.type === "done") {
                // Analysis complete
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
      <AnalysisNav projectId={projectId} currentModule="top_down" />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Inputs panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>
              Configure your top-down TAM analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Market</Label>
              <Input
                placeholder="e.g., US Enterprise Software"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>NAICS Codes</Label>
              <Input
                placeholder="e.g., 5112, 5415"
                value={naicsCodes}
                onChange={(e) => setNaicsCodes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Geography</Label>
              <Input
                placeholder="e.g., United States"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Size Filters</Label>
              <Input
                placeholder="e.g., 100+ employees"
                value={sizeFilters}
                onChange={(e) => setSizeFilters(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => runAnalysis()}
              disabled={running}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Analysis...
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
            <CardTitle>Results</CardTitle>
            <CardDescription>TAM, SAM, and SOM estimates</CardDescription>
          </CardHeader>
          <CardContent>
            {results.tam ? (
              <div className="space-y-6 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">TAM</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(results.tam)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-100 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">SAM</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {results.sam ? formatCurrency(results.sam) : "--"}
                    </p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">SOM</p>
                    <p className="text-2xl font-bold text-green-600">
                      {results.som ? formatCurrency(results.som) : "--"}
                    </p>
                  </div>
                </div>
                <TamFunnelChart
                  tam={results.tam}
                  sam={results.sam}
                  som={results.som}
                  className="border rounded-lg p-4"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground mb-6">
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run analysis to see results</p>
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
                      Claude will help you build your TAM analysis. Click
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
                    placeholder="Ask Claude a follow-up question..."
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
            Assumptions
          </CardTitle>
          <CardDescription>
            All assumptions are tracked with sources
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
