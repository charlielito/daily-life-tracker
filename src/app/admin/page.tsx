"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";

interface GrantAccessForm {
  userEmail: string;
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <Badge variant="destructive" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>
        <p className="text-gray-600">Manage user access and subscriptions</p>
      </div>

      {/* Grant Unlimited Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Grant Unlimited Access
          </CardTitle>
          <CardDescription>
            Give a user unlimited access to all features for free. This is useful for team members, friends, or beta testers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userEmail">User Email</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="user@example.com"
                {...register("userEmail", { 
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
              />
              {errors.userEmail && (
                <p className="text-red-500 text-sm">{errors.userEmail.message}</p>
              )}
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={grantUnlimitedAccess.isLoading}
            >
              {grantUnlimitedAccess.isLoading ? "Granting Access..." : "Grant Unlimited Access"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <h4 className="font-semibold mb-2">What happens when you grant unlimited access:</h4>
            <ul className="space-y-1 ml-4">
              <li className="list-disc">User gets unlimited AI macro calculations</li>
              <li className="list-disc">User gets unlimited image uploads</li>
              <li className="list-disc">User's subscription status becomes "unlimited"</li>
              <li className="list-disc">User won't be charged for any premium features</li>
              <li className="list-disc">This setting can be reversed by modifying the database directly</li>
            </ul>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <p className="text-amber-800 text-sm">
              <strong>Admin Access:</strong> Only users listed in the admin emails array can access this page. 
              Currently configured for your email address.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 