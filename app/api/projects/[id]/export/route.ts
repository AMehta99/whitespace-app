import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import PptxGenJS from "pptxgenjs";

// Extend jsPDF type for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

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

    // Get request body
    const { format, options } = await request.json();
    const { includeAssumptions, includeCharts, includeInsights } = options || {};

    // Get project with all related data
    const { data: project } = await supabase
      .from("projects")
      .select("*, analysis_modules(*)")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Extract data from modules
    const modules = project.analysis_modules || [];
    const allAssumptions: Array<{
      variable: string;
      value: string | number;
      source: string;
      module: string;
    }> = [];
    const moduleResults: Record<string, unknown> = {};

    for (const module of modules) {
      moduleResults[module.module_type] = module.results || {};
      if (module.assumptions && includeAssumptions) {
        for (const assumption of module.assumptions) {
          allAssumptions.push({
            ...assumption,
            module: module.module_type,
          });
        }
      }
    }

    // Extract key metrics
    const insights = project.insights || {};
    const metrics = insights.metrics || {};

    switch (format) {
      case "excel":
        return generateExcel(project, modules, allAssumptions, metrics, includeInsights ? insights : null);
      case "pdf":
        return generatePDF(project, modules, allAssumptions, metrics, includeInsights ? insights : null);
      case "pptx":
        return generatePPTX(project, modules, allAssumptions, metrics, includeInsights ? insights : null);
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatCurrency(value: number): string {
  if (!value) return "--";
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

async function generateExcel(
  project: Record<string, unknown>,
  modules: Array<Record<string, unknown>>,
  assumptions: Array<Record<string, unknown>>,
  metrics: Record<string, number>,
  insights: Record<string, unknown> | null
) {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["Market Sizing Analysis"],
    [""],
    ["Project:", project.name],
    ["Company:", project.company_name || "N/A"],
    ["Generated:", new Date().toLocaleDateString()],
    [""],
    ["Key Metrics"],
    ["TAM (Total Addressable Market):", formatCurrency(metrics.tam)],
    ["SAM (Serviceable Addressable Market):", formatCurrency(metrics.sam)],
    ["SOM (Serviceable Obtainable Market):", formatCurrency(metrics.som)],
    ["Vended Market:", formatCurrency(metrics.vendedMarket)],
    ["White Space:", formatCurrency(metrics.whiteSpace)],
    ["Penetration Rate:", metrics.penetrationRate ? `${metrics.penetrationRate.toFixed(1)}%` : "--"],
  ];

  if (insights?.executiveSummary) {
    summaryData.push([""], ["Executive Summary"], [insights.executiveSummary as string]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Module sheets
  for (const module of modules) {
    const moduleType = module.module_type as string;
    const results = module.results as Record<string, unknown> || {};

    const moduleData: (string | number)[][] = [
      [moduleType.charAt(0).toUpperCase() + moduleType.slice(1).replace(/-/g, " ") + " Analysis"],
      [""],
      ["Status:", module.status as string],
      [""],
      ["Results:"],
    ];

    // Add results
    for (const [key, value] of Object.entries(results)) {
      const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      const formattedValue = typeof value === "number"
        ? (value >= 1000000 ? formatCurrency(value) : value.toLocaleString())
        : String(value);
      moduleData.push([formattedKey, formattedValue]);
    }

    const moduleSheet = XLSX.utils.aoa_to_sheet(moduleData);
    const sheetName = moduleType.substring(0, 31); // Excel sheet name limit
    XLSX.utils.book_append_sheet(workbook, moduleSheet, sheetName);
  }

  // Assumptions sheet
  if (assumptions.length > 0) {
    const assumptionsData: (string | number)[][] = [
      ["Assumptions Log"],
      [""],
      ["Variable", "Value", "Source", "Module"],
    ];

    for (const assumption of assumptions) {
      assumptionsData.push([
        assumption.variable as string,
        assumption.value as string | number,
        assumption.source as string,
        assumption.module as string,
      ]);
    }

    const assumptionsSheet = XLSX.utils.aoa_to_sheet(assumptionsData);
    XLSX.utils.book_append_sheet(workbook, assumptionsSheet, "Assumptions");
  }

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="market-sizing-${project.id}.xlsx"`,
    },
  });
}

async function generatePDF(
  project: Record<string, unknown>,
  modules: Array<Record<string, unknown>>,
  assumptions: Array<Record<string, unknown>>,
  metrics: Record<string, number>,
  insights: Record<string, unknown> | null
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(31, 41, 55);
  doc.text("Market Sizing Analysis", 20, yPosition);
  yPosition += 15;

  // Project info
  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128);
  doc.text(`Project: ${project.name}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Company: ${project.company_name || "N/A"}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // Key Metrics Section
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text("Key Metrics", 20, yPosition);
  yPosition += 10;

  const metricsTable = [
    ["Metric", "Value"],
    ["TAM (Total Addressable Market)", formatCurrency(metrics.tam)],
    ["SAM (Serviceable Addressable Market)", formatCurrency(metrics.sam)],
    ["SOM (Serviceable Obtainable Market)", formatCurrency(metrics.som)],
    ["Vended Market", formatCurrency(metrics.vendedMarket)],
    ["White Space", formatCurrency(metrics.whiteSpace)],
    ["Penetration Rate", metrics.penetrationRate ? `${metrics.penetrationRate.toFixed(1)}%` : "--"],
  ];

  doc.autoTable({
    startY: yPosition,
    head: [metricsTable[0]],
    body: metricsTable.slice(1),
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 20, right: 20 },
  });

  yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Executive Summary
  if (insights?.executiveSummary) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text("Executive Summary", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const summaryLines = doc.splitTextToSize(insights.executiveSummary as string, 170);
    doc.text(summaryLines, 20, yPosition);
    yPosition += summaryLines.length * 5 + 15;
  }

  // Key Insights
  if (insights?.keyInsights && (insights.keyInsights as unknown[]).length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text("Key Insights", 20, yPosition);
    yPosition += 10;

    const insightsData = (insights.keyInsights as Array<{ text: string; category: string }>).map((insight) => [
      insight.category.charAt(0).toUpperCase() + insight.category.slice(1),
      insight.text,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [["Category", "Insight"]],
      body: insightsData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: "auto" },
      },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Assumptions
  if (assumptions.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text("Assumptions", 20, yPosition);
    yPosition += 10;

    const assumptionsData = assumptions.map((a) => [
      a.variable as string,
      String(a.value),
      a.source as string,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [["Variable", "Value", "Source"]],
      body: assumptionsData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });
  }

  // Generate buffer
  const pdfBuffer = doc.output("arraybuffer");

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="market-sizing-${project.id}.pdf"`,
    },
  });
}

async function generatePPTX(
  project: Record<string, unknown>,
  modules: Array<Record<string, unknown>>,
  assumptions: Array<Record<string, unknown>>,
  metrics: Record<string, number>,
  insights: Record<string, unknown> | null
) {
  const pptx = new PptxGenJS();
  pptx.author = "Whitespace";
  pptx.title = `Market Sizing - ${project.name}`;

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText("Market Sizing Analysis", {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 36,
    bold: true,
    color: "1F2937",
    align: "center",
  });
  titleSlide.addText(project.name as string, {
    x: 0.5,
    y: 3,
    w: 9,
    h: 0.5,
    fontSize: 24,
    color: "3B82F6",
    align: "center",
  });
  titleSlide.addText(project.company_name as string || "", {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: "6B7280",
    align: "center",
  });
  titleSlide.addText(new Date().toLocaleDateString(), {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0.3,
    fontSize: 12,
    color: "9CA3AF",
    align: "center",
  });

  // Key Metrics Slide
  const metricsSlide = pptx.addSlide();
  metricsSlide.addText("Key Metrics", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 28,
    bold: true,
    color: "1F2937",
  });

  const metricBoxes = [
    { label: "TAM", value: formatCurrency(metrics.tam), color: "3B82F6" },
    { label: "SAM", value: formatCurrency(metrics.sam), color: "6366F1" },
    { label: "SOM", value: formatCurrency(metrics.som), color: "8B5CF6" },
    { label: "Vended Market", value: formatCurrency(metrics.vendedMarket), color: "2563EB" },
    { label: "White Space", value: formatCurrency(metrics.whiteSpace), color: "10B981" },
    { label: "Penetration", value: metrics.penetrationRate ? `${metrics.penetrationRate.toFixed(1)}%` : "--", color: "F59E0B" },
  ];

  metricBoxes.forEach((metric, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    metricsSlide.addShape("rect", {
      x: 0.5 + col * 3.1,
      y: 1.2 + row * 2,
      w: 2.9,
      h: 1.8,
      fill: { color: metric.color },
      shadow: { type: "outer", blur: 3, offset: 2, angle: 45, opacity: 0.3 },
    });
    metricsSlide.addText(metric.label, {
      x: 0.5 + col * 3.1,
      y: 1.4 + row * 2,
      w: 2.9,
      h: 0.4,
      fontSize: 12,
      color: "FFFFFF",
      align: "center",
    });
    metricsSlide.addText(metric.value, {
      x: 0.5 + col * 3.1,
      y: 1.9 + row * 2,
      w: 2.9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });
  });

  // Executive Summary Slide
  if (insights?.executiveSummary) {
    const summarySlide = pptx.addSlide();
    summarySlide.addText("Executive Summary", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: "1F2937",
    });
    summarySlide.addText(insights.executiveSummary as string, {
      x: 0.5,
      y: 1,
      w: 9,
      h: 4,
      fontSize: 14,
      color: "374151",
      valign: "top",
    });
  }

  // Key Insights Slide
  if (insights?.keyInsights && (insights.keyInsights as unknown[]).length > 0) {
    const insightsSlide = pptx.addSlide();
    insightsSlide.addText("Key Insights", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: "1F2937",
    });

    const keyInsights = insights.keyInsights as Array<{ text: string; category: string }>;
    keyInsights.slice(0, 6).forEach((insight, idx) => {
      const iconColor = insight.category === "opportunity" ? "10B981"
        : insight.category === "risk" ? "EF4444"
        : "3B82F6";

      insightsSlide.addShape("rect", {
        x: 0.5,
        y: 1 + idx * 0.7,
        w: 0.15,
        h: 0.5,
        fill: { color: iconColor },
      });
      insightsSlide.addText(insight.text, {
        x: 0.8,
        y: 1 + idx * 0.7,
        w: 8.7,
        h: 0.5,
        fontSize: 12,
        color: "374151",
        valign: "middle",
      });
    });
  }

  // White Space Breakdown Slide
  if (metrics.whiteSpace) {
    const wsSlide = pptx.addSlide();
    wsSlide.addText("White Space Opportunity", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: "1F2937",
    });

    const wsCategories = [
      { label: "Greenfield", desc: "New market opportunities with no existing competition", color: "10B981" },
      { label: "Brownfield", desc: "Markets with weak competition or displacement opportunities", color: "F59E0B" },
      { label: "Jumpballs", desc: "Competitive situations where deals are up for grabs", color: "EF4444" },
    ];

    wsCategories.forEach((cat, idx) => {
      wsSlide.addShape("rect", {
        x: 0.5 + idx * 3.1,
        y: 1.5,
        w: 2.9,
        h: 2.5,
        fill: { color: cat.color },
        shadow: { type: "outer", blur: 3, offset: 2, angle: 45, opacity: 0.3 },
      });
      wsSlide.addText(cat.label, {
        x: 0.5 + idx * 3.1,
        y: 1.7,
        w: 2.9,
        h: 0.5,
        fontSize: 16,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      wsSlide.addText(cat.desc, {
        x: 0.6 + idx * 3.1,
        y: 2.3,
        w: 2.7,
        h: 1.5,
        fontSize: 10,
        color: "FFFFFF",
        align: "center",
        valign: "top",
      });
    });
  }

  // Generate buffer
  const pptxBuffer = await pptx.write({ outputType: "arraybuffer" });

  return new Response(pptxBuffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="market-sizing-${project.id}.pptx"`,
    },
  });
}
