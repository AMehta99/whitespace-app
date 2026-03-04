"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings2,
  FileUp,
  BarChart3,
  Lightbulb,
  Download,
  Settings,
  Scale,
} from "lucide-react";
import { ProjectStatus } from "@/types";

interface ProjectNavProps {
  projectId: string;
  status: ProjectStatus;
}

export function ProjectNav({ projectId, status }: ProjectNavProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  const navItems = [
    {
      title: "Setup",
      href: `${basePath}/setup`,
      icon: Settings2,
      disabled: false,
    },
    {
      title: "Data",
      href: `${basePath}/data`,
      icon: FileUp,
      disabled: false,
    },
    {
      title: "Analysis",
      href: `${basePath}/analysis/top-down`,
      icon: BarChart3,
      disabled: status === "setup",
    },
    {
      title: "Insights",
      href: `${basePath}/insights`,
      icon: Lightbulb,
      disabled: status === "setup",
    },
    {
      title: "Benchmarks",
      href: `${basePath}/benchmarks`,
      icon: Scale,
      disabled: status === "setup",
    },
    {
      title: "Export",
      href: `${basePath}/export`,
      icon: Download,
      disabled: status === "setup",
    },
    {
      title: "Settings",
      href: `${basePath}/settings`,
      icon: Settings,
      disabled: false,
    },
  ];

  return (
    <nav className="container">
      <div className="flex space-x-4 overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
