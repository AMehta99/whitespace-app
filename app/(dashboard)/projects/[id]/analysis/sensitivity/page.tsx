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
import { Play, SlidersHorizontal, Info, Loader2, Send, Bot, User, Plus, X } from "lucide-react";
import { AnalysisNav } from "@/components/analysis-nav";
import { TornadoChart } from "@/components/charts";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolResult?: unknown;
}

interface Variable {
  id: string;
  name: string;
  baseValue: string;
  lowValue: string;
  highValue: string;
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

interface ScenarioResult {
  name: string;
  tam: number;
  description: string;
}

export default function SensitivityPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form inputs
  const [variables, setVariables] = useState<Variable[]>([
    { id: "1", name: "Market Size", baseValue: "", lowValue: "", highValue: "" },
    { id: "2", name: "Penetration Rate", baseValue: "", lowValue: "", highValue: "" },
    { id: "3", name: "Average Deal Size", baseValue: "", lowValue: "", highValue: "" },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addVariable = () => {
    setVariables([
      ...variables,
      { id: crypto.randomUUID(), name: "", baseValue: "", lowValue: "", highValue: "" },
    ]);
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  const updateVariable = (
    id: string,
    field: "name" | "baseValue" | "lowValue" | "highValue",
    value: string
  ) => {
    setVariables(
      variables.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const runAnalysis = async (userMessage?: string) => {
    const variableList = variables
      .filter((v) => v.name)
      .map(
        (v) =>
          `${v.name}: Base=${v.baseValue || "TBD"}, Low=${v.lowValue || "TBD"}, High=${v.highValue || "TBD"}`
      )
      .join("\n");

    const message =
      userMessage ||
      `Run a sensitivity and scenario analysis with the following key variables:
${variableList || "No variables specified - please identify the most impactful variables from the analysis"}

Please:
1. Identify the most impactful assumptions from previous modules
2. Define reasonable low/base/high ranges for each
3. Calculate TAM under each scenario
4. Create a tornado chart showing variable impact
5. Build Bull/Base/Bear scenarios with combined assumptions
6. Save all assumptions with sources and rationale`;

    setRunning(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "sensitivity",
          user_message: message,
          context: {
            variables: variables.filter((v) => v.name),
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
      <AnalysisNav projectId={projectId} currentModule="sensitivity" />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Inputs panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <SlidersHorizontal className="mr-2 h-5 w-5" />
              Sensitivity Variables
            </CardTitle>
            <CardDescription>
              Define low/base/high ranges for key inputs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Variables</Label>
                <Button variant="ghost" size="sm" onClick={addVariable}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {variables.map((variable) => (
                  <div key={variable.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Variable name"
                        value={variable.name}
                        onChange={(e) =>
                          updateVariable(variable.id, "name", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariable(variable.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Low"
                        value={variable.lowValue}
                        onChange={(e) =>
                          updateVariable(variable.id, "lowValue", e.target.value)
                        }
                        className="text-sm"
                      />
                      <Input
                        placeholder="Base"
                        value={variable.baseValue}
                        onChange={(e) =>
                          updateVariable(variable.id, "baseValue", e.target.value)
                        }
                        className="text-sm"
                      />
                      <Input
                        placeholder="High"
                        value={variable.highValue}
                        onChange={(e) =>
                          updateVariable(variable.id, "highValue", e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
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
            <CardTitle>Scenario Results</CardTitle>
            <CardDescription>
              Bull, base, and bear case outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scenarios.length > 0 ? (
              <div className="space-y-6 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  {scenarios.map((scenario, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg text-center ${
                        scenario.name === "Bull"
                          ? "bg-green-100"
                          : scenario.name === "Bear"
                          ? "bg-red-100"
                          : "bg-blue-100"
                      }`}
                    >
                      <p className="text-sm text-muted-foreground">
                        {scenario.name} Case
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          scenario.name === "Bull"
                            ? "text-green-600"
                            : scenario.name === "Bear"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {formatCurrency(scenario.tam)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scenario.description}
                      </p>
                    </div>
                  ))}
                </div>
                {variables.filter(v => v.name && v.lowValue && v.highValue && v.baseValue).length > 0 && (
                  <TornadoChart
                    variables={variables
                      .filter(v => v.name && v.lowValue && v.highValue && v.baseValue)
                      .map(v => ({
                        name: v.name,
                        lowValue: parseFloat(v.lowValue) * 1_000_000_000,
                        highValue: parseFloat(v.highValue) * 1_000_000_000,
                        baseValue: parseFloat(v.baseValue) * 1_000_000_000,
                      }))}
                    baseCase={scenarios.find(s => s.name === "Base")?.tam || 10_000_000_000}
                    className="border rounded-lg p-4"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground mb-6">
                <div className="text-center">
                  <SlidersHorizontal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run analysis to see scenario outcomes</p>
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
                      Claude will help run sensitivity analysis. Click
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
                    placeholder="Ask Claude about scenarios..."
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
            Sensitivity Assumptions
          </CardTitle>
          <CardDescription>
            Range assumptions tracked with sources
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
