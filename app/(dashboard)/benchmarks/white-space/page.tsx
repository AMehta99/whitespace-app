"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Grid3X3 } from "lucide-react";
import Link from "next/link";

export default function WhiteSpaceBenchmarksPage() {
  return (
    <div className="container py-8">
      <Link
        href="/benchmarks"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Benchmarks
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Grid3X3 className="mr-3 h-8 w-8 text-primary" />
          White Space Benchmarks
        </h1>
        <p className="text-muted-foreground mt-1">
          White space opportunity sizes by sector and competitive landscape
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>White Space Distribution</CardTitle>
          <CardDescription>
            Greenfield / brownfield / jumpball splits across the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Not enough data to display benchmarks</p>
              <p className="text-sm mt-1">Minimum 5 completed projects required</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
