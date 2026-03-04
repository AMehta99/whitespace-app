"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function TAMBenchmarksPage() {
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
          <BarChart3 className="mr-3 h-8 w-8 text-primary" />
          TAM Benchmarks
        </h1>
        <p className="text-muted-foreground mt-1">
          Total Addressable Market distributions across your organization&apos;s projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TAM Distribution</CardTitle>
          <CardDescription>
            Histogram of TAM values with percentile bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Not enough data to display benchmarks</p>
              <p className="text-sm mt-1">Minimum 5 completed projects required</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
