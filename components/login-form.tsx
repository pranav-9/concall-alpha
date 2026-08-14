"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { identifyUser } from "@/lib/analytics";
import {
  AuthDivider,
  GoogleSignInButton,
} from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  nextPath,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { nextPath?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setNeedsConfirmation(false);
    setResendState("idle");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      identifyUser(data.user?.id ?? email, { email: data.user?.email ?? email });
      router.refresh();
      router.push(nextPath || "/watchlists");
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      const message = error instanceof Error ? error.message : "";
      if (
        code === "email_not_confirmed" ||
        message.toLowerCase().includes("not confirmed")
      ) {
        setNeedsConfirmation(true);
        setError(
          "Your email hasn't been confirmed yet. Find the confirmation link in your inbox (check spam too), or resend it below.",
        );
      } else if (code === "invalid_credentials") {
        setError("Incorrect email or password.");
      } else {
        setError(message || "An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const supabase = createClient();
    setResendState("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
          nextPath || "/watchlists",
        )}`,
      },
    });
    if (error) {
      setResendState("idle");
      setError(error.message);
    } else {
      setResendState("sent");
      setError(null);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <GoogleSignInButton nextPath={nextPath} />
          <AuthDivider />
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href={nextPath ? `/auth/forgot-password?next=${encodeURIComponent(nextPath)}` : "/auth/forgot-password"}
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {resendState === "sent" && (
                <p className="text-sm text-muted-foreground">
                  Confirmation email sent. Open the link in it, then log in
                  here.
                </p>
              )}
              {needsConfirmation && resendState !== "sent" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={resendState === "sending"}
                  onClick={handleResendConfirmation}
                >
                  {resendState === "sending"
                    ? "Sending..."
                    : "Resend confirmation email"}
                </Button>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href={nextPath ? `/auth/sign-up?next=${encodeURIComponent(nextPath)}` : "/auth/sign-up"}
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
