"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface GrantAccessForm {
  userEmail: string;
}

interface AdminUserRow {
  email: string;
  name: string;
  status: "unlimited" | "premium" | "free";
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GrantAccessForm>();

  const grantUnlimitedAccess = api.subscription.grantUnlimitedAccess.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setError(null);
      reset();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  // Redirect to sign-in if not authenticated
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-16">
          <p className="text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const onSubmit = (data: GrantAccessForm) => {
    setSuccess(null);
    setError(null);
    grantUnlimitedAccess.mutate({ userEmail: data.userEmail });
  };

  // Reference rows that document the access model. These are illustrative
  // entries shown in the hairline-divided table — the active mutation grants
  // access by email; this section gives the admin a visual schema for what
  // each status means.
  const sampleRows: AdminUserRow[] = [
    { email: "Recent grant", name: "Unlimited access for life", status: "unlimited" },
    { email: "Paid subscriber", name: "Monthly Premium plan", status: "premium" },
    { email: "Free tier", name: "Subject to monthly limits", status: "free" },
  ];

  const statusVariant = (s: AdminUserRow["status"]) =>
    s === "unlimited" ? "iron" : s === "premium" ? "default" : "outline";

  const statusLabel = (s: AdminUserRow["status"]) =>
    s === "unlimited" ? "Unlimited" : s === "premium" ? "Premium" : "Free";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
          <Badge variant="iron">Admin only</Badge>
        </div>

        {/* Header */}
        <header className="mb-14">
          <p className="text-micro text-muted mb-4">Administration</p>
          <h1 className="font-display text-h1 mb-3">Admin panel</h1>
          <p className="text-muted text-base leading-relaxed max-w-2xl">
            Manage user access and subscriptions.
          </p>
        </header>

        {/* Status notices */}
        {(success || error) && (
          <div className="mb-10 space-y-4">
            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Grant unlimited access */}
        <section className="border-t border-hairline pt-10 mb-16">
          <p className="text-micro text-muted mb-2">Action</p>
          <h2 className="font-display text-h2 mb-3">Grant unlimited access</h2>
          <p className="text-muted text-sm leading-relaxed max-w-2xl mb-8">
            Give a user unlimited access to all features at no charge — useful
            for team members, friends, or beta testers.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
            <div className="border-t border-hairline">
              <div className="py-5 border-b border-hairline">
                <Label htmlFor="userEmail" className="block mb-2">
                  User email
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  {...register("userEmail", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.userEmail && (
                  <p className="text-iron text-sm mt-2">{errors.userEmail.message}</p>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                type="submit"
                disabled={grantUnlimitedAccess.isLoading}
              >
                {grantUnlimitedAccess.isLoading ? "Granting access…" : "Grant unlimited access"}
              </Button>
            </div>
          </form>
        </section>

        {/* Access status reference table */}
        <section className="border-t border-hairline pt-10 mb-16">
          <p className="text-micro text-muted mb-2">Reference</p>
          <h2 className="font-display text-h2 mb-8">Access tiers</h2>

          {/* Header row */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto] gap-6 items-center py-3 border-b border-hairline">
            <span className="text-micro text-muted">Tier</span>
            <span className="text-micro text-muted">Description</span>
            <span className="text-micro text-muted">Status</span>
            <span className="text-micro text-muted">Action</span>
          </div>

          {sampleRows.map((row) => (
            <div
              key={row.email}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_auto_auto] gap-x-6 gap-y-2 items-center py-5 border-b border-hairline"
            >
              <div className="text-ink">{row.email}</div>
              <div className="text-muted text-sm md:order-none order-3 col-span-2 md:col-span-1">
                {row.name}
              </div>
              <Badge variant={statusVariant(row.status)}>
                {statusLabel(row.status)}
              </Badge>
              <Button variant="outline" size="sm" disabled>
                Manage
              </Button>
            </div>
          ))}
        </section>

        {/* Notes */}
        <section className="border-t border-hairline pt-10">
          <p className="text-micro text-muted mb-2">Notes</p>
          <h2 className="font-display text-h2 mb-8">When you grant unlimited access</h2>
          <div className="border-t border-hairline">
            <div className="py-4 border-b border-hairline text-sm text-ink">
              User gets unlimited AI macro calculations
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              User gets unlimited image uploads
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              Subscription status becomes <span className="font-mono text-xs">unlimited</span>
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              User is not charged for any premium feature
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              Reversible by editing the database directly
            </div>
          </div>
          <p className="text-micro text-muted mt-8">
            Only users in the admin email allowlist can access this page.
          </p>
        </section>
      </div>
    </div>
  );
}
