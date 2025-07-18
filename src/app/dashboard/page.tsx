"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [today] = useState(new Date());

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Fetch today's data
  const { data: todayMacros = [], isLoading: macrosLoading } = api.macros.getToday.useQuery(
    { date: today },
    { enabled: !!session }
  );

  const { data: todayIntestinal = [], isLoading: intestinalLoading } = api.intestinal.getToday.useQuery(
    { date: today },
    { enabled: !!session }
  );

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to sign-in
  }

  // Calculate total macros for today
  const totalMacros = todayMacros.reduce(
    (acc, entry) => {
      if (entry.calculatedMacros) {
        acc.calories += entry.calculatedMacros.calories || 0;
        acc.protein += entry.calculatedMacros.protein || 0;
        acc.carbs += entry.calculatedMacros.carbs || 0;
        acc.fat += entry.calculatedMacros.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Get today's weight (from the most recent entry)
  const todayWeight = todayMacros
    .filter(entry => entry.weight)
    .sort((a, b) => new Date(b.hour).getTime() - new Date(a.hour).getTime())[0]?.weight;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Sign Out */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {session.user?.name || session.user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-gray-600">
              {format(today, "EEEE, MMMM d, yyyy")} • Track your daily health
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Today's Stats - Big Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Today's Calories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">{Math.round(totalMacros.calories)}</div>
            <p className="text-xs text-blue-600 mt-1">kcal consumed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Meals Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">{todayMacros.length}</div>
            <p className="text-xs text-green-600 mt-1">entries today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Health Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800">{todayIntestinal.length}</div>
            <p className="text-xs text-purple-600 mt-1">logs today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Current Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">
              {todayWeight ? `${todayWeight}kg` : "—"}
            </div>
            <p className="text-xs text-orange-600 mt-1">latest entry</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Prominent */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              🍽️ Log New Meal
            </CardTitle>
            <CardDescription>
              Add a meal and get AI-powered macro calculation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/food">
              <Button size="lg" className="w-full">
                Add Meal Now
              </Button>
            </Link>
            {todayMacros.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium">Today's Macros:</p>
                <p>P: {Math.round(totalMacros.protein)}g | C: {Math.round(totalMacros.carbs)}g | F: {Math.round(totalMacros.fat)}g</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              🏥 Log Health Entry
            </CardTitle>
            <CardDescription>
              Track intestinal health using Bristol Stool Scale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/health">
              <Button size="lg" className="w-full" variant="secondary">
                Log Health Now
              </Button>
            </Link>
            {todayIntestinal.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium">Latest Entry:</p>
                <p>{format(new Date(todayIntestinal[todayIntestinal.length - 1].hour), "h:mm a")} • Pain: {todayIntestinal[todayIntestinal.length - 1].painLevel}/10</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Meals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Meals</CardTitle>
              <Link href="/food">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <CardDescription>Your latest food entries</CardDescription>
          </CardHeader>
          <CardContent>
            {macrosLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : todayMacros.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">No meals logged today</p>
                <Link href="/food">
                  <Button size="sm">Log Your First Meal</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayMacros.slice(-3).reverse().map((entry) => (
                  <div key={entry.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{entry.description}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(entry.hour), "h:mm a")}
                        </p>
                      </div>
                      {entry.calculatedMacros && (
                        <div className="text-xs text-gray-600 text-right">
                          <div className="font-medium">{Math.round(entry.calculatedMacros.calories)} cal</div>
                          <div className="text-gray-500">
                            P:{Math.round(entry.calculatedMacros.protein)}g
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Health Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Health Entries</CardTitle>
              <Link href="/health">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <CardDescription>Your latest health logs</CardDescription>
          </CardHeader>
          <CardContent>
            {intestinalLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : todayIntestinal.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">No health entries today</p>
                <Link href="/health">
                  <Button size="sm" variant="secondary">Log First Entry</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayIntestinal.slice(-3).reverse().map((entry) => (
                  <div key={entry.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">Bristol Scale Type {entry.consistency}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(entry.hour), "h:mm a")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-700">{entry.color}</div>
                        <div className="text-xs text-gray-500">
                          Pain: {entry.painLevel}/10
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 