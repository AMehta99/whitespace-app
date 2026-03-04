"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ModuleType } from "@/types";

interface AnalysisNavProps {
  projectId: string;
  currentModule: ModuleType;
}

const modules: { value: ModuleType; label: string; href: string }[] = [
  { value: "top_down", label: "Top-Down TAM", href: "top-down" },
  { value: "pricing", label: "Pricing", href: "pricing" },
  { value: "addressability", label: "Addressability", href: "addressability" },
  { value: "bottom_up", label: "Bottom-Up", href: "bottom-up" },
  { value: "white_space", label: "White Space", href: "white-space" },
  { value: "sensitivity", label: "Sensitivity", href: "sensitivity" },
];

export function AnalysisNav({ projectId, currentModule }: AnalysisNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {modules.map((module) => {
        const isActive = currentModule === module.value;
        return (
          <Link
            key={module.value}
            href={`/projects/${projectId}/analysis/${module.href}`}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {module.label}
          </Link>
        );
      })}
    </div>
  );
}
