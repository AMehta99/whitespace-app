import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claude, DEFAULT_MODEL } from "@/lib/claude/client";

const BENCHMARK_PROMPT = `You are an expert market analyst specializing in benchmarking and comparative analysis for Private Equity due diligence.

Given the market sizing metrics provided, generate relevant industry benchmarks that would be useful for comparison. Consider:

1. Market-specific benchmarks based on the industry/sector
2. Growth rate comparisons (historical and projected)
3. Penetration rate benchmarks for similar markets
4. Competitive landscape metrics
5. Pricing and deal size benchmarks
6. Operational efficiency metrics

For each benchmark, provide:
- A clear, descriptive name
- The benchmark value
- The appropriate unit (%, x, $, $M, $B)
- A credible source or basis for the benchmark
- The category (market-size, growth-rate, penetration, pricing, competition)

Format your response as JSON with the following structure:
{
  "benchmarks": [
    {
      "name": "string",
      "category": "market-size" | "growth-rate" | "penetration" | "pricing" | "competition",
      "benchmarkValue": number,
      "unit": "%" | "x" | "$" | "M" | "B",
      "source": "string",
      "rationale": "string"
    }
  ],
  "analysis": "Brief analysis of how the provided metrics compare to typical industry benchmarks"
}

Generate 5-8 highly relevant benchmarks based on the specific market context.`;

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

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("*, analysis_modules(*)")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { metrics } = await request.json();

    // Build context message
    const contextMessage = `
Project: ${project.name}
Company: ${project.company_name || "Not specified"}
Industry: ${project.industry || "Not specified"}

Current Metrics:
- TAM: ${metrics?.tam ? `$${(metrics.tam / 1_000_000_000).toFixed(2)}B` : "Not calculated"}
- SAM: ${metrics?.sam ? `$${(metrics.sam / 1_000_000_000).toFixed(2)}B` : "Not calculated"}
- SOM: ${metrics?.som ? `$${(metrics.som / 1_000_000_000).toFixed(2)}B` : "Not calculated"}
- Vended Market: ${metrics?.vendedMarket ? `$${(metrics.vendedMarket / 1_000_000_000).toFixed(2)}B` : "Not calculated"}
- White Space: ${metrics?.whiteSpace ? `$${(metrics.whiteSpace / 1_000_000_000).toFixed(2)}B` : "Not calculated"}
- Penetration Rate: ${metrics?.penetrationRate ? `${metrics.penetrationRate.toFixed(1)}%` : "Not calculated"}

Analysis Modules Completed: ${project.analysis_modules?.map((m: { module_type: string }) => m.module_type).join(", ") || "None"}

Please generate relevant industry benchmarks for comparison.
`;

    const response = await claude.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: BENCHMARK_PROMPT,
      messages: [{ role: "user", content: contextMessage }],
    });

    // Parse the response
    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    // Extract JSON from response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Add IDs to benchmarks
        const benchmarksWithIds = parsed.benchmarks.map((b: Record<string, unknown>) => ({
          ...b,
          id: crypto.randomUUID(),
          yourValue: null,
        }));

        // Save benchmarks to project
        await supabase
          .from("projects")
          .update({
            benchmarks: {
              generated: benchmarksWithIds,
              analysis: parsed.analysis,
              generatedAt: new Date().toISOString(),
            },
          })
          .eq("id", projectId);

        return NextResponse.json({
          benchmarks: benchmarksWithIds,
          analysis: parsed.analysis,
        });
      }
    } catch (parseError) {
      console.error("Error parsing benchmarks response:", parseError);
    }

    return NextResponse.json({
      benchmarks: [],
      error: "Could not parse benchmarks from AI response"
    });
  } catch (error) {
    console.error("Benchmarks API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Get project benchmarks
    const { data: project } = await supabase
      .from("projects")
      .select("benchmarks")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project.benchmarks || { generated: [], analysis: null });
  } catch (error) {
    console.error("Error fetching benchmarks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
