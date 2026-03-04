import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BarChart3, DollarSign, Target, Grid3X3 } from "lucide-react";

const benchmarkModules = [
  {
    title: "TAM Benchmarks",
    description: "Distribution of TAM sizes by sector, company type, and model",
    href: "/benchmarks/tam",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Pricing Benchmarks",
    description: "ACV and ARPU distributions by monetization model and size band",
    href: "/benchmarks/pricing",
    icon: DollarSign,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Penetration Benchmarks",
    description: "Penetration rate distributions by sector and customer type",
    href: "/benchmarks/penetration",
    icon: Target,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "White Space Benchmarks",
    description: "White space as % of TAM by sector and competitive intensity",
    href: "/benchmarks/white-space",
    icon: Grid3X3,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function BenchmarksPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Benchmarks</h1>
        <p className="text-muted-foreground mt-1">
          Anonymized insights from your organization&apos;s past projects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {benchmarkModules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center ${module.color}`}
                  >
                    <module.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About Benchmarks</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-muted-foreground">
          <p>
            Benchmarks are aggregated, anonymized data from completed projects
            within your organization. They help you calibrate assumptions and
            validate new models against historical performance.
          </p>
          <p className="mt-2">
            All data is anonymized before contribution. No company names, deal
            names, or identifying information is ever stored in the benchmark
            pool. A minimum cohort size of 5 is required before any distribution
            is shown.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
