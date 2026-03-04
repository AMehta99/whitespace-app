"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Archive, Trash2, UserPlus, Users } from "lucide-react";
import { Project, ProjectMember, ProjectRole } from "@/types";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<(ProjectMember & { user?: { full_name: string; email: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("analyst");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectData) {
        setProject(projectData);
        setName(projectData.name);
        setDescription(projectData.description || "");
        setCompanyName(projectData.company_name || "");
      }

      const { data: membersData } = await supabase
        .from("project_members")
        .select("*, user:users(full_name)")
        .eq("project_id", projectId);

      if (membersData) {
        setMembers(membersData);
      }

      setLoading(false);
    };

    loadData();
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("projects")
      .update({
        name,
        description: description || null,
        company_name: companyName || null,
      })
      .eq("id", projectId);

    setSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    const supabase = createClient();

    await supabase.from("project_members").insert({
      project_id: projectId,
      invited_email: inviteEmail,
      role: inviteRole,
      invited_at: new Date().toISOString(),
    });

    setInviteEmail("");
    // Refresh members
    const { data: membersData } = await supabase
      .from("project_members")
      .select("*, user:users(full_name)")
      .eq("project_id", projectId);

    if (membersData) {
      setMembers(membersData);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this project? It will become read-only.")) {
      return;
    }

    const supabase = createClient();
    await supabase
      .from("projects")
      .update({ status: "archived" })
      .eq("id", projectId);

    router.push("/projects");
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", projectId);

    router.push("/projects");
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const isArchived = project?.status === "archived";

  return (
    <div className="container py-8 max-w-3xl">
      <h2 className="text-2xl font-bold mb-8">Project Settings</h2>

      <div className="space-y-6">
        {/* General settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Update project details and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isArchived}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isArchived}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isArchived}
              />
            </div>
            {!isArchived && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Team members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage who has access to this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium">
                      {member.user?.full_name || member.invited_email}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {member.role}
                      {!member.joined_at && " (Pending)"}
                    </p>
                  </div>
                </div>
              ))}

              {!isArchived && (
                <div className="pt-4 border-t">
                  <Label>Invite Team Member</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      className="rounded-md border border-input px-3 py-2 text-sm"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as ProjectRole)
                      }
                    >
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <Button onClick={handleInvite}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        {!isArchived && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                These actions are irreversible. Please be certain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Archive Project</p>
                  <p className="text-sm text-muted-foreground">
                    Make this project read-only
                  </p>
                </div>
                <Button variant="outline" onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                <div>
                  <p className="font-medium">Delete Project</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this project and all data
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
