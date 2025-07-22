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
          Track your daily health metrics including nutrition, physical activity, 
          intestinal health, and calorie balance for better insights into your wellbeing and fitness goals.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              🏃‍♂️ Activity Tracking
            </CardTitle>
            <CardDescription>
              Track physical activities and monitor calories burned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • Log sports and exercise
              • Automatic calorie burn calculation
              • Activity intensity levels
              • Exercise history and patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔥 Calorie Balance
            </CardTitle>
            <CardDescription>
              Monitor daily calorie deficit or surplus for your goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • BMR calculation (calories at rest)
              • TDEE with activity level
              • Daily deficit/surplus tracking
              • Weight loss/gain insights
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
      </div>

      {/* New Calorie Balance Feature Highlight */}
      <div className="mb-8">
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 text-xl">
              🎯 Smart Calorie Balance Tracking
            </CardTitle>
            <CardDescription className="text-orange-700">
              Achieve your weight goals with intelligent calorie monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="text-orange-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">How it works:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Set up your profile (age, gender, height, activity level)</li>
                  <li>• Log your meals for calories consumed</li>
                  <li>• Track your workouts for calories burned</li>
                  <li>• Get daily deficit/surplus analysis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What you get:</h4>
                <ul className="text-sm space-y-1">
                  <li>• BMR: Calories your body burns at rest</li>
                  <li>• TDEE: Total daily energy expenditure</li>
                  <li>• Activity calories: From your logged exercises</li>
                  <li>• Balance: Know if you're meeting your goals</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg">
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 text-center">
          Sign up with your email or continue with Google
        </p>
      </div>
    </div>
  );
} 