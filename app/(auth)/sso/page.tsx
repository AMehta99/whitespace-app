"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SSOPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Extract domain from email
    const domain = email.split("@")[1];
    if (!domain) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // Try to initiate SSO with the domain
    const { error } = await supabase.auth.signInWithSSO({
      domain,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("No SSO provider")) {
        setError(
          "SSO is not configured for this organization. Please contact your administrator or sign in with email/password."
        );
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">W</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">SSO Sign In</CardTitle>
        <CardDescription className="text-center">
          Enter your work email to sign in with your organization&apos;s identity provider
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSSO}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Redirecting..." : "Continue with SSO"}
          </Button>
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full" type="button">
              Sign in with email
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
