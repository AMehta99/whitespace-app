import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectNav } from "@/components/project-nav";
import { Project } from "@/types";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !project) {
    notFound();
  }

  const isArchived = project.status === "archived";

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Project header */}
      <div className="border-b bg-white">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                <Link href="/projects" className="hover:text-foreground">
                  Projects
                </Link>
                <span>/</span>
                <span>{project.name}</span>
              </div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.company_name && (
                <p className="text-muted-foreground">{project.company_name}</p>
              )}
            </div>
            {isArchived && (
              <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                Archived (Read-only)
              </div>
            )}
          </div>
        </div>
        <ProjectNav projectId={params.id} status={project.status} />
      </div>

      {/* Project content */}
      <div className="flex-1 bg-slate-50">{children}</div>
    </div>
  );
}
