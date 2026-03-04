import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Archive, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function ArchivedProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "archived")
    .order("archived_at", { ascending: false });

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archived Projects</h1>
          <p className="text-muted-foreground mt-1">
            Browse and search past deal projects
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search archived projects..." className="pl-10" />
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Archive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No archived projects</h3>
            <p className="text-muted-foreground text-center">
              When you archive projects, they&apos;ll appear here for reference.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}/setup`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-80 hover:opacity-100">
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
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Archived
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    Archived{" "}
                    {project.archived_at
                      ? new Date(project.archived_at).toLocaleDateString()
                      : "Unknown"}
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
