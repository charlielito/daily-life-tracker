"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (session) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, they'll be redirected, so don't show content
  if (session) {
    return null;
  }

  // Show landing page only for unauthenticated users
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Daily Life Tracker</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Track your daily health metrics including nutrition, intestinal health, 
          physical activity, and sleep patterns for better insights into your wellbeing.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍽️ Food Tracking
            </CardTitle>
            <CardDescription>
              Log your meals and automatically calculate macronutrients using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • AI-powered macro calculation
              • Daily nutrition summaries
              • Weight tracking
              • Meal history and patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏥 Health Monitoring
            </CardTitle>
            <CardDescription>
              Monitor intestinal health and digestive patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • Bristol Stool Scale tracking
              • Pain level assessment
              • Color and consistency logs
              • Health pattern analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Analytics
            </CardTitle>
            <CardDescription>
              View trends and correlations in your health data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • Data correlation analysis
              • Historical trends
              • Health insights
              • Export capabilities
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <div className="space-x-4">
          <Link href="/auth/signup">
            <Button size="lg">
              Get Started - Sign Up
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Start tracking your daily health metrics today!
        </p>
      </div>
    </div>
  );
} 