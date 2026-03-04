"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Presentation,
  Loader2,
  CheckCircle,
} from "lucide-react";

export default function ExportPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Export options
  const [includeAssumptions, setIncludeAssumptions] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);

  const handleExport = async (format: "excel" | "pdf" | "pptx") => {
    setExporting(format);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          options: {
            includeAssumptions,
            includeCharts,
            includeInsights,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const extensions = { excel: "xlsx", pdf: "pdf", pptx: "pptx" };
      a.download = `market-sizing-${projectId}.${extensions[format]}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(format);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Export</h2>
        <p className="text-muted-foreground">
          Download your analysis in various formats
        </p>
      </div>

      {/* Export Options */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Export Options</CardTitle>
          <CardDescription>Choose what to include in your export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="assumptions"
              checked={includeAssumptions}
              onCheckedChange={(checked) =>
                setIncludeAssumptions(checked as boolean)
              }
            />
            <Label htmlFor="assumptions">Include assumptions with sources</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="charts"
              checked={includeCharts}
              onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
            />
            <Label htmlFor="charts">Include charts and visualizations</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="insights"
              checked={includeInsights}
              onCheckedChange={(checked) =>
                setIncludeInsights(checked as boolean)
              }
            />
            <Label htmlFor="insights">Include AI-generated insights</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Excel Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <CardTitle>Excel Export</CardTitle>
                <CardDescription>
                  Full model with separate tabs per module, assumptions, and
                  formulas
                </CardDescription>
              </div>
              {success === "excel" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleExport("excel")}
              disabled={exporting !== null}
            >
              {exporting === "excel" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* PDF Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <CardTitle>PDF Report</CardTitle>
                <CardDescription>
                  Executive summary, key charts, and assumptions appendix
                </CardDescription>
              </div>
              {success === "pdf" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* PowerPoint Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Presentation className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <CardTitle>PowerPoint Deck</CardTitle>
                <CardDescription>
                  Slide deck with market overview, TAM build, and key findings
                </CardDescription>
              </div>
              {success === "pptx" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleExport("pptx")}
              disabled={exporting !== null}
            >
              {exporting === "pptx" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PPT
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
