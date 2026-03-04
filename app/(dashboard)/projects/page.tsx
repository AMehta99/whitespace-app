import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, FolderOpen, Clock, Users } from "lucide-react";
import { Project, ProjectStatus } from "@/types";

const statusColors: Record<ProjectStatus, string> = {
  setup: "bg-yellow-100 text-yellow-800",
  active: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<ProjectStatus, string> = {
  setup: "Setup",
  active: "Active",
  complete: "Complete",
  archived: "Archived",
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  // Get active projects (not archived)
  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      project_members(count),
      created_by_user:users!projects_created_by_fkey(full_name)
    `
    )
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your market sizing projects
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first market sizing project.
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project & { created_by_user?: { full_name: string } }) => (
            <Link key={project.id} href={`/projects/${project.id}/setup`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">
                        {project.name}
                      </CardTitle>
                      {project.company_name && (
                        <CardDescription className="line-clamp-1">
                          {project.company_name}
                        </CardDescription>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[project.status as ProjectStatus]
                      }`}
                    >
                      {statusLabels[project.status as ProjectStatus]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-muted-foreground space-x-4">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-1 h-3 w-3" />
                      {project.created_by_user?.full_name || "Unknown"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
