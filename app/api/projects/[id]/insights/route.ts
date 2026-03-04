import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claude, DEFAULT_MODEL } from "@/lib/claude/client";
import { INSIGHTS_AGENT_PROMPT } from "@/lib/claude/systemPrompts";

// GET - Retrieve existing insights
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const projectId = params.id;

    // Verify user has access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get project with insights
    const { data: project } = await supabase
      .from("projects")
      .select("*, analysis_modules(*)")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Extract metrics from analysis modules
    const metrics: Record<string, number> = {};
    const modules = project.analysis_modules || [];

    for (const module of modules) {
      if (module.results) {
        Object.assign(metrics, module.results);
      }
    }

    // Return stored insights if available
    if (project.insights) {
      return NextResponse.json({
        executiveSummary: project.insights.executiveSummary,
        metrics: project.insights.metrics || metrics,
        insights: project.insights.keyInsights || [],
        confidence: project.insights.confidence,
        risks: project.insights.risks || [],
      });
    }

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Generate new insights
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const projectId = params.id;

    // Verify user has access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get project with all analysis modules
    const { data: project } = await supabase
      .from("projects")
      .select("*, analysis_modules(*), model_configs(*)")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Gather all analysis data
    const modules = project.analysis_modules || [];
    const analysisData: Record<string, unknown> = {};
    const allAssumptions: unknown[] = [];

    for (const module of modules) {
      analysisData[module.module_type] = {
        status: module.status,
        results: module.results,
        assumptions: module.assumptions,
      };
      if (module.assumptions) {
        allAssumptions.push(...module.assumptions);
      }
    }

    // Build context for Claude
    const contextMessage = `
Project: ${project.name}
Company: ${project.company_name || "Not specified"}
Model Configuration: ${JSON.stringify(project.model_configs || {}, null, 2)}

Analysis Data by Module:
${JSON.stringify(analysisData, null, 2)}

All Assumptions:
${JSON.stringify(allAssumptions, null, 2)}

Please generate:
1. An executive summary (3-5 paragraphs) that tells the market story
2. Key metrics summary (TAM, SAM, SOM, vended market, white space, penetration rate)
3. 5-10 board-ready key insights with specific figures
4. Overall confidence assessment with rationale
5. Key risks and sensitivities (3-5 bullet points)

Format your response as structured JSON with the following fields:
- executiveSummary: string
- metrics: { tam, sam, som, vendedMarket, whiteSpace, greenfield, brownfield, jumpballs, penetrationRate }
- insights: [{ id, text, category: "opportunity" | "risk" | "finding", metric }]
- confidence: { level: "high" | "medium" | "low", rationale: string }
- risks: string[]
`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await claude.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 4096,
            system: INSIGHTS_AGENT_PROMPT,
            messages: [{ role: "user", content: contextMessage }],
          });

          // Parse the response
          let responseText = "";
          for (const block of response.content) {
            if (block.type === "text") {
              responseText += block.text;
            }
          }

          // Try to parse as JSON
          try {
            // Find JSON in the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const insights = JSON.parse(jsonMatch[0]);

              // Stream the summary
              if (insights.executiveSummary) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "summary", content: insights.executiveSummary })}\n\n`
                  )
                );
              }

              // Stream metrics
              if (insights.metrics) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "metrics", metrics: insights.metrics })}\n\n`
                  )
                );
              }

              // Stream insights
              if (insights.insights) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "insights", insights: insights.insights })}\n\n`
                  )
                );
              }

              // Stream confidence
              if (insights.confidence) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "confidence", confidence: insights.confidence })}\n\n`
                  )
                );
              }

              // Stream risks
              if (insights.risks) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "risks", risks: insights.risks })}\n\n`
                  )
                );
              }

              // Save insights to project
              await supabase
                .from("projects")
                .update({
                  insights: {
                    executiveSummary: insights.executiveSummary,
                    metrics: insights.metrics,
                    keyInsights: insights.insights,
                    confidence: insights.confidence,
                    risks: insights.risks,
                    generatedAt: new Date().toISOString(),
                  },
                })
                .eq("id", projectId);
            } else {
              // If no JSON, stream the raw text as summary
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "summary", content: responseText })}\n\n`
                )
              );
            }
          } catch (parseError) {
            // If parsing fails, stream as raw summary
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "summary", content: responseText })}\n\n`
              )
            );
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error generating insights:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`
            )
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
