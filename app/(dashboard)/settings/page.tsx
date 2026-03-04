"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, Shield, Database } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("users")
          .select("*, organizations(*)")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFullName(profile.full_name || "");
          setIsAdmin(profile.role === "admin");
          if (profile.organizations) {
            setOrgName(profile.organizations.name || "");
          }
        }
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("users")
        .update({ full_name: fullName })
        .eq("id", user.id);
    }

    setSaving(false);
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

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and organization settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email
              </p>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Organization settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Organization
            </CardTitle>
            <CardDescription>
              Organization details and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={orgName} disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>Your Role</Label>
              <Input value={isAdmin ? "Admin" : "Member"} disabled />
            </div>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Contact your organization admin to change organization settings
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Change your password
                </p>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-medium">SSO Configuration</p>
                  <p className="text-sm text-muted-foreground">
                    Configure SAML SSO for your organization
                  </p>
                </div>
                <Button variant="outline">Configure SSO</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data retention (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Data Retention
              </CardTitle>
              <CardDescription>
                Configure how long project data is retained
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Raw Files Retention</Label>
                  <Input value="1 year" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Parsed Content Retention</Label>
                  <Input value="3 years" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Analysis Data Retention</Label>
                  <Input value="3 years" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Audit Logs Retention</Label>
                  <Input value="5 years" disabled />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact support to customize retention policies
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
