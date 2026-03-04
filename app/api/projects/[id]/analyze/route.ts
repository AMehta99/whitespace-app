import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claude, DEFAULT_MODEL } from "@/lib/claude/client";
import { tools } from "@/lib/claude/tools";
import {
  ANALYSIS_AGENT_PROMPT,
  TOP_DOWN_ANALYSIS_PROMPT,
  PRICING_ANALYSIS_PROMPT,
  WHITE_SPACE_PROMPT,
  SENSITIVITY_PROMPT,
} from "@/lib/claude/systemPrompts";
import { ModuleType } from "@/types";
import Anthropic from "@anthropic-ai/sdk";

type MessageParam = Anthropic.Messages.MessageParam;
type ContentBlockParam = Anthropic.Messages.ContentBlockParam;

// Get the appropriate system prompt for the module type
function getSystemPrompt(moduleType: ModuleType): string {
  const prompts: Record<ModuleType, string> = {
    top_down: `${ANALYSIS_AGENT_PROMPT}\n\n${TOP_DOWN_ANALYSIS_PROMPT}`,
    pricing: `${ANALYSIS_AGENT_PROMPT}\n\n${PRICING_ANALYSIS_PROMPT}`,
    addressability: `${ANALYSIS_AGENT_PROMPT}\n\nYou are analyzing market addressability and penetration rates.`,
    bottom_up: `${ANALYSIS_AGENT_PROMPT}\n\nYou are conducting bottom-up revenue triangulation using competitor data.`,
    white_space: `${ANALYSIS_AGENT_PROMPT}\n\n${WHITE_SPACE_PROMPT}`,
    sensitivity: `${ANALYSIS_AGENT_PROMPT}\n\n${SENSITIVITY_PROMPT}`,
  };
  return prompts[moduleType];
}

// Tool execution handlers
async function executeTools(
  toolName: string,
  toolInput: Record<string, unknown>,
  projectId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (toolName) {
    case "save_assumption": {
      const { module_id, variable, value, unit, source, source_url, confidence, rationale } = toolInput;

      // Get current assumptions
      const { data: module } = await supabase
        .from("analysis_modules")
        .select("assumptions")
        .eq("id", module_id)
        .single();

      const assumptions = module?.assumptions || [];
      assumptions.push({
        id: crypto.randomUUID(),
        variable,
        value,
        unit,
        source,
        source_url,
        confidence,
        rationale,
        created_at: new Date().toISOString(),
      });

      await supabase
        .from("analysis_modules")
        .update({ assumptions })
        .eq("id", module_id);

      return { success: true, data: { saved: true, variable, value } };
    }

    case "calculate_tam": {
      const { methodology, universe_count, average_deal_value, addressability_filters } = toolInput;

      let addressable_count = universe_count as number;
      const filter_steps: { name: string; percentage: number; remaining: number }[] = [];

      if (addressability_filters && Array.isArray(addressability_filters)) {
        for (const filter of addressability_filters) {
          const pct = (filter as { filter_percentage: number }).filter_percentage;
          addressable_count = Math.round(addressable_count * (pct / 100));
          filter_steps.push({
            name: (filter as { filter_name: string }).filter_name,
            percentage: pct,
            remaining: addressable_count,
          });
        }
      }

      const tam = addressable_count * (average_deal_value as number);

      return {
        success: true,
        data: {
          methodology,
          universe_count,
          addressable_count,
          average_deal_value,
          tam,
          tam_formatted: `$${(tam / 1_000_000_000).toFixed(2)}B`,
          filter_steps,
        },
      };
    }

    case "query_census": {
      // Simulated Census data - in production, would call actual Census API
      const { dataset, naics_code, geography, year } = toolInput;

      // Return mock data structure
      return {
        success: true,
        data: {
          source: "Census Bureau",
          dataset,
          naics_code,
          geography,
          year,
          note: "This is simulated data. In production, integrate with Census Bureau API.",
          establishments: 125000,
          employees: 2500000,
          annual_payroll: 150000000000,
        },
      };
    }

    case "query_bls": {
      // Simulated BLS data
      const { series_id, start_year, end_year } = toolInput;

      return {
        success: true,
        data: {
          source: "Bureau of Labor Statistics",
          series_id,
          period: `${start_year}-${end_year}`,
          note: "This is simulated data. In production, integrate with BLS API.",
          latest_value: 2350000,
          unit: "employees",
        },
      };
    }

    case "query_sec_edgar": {
      // Simulated SEC EDGAR data
      const { company_name, ticker, filing_type, data_points } = toolInput;

      return {
        success: true,
        data: {
          source: "SEC EDGAR",
          company: company_name || ticker,
          filing_type,
          note: "This is simulated data. In production, integrate with SEC EDGAR API.",
          revenue: 5200000000,
          revenue_growth: 0.15,
          segments: [
            { name: "Enterprise", revenue: 3200000000, pct: 0.62 },
            { name: "SMB", revenue: 2000000000, pct: 0.38 },
          ],
        },
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const projectId = params.id;

    // Verify user has access to project
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { module_type, user_message, context } = body as {
      module_type: ModuleType;
      user_message: string;
      context?: Record<string, unknown>;
    };

    // Get project and module data
    const { data: project } = await supabase
      .from("projects")
      .select("*, model_configs(*)")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get or create analysis module
    let { data: analysisModule } = await supabase
      .from("analysis_modules")
      .select("*")
      .eq("project_id", projectId)
      .eq("module_type", module_type)
      .single();

    if (!analysisModule) {
      const { data: newModule } = await supabase
        .from("analysis_modules")
        .insert({
          project_id: projectId,
          module_type,
          status: "in_progress",
        })
        .select()
        .single();
      analysisModule = newModule;
    }

    // Build context message
    const contextMessage = `
Project: ${project.name}
Company: ${project.company_name || "Not specified"}
Model Config: ${JSON.stringify(project.model_configs || {}, null, 2)}
Module: ${module_type}
Current Module Data: ${JSON.stringify(analysisModule, null, 2)}
Additional Context: ${JSON.stringify(context || {}, null, 2)}
`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initial Claude call
          let messages: MessageParam[] = [
            {
              role: "user",
              content: `${contextMessage}\n\nUser Request: ${user_message}`,
            },
          ];

          let continueLoop = true;

          while (continueLoop) {
            const response = await claude.messages.create({
              model: DEFAULT_MODEL,
              max_tokens: 4096,
              system: getSystemPrompt(module_type),
              messages,
              tools,
            });

            // Process response
            let assistantContent: ContentBlockParam[] = [];
            let hasToolUse = false;

            for (const block of response.content) {
              if (block.type === "text") {
                // Stream text to client
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "text", content: block.text })}\n\n`)
                );
                assistantContent.push({ type: "text", text: block.text });
              } else if (block.type === "tool_use") {
                hasToolUse = true;
                assistantContent.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });

                // Execute tool
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: block.name, input: block.input })}\n\n`)
                );

                const toolResult = await executeTools(
                  block.name,
                  block.input as Record<string, unknown>,
                  projectId,
                  supabase
                );

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_result", name: block.name, result: toolResult })}\n\n`)
                );

                // Add to messages for next iteration
                messages.push({ role: "assistant", content: assistantContent });
                messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: block.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                });
                assistantContent = [];
              }
            }

            // If no tool use, we're done
            if (!hasToolUse) {
              continueLoop = false;
            }

            // Check stop reason
            if (response.stop_reason === "end_turn") {
              continueLoop = false;
            }
          }

          // Update module status
          await supabase
            .from("analysis_modules")
            .update({
              status: "complete",
              last_run_at: new Date().toISOString(),
              run_by: user.id,
            })
            .eq("id", analysisModule?.id);

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Analysis error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
